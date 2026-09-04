// app.js: Hook, Line and Sentence core loop (cast → wait → reel → catch).
// All tuning values come from config.js. Words come from data/words.json,
// filtered to the unlocked letter set; Stream phrases (data/phrases.json) and
// Ocean sentences (data/sentences.json) are the same idea, gated by location.
import { CONFIG } from "./config.js";
import * as logic from "./logic.js";   // pure game math (unit-tested in tests/logic.test.mjs)

let FULL_POOL = [];              // every entry from data/words.json
let WORDS = [];                  // entries typeable with the unlocked letters
let FISH = [];                   // full roster from data/fish.json
let PHRASE_POOL = [];            // every entry from data/phrases.json (A1; Stream)
let PHRASES = [];                // phrases typeable with the unlocked letters
let SENTENCE_POOL = [];          // every entry from data/sentences.json (A5; Ocean)
let SENTENCES = [];              // sentences typeable with the unlocked letters
let PUN_POOLS = { shared: {} };  // data/puns.json: the voice, per spot (see puns())
let unlockedLetters = new Set();

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

// ---- Profiles (localStorage mirror; M4b layers Firestore sync on top) ----
// One document per kid, shaped per FIRESTORE.md. localStorage keys:
//   tf:profile:{id}: the save document (which IS the offline save file)
//   tf:profiles    : lightweight index for the picker [{id,name,avatar,updatedAt}]
//   tf:active      : last-picked profile id
// All reads/writes funnel through here so M4b can add Firestore in one place.
const AVATARS = ["🐸", "🐟", "🐠", "🦆", "🐢", "🦖", "🐙", "🦈", "⭐", "🍀", "🐳", "🦑"];
// These key names predate the rename to Hook, Line and Sentence and are kept
// verbatim on purpose: they address saved games on real devices, so renaming
// them would orphan every existing profile. Same goes for the `typingFishing`
// Firestore collection in config.js. They are storage paths, not display names.
const PROFILE_KEY = id => "tf:profile:" + id;
const INDEX_KEY = "tf:profiles";
const ACTIVE_KEY = "tf:active";
const LEGACY_KEY = "typing-fishing-save";

let save = null;   // the active profile document, or null before one is picked

function blankProfile(name, avatar) {
  const now = Date.now();
  return {
    id: "p" + now.toString(36) + Math.random().toString(36).slice(2, 6),
    name, avatar,
    createdAt: now, updatedAt: now,
    totalCatches: 0, stage: 1, coins: 0,
    // Advanced Progression (A0): rank + unlockedLocations derive from owned rods
    // (see recomputeLocations); `location` is the current fishing spot.
    rank: CONFIG.tiers[0].rank, location: CONFIG.tiers[0].location,
    unlockedLocations: [CONFIG.tiers[0].location],
    // upgrades carries owned lists too (FIRESTORE.md shows equipped only; the
    // shop needs to know what's already bought so it can't be re-purchased)
    upgrades: { rod: "stick", bait: "worm", boat: "classic", hat: "none",
                owned: { rod: ["stick"], bait: ["worm"], boat: ["classic"], hat: ["none"] } },
    collection: {},                                   // fishId → count
    records: {},                                      // fishId → { weight (lb best), wpm (best, Stream+) } (A4)
    badges: [],                                       // earned badge ids (journal)
    stats: { letters: {}, wordsTyped: 0, escapes: 0, sessionCount: 0, lastPlayed: now },
    junk: {},                                         // T3: junkId → count, same shape as collection
    // The lifetime groan total, and it is NOT the sum of `junk`: saves from
    // before T3 counted pulls without recording which. Kept as the total it
    // has always been rather than back-filled from nothing.
    jokesEndured: 0,
    speedBest: null,                                  // Quick Cast: { wpm, accuracy, at } | null
  };
}

function readIndex() { try { return JSON.parse(localStorage.getItem(INDEX_KEY)) ?? []; } catch { return []; } }
function writeIndex(list) { localStorage.setItem(INDEX_KEY, JSON.stringify(list)); }
function readProfile(id) { try { return JSON.parse(localStorage.getItem(PROFILE_KEY(id))); } catch { return null; } }

function persistSave() {
  if (!save) return;
  save.updatedAt = Date.now();
  save.totalCatches = totalCatches();
  save.stage = unlockedStageCount(save.totalCatches);
  save.stats.lastPlayed = save.updatedAt;
  localStorage.setItem(PROFILE_KEY(save.id), JSON.stringify(save));
  const idx = readIndex();
  const row = idx.find(p => p.id === save.id);
  if (row) { row.name = save.name; row.avatar = save.avatar; row.updatedAt = save.updatedAt; writeIndex(idx); }
  syncPush(save);   // M4b: push to Firestore when signed in; no-op otherwise
}

function createProfile(name, avatar) {
  const p = blankProfile(name || "Angler", avatar || pick(AVATARS));
  localStorage.setItem(PROFILE_KEY(p.id), JSON.stringify(p));
  writeIndex([...readIndex(), { id: p.id, name: p.name, avatar: p.avatar, updatedAt: p.updatedAt }]);
  return p;
}

function deleteProfile(id) {
  localStorage.removeItem(PROFILE_KEY(id));
  writeIndex(readIndex().filter(p => p.id !== id));
}

// One-time migration of the pre-M4 single save into a first profile.
function migrateLegacySave() {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy || readIndex().length) return;
  try {
    const old = JSON.parse(legacy);
    const p = blankProfile("Player 1", "🎣");
    p.coins = old.coins ?? 0;
    p.collection = old.caught ?? {};
    if (old.gear) p.upgrades = {
      rod: old.gear.rod ?? "stick", bait: old.gear.bait ?? "worm",
      owned: old.gear.owned ?? { rod: ["stick"], bait: ["worm"] },
    };
    p.totalCatches = Object.values(p.collection).reduce((a, b) => a + b, 0);
    p.stage = unlockedStageCount(p.totalCatches);
    localStorage.setItem(PROFILE_KEY(p.id), JSON.stringify(p));
    writeIndex([{ id: p.id, name: p.name, avatar: p.avatar, updatedAt: p.updatedAt }]);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore a malformed legacy save */ }
}

// ---- Firestore sync (M4b) ----
// One parent Google sign-in backs up every kid's profile to Firestore and
// pulls them on other devices. Everything here is best-effort: if Firebase
// can't load, isn't configured, or nobody's signed in, the game runs entirely
// on the localStorage mirror and none of this throws. Profiles are stored as
// one doc per kid in the CONFIG.firebase.collection collection, scoped by
// ownerUid so the security rules can keep families separate.
const COL = CONFIG.firebase.collection;
let fb = null;   // { db, auth, fs, authNs, uid } once Firebase has loaded

async function syncInit() {
  try {
    const base = "https://www.gstatic.com/firebasejs/" + CONFIG.firebase.sdkVersion;
    const [appNs, fs, authNs] = await Promise.all([
      import(base + "/firebase-app.js"),
      import(base + "/firebase-firestore.js"),
      import(base + "/firebase-auth.js"),
    ]);
    const app = appNs.initializeApp(CONFIG.firebase.config);
    fb = { db: fs.getFirestore(app), auth: authNs.getAuth(app), fs, authNs, uid: null };
    setSyncStatus("sync-out");
    authNs.onAuthStateChanged(fb.auth, async (user) => {
      fb.uid = user?.uid ?? null;
      if (user) {
        setSyncStatus("sync-in", user.email || user.displayName || "signed in");
        try { await pullProfiles(); } catch (e) { console.warn("profile pull failed", e); }
      } else {
        setSyncStatus("sync-out");
      }
    });
  } catch (err) {
    // Offline, blocked, or misconfigured: stay local-only and silent.
    console.info("Sync unavailable; playing offline on localStorage.", err?.message || err);
    setSyncStatus("sync-off");
  }
}

function signIn() {
  if (!fb) return;
  fb.authNs.signInWithPopup(fb.auth, new fb.authNs.GoogleAuthProvider())
    .catch(err => { console.warn("sign-in failed", err); setSyncStatus("sync-out", "sign-in cancelled"); });
}
function signOutSync() { if (fb) fb.authNs.signOut(fb.auth).catch(() => {}); }

// write-through on every persistSave() when signed in; fire-and-forget
function syncPush(profile) {
  if (!fb?.uid) return;
  const { doc, setDoc } = fb.fs;
  setDoc(doc(fb.db, COL, profile.id), { ...profile, ownerUid: fb.uid }, { merge: true })
    .catch(err => console.warn("sync push failed", err));
}

// pull the family's profiles and reconcile with local by updatedAt (newest wins)
async function pullProfiles() {
  if (!fb?.uid) return;
  const { collection, query, where, getDocs, doc, setDoc } = fb.fs;
  const snap = await getDocs(query(collection(fb.db, COL), where("ownerUid", "==", fb.uid)));
  const remote = {};
  snap.forEach(d => { remote[d.id] = d.data(); });

  const ids = new Set([...readIndex().map(p => p.id), ...Object.keys(remote)]);
  for (const id of ids) {
    const loc = readProfile(id);
    const rem = remote[id];
    const locT = loc?.updatedAt ?? 0, remT = rem?.updatedAt ?? 0;
    if (rem && remT > locT) {
      // remote is newer: adopt it locally, but never yank a kid mid-game
      if (!(save && save.id === id && !pickerOpen)) localStorage.setItem(PROFILE_KEY(id), JSON.stringify(rem));
    } else if (loc && locT >= remT) {
      // local is newer or remote-missing: back it up
      setDoc(doc(fb.db, COL, id), { ...loc, ownerUid: fb.uid }, { merge: true }).catch(() => {});
    }
  }
  // rebuild the picker index from whatever now exists locally
  const idx = [];
  for (const id of ids) { const d = readProfile(id); if (d) idx.push({ id, name: d.name, avatar: d.avatar, updatedAt: d.updatedAt }); }
  writeIndex(idx);
  if (pickerOpen) renderProfileGrid();
}

function equippedRod()  { return CONFIG.shop.rods.find(r => r.id === save.upgrades.rod); }
function equippedBait() { return CONFIG.shop.baits.find(b => b.id === save.upgrades.bait); }

// ---- Letter unlocks: total catches decide which stages are open ----
function totalCatches() { return Object.values(save.collection).reduce((a, b) => a + b, 0); }
function unlockedStageCount(total) { return logic.unlockedStageCount(CONFIG.unlock.stages, total); }
function recomputeUnlocks() {
  // The 🧪 shortcut unlocks the whole keyboard as well as the spots: the letter
  // stages are earned by catch count alone, so a fresh test profile standing in
  // the Ocean still only had the home row, which filters out every sentence
  // and silently drops the reel back to single words. Dev hosts only; a synced
  // save carrying the flag is ignored in production.
  const allKeys = CONFIG.dev?.testShortcuts && save?.devAllKeys;
  const n = allKeys ? CONFIG.unlock.stages.length : unlockedStageCount(totalCatches());
  unlockedLetters = logic.lettersForStages(CONFIG.unlock.stages, n);
  WORDS = FULL_POOL.filter(e => [...e.letters].every(l => unlockedLetters.has(l)));
  // phrases/sentences gate on the same unlocked-letter set as words, so a kid
  // only reels content they can actually type (both seeds are home-row, so
  // everything typeable today, same as A1's phrases)
  PHRASES = PHRASE_POOL.filter(e => [...e.letters].every(l => unlockedLetters.has(l)));
  SENTENCES = SENTENCE_POOL.filter(e => [...e.letters].every(l => unlockedLetters.has(l)));
  renderKeyLocks();
}

// ---- Advanced Progression (A0): rank & location derive from owned rods ----
// unlockedLocations/rank are a cache of what the owned rods imply; recompute on
// load (migrates pre-A0 saves for free) and after buying a rod.
function recomputeLocations() {
  save.location ??= CONFIG.tiers[0].location;
  save.unlockedLocations = logic.locationsForRods(CONFIG.tiers, CONFIG.shop.rods, save.upgrades.owned.rod);
  save.rank = logic.rankForProfile(CONFIG.tiers, save.unlockedLocations, CONFIG.prestige, hasPrestige());
  // the gate is the owned rods, so a `location` the rods don't justify (an
  // edited/rolled-back save, or a spot a config change retired) falls back home
  // rather than quietly fishing a locked spot
  if (!save.unlockedLocations.includes(save.location)) save.location = CONFIG.tiers[0].location;
}
// A4: widen records[fishId] from a bare weight to { weight, wpm }. Pre-A4 saves
// stored just the number; convert in place once on load. Idempotent.
function migrateRecords() {
  save.records ??= {};
  for (const id in save.records) {
    const r = save.records[id];
    if (typeof r === "number") save.records[id] = { weight: r, wpm: null };
  }
}
// Buying a location-unlocking rod graduates the profile. Returns the tier(s)
// newly reached (for the rank-up ceremony); empty on a rod that unlocks nothing.
function graduateLocations() {
  const before = new Set(save.unlockedLocations ?? []);
  recomputeLocations();
  return CONFIG.tiers.filter(t => !before.has(t.location) && save.unlockedLocations.includes(t.location));
}

// Dad joke flavor text: one pool per moment, picked at random. The pools live
// in data/puns.json and are PER SPOT: the Ocean never tells a pond joke, and a
// moment a spot does not override falls back to the shared pool. Add a joke to
// the JSON, not here.
//
// House rule (CLAUDE.md): cast lines always keep the literal instruction, which
// is exactly why the jokes toggle below cannot reach them. See setPun.
function punFor(moment) {
  const pool = logic.punPool(PUN_POOLS, save?.location, moment);
  return pool.length ? pick(pool) : "";
}

// ---- State ----
let phase = "cast";        // cast | wait | reel | done
let target = "";
let typed = 0;
let tension = 0;
let fish = null;           // roster entry currently on the line
let junk = null;           // junk item on the line instead of a fish (comedy), or null
let hookedTier = "common"; // the tier that was rolled for it: set at the approach, used at the bite
let reelPool = [];         // words matched to the hooked fish's difficulty
let reelMode = "words";    // "words" (Pond) | "phrase" (Stream, A1): set at each bite
let reelSegments = [];     // A7: the sentences this catch is fought over (1 outside the Ocean)
let segIndex = 0;          // which of those we're currently reeling
let wordsToLand = 0;
let wordsLeft = 0;
let inputLocked = false;
let pickerOpen = true;     // the profile picker gates play until a kid is chosen
let gameGen = 0;           // bumped on each profile activation; stales old timers

// silent typing stats (feeds the v2 adaptive meter: kids never see these)
let lastKeyTime = 0;                 // 0 = start of a word, don't time the first letter
const MAX_LATENCY_MS = 5000;         // ignore gaps this long (kid stepped away)
function statLetter(l) { return (save.stats.letters[l] ??= { n: 0, errors: 0, msTotal: 0 }); }

// A4: per-catch reel timing for a self-paced WPM (phrase mode only). Active
// typing time (idle gaps excluded) so a kid who pauses isn't punished. Reset
// at each bite; read at land. Separate from the stats' lastKeyTime above.
let reelChars = 0, reelActiveMs = 0, reelLastKeyMs = 0;
function tickReelWpm() {
  if (phase !== "reel" || reelMode !== "phrase") return;
  const now = Date.now();
  if (logic.countsTowardTiming(reelLastKeyMs, now, MAX_LATENCY_MS)) reelActiveMs += now - reelLastKeyMs;
  reelLastKeyMs = now;
  reelChars++;
}

// A4: fly-cast rhythm, inter-key gaps while typing a cast word, for a cozy
// "nice cast" line on graduated (fly-fishing) waters. Reset at each cast.
let castIntervals = [], castLastKeyMs = 0;
function tickCastRhythm() {
  if (phase !== "cast") return;
  const now = Date.now();
  if (logic.countsTowardTiming(castLastKeyMs, now, MAX_LATENCY_MS)) castIntervals.push(now - castLastKeyMs);
  castLastKeyMs = now;
}

// run fn after delay unless the game moved on (profile switched) or picker opened
function later(fn, delay) {
  const g = gameGen;
  // Handing the timer back is what lets a REPEATING one go through here too:
  // a self-rescheduling later() chain stops on its own the moment the game it
  // belongs to is over, and the caller can still cancel it early.
  return setTimeout(() => { if (g === gameGen && !pickerOpen) fn(); }, delay);
}

// ---- DOM ----
const $ = id => document.getElementById(id);
const el = { scene: $("scene"), word: $("word"), status: $("status"), fill: $("meter-fill"),
             caught: $("caught"), escaped: $("escaped"), coins: $("coins"), dist: $("dist"),
             linePath: $("line-path"), lure: $("lure"), fish: $("fish"), bobber: $("bobber"),
             pun: $("pun"), punDismiss: $("pun-dismiss") };

// scale the fixed 720x360 design-space canvas to cover the viewport (M9);
// every pixel position in the game logic stays in that untouched coordinate
// system, only #scene-frame's transform changes on resize
const sceneFrame = $("scene-frame");
function fitScene() {
  const scale = Math.max(window.innerWidth / 720, window.innerHeight / 360);
  sceneFrame.style.transform = `scale(${scale})`;
}
window.addEventListener("resize", fitScene);
fitScene();

// The catch card centres in the band between the top bar and #word, so the band
// has to start below whatever the bar actually is. Its height is not a constant:
// the chips wrap at narrow widths, and under 620px the bar stacks the HUD above
// the tackle box. Measured and published as --card-top, the same shape as
// fitScene/fitGuide, because the guessed 52px put the card under the tackle box
// on a 320px phone. Above 620px only the chips are in a centred card's way (the
// tackle box is out at the right edge), which is why the two modes differ.
const topbarEl = $("topbar"), toprightEl = $("topright");
function fitTopbar() {
  const stacked = getComputedStyle(topbarEl).flexDirection === "column-reverse";
  const clear = (stacked ? toprightEl : $("hud")).getBoundingClientRect().bottom;
  document.documentElement.style.setProperty("--card-top", Math.round(clear + 12) + "px");
}
// an observer rather than call sites: the bar also changes height when a chip's
// number gets wider (999 -> 1000 coins) or the title crosses its breakpoint,
// and neither of those is a resize
new ResizeObserver(fitTopbar).observe(toprightEl);
window.addEventListener("resize", fitTopbar);
fitTopbar();

const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const TIER_ORDER = ["legendary", "rare", "uncommon", "common"];   // rarity, hardest → easiest (A3 fish fallback)

// thin wrappers over logic.js: supply the live CONFIG / equipped rod / word pool
function rollWeight(tier)           { return logic.rollWeight(CONFIG.size, tier); }
function pickTier()                 { return logic.pickTier(CONFIG.bite.tierOddsByRod[equippedRod().rodLevel]); }
function buildReelPool(difficulty)  { return logic.buildReelPool(WORDS, difficulty, CONFIG.reel.minReelPoolSize); }
// phrase/sentence content for the current spot, matched to the fish's
// difficulty (same widening machinery as words). Phrases and sentences share
// one tag schema (AD1), so they merge into a single content pool here; only
// the entries tagged for save.location survive (Stream phrases at "stream",
// A5 sentences at "ocean", never both at once). Empty unless something
// typeable is tagged for this spot.
function buildPhrasePool(difficulty) {
  const here = [...PHRASES, ...SENTENCES].filter(p => p.location === save.location);
  return logic.buildReelPool(here, difficulty, CONFIG.reel.minPhrasePoolSize);
}

// ---- Audio: procedural synth, no external asset files (M10; the ambience
// rebuilt in S1) ----
// Web Audio oscillators/filters generate everything: a per-spot ambient bed
// plus short SFX blips/chimes. Avoids sourcing/licensing audio for a family
// project and needs no new files, matching the no-build-step rule.
//
// S1 split the bed in two. One filtered-noise layer is what the game had, and
// it read as white noise at every spot because that is what it was: the same
// hiss whether you were at a pond or in the sea. Now the bed is per spot
// (CONFIG.audio.ambience, with the same `shared` fallback the pun pools use)
// and the character comes from VOICES, the one-shots scheduled at random gaps
// on top of it: the frog, the dragonfly, the bubbles, the swell, the gull.
// Levels and gaps are CFG knobs; the synths themselves are sound design and
// live here next to the note pitches.
let actx = null, masterGain = null, sfxGain = null, bedGain = null, voiceGain = null;
let ambient = null;          // { nodes, timers, location } for the spot playing now
let noiseBuffer = null;      // two seconds of white noise, shared by every layer
// Sound is ON by default as of S1. It was turned off in 2026-08 because the
// one-bed ambience "needed tuning before it was worth hearing", which is the
// thing this milestone did. One line to put back if it is wrong on a real
// device: `=== "on"` restores off-by-default, and a kid who has already
// chosen keeps their choice either way.
let soundOn = localStorage.getItem("tf:soundOn") !== "off";

// The top-left jokes, on by default. Turning them off silences FLAVOUR only:
// the cast and wiggle prompts carry the literal instruction and keep showing
// whatever this says, so a kid who finds the puns annoying can be rid of them
// without losing the one line on screen that says what to press.
let punsOn = localStorage.getItem("tf:punsOn") !== "off";

function ensureAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = actx.createGain();
  masterGain.gain.value = soundOn ? CONFIG.audio.masterVolume : 0;
  masterGain.connect(actx.destination);
  sfxGain = actx.createGain(); sfxGain.gain.value = CONFIG.audio.sfxVolume; sfxGain.connect(masterGain);
  bedGain = actx.createGain(); bedGain.gain.value = CONFIG.audio.bedVolume; bedGain.connect(masterGain);
  voiceGain = actx.createGain(); voiceGain.gain.value = CONFIG.audio.voiceVolume; voiceGain.connect(masterGain);
  startAmbient(audioLocation());
}

// A browser refuses to start an AudioContext until the kid has touched
// something, and it suspends the one we have when the tab sleeps. Every key
// and every click is a chance to open it: both calls are cheap no-ops once it
// is running, and neither builds anything while the sound is off.
function audioGesture() {
  if (!soundOn) return;
  ensureAudio();
  if (actx.state === "suspended") actx.resume();
}
document.addEventListener("keydown", audioGesture);
document.addEventListener("pointerdown", audioGesture);

function setSoundOn(on) {
  soundOn = on;
  localStorage.setItem("tf:soundOn", on ? "on" : "off");
  if (masterGain) {
    masterGain.gain.setTargetAtTime(on ? CONFIG.audio.masterVolume : 0, actx.currentTime, 0.05);
  }
}

function audioLocation() { return save?.location ?? CONFIG.tiers[0].location; }
function ambienceHere() { return logic.ambienceFor(CONFIG.audio.ambience, audioLocation()); }

function whiteNoise() {
  if (!noiseBuffer) {
    const n = actx.sampleRate * 2;
    noiseBuffer = actx.createBuffer(1, n, actx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = actx.createBufferSource();
  src.buffer = noiseBuffer; src.loop = true;
  return src;
}

// The always-on layer. Filtered noise rather than oscillators: a flat sine
// drone reads as an unpleasant hum, never as water. A soft lowpass "body" (the
// weight of the water) plus a bandpass "shimmer" whose centre frequency sweeps
// on an LFO (light moving on ripples), and optionally a slow `swell` that
// breathes the whole bed in and out, which is what makes the Ocean read as
// open water rather than as a louder pond.
function buildBed(cfg) {
  const nodes = [];
  const out = actx.createGain(); out.gain.value = cfg.gain ?? 0.5;
  out.connect(bedGain);
  const noise = whiteNoise();

  const body = actx.createBiquadFilter();
  body.type = "lowpass"; body.frequency.value = cfg.body.hz;
  const bodyGain = actx.createGain(); bodyGain.gain.value = cfg.body.gain;
  noise.connect(body); body.connect(bodyGain); bodyGain.connect(out);

  if (cfg.shimmer) {
    const sh = actx.createBiquadFilter();
    sh.type = "bandpass"; sh.frequency.value = cfg.shimmer.hz; sh.Q.value = cfg.shimmer.q;
    const shGain = actx.createGain(); shGain.gain.value = cfg.shimmer.gain;
    const lfo = actx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = cfg.shimmer.sweepHz;
    const lfoGain = actx.createGain(); lfoGain.gain.value = cfg.shimmer.sweepDepth;
    lfo.connect(lfoGain); lfoGain.connect(sh.frequency);
    noise.connect(sh); sh.connect(shGain); shGain.connect(out);
    lfo.start(); nodes.push(lfo);
  }

  if (cfg.swell) {
    const lfo = actx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = cfg.swell.hz;
    const depth = actx.createGain(); depth.gain.value = (cfg.gain ?? 0.5) * cfg.swell.depth;
    lfo.connect(depth); depth.connect(out.gain);
    lfo.start(); nodes.push(lfo);
  }

  noise.start(); nodes.push(noise);
  return nodes;
}

function startAmbient(loc) {
  if (!actx || ambient) return;
  const cfg = logic.ambienceFor(CONFIG.audio.ambience, loc);
  if (!cfg) return;
  const nodes = cfg.bed ? buildBed(cfg.bed) : [];
  const timers = (cfg.voices ?? []).map(v => scheduleVoice(v));
  ambient = { nodes, timers, location: loc };
}

function stopAmbient() {
  if (!ambient) return;
  ambient.timers.forEach(s => { s.live = false; clearTimeout(s.timer); });
  ambient.nodes.forEach(n => { try { n.stop(); } catch { /* already stopped */ } });
  ambient = null;
}

// Called whenever the kid changes water (applyScene). The bed belongs to the
// spot the same way the costume and the tackle do.
function refreshAmbient() {
  if (!actx || ambient?.location === audioLocation()) return;
  stopAmbient();
  startAmbient(audioLocation());
}

// Each voice re-arms itself, so the gaps stay random forever rather than
// repeating a pattern of however many were queued up front. The timer runs
// even with the sound off: playVoice checks, so turning sound on mid-game
// gets you a live pond rather than a bed with nothing in it.
function scheduleVoice(v) {
  const slot = { timer: null, live: true };
  const arm = () => {
    slot.timer = setTimeout(() => {
      playVoice(v.id, v.gain);
      if (slot.live) arm();
    }, logic.nextVoiceDelayMs(v.everyMs));
  };
  arm();
  return slot;
}

function playVoice(id, gain = 0.4) {
  if (!actx || !soundOn || document.hidden) return;
  VOICES[id]?.(gain);
}

// The Pond's idle ring is something moving under there, so it makes a noise.
// The picture and the sound are one event rather than two schedules that drift
// apart; a spot whose ambience names no rippleVoice keeps silent rings.
function rippleHeard() {
  const rv = ambienceHere()?.rippleVoice;
  if (rv) playVoice(rv.id, rv.gain);
}

// ---- The voices. Each is a few seconds of one animal or one piece of water,
// built from the same two ingredients as everything else (a filtered noise
// source and an oscillator) and routed to voiceGain so the whole cast has one
// level. The ids are the keys here and in CONFIG.audio.ambience, and a data
// test holds the two lists to each other.
function panTo(node, from, to, dur) {
  if (!actx.createStereoPanner) return node;
  const p = actx.createStereoPanner();
  p.pan.setValueAtTime(from, actx.currentTime);
  p.pan.linearRampToValueAtTime(to, actx.currentTime + dur);
  node.connect(p);
  return p;
}

// a drop of water: a pitch that falls fast, with a little splish of noise on it
function voicePlop(gain) {
  const t0 = actx.currentTime;
  const osc = actx.createOscillator(); osc.type = "sine";
  osc.frequency.setValueAtTime(760, t0);
  osc.frequency.exponentialRampToValueAtTime(170, t0 + 0.09);
  const env = actx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
  osc.connect(env); env.connect(voiceGain);
  osc.start(t0); osc.stop(t0 + 0.15);

  const noise = whiteNoise();
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
  const ng = actx.createGain();
  ng.gain.setValueAtTime(gain * 0.35, t0);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  noise.connect(lp); lp.connect(ng); ng.connect(voiceGain);
  noise.start(t0); noise.stop(t0 + 0.1);
}

// a frog: two croaks, each a falling note with a fast rasp AM on it. The rasp
// is the whole trick, a clean triangle at this pitch is a toy trumpet.
function voiceFrog(gain) {
  const croak = (at, f0, f1, dur, g) => {
    const osc = actx.createOscillator(); osc.type = "triangle";
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const rasp = actx.createGain(); rasp.gain.value = 0.55;
    const lfo = actx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 34;
    const lfoGain = actx.createGain(); lfoGain.gain.value = 0.45;
    lfo.connect(lfoGain); lfoGain.connect(rasp.gain);
    const env = actx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(g, at + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1600;
    osc.connect(rasp); rasp.connect(env); env.connect(lp); lp.connect(voiceGain);
    osc.start(at); osc.stop(at + dur + 0.02);
    lfo.start(at); lfo.stop(at + dur + 0.02);
  };
  const t0 = actx.currentTime;
  croak(t0, 430, 330, 0.20, gain);
  croak(t0 + 0.28, 400, 300, 0.16, gain * 0.8);
}

// a dragonfly: a detuned buzz that swells in, crosses the pond and leaves
function voiceDragonfly(gain) {
  const t0 = actx.currentTime, dur = 2.4;
  const env = actx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + dur * 0.4);
  env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
  const dir = Math.random() < 0.5 ? -1 : 1;
  env.connect(lp);
  panTo(lp, -0.8 * dir, 0.8 * dir, dur).connect(voiceGain);
  for (const [type, hz, g] of [["sawtooth", 128, 0.5], ["sawtooth", 133, 0.35], ["square", 256, 0.12]]) {
    const osc = actx.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(hz, t0);
    osc.frequency.linearRampToValueAtTime(hz * 1.08, t0 + dur * 0.5);
    osc.frequency.linearRampToValueAtTime(hz, t0 + dur);
    const g2 = actx.createGain(); g2.gain.value = g;
    osc.connect(g2); g2.connect(env);
    osc.start(t0); osc.stop(t0 + dur);
  }
}

// one bubble of a brook: a tiny pitch that rises. Hundreds of these a minute
// are what "babbling" is; the bed alone is just a hiss.
function voiceBubble(gain) {
  const t0 = actx.currentTime;
  const f0 = 700 + Math.random() * 1500;   // high and glassy: the tinkle is the top of a brook
  const dur = 0.05 + Math.random() * 0.05;
  const osc = actx.createOscillator(); osc.type = "sine";
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(f0 * (1.7 + Math.random()), t0 + dur);
  const env = actx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(gain * (0.4 + Math.random() * 0.6), t0 + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env);
  panTo(env, (Math.random() * 2 - 1) * 0.6, (Math.random() * 2 - 1) * 0.6, dur).connect(voiceGain);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

// a wave: noise through a band that opens as it breaks and closes as it drains
function voiceWave(gain) {
  const t0 = actx.currentTime, dur = 3.6;
  const noise = whiteNoise();
  const bp = actx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(200, t0);
  bp.frequency.linearRampToValueAtTime(720, t0 + dur * 0.34);
  bp.frequency.linearRampToValueAtTime(180, t0 + dur);
  // and the fizz off the top of it: a wave heard from a boat is mostly weight
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
  const env = actx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + dur * 0.34);
  env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  noise.connect(bp); bp.connect(lp); lp.connect(env);
  panTo(env, -0.35, 0.35, dur).connect(voiceGain);
  noise.start(t0); noise.stop(t0 + dur + 0.05);
}

// a gull, far off: two or three falling cries with a vibrato in them, quiet
// and lowpassed, because distance is mostly the absence of high frequencies
function voiceGull(gain) {
  const t0 = actx.currentTime;
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2100;
  const side = (Math.random() * 2 - 1) * 0.7;
  panTo(lp, side, side, 0.01).connect(voiceGain);
  const cries = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < cries; i++) {
    const at = t0 + i * 0.42, dur = 0.26;
    const osc = actx.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1500 - i * 90, at);
    osc.frequency.exponentialRampToValueAtTime(820 - i * 60, at + dur);
    const vib = actx.createOscillator(); vib.type = "sine"; vib.frequency.value = 15;
    const vibGain = actx.createGain(); vibGain.gain.value = 45;
    vib.connect(vibGain); vibGain.connect(osc.frequency);
    const env = actx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(gain * (1 - i * 0.22), at + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(env); env.connect(lp);
    osc.start(at); osc.stop(at + dur + 0.02);
    vib.start(at); vib.stop(at + dur + 0.02);
  }
}

const VOICES = {
  plop: voicePlop, frog: voiceFrog, dragonfly: voiceDragonfly,
  bubble: voiceBubble, wave: voiceWave, gull: voiceGull,
};

// duck the ambient bed to silence while the tab is hidden, restore on return
document.addEventListener("visibilitychange", () => {
  if (!masterGain) return;
  const target = document.hidden ? 0 : (soundOn ? CONFIG.audio.masterVolume : 0);
  masterGain.gain.setTargetAtTime(target, actx.currentTime, CONFIG.audio.duckedVolumeMs / 1000);
});

// short synth blip/chime helper
function tone(freq, { duration = 0.12, type = "sine", gain = 0.25, delay = 0 } = {}) {
  if (!actx || !soundOn) return;
  const t0 = actx.currentTime + delay;
  const osc = actx.createOscillator(); osc.type = type; osc.frequency.value = freq;
  const g = actx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g); g.connect(sfxGain);
  osc.start(t0); osc.stop(t0 + duration + 0.02);
}
function chime(freqs, opts = {}) {
  freqs.forEach((f, i) => tone(f, { ...opts, delay: (opts.delay || 0) + i * (opts.step ?? 0.09) }));
}

// A fish coming up through the surface is water moving, not a note: it was a
// bare 180Hz sine until S1, which is the sound a doorbell makes. Noise through
// a lowpass that shuts, over the same falling pitch the plop uses.
function sfxSplash() {
  if (!actx || !soundOn) return;
  const t0 = actx.currentTime;
  const noise = whiteNoise();
  const lp = actx.createBiquadFilter(); lp.type = "lowpass";
  lp.frequency.setValueAtTime(3200, t0);
  lp.frequency.exponentialRampToValueAtTime(500, t0 + 0.34);
  const env = actx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
  noise.connect(lp); lp.connect(env); env.connect(sfxGain);
  noise.start(t0); noise.stop(t0 + 0.42);
  tone(320, { duration: 0.16, type: "sine", gain: 0.14 });
}
function sfxBite()     { chime([392, 587], { duration: 0.14, type: "square", gain: 0.22 }); }
function sfxWrong()    { tone(140, { duration: 0.15, type: "sawtooth", gain: 0.15 }); }
function sfxWordTick() { tone(880, { duration: 0.06, type: "sine", gain: 0.12 }); }
function sfxCatch()    { chime([523, 659, 784, 1047], { duration: 0.18, step: 0.08, gain: 0.22 }); }
function sfxRareCatch(){ chime([523, 659, 784, 988, 1319], { duration: 0.2, step: 0.07, gain: 0.24 }); }
function sfxEscape()   { chime([392, 330, 262], { duration: 0.22, step: 0.1, type: "triangle", gain: 0.2 }); }
function sfxUnlock()   { chime([523, 659, 784, 1047, 1319], { duration: 0.16, step: 0.06, gain: 0.24 }); }

// ---- Juice ----
function burst(x, y, n) {
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "p";
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", rand(-46, 46) + "px");
    p.style.setProperty("--dy", rand(-70, -14) + "px");
    el.scene.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}
// R6: the fish breaks the surface on its way to the boat. The splash goes where
// it actually crosses the waterline: under its own middle, on the line #surface
// starts at: rather than at the fixed point below the water this used to be,
// where it read as nothing at all.
function surfaceBreak() {
  const x = parseInt(el.fish.style.left) + fishBox().w / 2;
  burst(x, CONFIG.fish.surface.y, CONFIG.fish.surface.splashParticles);
  ripple(x, CONFIG.fish.surface.y + 2);
  sfxSplash();
}

// visual-cadence constants (rendering only: gameplay tuning stays in config.js)
const JUICE = { shadowEveryMs: 6000, bobberRippleMs: 1700, ambientRippleMs: 6500, rippleLifeMs: 1700 };

function ripple(x, y) {
  const r = document.createElement("div");
  r.className = "ripple";
  r.style.left = x + "px"; r.style.top = y + "px";
  el.scene.appendChild(r);
  setTimeout(() => r.remove(), JUICE.rippleLifeMs);
}

function coinFloat(x, y, amount) {
  const c = document.createElement("div");
  c.className = "coinfloat";
  c.textContent = "+" + amount;
  c.style.left = x + "px"; c.style.top = y + "px";
  el.scene.appendChild(c);
  setTimeout(() => c.remove(), 1200);
}
function shakeScene() {
  el.scene.classList.remove("shake"); void el.scene.offsetWidth; el.scene.classList.add("shake");
}
// ambient fish shadows
setInterval(() => {
  if (document.hidden) return;
  const s = document.createElement("div");
  s.className = "fish-shadow";
  s.style.width = rand(30, 70) + "px";
  s.style.top = rand(258, 348) + "px";   // the water band in scene coords: these
  s.style.left = "-90px";                // used to be relative to the #water div
  s.style.animationDuration = rand(16, 30) + "s";
  el.scene.appendChild(s);
  setTimeout(() => s.remove(), 31000);
}, JUICE.shadowEveryMs);

// ambient ripples: the pond breathes even when nobody's fishing. S1 gives the
// ring a sound at the spots that have one, so the splash and the picture are
// one event rather than two schedules drifting past each other.
setInterval(() => {
  if (document.hidden) return;
  ripple(rand(80, 640), rand(230, 330));
  rippleHeard();
}, JUICE.ambientRippleMs);

// bobber ripples while the line waits for a bite
let bobberRippleTimer = null;
function bobberIn() {
  el.bobber.classList.remove("tackle-bobber", "tackle-fly", "plunge", "twitch");
  // The rings run whether or not anything floats here. At the Ocean they are
  // the ONLY thing marking where the bait is, and twitchBait()'s ring is what
  // keeps F4's "a kid can see their typing move something" true at a spot with
  // no float to move.
  ripple(A.cast.landing.x, A.cast.landing.y); // splash-in ring, then the idle rhythm
  // A setInterval outlives the game that started it: this one kept stacking
  // rings behind the profile picker until the next startCast() cleared it.
  // A later() chain is the same rhythm and stops itself instead.
  const rippleTick = () => {
    ripple(A.cast.landing.x, A.cast.landing.y);
    bobberRippleTimer = later(rippleTick, JUICE.bobberRippleMs);
  };
  bobberRippleTimer = later(rippleTick, JUICE.bobberRippleMs);
  // T2: what floats here is the spot's business, and the Ocean floats nothing.
  const kind = CONFIG.tackle[save.location];
  if (!kind) return;
  // the kind decides the size, so it has to be on the element BEFORE the offsets
  // are read: otherwise a fly is centred as if it were a cork float
  el.bobber.classList.add("tackle-" + kind);
  // R1: the tackle takes over exactly where the lure landed
  el.bobber.style.left = (CONFIG.anim.cast.landing.x - el.bobber.offsetWidth / 2) + "px";
  el.bobber.style.top = (CONFIG.anim.cast.landing.y - el.bobber.offsetHeight / 2) + "px";
  el.bobber.classList.add("on");
}
function bobberOut(plunge) {
  clearTimeout(bobberRippleTimer);
  if (plunge) {
    el.bobber.classList.add("plunge");
    ripple(A.cast.landing.x, A.cast.landing.y);
    setTimeout(() => el.bobber.classList.remove("on", "plunge", "twitch"), 400);
  } else {
    el.bobber.classList.remove("on", "plunge", "twitch");   // F4: and any wiggle left on it
  }
}

// ---- Rendering ----
function renderWord() {
  // Phrase mode marks the space you're about to type with a visible ␣ so the
  // spacebar cue is obvious. Word mode (the Pond) never has a space as the next
  // char, so it keeps the original two-span markup untouched.
  if (target[typed] === " ") {
    el.word.innerHTML =
      `<span class="done">${target.slice(0, typed)}</span>` +
      `<span class="cur space">␣</span>` +
      `<span class="todo">${target.slice(typed + 1)}</span>`;
  } else {
    el.word.innerHTML =
      `<span class="done">${target.slice(0, typed)}</span><span class="todo">${target.slice(typed)}</span>`;
  }
  updateGuide(target[typed]);
}
function renderTension() {
  el.fill.style.width = tension + "%";
  el.fill.style.background = tension > 66 ? "var(--ember)" : tension > 33 ? "var(--gold)" : "var(--moss)";
  el.fill.classList.toggle("danger", tension > 66);
}
// The top-left line, and the two ways into it. setStatus carries INSTRUCTIONS
// (the cast and wiggle prompts, a change of spot, a load failure) and is always
// shown; setPun carries flavour and obeys the jokes toggle. That split is the
// whole reason a dismiss button can exist: the "x" only ever appears on a line
// a kid is allowed to lose, so silencing the jokes can never leave a beginner
// with nothing telling them to type.
function setStatus(t, dismissable = false) {
  el.status.textContent = t;
  el.pun.classList.toggle("empty", !t);
  el.punDismiss.hidden = !t || !dismissable;
  if (t) popPun();
}
function setPun(t) { setStatus(punsOn ? t : "", true); }
// Re-trigger the pop-in: a running animation only replays once the class has
// been removed and the removal committed, the same trick #word.pop uses.
function popPun() {
  if (REDUCE_MOTION) return;
  el.pun.classList.remove("pop");
  void el.pun.offsetWidth;
  el.pun.classList.add("pop");
}

// ---- Reel animation: the fish rises from the depths and is reeled toward the
// boat, with the fishing line redrawn every frame from the rod tip to the
// fish's mouth so it stays attached (shortening/re-angling as the fish nears).
// All coords are design-space px on the 720x360 canvas. ----
const REDUCE_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
let swimRAF = null, swimStart = 0;
let fishX = 0, fishY = 0, fishTX = 0, fishTY = 0;   // current + target fish position
// the tween carrying it from one to the other: where it left, when, and for how
// long. See CONFIG.fish.pull: this replaced a per-frame exponential chase.
let pullFrom = { x: 0, y: 0 }, pullT0 = 0, pullMs = 1;

// target for the current reel progress: starts deep-and-right, ends near the
// boat at the surface, so reeling pulls the fish up and in. Pure: it moves
// nothing; startPull() is what makes the fish travel to it.
function setFishTarget(progress = 1 - wordsLeft / wordsToLand) {   // 0 at bite, 1 at land
  const p = CONFIG.fish.path;
  fishTX = p.fromX + progress * (p.toX - p.fromX);
  // kept above the bottom-center ghost-hands panel so the fish stays visible
  // while it's reeled across; the "up from the depths" dip is the spawn offset
  fishTY = p.fromY + progress * (p.toY - p.fromY);
}

// Send the fish to wherever setFishTarget just put the mark, over `ms`, easing
// out of rest and back into it. Re-anchoring on the fish's CURRENT position is
// what lets a pull interrupt one already in flight (the Stream's spaces reel a
// word without waiting for a pause) without ever snapping.
function startPull(ms) {
  pullFrom = { x: fishX, y: fishY };
  pullT0 = performance.now();
  pullMs = Math.max(1, ms);
}

// ---- R1: the cast, the line and the reel actually move (ANIMATION.md) ----
// The line used to be a rotated <div>: straight by construction, sized by a CSS
// width transition, which is why it read as *appearing* rather than travelling.
// It's now an SVG quadratic Bezier redrawn every frame between two ends that
// both move: the rod tip (which swings with the cast, the tug and the boat's
// bob) and whatever is on the other end (a lure in flight, the bobber, a fish).
// The maths is in logic.js and the numbers are in CONFIG.anim; this is only the
// DOM half.
const A = CONFIG.anim;
// R5: #rig's transform-origin is the pose's anchor pivot, not a constant, the
// hull it rocks about moves with the vessel.
const rigPivot = () => pose.anchor.pivot;
let rodAngle = 0, rodVel = 0;               // the tug spring, in degrees
let castSwing = 0;                          // the cast's own rod angle, in degrees
let lineMode = "off";                       // off | cast | wait | reel
let lineEnd = { x: 0, y: 0 };               // what the far end is attached to
let lureAt = { x: 0, y: 0 }, castFrom = { x: 0, y: 0 };
let castPhase = null, castT0 = 0, castLanded = null;
let lineRAF = null, lastFrame = 0;
let rodLayerEl = null;                      // cached by renderRig(); re-cached on equip
let armLayerEl = null;                      // R4: the forearm, which swings the rod with it
let pose = poseFor();                       // R4: the active costume, re-read on every applyScene()

// R4: one kid, three costumes. The pose carries its own layer stack, its own
// grip and its own rod tip, because a standing angler in waders holds the rod
// somewhere a seated one doesn't. All three are painted now; a location with no
// pose of its own would still fall back to the default rather than render an
// empty rig: the wrong shirt rather than no angler at all.
//
// R7 needs the pose's KEY as well as its stack, because gear art is named
// <stem>-<pose>. One function owns the fallback rule so the name and the object
// can never disagree about which pose is being worn.
function poseNameFor(loc) {
  const key = loc ?? save?.location;
  return CONFIG.rig.poses[key] ? key : CONFIG.rig.defaultPose;
}
function poseFor(loc) { return CONFIG.rig.poses[poseNameFor(loc)]; }

// The rod tip in scene coords, through everything that moves it: the rod's own
// rotation about the grip, then #rig's live CSS transform (the boat's bob).
// Reading the matrix each frame is the point: the old build resolved the rod
// tip once at load, so any rod that moved would have left the line behind.
// R4: the rod's swing is split between the wrist and the arm, see swingParts.
// The arm rotates about its own pivot and carries the grip with it, so the tip
// is two rotations composed, not one.
function swingParts() {
  const total = castSwing + rodAngle;
  const arm = pose.armPivot ? total * (A.rod.armFollow ?? 0) : 0;
  return { arm, wrist: total - arm };
}

function rodTip() {
  const { arm, wrist } = swingParts();
  let tip = logic.rotateAboutPivot(pose.lineOrigin, pose.rodPivot, wrist);
  if (arm) tip = logic.rotateAboutPivot(tip, pose.armPivot, arm);
  const rig = $("rig");
  const t = getComputedStyle(rig).transform;
  const m = t && t !== "none" ? new DOMMatrix(t) : new DOMMatrix();
  const o = rigPivot();
  const dx = tip.x - o.x, dy = tip.y - o.y;
  return {
    x: rig.offsetLeft + o.x + m.a * dx + m.c * dy + m.e,
    y: rig.offsetTop  + o.y + m.b * dx + m.d * dy + m.f,
  };
}

// How much the line sags right now. Reeling is the interesting one: tension
// pulls the curve straight, and tension only ever comes from mistakes.
function currentSag() {
  if (lineMode === "cast") return A.line.castSagPx;
  if (lineMode === "reel") return logic.lineSagPx(tension, A.line.slackSagPx, A.line.tautSagPx);
  return A.line.idleSagPx;
}

function drawLine() {
  if (lineMode === "off") { el.linePath.removeAttribute("d"); return; }
  const from = rodTip(), to = lineEnd;
  const c = logic.lineControlPoint(from, to, currentSag());
  el.linePath.setAttribute("d", `M ${from.x} ${from.y} Q ${c.x} ${c.y} ${to.x} ${to.y}`);
  el.linePath.setAttribute("stroke-width", A.line.widthPx);
  applySwing();
}

// Both layers take their transform-origin from the ARM's pivot, so the arm is a
// plain rotation and the rod is the same rotation with its own wrist turn about
// the grip nested inside it. One transform each, no DOM nesting, which matters
// because the paint order (rod behind the arm) forbids making one a child of
// the other.
function applySwing() {
  const { arm, wrist } = swingParts();
  if (armLayerEl) armLayerEl.style.transform = `rotate(${arm}deg)`;
  if (!rodLayerEl) return;
  if (!pose.armPivot) { rodLayerEl.style.transform = `rotate(${wrist}deg)`; return; }
  const dx = pose.rodPivot.x - pose.armPivot.x, dy = pose.rodPivot.y - pose.armPivot.y;
  rodLayerEl.style.transform =
    `rotate(${arm}deg) translate(${dx}px,${dy}px) rotate(${wrist}deg) translate(${-dx}px,${-dy}px)`;
}

// Reduced motion runs no animation loop, so anything that changes the line's
// shape between fish movements (a tug, a tension change) has to ask for its
// own single redraw. The line still ends up in the right place; it just gets
// there in one step instead of over frames.
function lineChanged() { if (REDUCE_MOTION && lineMode !== "off") drawLine(); }

// One correct keystroke's worth of pull on the rod tip. A damped spring, not a
// tween: impulses from fast typing stack into an irregular judder, which is
// what a fish on the end of a line actually does to a rod.
function rodTug(impulse) {
  if (REDUCE_MOTION) { lineChanged(); return; }
  rodVel += impulse * (1 + (Math.random() * 2 - 1) * A.tug.jitter);
  startLineLoop();
}

function startLineLoop() {
  if (lineRAF || REDUCE_MOTION) return;
  lastFrame = performance.now();
  const step = (now) => {
    const dt = now - lastFrame; lastFrame = now;
    ({ angle: rodAngle, vel: rodVel } = logic.stepTug(rodAngle, rodVel, dt, A.tug));
    if (castPhase) stepCast(now);
    if (lineMode !== "off") drawLine();
    // keep going while anything is still moving: the line is out, the rod is
    // still settling, or a cast is mid-flight
    if (lineMode === "off" && !castPhase && Math.abs(rodAngle) < 0.05 && Math.abs(rodVel) < 0.05) {
      rodAngle = 0; rodVel = 0; drawLine(); lineRAF = null; return;
    }
    lineRAF = requestAnimationFrame(step);
  };
  lineRAF = requestAnimationFrame(step);
}

// The cast itself: anticipation (rod loads back), then a forward swing that
// releases the lure onto an arc, then the splash where it lands.
function stepCast(now) {
  const t = now - castT0;
  if (castPhase === "back") {
    castSwing = A.rod.backswingDeg * logic.easeIn(t / A.cast.backswingMs);
    lureAt = rodTip();
    lineEnd = lureAt;
    if (t >= A.cast.backswingMs) { castPhase = "flight"; castT0 = now; castFrom = rodTip(); }
    return;
  }
  // flight: the rod snaps forward and eases back to rest while the lure travels
  const k = Math.min(1, t / A.cast.flightMs);
  castSwing = t < A.cast.recoverMs
    ? A.rod.backswingDeg + (A.rod.forwardDeg - A.rod.backswingDeg)
        * logic.easeOut(t / 90) * (1 - logic.easeIn(t / A.cast.recoverMs))
    : 0;
  lureAt = logic.castArcPoint(castFrom, A.cast.landing, A.cast.apexPx, logic.easeOut(k));
  lineEnd = lureAt;
  el.lure.style.left = (lureAt.x - 3.5) + "px";
  el.lure.style.top = (lureAt.y - 3.5) + "px";
  if (k >= 1) { castSwing = 0; castPhase = null; castLanded?.(); castLanded = null; }
}

// Throw the line out. `then` fires when the lure hits the water, so the splash,
// the bobber and the wait for a bite all hang off the landing rather than off
// the moment the kid finished typing the cast word.
function castLine(then) {
  lineMode = "cast";
  castLanded = () => {
    lineMode = "wait";
    el.lure.classList.remove("on");
    lineEnd = { ...A.cast.landing };
    drawLine();
    then();
  };
  if (REDUCE_MOTION) { castPhase = null; castSwing = 0; castLanded(); return; }
  el.lure.classList.add("on");
  castPhase = "back"; castT0 = performance.now();
  startLineLoop();
}

function lineOff() {
  lineMode = "off"; castPhase = null; castLanded = null; castSwing = 0;
  el.lure.classList.remove("on");
  drawLine();
}

// ---- R6: the fish is a rig too, when it has the art for it ----
// CONFIG.fish.species is the registry and the only switch: a species listed
// there renders as cut layers inside #fish, a species absent from it renders
// the tier placeholder. That is what makes a half-finished roster playable
// rather than broken, and it is the same arrangement CONFIG.rig.poses uses for
// the angler.
const fishArt = (f) => (f ? CONFIG.fish.species[f.id] : null) ?? null;
// Where the mouth and the middle are. The placeholder's numbers are the ones
// drawFish() and pullFishOneWord() used to hardcode, so a species without art
// behaves exactly as it did. Every species in fish.json now has art, so the
// fallback serves nothing today: it stays because it is what keeps a species
// added ahead of its painting playable rather than invisible.
const fishBox = () => fishArt(fish) ?? CONFIG.fish.placeholder;

function renderFish(f) {
  const art = fishArt(f);
  el.fish.querySelectorAll(".fish-layer").forEach(n => n.remove());
  el.fish.classList.toggle("rigged", !!art);
  if (!art) {
    // let the stylesheet own the box again: a legendary's box is wider than
    // the placeholder's, and an inline width would quietly shrink it
    el.fish.style.removeProperty("width");
    el.fish.style.removeProperty("height");
    return;
  }
  el.fish.style.width = art.w + "px";
  el.fish.style.height = art.h + "px";
  for (const L of art.layers) {
    const d = document.createElement("div");
    d.className = "fish-layer";
    d.dataset.id = L.id;
    d.style.backgroundImage = `url("assets/${L.file}.png")`;
    if (L.id === "tail") {
      // the pivot is the peduncle the cut was made at, so the tail swings from
      // where it actually joins the body rather than from the box's corner
      d.style.transformOrigin = `${art.tail.x}px ${art.tail.y}px`;
      d.style.setProperty("--tail-deg", CONFIG.fish.swim.tailDeg + "deg");
      // `alternate` runs there-and-back, so one leg is half a cycle
      d.style.setProperty("--tail-ms", CONFIG.fish.swim.tailPeriodMs / 2 + "ms");
    }
    el.fish.appendChild(d);
  }
}

// How far the species has resolved out of the murk, written onto #fish as
// --reveal for the stylesheet's submerged filters to interpolate. Read from the
// fish's own x rather than from wordsLeft, so it clears with the swim instead
// of stepping once per word.
function setReveal(x) {
  const rv = CONFIG.fish.reveal;
  const r = logic.revealAt(logic.reelProgressAtX(CONFIG.fish.path, x), rv.startAt, rv.fullAt);
  el.fish.style.setProperty("--reveal", r.toFixed(3));
}

// the fish's mouth (left edge; the art faces left) is where the line attaches
function drawFish(x, y) {
  el.fish.style.left = x + "px";
  el.fish.style.top = y + "px";
  setReveal(x);
  const m = fishBox().mouth;
  lineEnd = { x: x + m.x, y: y + m.y };
  if (REDUCE_MOTION) drawLine();
}

function startSwim() {
  startLineLoop();                     // R1: the line follows the fish and the rod
  if (REDUCE_MOTION) { fishX = fishTX; fishY = fishTY; drawFish(fishTX, fishTY); return; }
  swimStart = performance.now();
  const W = CONFIG.fish.wobble;
  const step = (now) => {
    if (phase !== "reel") return;
    // a real tween on a clock, not a per-frame chase: same speed on any
    // monitor, and it leaves and arrives at rest so a pull reads as a pull
    const k = logic.easeInOut((now - pullT0) / pullMs);
    fishX = pullFrom.x + (fishTX - pullFrom.x) * k;
    fishY = pullFrom.y + (fishTY - pullFrom.y) * k;
    const t = (now - swimStart) / 1000;
    const wobX = Math.sin(t * W.xHz) * W.xPx;
    const wobY = Math.sin(t * W.yHz) * W.yPx + Math.sin(t * W.y2Hz) * W.y2Px;
    drawFish(fishX + wobX, fishY + wobY);
    swimRAF = requestAnimationFrame(step);
  };
  swimRAF = requestAnimationFrame(step);
}
function stopSwim() {
  if (swimRAF) cancelAnimationFrame(swimRAF);
  swimRAF = null;
}

// The one that got away, darting off into deep water. land() has already
// stopped the swim RAF by the time this runs, so the move is handed to a CSS
// transition (the same way the approach drifts in) rather than being set
// straight onto `left`, which is what used to make an escape a disappearance.
function fleeOffscreen() {
  const esc = CONFIG.fish.escape;
  el.fish.style.setProperty("--flee", esc.ms + "ms");
  el.fish.classList.add("fleeing");
  void el.fish.offsetWidth;             // commit the current position to transition FROM
  el.fish.style.left = esc.toX + "px";
  el.fish.style.setProperty("--reveal", "0");   // …and back to a shape as it goes
}

// ---- Phases ----
function startCast() {
  phase = "cast"; inputLocked = false;
  target = pick(WORDS).w; typed = 0; lastKeyTime = 0;
  castIntervals = []; castLastKeyMs = 0;   // A4: fresh fly-cast rhythm window
  tension = 0; renderTension();
  el.dist.textContent = "–";
  lineOff();                         // line's in; the next cast throws it back out
  bobberOut(false);
  el.fish.style.opacity = 0;
  el.fish.className = "";
  el.fish.style.transform = "";
  el.fish.style.removeProperty("--fish-color");
  el.fish.style.removeProperty("background-image");   // clear a junk sprite swap
  renderFish(null);                                   // R6: and any species layers with it
  el.fish.style.removeProperty("--drift");
  el.fish.style.removeProperty("--reveal");           // …and the next catch is a shape again
  el.fish.style.removeProperty("--flee");
  fish = junk = null;                                 // the next approach rolls its own
  setStatus(punFor("cast"));
  renderWord();
}

function startWait() {
  phase = "wait"; inputLocked = true;
  el.word.textContent = "";
  updateGuide(null);
  // A4: on graduated (fly-fishing) waters, an even casting cadence earns a cozy
  // line, never a penalty, and the Pond casts exactly as before.
  const flyWater = save.location !== CONFIG.tiers[0].location;
  const niceCast = flyWater && logic.isEvenCadence(castIntervals, CONFIG.flyCast.minKeys, CONFIG.flyCast.maxCadenceCv);
  setPun(niceCast ? punFor("niceCast") : punFor("wait"));
  // R1: the rod loads, swings, and the lure flies, the splash, the bobber and
  // the wait for a bite all now hang off where and when the lure actually lands.
  castLine(() => {
    burst(A.cast.landing.x + 6, A.cast.landing.y - 1, A.cast.splashParticles);
    ripple(A.cast.landing.x, A.cast.landing.y);
    sfxSplash();
    bobberIn();
    // F4: some casts land the bait on an uninterested pond. Rolled here rather
    // than at the cast, so it is the water that is quiet and not the throw.
    if (Math.random() < CONFIG.wiggle.chance) startWiggle();
    else armBite(CONFIG.bite.delayMsRange);
  });
}

// R6: the fish shows itself before it bites. A fast bait shortens the tease
// rather than losing it: the approach never starts before the cast lands.
// F4 pulled this out of startWait because the end of a wiggle arms a bite the
// same way, just from a much shorter range.
function armBite(range) {
  const wait = rand(...range) * equippedBait().biteSpeedMult;
  later(approach, Math.max(0, wait - CONFIG.fish.approach.leadMs));
  later(bite, wait);
}

// ---- F4: the wiggle ----
// The wait used to be locked input and nothing to do. On a wiggle cast the kid
// types a couple of short words to twitch the bait, and the fish comes when
// they finish, no wiggle, no bite (Matt's call; the reasoning and why it does
// not break the cozy guardrail are on CONFIG.wiggle).
//
// It is deliberately the plainest possible use of the machinery already here:
// a phase, a target word, and the same keydown handler. Nothing about tension,
// timing or scoring is touched, so a wiggle cannot cost a kid anything.
let wigglesLeft = 0;

function startWiggle() {
  phase = "wiggle"; inputLocked = false;
  const [lo, hi] = CONFIG.wiggle.wordsRange;
  wigglesLeft = lo + Math.floor(Math.random() * (hi - lo + 1));   // inclusive both ends
  // F4: the wiggle prompt is an INSTRUCTION, so like the cast prompt it keeps
  // the literal thing to do in it and is setStatus rather than setPun: a kid
  // who has never seen a wiggle cast has to read one line and know what to
  // press, jokes on or off.
  setStatus(punFor("wiggle"));
  nextWiggleWord();
}

// Short words only: a twitch, not a cast. Falls back to the whole unlocked
// pool if a stage somehow has none: stage 1 is 37 home-row words and a filter
// that comes back empty must never be able to strand the cast.
function nextWiggleWord() {
  const short = WORDS.filter(e => e.w.length <= CONFIG.wiggle.maxWordLen);
  target = pick(short.length ? short : WORDS).w;
  typed = 0; lastKeyTime = 0;
  renderWord();
}

function wiggleComplete() {
  twitchBait();
  if (--wigglesLeft > 0) { nextWiggleWord(); return; }
  phase = "wait"; inputLocked = true;
  el.word.textContent = "";
  updateGuide(null);
  setPun(punFor("wiggleDone"));
  armBite(CONFIG.wiggle.biteDelayMsRange);
}

// One word's worth of twitch. The whole mechanic rests on a kid being able to
// SEE their typing move something in the water, so every word moves the bobber,
// rings the surface and pulls the rod: the same three things a reeled word
// already does, aimed at the bait instead of at a fish.
function twitchBait() {
  el.bobber.classList.remove("twitch"); void el.bobber.offsetWidth;
  el.bobber.classList.add("twitch");
  ripple(A.cast.landing.x, A.cast.landing.y);
  rodTug(A.tug.wordImpulse);
  sfxWordTick();
}

// What is on its way up. Rolled at the START of the approach rather than at the
// bite, so the silhouette a kid sees is the fish that actually takes the hook,
// the odds are untouched, only the moment they are asked.
function chooseCatch() {
  junk = Math.random() < CONFIG.junk.chance ? pick(CONFIG.junk.items) : null;
  const rolled = junk ? "common" : pickTier();        // junk reels like an easy common
  // Fish come from the current spot (A3). If this spot has no fish of the rolled
  // tier (e.g. the Stream has no legendary yet), degrade to the nearest tier it
  // does have. An unpopulated spot (a future location before its fish exist)
  // falls back to the home water so a bite never picks from an empty pool.
  const localFish = FISH.filter(f => f.location === save.location);
  const pool = localFish.length ? localFish : FISH.filter(f => f.location === CONFIG.tiers[0].location);
  hookedTier = junk ? "common" : logic.tierWithFallback(new Set(pool.map(f => f.tier)), rolled, TIER_ORDER);
  fish = junk ? null : pick(pool.filter(f => f.tier === hookedTier));
}

// R6: the fish rises out of the depths as a silhouette before it bites, behind
// #surface, which is the front plane V1 was built for and has never had
// anything to put behind it. It drifts to exactly where the hooked fish starts,
// so the tease and the hook are one fish rather than two that line up.
//
// Deliberately NO tier class here: the glow and the placeholder's per-tier
// sprite both belong to a fish you have hooked, and a legendary announcing
// itself through the water in gold would give the whole moment away. The
// silhouette says "something big is coming", not what.
function approach() {
  if (phase !== "wait") return;
  chooseCatch();
  const ap = CONFIG.fish.approach;
  setFishTarget(0);                         // where the reel will start it, and so where the rise ends
  const to = { x: fishTX + ap.spawn.dx, y: fishTY + ap.spawn.dy };
  // F1: the class assignment goes FIRST and renderFish second, because
  // renderFish sets `.rigged` and this line would wipe it. It did, for as long
  // as the approach has existed: `#fish:not(.rigged)` paints the old shared
  // fish-common.png placeholder, so the tease was that generic body showing
  // through behind the two real species layers, and the bite, which calls
  // renderFish again, after its own class work: was where the real fish
  // finally appeared. One shape rises, the same shape takes the hook.
  el.fish.className = "silhouette";
  renderFish(fish);
  el.fish.style.left = to.x + ap.rise.dx + "px";
  el.fish.style.top = to.y + ap.rise.dy + "px";
  void el.fish.offsetWidth;                 // paint it down there first, or there is nothing to drift from
  el.fish.classList.add("approaching");
  el.fish.style.setProperty("--drift", ap.leadMs + "ms");
  el.fish.style.opacity = 1;
  el.fish.style.left = to.x + "px";
  el.fish.style.top = to.y + "px";
}

function bite() {
  phase = "reel"; inputLocked = false;
  bobberOut(true);
  if (!fish && !junk) chooseCatch();   // a bite too quick for the approach to have run
  const tier = hookedTier;
  el.fish.classList.remove("silhouette", "approaching");
  el.fish.style.removeProperty("--drift");

  // Content unit for this catch (AD2): reel a phrase when typeable phrase content
  // is tagged for this spot (the Stream, A1); otherwise word-at-a-time: the Pond,
  // and junk everywhere (a boot doesn't earn a phrase). Empty phrase pool falls
  // back to words, so a missing/short data set never blocks a catch.
  const phrasePool = junk ? [] : buildPhrasePool(fish.difficulty);
  reelMode = phrasePool.length ? "phrase" : "words";
  reelChars = 0; reelActiveMs = 0; reelLastKeyMs = 0;   // A4: fresh WPM window per catch
  if (reelMode === "phrase") {
    // A7: at a fight location a bigger fish takes more segments, one sentence
    // each, so a marlin is a fight and a sardine is a snack. Everywhere else
    // this is 1, leaving the Stream's single-phrase catch exactly as it was.
    const segs = logic.segmentsForTier(CONFIG.fight, save.location, tier);
    reelSegments = logic.pickDistinct(phrasePool, segs);
    segIndex = 0;
    target = reelSegments[0].text; typed = 0; lastKeyTime = 0;
    // the whole fight's worth of words, so the reel meter tracks the full landing
    wordsToLand = reelSegments.reduce((n, s) => n + logic.wordCount(s.text), 0);
  } else {
    reelPool = buildReelPool(junk ? 1 : fish.difficulty);
    wordsToLand = CONFIG.reel.wordsToLandByTier[tier];
  }
  wordsLeft = wordsToLand;
  el.fish.classList.add("hooked");
  renderFish(fish);                    // R6: species art if it has landed, the placeholder if not
  if (junk) {
    el.fish.style.backgroundImage = `url("assets/${junk.file}.png")`;
  } else {
    el.fish.classList.add("tier-" + tier);
    el.fish.style.setProperty("--fish-color", fish.color);
  }
  el.fish.style.opacity = 1;
  el.fish.classList.add("submerged");   // V1: seen through the water until it's landed
  lineMode = "reel";                    // R1: the curve now answers to tension
  setFishTarget();
  // emerge deep and right of the finger panel, then rise up-and-in, and this is
  // the point the silhouette has just drifted to, from the same config
  fishX = fishTX + CONFIG.fish.approach.spawn.dx;
  fishY = fishTY + CONFIG.fish.approach.spawn.dy;
  startPull(CONFIG.fish.pull.biteMs);
  // the murk the silhouette rose in carries straight through the hook, so the
  // bite doesn't hand the species over the moment the fish is caught
  setReveal(fishX);
  el.dist.textContent = wordsLeft + " words";
  shakeScene();
  burst(A.cast.landing.x + 16, A.cast.landing.y + 4, CONFIG.fish.approach.biteParticles);
  sfxBite();
  setPun(punFor("bite"));
  startSwim();
  setTimeout(() => el.fish.classList.remove("hooked"), 350);
  if (reelMode === "phrase") renderWord(); else nextReelWord();
}

function nextReelWord() { target = pick(reelPool).w; typed = 0; lastKeyTime = 0; renderWord(); }

// One word reeled in: pull the fish a notch toward the boat, with the tick/pop
// feedback. Shared by word-mode (wordComplete) and phrase-mode (space/land).
function pullFishOneWord() {
  wordsLeft--;
  el.dist.textContent = wordsLeft > 0 ? wordsLeft + " words" : "landing…";
  setFishTarget();
  startPull(CONFIG.fish.pull.wordMs);  // …and it swims there rather than arriving there
  rodTug(A.tug.wordImpulse);           // R1: the rod bends to the pull
  if (REDUCE_MOTION) { fishX = fishTX; fishY = fishTY; drawFish(fishTX, fishTY); }
  // F1: the wake this throws is skipped on the word that LANDS the fish.
  // surfaceBreak() splashes at the waterline for the same fish in the same
  // instant, and the two rings stacked vertically read as one bug: a ring in
  // open water with a second directly above it at the surface.
  if (wordsLeft > 0) {
    const w = CONFIG.fish.wake;
    const mid = parseInt(el.fish.style.left) + fishBox().w / 2;   // R6: a species' box is its own
    burst(mid, w.y, w.particles);
    ripple(mid, w.y + w.rippleDy);
  }
  sfxWordTick();
  el.word.classList.remove("pop"); void el.word.offsetWidth; el.word.classList.add("pop");
}

function wordComplete() {
  pullFishOneWord();
  if (wordsLeft <= 0) return land(true);
  inputLocked = true;
  el.word.innerHTML = `<span class="done">${target}</span>`;
  updateGuide(null);
  later(() => { inputLocked = false; nextReelWord(); }, CONFIG.reel.wordPauseMs);
}

// The reel content's last unit was just typed: land it. Word mode defers to
// wordComplete's 450ms beat; a phrase pulls its final word straight to the boat
// (its beats already happened at each typed space).
function reelComplete() {
  if (reelMode !== "phrase") return wordComplete();
  pullFishOneWord();
  // A7: a fight runs across several sentences, land only once the last one is
  // in. (wordsToLand spans every segment, so these two agree; the || keeps a
  // short-count from ever hanging the catch mid-fight.)
  if (wordsLeft <= 0 || segIndex + 1 >= reelSegments.length) return land(true);
  segIndex++;
  fishRun(CONFIG.fight.segmentRunMs, () => {
    target = reelSegments[segIndex].text; typed = 0; lastKeyTime = 0;
  });
}

// A7: the fish makes a run. Pure theatre, it darts back on screen and the reel
// beats for a moment, but `wordsLeft` is untouched, so **no progress is lost**
// and tension never moves. The swim RAF already tweens fishX toward fishTX, so
// nudging the target outward and restoring it afterwards is the whole animation.
function fishRun(ms, then) {
  inputLocked = true;
  updateGuide(null);                      // hands rest through the beat, like the word pause
  fishTX += CONFIG.fight.runSurgePx;      // dart away…
  startPull(CONFIG.fish.pull.runOutMs);   // …faster than it is reeled back in
  if (REDUCE_MOTION) { fishX = fishTX; fishY = fishTY; drawFish(fishTX, fishTY); }
  shakeScene();
  sfxBite();
  setPun(punFor("fishRun"));
  later(() => {
    setFishTarget();                      // …and back to where the kid actually reeled it to
    startPull(CONFIG.fish.pull.wordMs);
    if (REDUCE_MOTION) { fishX = fishTX; fishY = fishTY; drawFish(fishTX, fishTY); }
    then?.();
    inputLocked = false;
    renderWord();                         // repaints the word and restores the finger guide
  }, ms);
}

// Forgiving spacebar (A1): it only ever advances between the words of a phrase,
// and it never touches tension: a mistimed or missing space can't cost the
// catch, so "slow + careful always lands" still holds. Anything else is a no-op.
function handleSpace() {
  if (phase === "reel" && reelMode === "phrase" && target[typed] === " ") {
    typed++;                     // the word before the space is done
    save.stats.wordsTyped++;
    tickReelWpm();               // A4: the space is a typed character too
    pullFishOneWord();           // a space always leaves ≥1 word, so this never lands
    renderWord();
  }
}

// Forgiving punctuation (A5): same spirit as the spacebar, a real key the
// kid must press (it's genuinely part of the sentence), but a wrong key while
// a mark is due is a silent no-op, and a correct mark never touches tension.
// Unlike a space, a mark can be the very last character of a sentence, so it
// has to be able to finish the catch too.
function handlePunct(key) {
  if (phase === "reel" && reelMode === "phrase" && target[typed] === key) {
    typed++;
    tickReelWpm();                // a mark is a typed character too (WPM)
    renderWord();
    // the sentence's last character lands (or advances) the catch; a
    // mid-sentence mark is a clause break, and at a fight water the fish
    // uses it to make a run (A7)
    if (typed === target.length) finishReelUnit();
    else if (fightWater()) fishRun(CONFIG.fight.clauseRunMs);
  }
}
// A7: fight pacing is a property of the water, not the fish, the Stream's
// phrases carry no punctuation anyway, so it never sees a clause run.
function fightWater() { return CONFIG.fight.fromLocations.includes(save.location); }

// Shared tail of "the current reel content is fully typed": reached either
// by a letter (the common case) or by a sentence-final punctuation mark (A5).
function finishReelUnit() {
  save.stats.wordsTyped++;
  if (phase === "cast") startWait();
  else if (phase === "wiggle") wiggleComplete();
  else if (phase === "reel") reelComplete();
}

function land(success) {
  phase = "done"; inputLocked = true;
  stopSwim();
  lineOff();                      // reel the line all the way in
  el.word.textContent = "";
  updateGuide(null);
  if (success && junk) {
    // comedy catch: no coins, no collection, just a groan
    el.fish.classList.remove("submerged");   // breaks the surface, snaps into focus
    el.fish.classList.add("landing");
    surfaceBreak();
    save.jokesEndured = (save.jokesEndured ?? 0) + 1;
    // T3: which junk, not just how much of it. Same shape as save.collection so
    // the sync story is the one FIRESTORE.md already describes: an increment
    // on one key, folded into the write this catch was making anyway.
    save.junk ??= {};
    save.junk[junk.id] = (save.junk[junk.id] ?? 0) + 1;
    const freshJunkBadges = evaluateBadges();
    persistSave();
    sfxEscape();
    const junkPun = punFor("junk").replace("{it}", junk.name);
    setStatus("");                      // the card carries it now, and announces it
    showCatchCard({ kind: "junk", files: [junk.file], box: CONFIG.card.junkBox,
                    name: junk.name, sub: "not a fish", pun: junkPun });
    freshJunkBadges.forEach((b, i) => later(() => showBadgeToast(b), 300 + i * 1800));
    later(startCast, CONFIG.reel.recastDelayMs);
    return;
  }
  if (success) {
    el.fish.classList.remove("submerged");   // breaks the surface, snaps into focus
    el.fish.classList.add("landing");
    surfaceBreak();
    const stagesBefore = unlockedStageCount(totalCatches());
    const firstCatch = !save.collection[fish.id];
    // A8: asked *before* the collection is credited, since prestige is derived
    // from it: a second Muskie is a great day, not a second ceremony
    const prestigeNow = logic.earnsPrestige(CONFIG.prestige, fish.id, hasPrestige());
    const amount = logic.catchReward(fish.coins, firstCatch, CONFIG.economy.firstCatchBonus);
    save.coins += amount;
    save.collection[fish.id] = (save.collection[fish.id] ?? 0) + 1;
    // the collection just changed, so the derived rank may have too (A8),
    // refresh it now so persistSave below stores the Muskie rank, rather than
    // it only appearing after the next reload
    if (prestigeNow) recomputeLocations();
    // weight roll + personal-best tracking (flavor only, no coin/difficulty effect)
    save.records ??= {};                        // back-compat for pre-records saves
    const { weight, cls } = rollWeight(fish.tier);
    const rec = save.records[fish.id];          // { weight, wpm } | undefined
    const newBest = logic.isPersonalBest(rec?.weight, weight);
    // A4: per-species WPM, tracked & shown on Stream+ (phrase) catches only. A
    // slower-than-best run is never a fail: it just isn't flagged as a best.
    const wpm = reelMode === "phrase" ? logic.computeWpm(reelChars, reelActiveMs) : 0;
    const newWpmBest = reelMode === "phrase" && logic.isPersonalBestWpm(rec?.wpm, wpm);
    save.records[fish.id] = {
      weight: newBest ? weight : (rec?.weight ?? weight),
      wpm: newWpmBest ? wpm : (rec?.wpm ?? null),
    };
    const freshBadges = evaluateBadges();       // marks earned; persistSave below flushes them
    persistSave();                              // the one write per catch
    el.coins.textContent = save.coins;
    el.caught.textContent = totalCatches();
    freshBadges.forEach((b, i) => later(() => showBadgeToast(b), 1400 + i * 1800));
    maybeShowRodNudge();
    coinFloat(140, 200, amount);
    const isRare = fish.tier === "rare" || fish.tier === "legendary";
    (isRare ? sfxRareCatch : sfxCatch)();
    const pun = isRare ? punFor("catchRare") : punFor("catchCommon");
    // F3: the same three facts the old corner message carried, on a card big
    // enough to read. A first catch is trivially a personal best, so it flies
    // the one flag that is actually news: exactly as the old string did.
    const flags = [];
    if (firstCatch) flags.push("NEW SPECIES");
    else if (newBest) flags.push("NEW RECORD");
    if (newWpmBest) flags.push("FASTEST YET");
    const art = CONFIG.fish.species[fish.id];
    setStatus("");                      // the card carries it now, and announces it
    const showCard = () => showCatchCard({
      kind: "catch",
      files: art ? art.layers.map(L => L.file) : [],
      box: art ?? CONFIG.fish.placeholder,
      name: fish.name,
      sub: logic.catchSubtitle(weight, cls, reelMode === "phrase" ? wpm : 0),
      pun, coins: amount, flags,
    });
    if (collectionOpen) renderCollection();
    const stagesAfter = unlockedStageCount(totalCatches());
    let delay = CONFIG.reel.recastDelayMs;
    let celebrating = false;
    if (stagesAfter > stagesBefore) {
      const fresh = CONFIG.unlock.stages.slice(stagesBefore, stagesAfter).flatMap(s => [...s.letters]);
      recomputeUnlocks();
      showUnlock(fresh);
      delay = CONFIG.unlock.celebrateMs;
      celebrating = true;
    }
    // A8: the capstone queues *after* any letter banner, so the two celebrations
    // never land on top of each other, and the recast waits for both
    if (prestigeNow) {
      later(showPrestige, delay);
      delay += CONFIG.prestige.celebrateMs;
      celebrating = true;
    }
    // F3: the card is the LAST thing to arrive when a banner is due. The banner
    // and the card are both full-width panels in the same band and they do not
    // both fit: measured, not guessed: the band is 364px tall on a 720 screen
    // and they need 410 between them. So the celebration plays first and the
    // card is what is left on screen when it clears, which is also the right
    // order to read them in. With no banner due there is nothing to wait for.
    if (celebrating) { const g = ++cardGen; later(() => g === cardGen && showCard(), delay); }
    else showCard();
    later(startCast, delay);
    return;
  } else {
    save.stats.escapes = (save.stats.escapes ?? 0) + 1;
    persistSave();                              // flush accumulated stats on escape
    el.escaped.textContent = save.stats.escapes;
    fleeOffscreen();
    sfxEscape();
    const escPun = punFor("escape");
    setStatus("");                      // the card carries it now, and announces it
    // No species on this one, deliberately: the reveal never tells you what a
    // fish was until it is close, and an escape is the fish you never found out
    // about. The card shows the same shape that rose out of the depths.
    showCatchCard({ kind: "escape", box: CONFIG.fish.placeholder,
                    name: "the one that got away", sub: "it'll be back", pun: escPun });
  }
  later(startCast, CONFIG.reel.recastDelayMs);
}

// ---- F3: the catch card ----
// The payoff. This used to be one setStatus line in the top-left corner at
// 12px, held for reel.recastDelayMs (1500ms) and then overwritten by the cast
// prompt: by which point the fish had already arced off the screen, so there
// was nothing to look at and no time to read what you had caught.
//
// ONE surface with three dresses (Matt's call): a plain card for a junk pull or
// an escape, the ordinary catch card, and the same card raised to a plaque when
// a species is new or a record falls. One surface means one dismissal and
// nothing to sequence against anything else.
//
// It has no timer. It is dismissed by the kid starting the next word, and that
// keystroke still counts: see the keydown handler.
let cardUp = false;
// Bumped by anything that invalidates a card, including one still WAITING on a
// celebration banner: a kid can reach the location buttons during those 2.6s,
// and the Ocean should not then be handed the Pond's trophy.
let cardGen = 0;

// `files` is the paint order, same as CONFIG.fish.species[].layers: the fish's
// own cut layers for a catch, one sprite for junk, none for an escape. CSS
// paints the FIRST background-image on top, so the list is reversed here: the
// same trick the journal grid uses, and the reason a card fish has its tail.
function showCatchCard({ kind, files = [], box, name, sub, pun, coins = 0, flags = [] }) {
  const card = $("catch-card");
  card.className = kind + (flags.length ? " plaque" : "");
  card.style.setProperty("--card-in", CONFIG.card.inMs + "ms");
  card.style.setProperty("--card-out", CONFIG.card.yankMs + "ms");
  const shape = card.querySelector(".card-fish");
  shape.style.backgroundImage = files.length
    ? files.map(f => `url("assets/${f}.png")`).reverse().join(", ")
    : "";
  // Drawn from the species' own box so every fish arrives at the same LENGTH
  // and keeps its own proportions: the card is where a kid finally sees the
  // thing at a size worth painting, and 33 species at 33 scales would undo R6.
  const px = kind === "junk" ? CONFIG.card.junkPx : CONFIG.card.fishPx;
  const scale = box ? px / box.w : 1;
  shape.style.width = (box ? box.w * scale : px) + "px";
  shape.style.height = (box ? box.h * scale : px * 0.55) + "px";
  card.querySelector(".card-ribbon").textContent = flags.join("  ·  ");
  card.querySelector(".card-name").textContent = name;
  card.querySelector(".card-sub").textContent = sub ?? "";
  card.querySelector(".card-pun").textContent = pun ?? "";
  card.querySelector(".card-coins").textContent = coins ? `+${coins} coins` : "";
  $("card-slot").hidden = false;
  el.pun.classList.add("behind-card");  // the card does the talking while it is up
  void card.offsetWidth;               // commit the resting state to animate FROM
  card.classList.add("in");
  cardUp = true;
}

function hideCatchCard() {
  cardGen++;                           // …and cancel any card still waiting on a banner
  el.pun.classList.remove("behind-card");
  if (!cardUp) return;
  if (el.status.textContent) popPun();  // the cast prompt pops back in as the card is yanked
  cardUp = false;
  const card = $("catch-card");
  card.classList.remove("in");
  card.classList.add("out");           // yanked off the top, not faded away
  setTimeout(() => {
    if (cardUp) return;                // a new catch beat us to it
    $("card-slot").hidden = true;
    card.classList.remove("out");
  }, CONFIG.card.yankMs);
}

// shared celebration banner over the pond (letter unlocks + A0 rank-ups)
function showBanner(title, big, ms = CONFIG.unlock.celebrateMs) {
  const banner = $("unlock-banner");
  banner.querySelector(".banner-title").textContent = title;
  banner.querySelector(".letters").textContent = big;
  banner.classList.add("show");
  burst(360, 150, 16);
  sfxUnlock();
  setTimeout(() => banner.classList.remove("show"), ms);
  return banner;
}

// A8: the Muskie capstone, the biggest moment in the game. Same banner as a
// rank-up, but held longer, gold-trimmed, and with confetti that keeps coming.
// Fires once, on the first Muskie Quixote ever landed.
function showPrestige() {
  const p = CONFIG.prestige;
  const banner = showBanner("MASTER ANGLER!", `${p.badge} ${p.rank.toUpperCase()}`, p.celebrateMs);
  banner.classList.add("prestige");
  setTimeout(() => banner.classList.remove("prestige"), p.celebrateMs);
  sfxRareCatch();
  // rolling confetti across the scene, rather than the single burst a rank-up gets
  for (let i = 0; i < 6; i++) later(() => burst(140 + i * 90, 110 + (i % 3) * 55, 14), i * 280);
  later(() => showBadgeToast({ name: `${p.label}, you landed Muskie Quixote` }), p.celebrateMs - 1100);
}

// the "new letter!" moment: banner over the pond, fresh keys pulse on the guide
function showUnlock(letters) {
  showBanner("NEW LETTERS UNLOCKED!", letters.join(" ").toUpperCase());
  letters.forEach(l => {
    const k = guide.querySelector(`.key[data-ch="${l}"]`);
    if (k) k.classList.add("fresh");
  });
  setTimeout(() => guide.querySelectorAll(".key.fresh").forEach(k => k.classList.remove("fresh")),
             CONFIG.unlock.celebrateMs);
}

// A0 rank-up: reuses the unlock banner for the new spot + the badge toast for
// the earned rank. `save.location` follows the kid to the new water automatically.
function showRankUp(tier) {
  save.location = tier.location;
  applyScene();
  showBanner("NEW SPOT UNLOCKED!", (tier.badge + " " + tier.locationName).toUpperCase());
  later(() => showBadgeToast({ name: `${tier.label}, now fishing ${tier.locationName}` }),
        CONFIG.unlock.celebrateMs);
  persistSave();
}

// record a processed keystroke for the silent adaptive-meter stats
function recordKey(expected, correct) {
  const s = statLetter(expected.toLowerCase());   // capitals share their base-letter bucket (A2)
  if (correct) {
    s.n++;
    const now = Date.now();
    if (logic.countsTowardTiming(lastKeyTime, now, MAX_LATENCY_MS)) s.msTotal += now - lastKeyTime;
  } else {
    s.errors++;
  }
  lastKeyTime = Date.now();
}

// ---- Input ----
document.addEventListener("keydown", (e) => {
  if (!save || pickerOpen || collectionOpen || shopOpen || nudgeOpen || progressOpen || journalOpen || speedOpen || inputLocked) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length !== 1) return;
  // F3: starting the next word yanks the catch card off. It happens here, above
  // the hit/miss logic, so the keystroke that dismisses it is not swallowed,
  // and so a wrong first letter dismisses it too, because the kid has still
  // started typing. inputLocked above means keys during the recast pause do
  // nothing at all, card included.
  if (cardUp) hideCatchCard();
  if (e.key === " ") { e.preventDefault(); handleSpace(); return; }   // forgiving spacebar (A1)
  // forgiving punctuation (A5). preventDefault like the spacebar: "?" is
  // Firefox's quick-find-links shortcut, and these are game keys here.
  if (CONFIG.punctuation.chars.includes(e.key)) { e.preventDefault(); handlePunct(e.key); return; }
  if (!/[a-z]/i.test(e.key)) return;                                  // a single letter, either case

  const expected = target[typed];
  // a letter pressed while a space/punctuation mark is due → forgiving no-op
  // (mirrors handleSpace/handlePunct's own no-op when the wrong key shows up)
  if (!/[a-z]/i.test(expected ?? "")) return;
  // Case matters only for a capital target (A2): a capital must be typed with
  // Shift (exact match). A lowercase target accepts either case, so the Pond,
  // lowercase-only forever: behaves exactly as before (a stray Shift is harmless).
  const hit = expected === expected.toLowerCase()
    ? e.key.toLowerCase() === expected
    : e.key === expected;
  if (hit) {
    recordKey(expected, true);
    tickReelWpm(); tickCastRhythm();   // A4: self-paced timing (each guards its own phase)
    typed++;
    if (phase === "reel") {
      ({ tension } = logic.applyTension(tension, true, CONFIG.reel)); renderTension();
      rodTug(A.tug.keyImpulse);   // R1: every correct letter tugs the rod tip
    }
    renderWord();
    if (typed === target.length) finishReelUnit();
  } else {
    recordKey(expected, false);
    sfxWrong();
    el.word.classList.remove("shakeword"); void el.word.offsetWidth; el.word.classList.add("shakeword");
    if (phase === "reel") {
      const t = logic.applyTension(tension, false, CONFIG.reel);
      tension = t.tension;
      renderTension();
      lineChanged();          // R1: more tension, tighter line
      if (t.escaped) land(false);
    }
  }
});

// ---- Finger guide (ghost hands over a mini keyboard) ----
const GUIDE_SCALE = 1.3;   // one knob: grows the whole keyboard/guide uniformly
const S  = (n) => Math.round(n * GUIDE_SCALE);
const KEY_SZ   = S(38);    // key box (matches the old .key size, now scaled)
const FINGER_W = S(18);
// A5-guide: the bottom row carries the real `,` `.` `/` keys so the Ocean's
// punctuation has somewhere to light up. They're rendered as quiet ghost keys
// (like the ";" anchor) since they're outside the letter curriculum.
const KB = { pitch: S(42), rows: [
  { keys: "qwertyuiop", off: S(0)  },
  { keys: "asdfghjkl;", off: S(12) },
  { keys: "zxcvbnm,./", off: S(34) },
]};
const GHOST_KEYS = new Set([";", ",", ".", "/"]);   // rendered, but not letters to learn
// Standard touch-typing zones. lp = left pinky ... rp = right pinky.
const FINGER_HOMES = { lp:"a", lr:"s", lm:"d", li:"f", ri:"j", rm:"k", rr:"l", rp:";" };
const FINGER_LEN   = { lp:50, lr:68, lm:78, li:70, ri:70, rm:78, rr:68, rp:50 };
const LETTER_FINGER = {};
[["lp","qaz"],["lr","wsx"],["lm","edc"],["li","rfvtgb"],
 ["ri","yhnujm"],["rm","ik,"],["rr","ol."],["rp","p;/"]]
  .forEach(([f, ls]) => [...ls].forEach(l => LETTER_FINGER[l] = f));
// Punctuation typed as Shift + another key → the key actually pressed (A5).
// "!" is Shift+1 on the number row, which the guide deliberately doesn't
// render (10 keys a beginner never uses); it resolves to a key with no finger
// mapping, so updateGuide falls through and simply shows no reach for it.
const SHIFTED_PUNCT = { "?": "/", "!": "1" };

const guide = $("guide");
const keyPos = {}, fingerEls = {};
let guideOn = true;

KB.rows.forEach((row, r) => {
  [...row.keys].forEach((ch, i) => {
    const x = row.off + i * KB.pitch, y = r * KB.pitch;
    keyPos[ch] = { x: x + KEY_SZ / 2, y: y + KEY_SZ / 2 };
    const k = document.createElement("div");
    k.className = "key" + (GHOST_KEYS.has(ch) ? " ghost-key" : "");
    k.textContent = ch;
    k.style.left = x + "px"; k.style.top = y + "px";
    k.style.width = k.style.height = KEY_SZ + "px";
    k.style.fontSize = S(14) + "px";
    k.dataset.ch = ch;
    guide.appendChild(k);
  });
});

// A2: two Shift keys flanking the bottom row. Capitals are typed with the
// OPPOSITE hand's pinky on Shift, so the guide can animate that reach.
const SHIFT_KEYS = [
  { id: "lshift", x: 0, w: KB.rows[2].off },
  // sits just past the end of the bottom row: derived, not a hardcoded key
  // count, so adding `,./` (A5-guide) moved it automatically
  { id: "rshift", x: KB.rows[2].off + KB.rows[2].keys.length * KB.pitch, w: S(64) },
];
SHIFT_KEYS.forEach(({ id, x, w }) => {
  const y = 2 * KB.pitch;
  keyPos[id] = { x: x + w / 2, y: y + KEY_SZ / 2 };
  const k = document.createElement("div");
  k.className = "key shift-key";
  k.textContent = "⇧";
  k.style.left = x + "px"; k.style.top = y + "px";
  k.style.width = w + "px"; k.style.height = KEY_SZ + "px";
  k.style.fontSize = S(14) + "px";
  k.dataset.ch = id;
  guide.appendChild(k);
});

// fingers: capsules with tips resting on their home keys
Object.entries(FINGER_HOMES).forEach(([f, home]) => {
  const fin = document.createElement("div");
  fin.className = "finger";
  fin.style.width = FINGER_W + "px";
  fin.style.borderRadius = FINGER_W / 2 + "px";
  fin.style.height = S(FINGER_LEN[f]) + "px";
  fin.style.left = (keyPos[home].x - FINGER_W / 2) + "px";
  fin.style.top = (keyPos[home].y - S(12)) + "px";
  guide.appendChild(fin);
  fingerEls[f] = { el: fin, home };
});

// Size the guide from what actually got laid out, rather than the constants it
// used to carry. #guide-panel is overflow:hidden, so a row that outgrows a
// hardcoded width silently loses its rightmost keys, which is exactly what
// adding `,./` + the shifted right Shift would have done (A5-guide).
{
  const keys = [...guide.querySelectorAll(".key")];
  const right  = Math.max(...keys.map(k => parseFloat(k.style.left) + parseFloat(k.style.width)));
  const bottom = Math.max(...keys.map(k => parseFloat(k.style.top)  + KEY_SZ));
  guide.style.width  = right + "px";
  // fingers hang below their key (top = key centre − S(12), then FINGER_LEN),
  // so the panel has to clear the longest one, not just the last key row
  const fingerDrop = Math.max(...Object.entries(FINGER_HOMES)
    .map(([f, home]) => keyPos[home].y - S(12) + S(FINGER_LEN[f])));
  guide.style.height = Math.max(bottom, fingerDrop) + "px";
  guide.style.transformOrigin = "top left";
}

// Shrink the guide to fit a narrow window instead of letting the panel crop it.
// The panel is overflow:hidden, so without this the rightmost key: the right
// Shift, the very key a capital tells you to press: just disappears below
// ~700px. Mirrors fitScene above. The panel is sized explicitly because a CSS
// transform doesn't change layout size, so it would otherwise still reserve
// (and crop at) the guide's natural width.
const guidePanel = $("guide-panel");
const PANEL_MARGIN = 20;   // matches #guide-panel's max-width: calc(100vw - 20px)
function fitGuide() {
  // padding + border come from the stylesheet, not a constant here: the panel
  // is border-box, so forgetting its 1px border silently crops a key
  const cs = getComputedStyle(guidePanel);
  const px = (...v) => v.reduce((a, p) => a + parseFloat(cs[p]), 0);
  const chromeX = px("paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth");
  const chromeY = px("paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth");
  const natW = parseFloat(guide.style.width), natH = parseFloat(guide.style.height);
  const scale = Math.min(1, (window.innerWidth - PANEL_MARGIN - chromeX) / natW);
  guide.style.transform = scale < 1 ? `scale(${scale})` : "";
  guidePanel.style.width  = natW * scale + chromeX + "px";
  guidePanel.style.height = natH * scale + chromeY + "px";
}
window.addEventListener("resize", fitGuide);
fitGuide();

// dim keys the player hasn't unlocked yet. The ghost keys (";" anchor, `,` `.`
// `/`) and the Shift keys aren't letters in the unlock ladder, so they're never
// "locked": they just sit quiet until something calls for them.
function renderKeyLocks() {
  guide.querySelectorAll(".key").forEach(k => {
    const ch = k.dataset.ch;
    if (!/^[a-z]$/.test(ch)) return;
    k.classList.toggle("locked", !unlockedLetters.has(ch));
  });
}

// light a key and slide its finger there from its home rest position
function reachFinger(finger, posId) {
  const keyEl = guide.querySelector(`.key[data-ch="${posId}"]`);
  if (keyEl) keyEl.classList.add("target");
  const { el: fin, home } = fingerEls[finger];
  fin.style.transform =
    `translate(${keyPos[posId].x - keyPos[home].x}px, ${keyPos[posId].y - keyPos[home].y}px)`;
  fin.classList.add("active");
}

// Which physical key a target character is typed on, and whether it needs
// Shift. Three cases share one path: a plain letter or `,` `.` (press the key),
// a capital (Shift + the lowercase key, A2), and shifted punctuation like `?`
// (Shift + `/`, A5). Anything with no key on the rendered board: `!`, which
// lives on the number row: comes back unmapped and simply isn't guided.
function keyForTarget(ch) {
  if (SHIFTED_PUNCT[ch]) return { key: SHIFTED_PUNCT[ch], shift: true };
  const lower = ch.toLowerCase();
  return { key: lower, shift: lower !== ch };
}

function updateGuide(letter) {
  guide.querySelectorAll(".key.target").forEach(k => k.classList.remove("target"));
  Object.values(fingerEls).forEach(({ el }) => { el.style.transform = ""; el.classList.remove("active"); });
  if (!guideOn || !letter) return;
  const { key, shift } = keyForTarget(letter);
  const finger = LETTER_FINGER[key];
  if (!finger) return;                        // not on the rendered board (e.g. "!")
  reachFinger(finger, key);
  // A2: a shifted character also needs Shift, the OPPOSITE hand's pinky reaches
  // for it, so the same hand isn't asked to do two things at once
  if (shift) {
    const leftHand = finger[0] === "l";
    reachFinger(leftHand ? "rp" : "lp", leftHand ? "rshift" : "lshift");
  }
}

const guideBtn = $("guide-toggle");
guideBtn.addEventListener("click", () => {
  guideOn = !guideOn;
  guideBtn.textContent = guideOn ? "ON" : "OFF";
  guideBtn.classList.toggle("active", guideOn);
  guide.style.display = guideOn ? "block" : "none";
  updateGuide(guideOn && !inputLocked ? target[typed] : null);
});

// the jokes: a tackle-box toggle, and the "x" on the bubble itself, which is
// the same switch reached from where the annoyance actually is
const punBtn = $("pun-toggle");
function setPunsOn(on) {
  punsOn = on;
  localStorage.setItem("tf:punsOn", on ? "on" : "off");
  punBtn.textContent = on ? "ON" : "OFF";
  punBtn.classList.toggle("active", on);
}
setPunsOn(punsOn);
punBtn.addEventListener("click", () => setPunsOn(!punsOn));
el.punDismiss.addEventListener("click", (e) => {
  setPunsOn(false);
  setStatus("");            // and the line they just dismissed goes now, not next cast
  e.currentTarget.blur();   // or the next space/enter would press it again
});

const soundBtn = $("sound-toggle");
soundBtn.textContent = soundOn ? "ON" : "OFF";
soundBtn.classList.toggle("active", soundOn);
soundBtn.addEventListener("click", () => {
  ensureAudio();
  setSoundOn(!soundOn);
  soundBtn.textContent = soundOn ? "ON" : "OFF";
  soundBtn.classList.toggle("active", soundOn);
});

// ---- Tackle box: one corner button toggles the #controls menu tray ----
const tackleBtn = $("tacklebox");
const controlsTray = $("controls");
function toggleControls(open) {
  const show = open ?? controlsTray.hidden;
  if (show) renderLocations();
  controlsTray.hidden = !show;
  tackleBtn.setAttribute("aria-expanded", String(show));
}

// ---- Dev/test shortcut (build + playtest phase only) ----------------------
// Gated by CONFIG.dev.testShortcuts. A clearly-labelled 🧪 tackle-box button
// that grants every rod (owning the location-unlocking ones opens their spots,
// AD4) and jumps to the furthest unlocked spot, so a playtest reaches the
// advanced tiers instantly instead of grinding there. Remove this block, or set
// CONFIG.dev.testShortcuts = false, before a real release.
function setupDevTools() {
  if (!CONFIG.dev?.testShortcuts) return;
  const btn = document.createElement("button");
  btn.className = "toggle-btn nav dev";
  btn.id = "dev-unlock-btn";
  btn.textContent = "🧪 Test: unlock all spots + keys";
  btn.addEventListener("click", () => { unlockAllSpotsForTest(); toggleControls(false); });
  controlsTray.appendChild(btn);
}
function unlockAllSpotsForTest() {
  if (!save) return;
  // every letter, so the Stream's phrases and the Ocean's sentences are
  // actually typeable: capitals and punctuation still ride on the content
  // tagging (CONFIG.capitals/punctuation.fromLocations), so the Stream stays
  // letters-and-spacebar and only the Ocean serves punctuation
  save.devAllKeys = true;
  recomputeUnlocks();
  for (const r of CONFIG.shop.rods)
    if (!save.upgrades.owned.rod.includes(r.id)) save.upgrades.owned.rod.push(r.id);
  save.upgrades.rod = CONFIG.shop.rods.reduce((a, b) => (b.rodLevel > a.rodLevel ? b : a)).id;  // best odds for testing
  save.coins += CONFIG.dev.testCoins ?? 0;
  recomputeLocations();
  // furthest by tier order (robust to rod ordering), not array position
  const furthest = [...CONFIG.tiers].reverse().find(t => save.unlockedLocations.includes(t.location));
  save.location = furthest ? furthest.location : save.location;
  persistSave();
  el.coins.textContent = save.coins;
  renderLocations();
  applyScene();
  if (shopOpen) renderShop();
  const here = CONFIG.tiers.find(t => t.location === save.location);
  setStatus(`🧪 Test: all spots + all letters unlocked, now fishing ${here.locationName}.`);
}
setupDevTools();

// A0 location switcher: one button per unlocked spot; hidden until the kid has
// graduated past the Pond (nothing to switch between with only one spot).
function renderLocations() {
  const box = $("locations");
  const locs = save.unlockedLocations ?? [CONFIG.tiers[0].location];
  box.hidden = locs.length < 2;
  box.innerHTML = "";
  for (const loc of locs) {
    const tier = CONFIG.tiers.find(t => t.location === loc);
    const btn = document.createElement("button");
    btn.className = "toggle-btn loc" + (save.location === loc ? " active" : "");
    btn.textContent = "📍 " + tier.locationName;
    btn.addEventListener("click", () => switchLocation(loc));
    box.appendChild(btn);
  }
}
function switchLocation(loc) {
  save.location = loc;
  hideCatchCard();          // F3: the last spot's catch doesn't follow you here
  // …and neither does the cast. This used to change the scene and the rig and
  // leave the cast itself running, so the Pond's cork float stayed on screen at
  // the Ocean (which T2 says floats nothing), the line was still drawn out to
  // it, and a bite armed at the Pond landed HERE: a 17-word Ocean sentence off
  // a cast the kid never made there.
  //
  // Two things end it, and both are needed. gameGen stales the pending
  // approach/bite the way activating a profile already does, because later()
  // is the only thing holding them and it checks nothing else. startCast()
  // does the rest: the phase, the line, the tackle, the fish and a fresh word.
  // It also speaks the new spot's own cast prompt, which is why the old
  // "Now fishing the Ocean." line is gone rather than moved: there is one
  // status line, and an instruction the game promises always shows outranks a
  // confirmation of something the whole repainted scene has already said.
  gameGen++;
  persistSave();
  renderLocations();
  applyScene();
  startCast();
}

// R7: which shop list each `gear` slot draws from. The layer says "hat", the
// shop stores hats under `hats`, and the save equips one at `upgrades.hat`: a
// data test holds all three to each other, because a typo in any of them is a
// slot that silently never resolves.
const GEAR_LISTS = { rod: "rods", hat: "hats" };
// thin wrapper over logic.gearFile: supplies the live CONFIG and save
function layerFile(L, poseName) {
  return logic.gearFile(L, poseName, save?.upgrades?.[L.gear],
                        CONFIG.shop[GEAR_LISTS[L.gear]], CONFIG.rig.gearArt);
}

// G1: draw the angler as layers from the active pose's stack. Called at boot,
// again from applyScene() whenever the kid changes water (R4: the costume
// belongs to the location), and by the hat/rod shop (R7) on equip, which is the
// whole point of the split. R1: the line is no longer a child of #rig, it's an
// SVG in scene space, and the rod layer gets the pivot it rotates about, so
// the cast and the tug swing the rod rather than the whole angler.
function renderRig(loc) {
  const poseName = poseNameFor(loc);
  pose = CONFIG.rig.poses[poseName];
  const rig = $("rig");
  rig.querySelectorAll(".rig-layer, .vessel").forEach(n => n.remove());
  rodLayerEl = armLayerEl = null;

  // R5: the pose places the whole rig and decides whether it rocks. The bob is a
  // class rather than an inline style so prefers-reduced-motion still wins.
  rig.style.left = pose.anchor.x + "px";
  rig.style.top = pose.anchor.y + "px";
  rig.style.transformOrigin = `${pose.anchor.pivot.x}px ${pose.anchor.pivot.y}px`;
  rig.classList.toggle("bobs", !!pose.bob);
  // the hull's shadow travels with the hull: it is a box on the vessel, not a
  // rectangle in style.css, because a Whaler and a rowboat do not darken the
  // same patch of water. CSS still owns its gradient, height and wake.
  const sh = pose.vessel?.shadow, shEl = $("hull-shadow");
  shEl.hidden = !sh;
  if (sh) {
    shEl.style.left = sh.x + "px"; shEl.style.top = sh.y + "px";
    shEl.style.width = sh.w + "px";
  }

  // The hull behind the angler; its near side goes on after the layers, so the
  // kid sits down IN it rather than on it.
  //
  // A shop hull is a TINT of this pose's own painting, not a painting of its
  // own, so both halves always draw the pose's files and the skin only adds a
  // filter. That fixes three things the swapped-file version got wrong, none of
  // which could show while every vessel was skinnable:false: it skinned the
  // `far` half only, leaving a brown near gunwale in front of a red kid; it
  // pointed the free `classic` at the pixel-era boat.png, so equipping the
  // default would have painted the OLD boat over the painted one; and a skin
  // with no far/near split had no way to fill the near half at all.
  const vessel = (which) => {
    const v = pose.vessel;
    if (!v || !v[which]) return;
    const d = document.createElement("div");
    d.className = "vessel vessel-" + which;
    d.style.left = v.x + "px"; d.style.top = v.y + "px";
    d.style.width = v.w + "px"; d.style.height = v.h + "px";
    d.style.backgroundImage = `url("assets/${v[which]}.png")`;
    const skin = v.skinnable
      ? CONFIG.shop.boats.find(b => b.id === save?.upgrades?.boat) : null;
    if (skin?.tint) d.style.filter = skin.tint;
    rig.appendChild(d);
  };
  vessel("far");

  for (const L of pose.layers) {
    const file = layerFile(L, poseName);
    if (!file) continue;                   // a gear slot with nothing to draw
    const d = document.createElement("div");
    d.className = "rig-layer";
    d.dataset.id = L.id;
    d.style.left = L.x + "px"; d.style.top = L.y + "px";
    d.style.width = L.w + "px"; d.style.height = L.h + "px";
    d.style.backgroundImage = `url("assets/${file}.png")`;
    // Both swinging layers rotate about the arm's pivot when there is one, so
    // the rod's wrist turn can nest inside the arm's: see applySwing().
    if (L.id === "rod" || L.id === "arm") {
      const o = pose.armPivot ?? pose.rodPivot;
      d.style.transformOrigin = `${o.x - L.x}px ${o.y - L.y}px`;
      if (L.id === "rod") rodLayerEl = d; else armLayerEl = d;
    }
    rig.appendChild(d);
  }
  vessel("near");
  // the rig may have been rebuilt mid-swing (a location switch during a cast),
  // so put the angles back rather than letting them snap to zero for a frame
  applySwing();
}
renderRig();

// A3: swap the biome scene by location. Sets a loc-<location> class on #scene;
// CSS layers the stream background over the pond one, so this stays visually
// safe until assets/background-stream.png exists, then the stream scene appears.
function applyScene() {
  const loc = save?.location ?? CONFIG.tiers[0].location;
  el.scene.classList.remove(...CONFIG.tiers.map(t => "loc-" + t.location));
  el.scene.classList.add("loc-" + loc);
  renderRig(loc);   // R4: the costume and the pose belong to the water, not to the boot
  refreshAmbient(); // S1: and so does what it sounds like
}
tackleBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleControls(); });
// picking a nav item (collection/shop/…) closes the tray; the ON/OFF toggles leave it open
controlsTray.addEventListener("click", (e) => { if (e.target.closest(".nav")) toggleControls(false); });
// a click anywhere outside the tray closes it
document.addEventListener("click", (e) => {
  if (!controlsTray.hidden && !controlsTray.contains(e.target) && e.target !== tackleBtn) toggleControls(false);
});

// ---- Tabs inside an overlay ----
// One tab bar per browsable panel. The tabs and panes are paired by
// `data-tab`, which is the whole mechanism: a pane with no tab never shows and
// a tab with no pane shows nothing, and both are visible in the markup rather
// than assembled here. Returns the show function so opening a panel can put it
// back on its first tab, which is what a kid expects from a thing they closed.
function initTabs(root) {
  const tabs = [...root.querySelectorAll(".tab")];
  const panes = [...root.querySelectorAll(".tabpane")];
  const body = root.querySelector(".overlay-body");
  const show = (name) => {
    for (const t of tabs) {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    }
    for (const p of panes) p.hidden = p.dataset.tab !== name;
    if (body) body.scrollTop = 0;   // a new tab starts at its own top, not the last one's
  };
  for (const t of tabs) t.addEventListener("click", () => show(t.dataset.tab));
  if (tabs.length) show(tabs[0].dataset.tab);
  return show;
}

// ---- Collection screen (per-profile once M4 lands; one shared save for now) ----
let collectionOpen = false;
const collectionRoot = $("collection");
const collectionGrid = $("collection-grid");
const collectionTabs = $("collection-tabs");

function renderCollection() {
  collectionGrid.innerHTML = "";
  collectionTabs.innerHTML = "";
  // A3: group silhouettes by location (Pond, then Stream, then Ocean), showing
  // only spots that actually have fish. Fish with an unknown/missing location
  // fall under the home water so nothing is ever dropped from the journal.
  // The grouping is a tab per spot now rather than a heading inside one long
  // grid: 33 species in one column is a scroll, and three tabs is a glance.
  // The tabs are built here rather than sitting in index.html because which
  // spots have fish is a question only the data can answer.
  const homeLoc = CONFIG.tiers[0].location;
  const known = new Set(CONFIG.tiers.map(t => t.location));
  const locOf = f => (known.has(f.location) ? f.location : homeLoc);
  const locs = CONFIG.tiers.map(t => t.location).filter(loc => FISH.some(f => locOf(f) === loc));
  for (const loc of locs) {
    const tier = CONFIG.tiers.find(t => t.location === loc);
    const tab = document.createElement("button");
    tab.className = "tab"; tab.dataset.tab = loc; tab.setAttribute("role", "tab");
    // how many of this spot's species are in the book: the one number a kid
    // wants off a collection screen, and it was nowhere on the old one
    const here = FISH.filter(f => locOf(f) === loc);
    const got = here.filter(f => (save.collection[f.id] ?? 0) > 0).length;
    // "the Pond" is how the game says it in a sentence; a tab is a label, and
    // three of them plus their counts have to fit across a phone
    tab.textContent = `${tier.badge} ${tier.locationName.replace(/^the /, "")} ${got}/${here.length}`;
    collectionTabs.appendChild(tab);
    const pane = document.createElement("div");
    pane.className = "tabpane"; pane.dataset.tab = loc;
    const grid = document.createElement("div");
    grid.className = "cgrid";
    pane.appendChild(grid);
    collectionGrid.appendChild(pane);
    for (const f of here) {
      const count = save.collection[f.id] ?? 0;
      const cell = document.createElement("div");
      // R2: the tier rides on the cell so a caught rare/legendary glows here the
      // way it does in the scene. It mattered more once the palette was muted,
      // the loudest fish used to be legendary by sheer colour, and now nothing is
      // loud, so rarity needs to be said rather than implied.
      cell.className = "cell" + (count ? " tier-" + f.tier : " unknown");
      const shape = document.createElement("div");
      shape.className = "cfish";
      if (count) shape.style.setProperty("--fish-color", f.color);
      // R6: a caught species with its own art shows the real body sprite here,
      // this is the half of "reads as 33 different fish" that isn't the scene.
      // An uncaught one keeps the tinted blob however much art exists: the
      // silhouette is the tease, and the grid would spoil every fish otherwise.
      // ALL of its layers, not just the body: the tail is a separate cut and a
      // fish without one is a fish with its tail chopped off. CSS paints the
      // first background-image in the list on top, so the pose's paint order
      // (tail first, body over it) is the list reversed. Both cuts share one
      // crop, so `contain` registers them exactly the way the scene does.
      const art = count ? CONFIG.fish.species[f.id] : null;
      if (art) {
        shape.classList.add("art");
        shape.style.backgroundImage = art.layers
          .map(L => `url("assets/${L.file}.png")`).reverse().join(", ");
      }
      const name = document.createElement("div");
      name.className = "cname";
      name.textContent = count ? f.name : "???";
      const best = (save.records ?? {})[f.id];   // { weight, wpm } (A4)
      const sub = document.createElement("div");
      sub.className = "csub";
      sub.textContent = count
        ? `${f.species} × ${count}` + (best?.weight ? ` · best ${best.weight} lb` : "")
        : f.tier;
      if (count) cell.title = f.blurb;
      cell.append(shape, name, sub);
      grid.appendChild(cell);
    }
  }
  initTabs(collectionRoot);
}

function toggleCollection(open) {
  collectionOpen = open ?? !collectionOpen;
  if (collectionOpen) renderCollection();
  collectionRoot.hidden = !collectionOpen;
}
$("collection-btn").addEventListener("click", () => toggleCollection(true));
$("collection-close").addEventListener("click", () => toggleCollection(false));

// ---- Shop: buy once, equip freely; effects apply on the next cast ----
let shopOpen = false;
const shopRoot = $("shop");

// kid-readable effect blurbs derived from the config numbers
function rodHint(rod)   { return "luck " + "★".repeat(rod.rodLevel); }
function baitHint(bait) {
  const pct = Math.round((1 - bait.biteSpeedMult) * 100);
  return pct === 0 ? "a patient wiggle" : pct + "% faster bites";
}
function boatHint()     { return "a fresh coat of paint"; }
function hatHint(hat)   { return hat.file ? "just for the look of it" : "no hat at all"; }

// Show whatever is equipped, on the angler (also called on load).
// R5: the vessel is a rig layer now, not a standalone #boat, so equipping a
// skin rebuilds the rig. Poses whose vessel isn't `skinnable` ignore it: a
// rowboat skin has no business on a Boston Whaler, and the Stream has no
// vessel at all. R7 puts rods and hats through the same door, which is why this
// is no longer applyBoatSkin(): one rebuild reads every equipped slot at once.
function applyGear() { renderRig(); }

function renderShop() {
  $("shop-coin-count").textContent = save.coins;
  renderShopList(CONFIG.shop.rods,  $("shop-rods"),  "rod",  rodHint);
  renderShopList(CONFIG.shop.baits, $("shop-baits"), "bait", baitHint);
  renderShopList(CONFIG.shop.boats, $("shop-boats"), "boat", boatHint);
  renderShopList(CONFIG.shop.hats,  $("shop-hats"),  "hat",  hatHint);
  applyGear();       // reflect an equip made from this shop pass
}

function renderShopList(items, container, kind, hint) {
  container.innerHTML = "";
  for (const item of items) {
    const owned = save.upgrades.owned[kind].includes(item.id);
    const equipped = save.upgrades[kind] === item.id;
    const row = document.createElement("div");
    row.className = "shop-row";
    const name = document.createElement("span");
    name.className = "shop-name";
    name.textContent = item.name;
    const hintEl = document.createElement("span");
    hintEl.className = "shop-hint";
    hintEl.textContent = hint(item);
    const btn = document.createElement("button");
    btn.className = "toggle-btn shop-btn" + (equipped ? " equipped" : "");
    if (equipped) {
      btn.textContent = "EQUIPPED";
      btn.disabled = true;
    } else if (owned) {
      btn.textContent = "EQUIP";
      btn.addEventListener("click", () => {
        save.upgrades[kind] = item.id;
        persistSave();
        renderShop();
      });
    } else {
      btn.textContent = "BUY " + item.cost;
      btn.disabled = save.coins < item.cost;
      btn.addEventListener("click", () => {
        if (save.coins < item.cost) return;
        save.coins -= item.cost;
        save.upgrades.owned[kind].push(item.id);
        save.upgrades[kind] = item.id;
        // A0: a rod may unlock a new fishing spot, graduate + celebrate
        const freshTiers = kind === "rod" ? graduateLocations() : [];
        const freshBadges = evaluateBadges();   // e.g. "Tackle Box Tycoon" on the last rod
        persistSave();
        el.coins.textContent = save.coins;
        renderShop();
        if (freshTiers.length) { toggleShop(false); freshTiers.forEach(t => showRankUp(t)); }
        freshBadges.forEach((b, i) => later(() => showBadgeToast(b), 300 + i * 1800));
      });
    }
    row.append(name, hintEl, btn);
    container.appendChild(row);
  }
}

// the tabs are wired once; opening the shop puts it back on RODS rather than
// wherever the last visit left it
const showShopTab = initTabs(shopRoot);
function toggleShop(open) {
  shopOpen = open ?? !shopOpen;
  if (shopOpen) { renderShop(); showShopTab("rods"); }
  shopRoot.hidden = !shopOpen;
}
$("shop-btn").addEventListener("click", () => toggleShop(true));
$("shop-close").addEventListener("click", () => toggleShop(false));

// ---- One-time nudge: after ~25 catches, point players at a better rod ----
let nudgeOpen = false;
const nudgeRoot = $("rod-nudge");
function toggleNudge(open) {
  nudgeOpen = open ?? !nudgeOpen;
  nudgeRoot.hidden = !nudgeOpen;
}
function maybeShowRodNudge() {
  if (save.stats.rodNudgeShown || totalCatches() < CONFIG.economy.rodNudgeAt) return;
  save.stats.rodNudgeShown = true;
  persistSave();
  if (save.upgrades.rod !== "stick") return;   // already upgraded, no need to nag
  toggleNudge(true);
}
$("nudge-shop").addEventListener("click", () => { toggleNudge(false); toggleShop(true); });
$("nudge-close").addEventListener("click", () => toggleNudge(false));

// ---- Parent progress view: per-key accuracy heatmap from stats.letters ----
let progressOpen = false;
const progressRoot = $("progress");
// R2: same red→green meaning, muted into the warm palette (ART_DIRECTION.md,
// nothing in the game is saturated any more, the heatmap included). Saturation
// and lightness ease across the ramp so the middle doesn't go acid yellow.
const accColor = acc => {
  const h = Math.round(6 + acc * 106);                    // 6° red → 112° green
  const s = Math.round(42 + Math.sin(acc * Math.PI) * 6); // gentle bulge mid-ramp
  return `hsl(${h}, ${s}%, ${Math.round(48 - acc * 4)}%)`;
};

function renderProgress() {
  const L = save.stats.letters || {};
  const { pct, keys: attempts } = overallAccuracy();   // the same sum, already in logic.js
  const overall = Math.round(pct * 100);
  // trouble keys = lowest accuracy among letters with enough samples to matter
  const trouble = Object.entries(L)
    .filter(([k, s]) => /[a-z]/.test(k) && s.n + s.errors >= 3)
    .map(([k, s]) => ({ k, acc: s.n / (s.n + s.errors) }))
    .sort((a, b) => a.acc - b.acc).slice(0, 3)
    .map(t => `${t.k.toUpperCase()} ${Math.round(t.acc * 100)}%`);
  $("progress-summary").innerHTML =
    `<b>${attempts}</b> keys typed · <b>${overall}%</b> accurate`
    + (trouble.length ? `<br>keys to practice: ${trouble.join(" · ")}` : "");

  const kb = $("progress-kb"); kb.innerHTML = "";
  KB.rows.forEach(row => {
    const r = document.createElement("div"); r.className = "prow";
    [...row.keys].forEach(ch => {
      if (!/[a-z]/.test(ch)) return;               // skip the ";" anchor
      const s = L[ch]; const tries = s ? s.n + s.errors : 0;
      const key = document.createElement("div"); key.className = "pkey";
      key.textContent = ch;
      if (tries) {
        const acc = s.n / tries;
        key.style.background = accColor(acc);
        key.title = `${ch.toUpperCase()}: ${Math.round(acc * 100)}% over ${tries}`
          + (s.n ? ` · ~${Math.round(s.msTotal / s.n)}ms/key` : "");
      } else {
        key.classList.add("nodata");
        key.title = `${ch.toUpperCase()}: not typed yet`;
      }
      r.appendChild(key);
    });
    kb.appendChild(r);
  });
}

function toggleProgress(open) {
  progressOpen = open ?? !progressOpen;
  if (progressOpen) renderProgress();
  progressRoot.hidden = !progressOpen;
}
$("progress-btn").addEventListener("click", () => toggleProgress(true));
$("progress-close").addEventListener("click", () => toggleProgress(false));

// ---- Fishing journal: punny milestone badges (collection/accuracy, never speed) ----
const fishTierOf = id => FISH.find(f => f.id === id)?.tier;
function hasLegendary() { return Object.keys(save.collection).some(id => fishTierOf(id) === "legendary"); }
// A8: the prestige rank is *held by having caught the fish*, not by a saved
// flag, so it can never drift from the collection, and a save that landed the
// legendary before A8 existed is credited the moment it loads.
function hasPrestige() { return (save?.collection?.[CONFIG.prestige.fishId] ?? 0) > 0; }
// the rank a kid wears, for display. Ranks were stored but never shown anywhere
// before A8; the journal surfaces this one for every tier, not just Muskie.
function rankLabel() {
  if (hasPrestige()) return `${CONFIG.prestige.badge} ${CONFIG.prestige.label}`;
  const t = CONFIG.tiers.find(t => t.rank === save.rank) ?? CONFIG.tiers[0];
  return `${t.badge} ${t.label}`;
}
function hasLunker() {
  return Object.entries(save.records || {}).some(([id, r]) => {
    const tier = fishTierOf(id); if (!tier) return false;
    return logic.weightClass(CONFIG.size, tier, r?.weight ?? 0) === "lunker";  // r is { weight, wpm } (A4)
  });
}
function ownsAllRods() { return CONFIG.shop.rods.every(r => save.upgrades.owned.rod.includes(r.id)); }
function overallAccuracy() { return logic.overallAccuracy(save.stats.letters || {}); }

const BADGES = [
  { id: "firstmate",   name: "First Mate",        desc: "Catch your very first fish.",
    check: () => totalCatches() >= 1 },
  { id: "homerow",     name: "Home Row Hero",     desc: "Clear the home row and unlock new letters.",
    check: () => unlockedStageCount(totalCatches()) >= 2 },
  { id: "hooked",      name: "Hooked on Typing",  desc: `Type ${CONFIG.badges.wordsTyped} words.`,
    check: () => (save.stats.wordsTyped || 0) >= CONFIG.badges.wordsTyped },
  { id: "regular",     name: "Reel Regular",      desc: `Catch ${CONFIG.badges.catches} fish.`,
    check: () => totalCatches() >= CONFIG.badges.catches },
  { id: "lunker",      name: "Landed a Lunker",   desc: "Reel in a lunker-sized catch.",
    check: () => hasLunker() },
  { id: "deepend",     name: "The Deep End",      desc: "Catch a legendary fish.",
    check: () => hasLegendary() },
  { id: "tacklebox",   name: "Tackle Box Tycoon", desc: "Own every rod in the shop.",
    check: () => ownsAllRods() },
  { id: "sharpshooter",name: "Sharp Shooter",     desc: `Hit ${CONFIG.badges.accuracyPct}% accuracy over ${CONFIG.badges.accuracyMinKeys}+ keys.`,
    check: () => { const a = overallAccuracy(); return a.keys >= CONFIG.badges.accuracyMinKeys && a.pct * 100 >= CONFIG.badges.accuracyPct; } },
  { id: "alphabet",    name: "Alphabet Angler",   desc: "Unlock every letter in the game.",
    check: () => unlockedStageCount(totalCatches()) >= CONFIG.unlock.stages.length },
  // A8: the capstone. "The Deep End" is any legendary; this one is *the* one.
  { id: "muskie",      name: "Muskie Master",     desc: "Land the legendary Muskie Quixote.",
    check: () => hasPrestige() },
  // T3: the only badges you earn by catching NOTHING. Junk rolls at
  // CONFIG.junk.chance and cannot be fished for on purpose, which is the joke.
  { id: "notafish",    name: "Not a Fish",        desc: "Reel in something that isn't a fish.",
    check: () => junkPulled() >= 1 },
  { id: "litterpicker",name: "Litter Picker",     desc: `Reel in ${CONFIG.badges.junkPulls} pieces of junk.`,
    check: () => junkPulled() >= CONFIG.badges.junkPulls },
  { id: "junkslam",    name: "Junk Collector",    desc: "Pull up all four kinds of junk.",
    check: () => CONFIG.junk.items.every(j => (save.junk?.[j.id] ?? 0) > 0) },
];

// Junk pulled since T3 started recording which kind. Deliberately NOT
// save.jokesEndured: that is the lifetime total and includes pulls from before
// there was a breakdown, so counting it here would award "Junk Collector"'s
// neighbours to a save that has never seen a boot.
function junkPulled() {
  return Object.values(save.junk ?? {}).reduce((n, c) => n + c, 0);
}

// mark any freshly-satisfied badges as earned; returns the newly-earned ones.
// Does NOT persist: the caller's persistSave() flushes them in its normal write.
function evaluateBadges() {
  save.badges ??= [];
  const newly = [];
  for (const b of BADGES) {
    if (save.badges.includes(b.id)) continue;
    if (b.check()) { save.badges.push(b.id); newly.push(b); }
  }
  return newly;
}

const badgeToast = $("badge-toast");
function showBadgeToast(b) {
  badgeToast.innerHTML = `<span class="badge-medal">🎖️</span> Badge earned: <b>${b.name}</b>`;
  badgeToast.classList.add("show");
  sfxUnlock();
  clearTimeout(badgeToast._timer);
  badgeToast._timer = setTimeout(() => badgeToast.classList.remove("show"), 2600);
}

let journalOpen = false;
const journalRoot = $("journal");
function renderJournal() {
  // Backfill badges earned retroactively (an old save, or progress from before
  // the journal existed). The write is guarded on there being one, because
  // opening a panel is not a game event: unconditionally, this was the only
  // call site in the game that spent a Firestore write on somebody looking at
  // a screen, against the one-write-per-catch budget `FIRESTORE.md` opens with.
  if (evaluateBadges().length) persistSave();
  const earned = BADGES.filter(b => save.badges.includes(b.id)).length;
  // A8 also surfaces the kid's rank here: it was stored from A0 onward but
  // never actually shown anywhere, which made "you made Marlin!" a one-off toast
  // with no lasting record. Now every rank has a home, Muskie included.
  $("journal-summary").innerHTML =
    `<b>${earned}</b> / ${BADGES.length} badges earned<div class="jrank">${rankLabel()}</div>`;
  const grid = $("journal-grid"); grid.innerHTML = "";
  for (const b of BADGES) {
    const got = save.badges.includes(b.id);
    const card = document.createElement("div");
    card.className = "badge-card" + (got ? " earned" : "");
    card.innerHTML = `<div class="badge-medal">${got ? "🎖️" : "🔒"}</div>`
      + `<div class="badge-name">${b.name}</div>`
      + `<div class="badge-desc">${b.desc}</div>`;
    grid.appendChild(card);
  }
  renderJunkShelf();
}

// T3: what you have dredged up. Junk is not a fish, so it has no place in the
// collection grid: it lives here, under the badges it earns. A piece you have
// never pulled stays locked rather than showing a dimmed sprite: the fish grid
// teases with a silhouette because the SHAPE is the reward, and a boot's shape
// is not. The gag is the surprise.
function renderJunkShelf() {
  const found = CONFIG.junk.items.filter(j => (save.junk?.[j.id] ?? 0) > 0).length;
  const total = CONFIG.junk.items.length;
  $("junk-summary").innerHTML =
    `<b>${found}</b> / ${total} junk found`
    + `<span class="jpulls">${junkPulled()} pulled in all</span>`;
  const shelf = $("junk-shelf"); shelf.innerHTML = "";
  for (const j of CONFIG.junk.items) {
    const n = save.junk?.[j.id] ?? 0;
    const cell = document.createElement("div");
    cell.className = "junk-cell" + (n ? " found" : "");
    const art = document.createElement("div");
    art.className = "junk-art";
    if (n) art.style.backgroundImage = `url("assets/${j.file}.png")`;
    else art.textContent = "🔒";
    const name = document.createElement("div");
    name.className = "junk-name";
    name.textContent = n ? j.name : "???";
    const sub = document.createElement("div");
    sub.className = "junk-sub";
    sub.textContent = n ? `× ${n}` : "not yet";
    cell.append(art, name, sub);
    shelf.appendChild(cell);
  }
}
const showJournalTab = initTabs(journalRoot);
function toggleJournal(open) {
  journalOpen = open ?? !journalOpen;
  if (journalOpen) { renderJournal(); showJournalTab("badges"); }
  journalRoot.hidden = !journalOpen;
}
$("journal-btn").addEventListener("click", () => toggleJournal(true));
$("journal-close").addEventListener("click", () => toggleJournal(false));

// ---- Quick Cast: a timed typing-speed test, deliberately outside the game ----
// The one mode that ignores progression entirely: it is always in the tackle
// box, and by default it draws from the whole word pool so a kid's scores stay
// comparable to each other as they unlock letters (CONFIG.speedTest).
//
// It is also deliberately SEALED OFF from the fishing save. It never touches
// save.stats, save.collection, coins or badges: "Hooked on Typing" counts
// words reeled from real fish, and a timed run must not farm it. Under a clock
// a kid mistypes more than they ever would while fishing, so folding those keys
// into the Grown-ups heatmap would misreport which keys they actually struggle
// with. Its only persisted state is save.speedBest.
const stCfg = () => CONFIG.speedTest;
let speedOpen = false;
let stPhase = "idle";            // idle | ready | running | done
let stQueue = [], stIndex = 0, stTyped = 0;
let stCorrect = 0, stWrong = 0;
let stEndsAt = 0, stTick = null;

const speedRoot = $("speedtest");
const stIntro = $("st-intro"), stRun = $("st-run"), stResult = $("st-result");

function stShow(which) {
  stIntro.hidden = which !== "intro";
  stRun.hidden   = which !== "run";
  stResult.hidden = which !== "result";
}

function stBestLine() {
  const b = save?.speedBest;
  $("st-best").textContent = b?.wpm
    ? `Your best so far: ${b.wpm} wpm · ${b.accuracy}% accurate`
    : "No score yet. Set one!";
}

// A long queue up front so the run never pauses to think, topped up as it drains.
// The top-up is not theoretical: a fast typist (or a test driver) really can
// outrun a fixed queue, and running dry leaves an empty word on screen with
// nothing to type and the clock still going.
const ST_BATCH = 120, ST_REFILL_AT = 20;
function stMoreWords(n) {
  const pool = logic.speedTestPool(FULL_POOL, unlockedLetters, stCfg().useUnlockedLettersOnly);
  const src = pool.length ? pool : FULL_POOL;      // gated to nothing → fall back, never strand the run
  for (let i = 0; i < n; i++) stQueue.push(pick(src).w);
}
function stFillQueue() {
  stQueue = []; stIndex = 0; stTyped = 0;
  stMoreWords(ST_BATCH);
}

function stRenderWord() {
  const w = stQueue[stIndex] ?? "";
  const word = $("st-word");
  word.innerHTML = "";
  [...w].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = i < stTyped ? "done" : (i === stTyped ? "cur" : "todo");
    span.textContent = ch;
    word.appendChild(span);
  });
  $("st-next").textContent = stQueue.slice(stIndex + 1, stIndex + 1 + stCfg().upcoming).join("  ");
  // Point the finger guide at THIS letter. Left alone it keeps pointing at the
  // fishing word behind the overlay, which is the wrong key and reads as a
  // broken hint; the guide is the game's main teaching aid, so a speed run
  // should get it too.
  updateGuide(stPhase === "running" ? (w[stTyped] ?? null) : null);
}

function stStop() {
  clearInterval(stTick); stTick = null;
}

function stBegin() {
  stFillQueue();
  stCorrect = 0; stWrong = 0;
  stPhase = "ready";
  stShow("run");
  stRenderWord();
  let count = stCfg().countdownSec;
  const clock = $("st-clock");
  clock.textContent = count;
  clock.classList.add("ready");
  stStop();
  stTick = setInterval(() => {
    count--;
    if (count > 0) { clock.textContent = count; return; }
    clock.classList.remove("ready");
    stStop();
    stPhase = "running";
    stEndsAt = Date.now() + stCfg().durationSec * 1000;
    clock.textContent = stCfg().durationSec;
    stRenderWord();   // the guide rests during the countdown; point it at the first letter now
    stTick = setInterval(() => {
      const left = Math.max(0, stEndsAt - Date.now());
      clock.textContent = Math.ceil(left / 1000);
      clock.classList.toggle("low", left <= 5000);
      if (left <= 0) stFinish();
    }, 100);
  }, 1000);
}

function stFinish() {
  stStop();
  stPhase = "done";
  $("st-clock").classList.remove("low");
  const wpm = logic.computeWpm(stCorrect, stCfg().durationSec * 1000);
  const acc = logic.typingAccuracy(stCorrect, stWrong);
  const best = logic.isPersonalBestWpm(save.speedBest?.wpm, wpm);
  if (best) {
    save.speedBest = { wpm, accuracy: acc, at: Date.now() };
    persistSave();
  }
  $("st-wpm").textContent = wpm;
  $("st-detail").textContent =
    `${stIndex} words · ${acc}% accurate · ${stCorrect + stWrong} keys`;
  $("st-pb").hidden = !best;
  stShow("result");
  updateGuide(null);
  (best ? sfxUnlock : sfxCatch)();
  stBestLine();
}

function toggleSpeed(open) {
  speedOpen = open ?? !speedOpen;
  if (speedOpen) { stPhase = "idle"; stBestLine(); stShow("intro"); updateGuide(null); }
  else { stStop(); stPhase = "idle"; renderWord(); }   // renderWord() hands the guide back to the game
  speedRoot.hidden = !speedOpen;
}

// Its own key handler: the main one bails while an overlay is open (speedOpen
// is in that guard), so nothing here can move the fishing game.
document.addEventListener("keydown", (e) => {
  if (!speedOpen || stPhase !== "running") return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
  e.preventDefault();
  const w = stQueue[stIndex] ?? "";
  const expected = w[stTyped];
  if (!expected) return;
  if (e.key.toLowerCase() === expected.toLowerCase()) {
    stCorrect++; stTyped++;
    if (stTyped === w.length) {                             // words advance themselves
      stIndex++; stTyped = 0;
      if (stQueue.length - stIndex < ST_REFILL_AT) stMoreWords(ST_BATCH);
    }
    stRenderWord();
  } else {
    stWrong++;
    sfxWrong();
    const word = $("st-word");
    word.classList.remove("shakeword"); void word.offsetWidth; word.classList.add("shakeword");
  }
});

$("speed-btn").addEventListener("click", () => { toggleControls(false); toggleSpeed(true); });
$("st-start").addEventListener("click", stBegin);
$("st-again").addEventListener("click", stBegin);
$("st-close").addEventListener("click", () => toggleSpeed(false));
$("st-done").addEventListener("click", () => toggleSpeed(false));

// Escape closes ONE thing: the topmost. It used to close all of them at once,
// so a panel opened from the tray took the tray with it and a kid backing out
// of the shop landed on the water instead of on the menu they came from. Every
// .overlay shares z-index 10, so "topmost" is DOM order in index.html, and this
// list is that order reversed, with the tray (which sits under all of them)
// last.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (nudgeOpen) return toggleNudge(false);
  if (speedOpen) return toggleSpeed(false);
  if (progressOpen) return toggleProgress(false);
  if (journalOpen) return toggleJournal(false);
  if (shopOpen) return toggleShop(false);
  if (collectionOpen) return toggleCollection(false);
  if (!controlsTray.hidden) return toggleControls(false);
});

// ---- Profile picker (shown on launch; gates the game until a kid is chosen) ----
const profilesRoot = $("profiles");
const profileGrid = $("profile-grid");
const profileNew = $("profile-new");
let chosenAvatar = AVATARS[0];

function showProfilePicker() {
  pickerOpen = true;
  profileNew.hidden = true;
  renderProfileGrid();
  profilesRoot.hidden = false;
}

function renderProfileGrid() {
  profileGrid.innerHTML = "";
  for (const row of readIndex()) {
    const doc = readProfile(row.id);
    const caught = doc ? Object.values(doc.collection).reduce((a, b) => a + b, 0) : 0;
    const cell = document.createElement("button");
    cell.className = "profile-cell";
    cell.innerHTML =
      `<span class="pavatar">${row.avatar}</span><span class="pname"></span><span class="pmeta">${caught} caught</span>`;
    cell.querySelector(".pname").textContent = row.name;
    cell.addEventListener("click", () => activateProfile(row.id));
    const del = document.createElement("span");
    del.className = "pdelete"; del.textContent = "✕"; del.title = "delete " + row.name;
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm(`Delete ${row.name}'s pond? This can't be undone.`)) { deleteProfile(row.id); renderProfileGrid(); }
    });
    cell.appendChild(del);
    profileGrid.appendChild(cell);
  }
  const add = document.createElement("button");
  add.className = "profile-cell add";
  add.innerHTML = `<span class="pavatar">＋</span><span class="pname">New angler</span>`;
  add.addEventListener("click", openNewProfile);
  profileGrid.appendChild(add);
}

function openNewProfile() {
  profileNew.hidden = false;
  $("profile-name").value = "";
  chosenAvatar = AVATARS[0];
  renderAvatarRow();
  $("profile-name").focus();
}
function renderAvatarRow() {
  const rowEl = $("avatar-row"); rowEl.innerHTML = "";
  for (const a of AVATARS) {
    const b = document.createElement("button");
    b.className = "avatar-opt" + (a === chosenAvatar ? " sel" : "");
    b.textContent = a;
    b.addEventListener("click", () => { chosenAvatar = a; renderAvatarRow(); });
    rowEl.appendChild(b);
  }
}
$("profile-create").addEventListener("click", () => {
  const name = $("profile-name").value.trim().slice(0, 12) || "Angler";
  activateProfile(createProfile(name, chosenAvatar).id);
});
$("profile-name").addEventListener("keydown", (e) => { if (e.key === "Enter") $("profile-create").click(); });
$("profile-cancel").addEventListener("click", () => { profileNew.hidden = true; });
$("switch-btn").addEventListener("click", () => { if (save) persistSave(); showProfilePicker(); });

// sync bar in the picker: reflects Firebase/sign-in state
const syncBtn = $("sync-btn");
const syncStatus = $("sync-status");
function setSyncStatus(state, detail) {
  // states: sync-off (unavailable) | sync-out (signed out) | sync-in (signed in)
  syncBtn.hidden = state === "sync-off";
  if (state === "sync-in") {
    syncStatus.textContent = "☁ synced" + (detail ? " · " + detail : "");
    syncBtn.textContent = "SIGN OUT";
  } else if (state === "sync-out") {
    syncStatus.textContent = detail || "play saves on this device";
    syncBtn.textContent = "SIGN IN TO SYNC";
  } else {
    syncStatus.textContent = "playing offline, saved on this device";
  }
}
syncBtn.addEventListener("click", () => { fb?.uid ? signOutSync() : signIn(); });

function activateProfile(id) {
  const doc = readProfile(id);
  if (!doc) return;
  ensureAudio();   // profile-pick click is the user gesture that unlocks audio
  save = doc;
  save.upgrades.boat ??= "classic";                  // back-compat: pre-boats saves
  save.upgrades.owned.boat ??= ["classic"];
  save.upgrades.hat ??= "none";                      // back-compat: pre-R7 saves
  save.upgrades.owned.hat ??= ["none"];
  save.junk ??= {};                                  // back-compat: pre-T3 saves
  recomputeLocations();                              // A0: derive rank/locations, migrates pre-A0 saves
  migrateRecords();                                  // A4: records number → { weight, wpm }
  localStorage.setItem(ACTIVE_KEY, id);
  save.stats.sessionCount = (save.stats.sessionCount ?? 0) + 1;
  gameGen++;
  pickerOpen = false;
  profilesRoot.hidden = true;
  recomputeUnlocks();
  el.coins.textContent = save.coins;
  el.caught.textContent = totalCatches();
  el.escaped.textContent = save.stats.escapes ?? 0;
  $("who").textContent = save.avatar + " " + save.name;
  applyGear();
  applyScene();                      // A3: show the biome for wherever this kid last fished
  persistSave();                     // records the new session (sessionCount/lastPlayed)
  startCast();
}

try {
  // NB: PHRASE_POOL/SENTENCE_POOL were declared back in A1 but never actually
  // fetched here: the Stream silently never reeled phrases (or capitals, or
  // WPM) at runtime despite A1-A4 shipping. Fixed alongside A5's sentences.
  [FULL_POOL, FISH, PHRASE_POOL, SENTENCE_POOL, PUN_POOLS] = await Promise.all([
    loadJson("data/words.json"), loadJson("data/fish.json"),
    loadJson("data/phrases.json"), loadJson("data/sentences.json"),
    loadJson("data/puns.json"),
  ]);
  migrateLegacySave();
  showProfilePicker();
  syncInit();                        // fire-and-forget: wires sign-in + pulls when ready,
                                     // never blocks play if the network is slow or down

} catch (err) {
  setStatus("The word pool got away… reload to try again");
  console.error(err);
}
