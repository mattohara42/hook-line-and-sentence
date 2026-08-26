// app.js — Typing Fishing core loop (cast → wait → reel → catch).
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
let unlockedLetters = new Set();

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

// ---- Profiles (localStorage mirror; M4b layers Firestore sync on top) ----
// One document per kid, shaped per FIRESTORE.md. localStorage keys:
//   tf:profile:{id} — the save document (which IS the offline save file)
//   tf:profiles     — lightweight index for the picker [{id,name,avatar,updatedAt}]
//   tf:active       — last-picked profile id
// All reads/writes funnel through here so M4b can add Firestore in one place.
const AVATARS = ["🐸", "🐟", "🐠", "🦆", "🐢", "🦖", "🐙", "🦈", "⭐", "🍀", "🐳", "🦑"];
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
    upgrades: { rod: "stick", bait: "worm", boat: "classic",
                owned: { rod: ["stick"], bait: ["worm"], boat: ["classic"] } },
    collection: {},                                   // fishId → count
    records: {},                                      // fishId → { weight (lb best), wpm (best, Stream+) } (A4)
    badges: [],                                       // earned badge ids (journal)
    stats: { letters: {}, wordsTyped: 0, escapes: 0, sessionCount: 0, lastPlayed: now },
    jokesEndured: 0,                                  // reserved (backlog groan counter)
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
    // Offline, blocked, or misconfigured — stay local-only and silent.
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
      // remote is newer — adopt it locally, but never yank a kid mid-game
      if (!(save && save.id === id && !pickerOpen)) localStorage.setItem(PROFILE_KEY(id), JSON.stringify(rem));
    } else if (loc && locT >= remT) {
      // local is newer or remote-missing — back it up
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
  // the Ocean still only had the home row — which filters out every sentence
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

// Dad joke flavor text — one pool per moment, picked at random.
// House rule: cast lines always keep the literal instruction for beginners.
const PUNS = {
  cast: [
    "Type the word to cast — reel easy does it",
    "Type the word to cast. Let's get kraken",
    "Type the word to cast — any fin is possible",
  ],
  wait: [
    "Something's fishy down there…",
    "Waiting… just for the halibut",
    "Any second now. I'm not squidding",
    "Patience… good things come to those with bait",
    "Vibing to some classic rock down there…",
    "Twisting the wait away, Rubik's-cube style",
    "Chill like Bluey on a lazy Sunday…",
  ],
  // A4: even fly-cast cadence (Stream+). Praise only — never shown as a miss.
  niceCast: [
    "Smooth cast! You've got the rhythm 🎣",
    "Ooh, buttery. That fly landed like a feather",
    "Nice and even — textbook fly cast",
    "That's the rhythm! The trout are impressed",
    "Smooth cast! Steady as a weightlifter's rep",
    "Nice and even — classic-rock steady beat",
    "That's the rhythm! Totally Bluey-and-Bingo calm",
  ],
  // A7: the fish makes a run mid-fight (Ocean). Drama, never a scolding — the
  // kid hasn't done anything wrong, and nothing is lost while these show.
  fishRun: [
    "It's running! Hold steady…",
    "Whoa — it's taking line!",
    "It dove deep! Easy does it",
    "Still fighting! You've got this",
    "That's a strong one — stay with it",
    "It's not giving up yet!",
  ],
  bite: [
    "Fish on! Holy mackerel!",
    "Oh my cod — reel it in!",
    "A bite! Hook, line, and sinker!",
    "Fish on! Don't trout yourself now",
    "Fish on! Somebody grab the ketchup",
    "A bite! Cue the classic hip hop beat",
    "Fish on! Pink and sparkly incoming",
  ],
  catchCommon: [
    "Caught it! Reel-y nice work",
    "Landed! That was off the scale",
    "Caught — and it wasn't even a fluke",
    "Got it! You're quite the catch-er",
    "Caught it! Comic-book-cover worthy",
    "Landed! Rubik's-cube fast",
    "Got it! Totally 80s-power-ballad worthy",
  ],
  catchRare: [
    "✨ RARE! Holy carp! ✨",
    "✨ RARE! You're o-fish-ally amazing ✨",
    "✨ RARE! Simply fin-tastic ✨",
    "✨ RARE! Hyrule-legendary rare ✨",
    "✨ RARE! Simpsons-couch-gag rare ✨",
    "✨ RARE! Unicorn-sparkle rare ✨",
  ],
  escape: [
    "It got away… cod it be worse?",
    "Escaped! A missed oppor-tuna-ty",
    "Gone… but the pond is patient",
    "It slipped away — better luck next tide",
  ],
  // {it} = the junk item's name (see CONFIG.junk.items)
  junk: [
    "Aw shucks — you reeled up {it}. Water ya gonna do?",
    "Just {it}. That's a load of pond scum!",
    "You caught {it}?! Talk about a re-boot",
    "{it}. Well, it's the sole of the lake…",
    "Only {it} — not every cast's a jackpot. Cast again!",
    "{it}! Dino-mite catch… for a lunchbox. Not so much a lake.",
  ],
};

// ---- State ----
let phase = "cast";        // cast | wait | reel | done
let target = "";
let typed = 0;
let tension = 0;
let fish = null;           // roster entry currently on the line
let junk = null;           // junk item on the line instead of a fish (comedy), or null
let reelPool = [];         // words matched to the hooked fish's difficulty
let reelMode = "words";    // "words" (Pond) | "phrase" (Stream, A1) — set at each bite
let reelSegments = [];     // A7: the sentences this catch is fought over (1 outside the Ocean)
let segIndex = 0;          // which of those we're currently reeling
let wordsToLand = 0;
let wordsLeft = 0;
let inputLocked = false;
let pickerOpen = true;     // the profile picker gates play until a kid is chosen
let gameGen = 0;           // bumped on each profile activation; stales old timers

// silent typing stats (feeds the v2 adaptive meter — kids never see these)
let lastKeyTime = 0;                 // 0 = start of a word, don't time the first letter
const MAX_LATENCY_MS = 5000;         // ignore gaps this long (kid stepped away)
function statLetter(l) { return (save.stats.letters[l] ??= { n: 0, errors: 0, msTotal: 0 }); }

// A4: per-catch reel timing for a self-paced WPM (phrase mode only). Active
// typing time — idle gaps excluded — so a kid who pauses isn't punished. Reset
// at each bite; read at land. Separate from the stats' lastKeyTime above.
let reelChars = 0, reelActiveMs = 0, reelLastKeyMs = 0;
function tickReelWpm() {
  if (phase !== "reel" || reelMode !== "phrase") return;
  const now = Date.now();
  if (logic.countsTowardTiming(reelLastKeyMs, now, MAX_LATENCY_MS)) reelActiveMs += now - reelLastKeyMs;
  reelLastKeyMs = now;
  reelChars++;
}

// A4: fly-cast rhythm — inter-key gaps while typing a cast word, for a cozy
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
  setTimeout(() => { if (g === gameGen && !pickerOpen) fn(); }, delay);
}

// ---- DOM ----
const $ = id => document.getElementById(id);
const el = { scene: $("scene"), word: $("word"), status: $("status"), fill: $("meter-fill"),
             caught: $("caught"), escaped: $("escaped"), coins: $("coins"), dist: $("dist"),
             line: $("line"), fish: $("fish"), bobber: $("bobber") };

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

const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const TIER_ORDER = ["legendary", "rare", "uncommon", "common"];   // rarity, hardest → easiest (A3 fish fallback)

// thin wrappers over logic.js — supply the live CONFIG / equipped rod / word pool
function rollWeight(tier)           { return logic.rollWeight(CONFIG.size, tier); }
function pickTier()                 { return logic.pickTier(CONFIG.bite.tierOddsByRod[equippedRod().rodLevel]); }
function buildReelPool(difficulty)  { return logic.buildReelPool(WORDS, difficulty, CONFIG.reel.minReelPoolSize); }
// phrase/sentence content for the current spot, matched to the fish's
// difficulty (same widening machinery as words). Phrases and sentences share
// one tag schema (AD1), so they merge into a single content pool here; only
// the entries tagged for save.location survive (Stream phrases at "stream",
// A5 sentences at "ocean" — never both at once). Empty unless something
// typeable is tagged for this spot.
function buildPhrasePool(difficulty) {
  const here = [...PHRASES, ...SENTENCES].filter(p => p.location === save.location);
  return logic.buildReelPool(here, difficulty, CONFIG.reel.minPhrasePoolSize);
}

// ---- Audio: procedural synth, no external asset files (M10) ----
// Web Audio oscillators/filters generate everything — a water-drone ambient
// bed plus short SFX blips/chimes. Avoids sourcing/licensing audio for a
// family project and needs no new files, matching the no-build-step rule.
// Volumes/timing are CFG knobs; note pitches are sound-design content, kept
// here next to PUNS rather than in config.js.
let actx = null, masterGain = null, sfxGain = null, musicGain = null, ambientNodes = null;
// Off by default (Matt, 2026-08-25): the generated ambience/SFX need tuning
// before they're worth hearing, and a kid shouldn't have to mute the game to
// like it. The tackle-box toggle still turns it on and that choice sticks.
let soundOn = localStorage.getItem("tf:soundOn") === "on";

function ensureAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = actx.createGain();
  masterGain.gain.value = soundOn ? CONFIG.audio.masterVolume : 0;
  masterGain.connect(actx.destination);
  sfxGain = actx.createGain(); sfxGain.gain.value = CONFIG.audio.sfxVolume; sfxGain.connect(masterGain);
  musicGain = actx.createGain(); musicGain.gain.value = CONFIG.audio.musicVolume; musicGain.connect(masterGain);
  startAmbient();
}

function setSoundOn(on) {
  soundOn = on;
  localStorage.setItem("tf:soundOn", on ? "on" : "off");
  if (masterGain) {
    masterGain.gain.setTargetAtTime(on ? CONFIG.audio.masterVolume : 0, actx.currentTime, 0.05);
  }
}

// gentle water ambience: filtered noise, not tonal oscillators — flat sine
// drones read as an unpleasant hum rather than water. A soft lowpass "body"
// (like a distant whoosh) plus a bandpass "shimmer" layer whose center
// frequency slowly sweeps via an LFO (like sunlight glinting on ripples).
function startAmbient() {
  if (ambientNodes || !actx) return;
  const bufferSize = actx.sampleRate * 2;
  const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = actx.createBufferSource();
  noise.buffer = buffer; noise.loop = true;

  const body = actx.createBiquadFilter(); body.type = "lowpass"; body.frequency.value = 340;
  const bodyGain = actx.createGain(); bodyGain.gain.value = 0.55;

  const shimmer = actx.createBiquadFilter(); shimmer.type = "bandpass";
  shimmer.frequency.value = 1100; shimmer.Q.value = 0.7;
  const shimmerGain = actx.createGain(); shimmerGain.gain.value = 0.3;
  const lfo = actx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.06;
  const lfoGain = actx.createGain(); lfoGain.gain.value = 350;
  lfo.connect(lfoGain); lfoGain.connect(shimmer.frequency);

  noise.connect(body); body.connect(bodyGain); bodyGain.connect(musicGain);
  noise.connect(shimmer); shimmer.connect(shimmerGain); shimmerGain.connect(musicGain);
  noise.start(); lfo.start();
  ambientNodes = { noise, lfo };
}

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

function sfxSplash()   { tone(180, { duration: 0.18, type: "sine", gain: 0.2 }); }
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
// visual-cadence constants (rendering only — gameplay tuning stays in config.js)
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
  s.style.top = rand(258, 348) + "px";   // the water band in scene coords — these
  s.style.left = "-90px";                // used to be relative to the #water div
  s.style.animationDuration = rand(16, 30) + "s";
  el.scene.appendChild(s);
  setTimeout(() => s.remove(), 31000);
}, JUICE.shadowEveryMs);

// ambient ripples: the pond breathes even when nobody's fishing
setInterval(() => {
  if (document.hidden) return;
  ripple(rand(80, 640), rand(230, 330));
}, JUICE.ambientRippleMs);

// bobber ripples while the line waits for a bite
let bobberRippleTimer = null;
function bobberIn() {
  el.bobber.classList.remove("plunge");
  el.bobber.classList.add("on");
  ripple(394, 196); // splash-in ring, then the idle rhythm
  bobberRippleTimer = setInterval(() => ripple(394, 196), JUICE.bobberRippleMs);
}
function bobberOut(plunge) {
  clearInterval(bobberRippleTimer);
  if (plunge) {
    el.bobber.classList.add("plunge");
    ripple(394, 196);
    setTimeout(() => el.bobber.classList.remove("on", "plunge"), 400);
  } else {
    el.bobber.classList.remove("on", "plunge");
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
function setStatus(t) { el.status.textContent = t; }

// ---- Reel animation: the fish rises from the depths and is reeled toward the
// boat, with the fishing line redrawn every frame from the rod tip to the
// fish's mouth so it stays attached (shortening/re-angling as the fish nears).
// All coords are design-space px on the 720x360 canvas. ----
const REDUCE_MOTION = matchMedia("(prefers-reduced-motion: reduce)").matches;
// the rod tip in scene coords: #rig's own position plus the rig-relative tip
// (offsetLeft/Top read #rig's CSS placement rather than repeating it here)
const LINE_ORIGIN = { x: $("rig").offsetLeft + CONFIG.rig.lineOrigin.x,
                      y: $("rig").offsetTop + CONFIG.rig.lineOrigin.y };
let swimRAF = null, swimStart = 0;
let fishX = 0, fishY = 0, fishTX = 0, fishTY = 0;   // current + target fish position

// target for the current reel progress: starts deep-and-right, ends near the
// boat at the surface, so reeling pulls the fish up and in
function setFishTarget() {
  const progress = 1 - wordsLeft / wordsToLand;   // 0 at bite, 1 at land
  fishTX = 430 - progress * 280;                  // 430 -> 150 (toward the boat)
  // kept above the bottom-center ghost-hands panel so the fish stays visible
  // while it's reeled across; the "up from the depths" dip is the spawn offset
  fishTY = 232 - progress * 16;                    // 232 -> 216 (near the surface)
}

// aim the line from the rod tip at the bobber, for the cast and the wait
function lineToBobber() {
  const b = $("bobber");
  aimLine(b.offsetLeft + b.offsetWidth / 2, b.offsetTop + b.offsetHeight / 2);
}
// point #line from the rod tip at a scene coordinate, sizing it to reach
function aimLine(x, y) {
  const dx = x - LINE_ORIGIN.x, dy = y - LINE_ORIGIN.y;
  el.line.style.width = Math.hypot(dx, dy) + "px";
  el.line.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
}

// aim the line from the rod tip to the fish's mouth (left edge; the art faces left)
function lineToFish(fishLeft, fishTop) {
  aimLine(fishLeft + 6, fishTop + 20);
}
function drawFish(x, y) {
  el.fish.style.left = x + "px";
  el.fish.style.top = y + "px";
  lineToFish(x, y);
}

function startSwim() {
  el.line.style.transition = "none";   // the RAF drives the line now — no easing lag
  if (REDUCE_MOTION) { fishX = fishTX; fishY = fishTY; drawFish(fishTX, fishTY); return; }
  swimStart = performance.now();
  const step = (now) => {
    if (phase !== "reel") return;
    fishX += (fishTX - fishX) * 0.08;   // ease toward the target each frame
    fishY += (fishTY - fishY) * 0.08;
    const t = (now - swimStart) / 1000;
    const wobX = Math.sin(t * 0.9) * 5;
    const wobY = Math.sin(t * 1.6) * 7 + Math.sin(t * 3.7) * 2;
    drawFish(fishX + wobX, fishY + wobY);
    swimRAF = requestAnimationFrame(step);
  };
  swimRAF = requestAnimationFrame(step);
}
function stopSwim() {
  if (swimRAF) cancelAnimationFrame(swimRAF);
  swimRAF = null;
}

// ---- Phases ----
function startCast() {
  phase = "cast"; inputLocked = false;
  target = pick(WORDS).w; typed = 0; lastKeyTime = 0;
  castIntervals = []; castLastKeyMs = 0;   // A4: fresh fly-cast rhythm window
  tension = 0; renderTension();
  el.dist.textContent = "—";
  el.line.style.transition = "";     // restore the CSS ease for the next cast
  el.line.style.width = "0px";       // the next cast re-aims it at the bobber
  bobberOut(false);
  el.fish.style.opacity = 0;
  el.fish.className = "";
  el.fish.style.transform = "";
  el.fish.style.removeProperty("--fish-color");
  el.fish.style.removeProperty("background-image");   // clear a junk sprite swap
  junk = null;
  setStatus(pick(PUNS.cast));
  renderWord();
}

function startWait() {
  phase = "wait"; inputLocked = true;
  el.word.textContent = "";
  updateGuide(null);
  lineToBobber();
  burst(400, 195, 5);
  sfxSplash();
  bobberIn();
  // A4: on graduated (fly-fishing) waters, an even casting cadence earns a cozy
  // line — never a penalty, and the Pond casts exactly as before.
  const flyWater = save.location !== CONFIG.tiers[0].location;
  const niceCast = flyWater && logic.isEvenCadence(castIntervals, CONFIG.flyCast.minKeys, CONFIG.flyCast.maxCadenceCv);
  setStatus(niceCast ? pick(PUNS.niceCast) : pick(PUNS.wait));
  later(bite, rand(...CONFIG.bite.delayMsRange) * equippedBait().biteSpeedMult);
}

function bite() {
  phase = "reel"; inputLocked = false;
  bobberOut(true);
  junk = Math.random() < CONFIG.junk.chance ? pick(CONFIG.junk.items) : null;
  const rolled = junk ? "common" : pickTier();        // junk reels like an easy common
  // Fish come from the current spot (A3). If this spot has no fish of the rolled
  // tier (e.g. the Stream has no legendary yet), degrade to the nearest tier it
  // does have. An unpopulated spot (a future location before its fish exist)
  // falls back to the home water so a bite never picks from an empty pool.
  const localFish = FISH.filter(f => f.location === save.location);
  const pool = localFish.length ? localFish : FISH.filter(f => f.location === CONFIG.tiers[0].location);
  const tier = junk ? "common" : logic.tierWithFallback(new Set(pool.map(f => f.tier)), rolled, TIER_ORDER);
  fish = junk ? null : pick(pool.filter(f => f.tier === tier));

  // Content unit for this catch (AD2): reel a phrase when typeable phrase content
  // is tagged for this spot (the Stream, A1); otherwise word-at-a-time — the Pond,
  // and junk everywhere (a boot doesn't earn a phrase). Empty phrase pool falls
  // back to words, so a missing/short data set never blocks a catch.
  const phrasePool = junk ? [] : buildPhrasePool(fish.difficulty);
  reelMode = phrasePool.length ? "phrase" : "words";
  reelChars = 0; reelActiveMs = 0; reelLastKeyMs = 0;   // A4: fresh WPM window per catch
  if (reelMode === "phrase") {
    // A7: at a fight location a bigger fish takes more segments — one sentence
    // each — so a marlin is a fight and a sardine is a snack. Everywhere else
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
  if (junk) {
    el.fish.style.backgroundImage = `url("assets/${junk.file}.png")`;
  } else {
    el.fish.classList.add("tier-" + tier);
    el.fish.style.setProperty("--fish-color", fish.color);
  }
  el.fish.style.opacity = 1;
  setFishTarget();
  fishX = fishTX + 30; fishY = fishTY + 56;   // emerge deep & right of the panel, then rise up-and-in
  el.dist.textContent = wordsLeft + " words";
  shakeScene();
  burst(410, 200, 10);
  sfxBite();
  setStatus(pick(PUNS.bite));
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
  if (REDUCE_MOTION) drawFish(fishTX, fishTY);
  burst(parseInt(el.fish.style.left) + 28, 258, 4);
  ripple(parseInt(el.fish.style.left) + 28, 262);
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

// The reel content's last unit was just typed — land it. Word mode defers to
// wordComplete's 450ms beat; a phrase pulls its final word straight to the boat
// (its beats already happened at each typed space).
function reelComplete() {
  if (reelMode !== "phrase") return wordComplete();
  pullFishOneWord();
  // A7: a fight runs across several sentences — land only once the last one is
  // in. (wordsToLand spans every segment, so these two agree; the || keeps a
  // short-count from ever hanging the catch mid-fight.)
  if (wordsLeft <= 0 || segIndex + 1 >= reelSegments.length) return land(true);
  segIndex++;
  fishRun(CONFIG.fight.segmentRunMs, () => {
    target = reelSegments[segIndex].text; typed = 0; lastKeyTime = 0;
  });
}

// A7: the fish makes a run. Pure theatre — it darts back on screen and the reel
// beats for a moment, but `wordsLeft` is untouched, so **no progress is lost**
// and tension never moves. The swim RAF already eases fishX toward fishTX, so
// nudging the target outward and restoring it afterwards is the whole animation.
function fishRun(ms, then) {
  inputLocked = true;
  updateGuide(null);                      // hands rest through the beat, like the word pause
  fishTX += CONFIG.fight.runSurgePx;      // dart away…
  if (REDUCE_MOTION) drawFish(fishTX, fishTY);
  shakeScene();
  sfxBite();
  setStatus(pick(PUNS.fishRun));
  later(() => {
    setFishTarget();                      // …and back to where the kid actually reeled it to
    if (REDUCE_MOTION) drawFish(fishTX, fishTY);
    then?.();
    inputLocked = false;
    renderWord();                         // repaints the word and restores the finger guide
  }, ms);
}

// Forgiving spacebar (A1): it only ever advances between the words of a phrase,
// and it never touches tension — a mistimed or missing space can't cost the
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

// Forgiving punctuation (A5): same spirit as the spacebar — a real key the
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
// A7: fight pacing is a property of the water, not the fish — the Stream's
// phrases carry no punctuation anyway, so it never sees a clause run.
function fightWater() { return CONFIG.fight.fromLocations.includes(save.location); }

// Shared tail of "the current reel content is fully typed" — reached either
// by a letter (the common case) or by a sentence-final punctuation mark (A5).
function finishReelUnit() {
  save.stats.wordsTyped++;
  if (phase === "cast") startWait();
  else if (phase === "reel") reelComplete();
}

function land(success) {
  phase = "done"; inputLocked = true;
  stopSwim();
  el.line.style.width = "0px";    // reel the line all the way in
  el.word.textContent = "";
  updateGuide(null);
  if (success && junk) {
    // comedy catch: no coins, no collection — just a groan
    el.fish.classList.add("landing");
    burst(150, 240, 14);
    save.jokesEndured = (save.jokesEndured ?? 0) + 1;
    persistSave();
    sfxEscape();
    setStatus(pick(PUNS.junk).replace("{it}", junk.name));
    later(startCast, CONFIG.reel.recastDelayMs);
    return;
  }
  if (success) {
    el.fish.classList.add("landing");
    burst(150, 240, 14);
    const stagesBefore = unlockedStageCount(totalCatches());
    const firstCatch = !save.collection[fish.id];
    // A8: asked *before* the collection is credited, since prestige is derived
    // from it — a second Muskie is a great day, not a second ceremony
    const prestigeNow = logic.earnsPrestige(CONFIG.prestige, fish.id, hasPrestige());
    const amount = logic.catchReward(fish.coins, firstCatch, CONFIG.economy.firstCatchBonus);
    save.coins += amount;
    save.collection[fish.id] = (save.collection[fish.id] ?? 0) + 1;
    // the collection just changed, so the derived rank may have too (A8) —
    // refresh it now so persistSave below stores the Muskie rank, rather than
    // it only appearing after the next reload
    if (prestigeNow) recomputeLocations();
    // weight roll + personal-best tracking (flavor only, no coin/difficulty effect)
    save.records ??= {};                        // back-compat for pre-records saves
    const { weight, cls } = rollWeight(fish.tier);
    const rec = save.records[fish.id];          // { weight, wpm } | undefined
    const newBest = logic.isPersonalBest(rec?.weight, weight);
    // A4: per-species WPM, tracked & shown on Stream+ (phrase) catches only. A
    // slower-than-best run is never a fail — it just isn't flagged as a best.
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
    const pun = isRare ? pick(PUNS.catchRare) : pick(PUNS.catchCommon);
    const sizeNote = ` — ${fish.name} (${weight} lb`
      + (cls === "lunker" ? ", a LUNKER!" : cls === "little" ? ", a little one" : "")
      + ")";
    const wpmNote = (reelMode === "phrase" && wpm > 0)
      ? ` · ${wpm} wpm` + (newWpmBest ? " ★ your best!" : "")
      : "";
    const weightBestNote = (newBest && !firstCatch) ? " ★ new best!" : "";
    setStatus((firstCatch ? "NEW! " : "") + pun + sizeNote + wpmNote + weightBestNote);
    if (collectionOpen) renderCollection();
    const stagesAfter = unlockedStageCount(totalCatches());
    let delay = CONFIG.reel.recastDelayMs;
    if (stagesAfter > stagesBefore) {
      const fresh = CONFIG.unlock.stages.slice(stagesBefore, stagesAfter).flatMap(s => [...s.letters]);
      recomputeUnlocks();
      showUnlock(fresh);
      delay = CONFIG.unlock.celebrateMs;
    }
    // A8: the capstone queues *after* any letter banner, so the two celebrations
    // never land on top of each other — and the recast waits for both
    if (prestigeNow) {
      later(showPrestige, delay);
      delay += CONFIG.prestige.celebrateMs;
    }
    later(startCast, delay);
    return;
  } else {
    save.stats.escapes = (save.stats.escapes ?? 0) + 1;
    persistSave();                              // flush accumulated stats on escape
    el.escaped.textContent = save.stats.escapes;
    el.fish.style.left = "760px";
    sfxEscape();
    setStatus(pick(PUNS.escape));
  }
  later(startCast, CONFIG.reel.recastDelayMs);
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

// A8: the Muskie capstone — the biggest moment in the game. Same banner as a
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
  later(() => showBadgeToast({ name: `${p.label} — you landed Muskie Quixote` }), p.celebrateMs - 1100);
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
  later(() => showBadgeToast({ name: `${tier.label} — now fishing ${tier.locationName}` }),
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
  if (!save || pickerOpen || collectionOpen || shopOpen || nudgeOpen || progressOpen || journalOpen || inputLocked) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length !== 1) return;
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
  // Shift (exact match). A lowercase target accepts either case, so the Pond —
  // lowercase-only forever — behaves exactly as before (a stray Shift is harmless).
  const hit = expected === expected.toLowerCase()
    ? e.key.toLowerCase() === expected
    : e.key === expected;
  if (hit) {
    recordKey(expected, true);
    tickReelWpm(); tickCastRhythm();   // A4: self-paced timing (each guards its own phase)
    typed++;
    if (phase === "reel") { ({ tension } = logic.applyTension(tension, true, CONFIG.reel)); renderTension(); }
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
  // sits just past the end of the bottom row — derived, not a hardcoded key
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
// hardcoded width silently loses its rightmost keys — which is exactly what
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
// The panel is overflow:hidden, so without this the rightmost key — the right
// Shift, the very key a capital tells you to press — just disappears below
// ~700px. Mirrors fitScene above. The panel is sized explicitly because a CSS
// transform doesn't change layout size, so it would otherwise still reserve
// (and crop at) the guide's natural width.
const guidePanel = $("guide-panel");
const PANEL_MARGIN = 20;   // matches #guide-panel's max-width: calc(100vw - 20px)
function fitGuide() {
  // padding + border come from the stylesheet, not a constant here — the panel
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
// "locked" — they just sit quiet until something calls for them.
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
// (Shift + `/`, A5). Anything with no key on the rendered board — `!`, which
// lives on the number row — comes back unmapped and simply isn't guided.
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
  // A2: a shifted character also needs Shift — the OPPOSITE hand's pinky reaches
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
// that grants every rod (owning the location-unlocking ones opens their spots —
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
  // actually typeable — capitals and punctuation still ride on the content
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
  setStatus(`🧪 Test: all spots + all letters unlocked — now fishing ${here.locationName}.`);
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
  persistSave();
  renderLocations();
  applyScene();
  setStatus("Now fishing " + CONFIG.tiers.find(t => t.location === loc).locationName + ".");
}

// G1: draw the angler as layers from CONFIG.rig.layers, inserted before #line
// so the line stays on top. Called once at boot; G4's hat/rod shop re-runs it
// on equip, which is the whole point of the split.
function renderRig() {
  const rig = $("rig"), line = $("line");
  line.style.left = CONFIG.rig.lineOrigin.x + "px";
  line.style.top = CONFIG.rig.lineOrigin.y + "px";
  rig.querySelectorAll(".rig-layer").forEach(n => n.remove());
  for (const L of CONFIG.rig.layers) {
    const d = document.createElement("div");
    d.className = "rig-layer";
    d.style.left = L.x + "px"; d.style.top = L.y + "px";
    d.style.width = L.w + "px"; d.style.height = L.h + "px";
    d.style.backgroundImage = `url("assets/${L.file}.png")`;
    rig.insertBefore(d, line);
  }
}
renderRig();

// A3: swap the biome scene by location. Sets a loc-<location> class on #scene;
// CSS layers the stream background over the pond one, so this stays visually
// safe until assets/background-stream.png exists, then the stream scene appears.
function applyScene() {
  const loc = save?.location ?? CONFIG.tiers[0].location;
  el.scene.classList.remove(...CONFIG.tiers.map(t => "loc-" + t.location));
  el.scene.classList.add("loc-" + loc);
}
tackleBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleControls(); });
// picking a nav item (collection/shop/…) closes the tray; the ON/OFF toggles leave it open
controlsTray.addEventListener("click", (e) => { if (e.target.closest(".nav")) toggleControls(false); });
// a click anywhere outside the tray closes it
document.addEventListener("click", (e) => {
  if (!controlsTray.hidden && !controlsTray.contains(e.target) && e.target !== tackleBtn) toggleControls(false);
});

// ---- Collection screen (per-profile once M4 lands; one shared save for now) ----
let collectionOpen = false;
const collectionRoot = $("collection");
const collectionGrid = $("collection-grid");

function renderCollection() {
  collectionGrid.innerHTML = "";
  // A3: group silhouettes by location (Pond, then Stream, then Ocean), showing
  // only spots that actually have fish. Fish with an unknown/missing location
  // fall under the home water so nothing is ever dropped from the journal.
  const homeLoc = CONFIG.tiers[0].location;
  const known = new Set(CONFIG.tiers.map(t => t.location));
  const locOf = f => (known.has(f.location) ? f.location : homeLoc);
  const locs = CONFIG.tiers.map(t => t.location).filter(loc => FISH.some(f => locOf(f) === loc));
  for (const loc of locs) {
    const tier = CONFIG.tiers.find(t => t.location === loc);
    const header = document.createElement("div");
    header.className = "cgroup";
    header.textContent = `${tier.badge} ${tier.locationName}`;
    collectionGrid.appendChild(header);
    for (const f of FISH.filter(f => locOf(f) === loc)) {
      const count = save.collection[f.id] ?? 0;
      const cell = document.createElement("div");
      cell.className = "cell" + (count ? "" : " unknown");
      const shape = document.createElement("div");
      shape.className = "cfish";
      if (count) shape.style.setProperty("--fish-color", f.color);
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
      collectionGrid.appendChild(cell);
    }
  }
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

// swap the #boat sprite to the equipped skin (cosmetic; also called on load)
function applyBoatSkin() {
  const boat = CONFIG.shop.boats.find(b => b.id === save.upgrades.boat) ?? { file: "boat" };
  $("boat").style.backgroundImage = `url("assets/${boat.file}.png")`;
}

function renderShop() {
  $("shop-coin-count").textContent = save.coins;
  renderShopList(CONFIG.shop.rods,  $("shop-rods"),  "rod",  rodHint);
  renderShopList(CONFIG.shop.baits, $("shop-baits"), "bait", baitHint);
  renderShopList(CONFIG.shop.boats, $("shop-boats"), "boat", boatHint);
  applyBoatSkin();   // reflect an equip made from this shop pass
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
        // A0: a rod may unlock a new fishing spot — graduate + celebrate
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

function toggleShop(open) {
  shopOpen = open ?? !shopOpen;
  if (shopOpen) renderShop();
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
  if (save.upgrades.rod !== "stick") return;   // already upgraded — no need to nag
  toggleNudge(true);
}
$("nudge-shop").addEventListener("click", () => { toggleNudge(false); toggleShop(true); });
$("nudge-close").addEventListener("click", () => toggleNudge(false));

// ---- Parent progress view: per-key accuracy heatmap from stats.letters ----
let progressOpen = false;
const progressRoot = $("progress");
const accColor = acc => `hsl(${Math.round(acc * 120)}, 55%, 42%)`;   // red → green

function renderProgress() {
  const L = save.stats.letters || {};
  let totalN = 0, totalErr = 0;
  for (const k in L) { totalN += L[k].n; totalErr += L[k].errors; }
  const attempts = totalN + totalErr;
  const overall = attempts ? Math.round(100 * totalN / attempts) : 0;
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
// flag — so it can never drift from the collection, and a save that landed the
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
];

// mark any freshly-satisfied badges as earned; returns the newly-earned ones.
// Does NOT persist — the caller's persistSave() flushes them in its normal write.
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
  badgeToast.innerHTML = `<span class="badge-medal">🎖️</span> Badge earned — <b>${b.name}</b>`;
  badgeToast.classList.add("show");
  sfxUnlock();
  clearTimeout(badgeToast._timer);
  badgeToast._timer = setTimeout(() => badgeToast.classList.remove("show"), 2600);
}

let journalOpen = false;
const journalRoot = $("journal");
function renderJournal() {
  evaluateBadges();          // backfill retroactively earned badges (old saves / pre-journal progress)
  persistSave();
  const earned = BADGES.filter(b => save.badges.includes(b.id)).length;
  // A8 also surfaces the kid's rank here — it was stored from A0 onward but
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
}
function toggleJournal(open) {
  journalOpen = open ?? !journalOpen;
  if (journalOpen) renderJournal();
  journalRoot.hidden = !journalOpen;
}
$("journal-btn").addEventListener("click", () => toggleJournal(true));
$("journal-close").addEventListener("click", () => toggleJournal(false));

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (collectionOpen) toggleCollection(false);
  if (shopOpen) toggleShop(false);
  if (nudgeOpen) toggleNudge(false);
  if (progressOpen) toggleProgress(false);
  if (journalOpen) toggleJournal(false);
  if (!controlsTray.hidden) toggleControls(false);
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
    syncStatus.textContent = "playing offline — saves on this device";
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
  applyBoatSkin();
  applyScene();                      // A3: show the biome for wherever this kid last fished
  persistSave();                     // records the new session (sessionCount/lastPlayed)
  startCast();
}

try {
  // NB: PHRASE_POOL/SENTENCE_POOL were declared back in A1 but never actually
  // fetched here — the Stream silently never reeled phrases (or capitals, or
  // WPM) at runtime despite A1-A4 shipping. Fixed alongside A5's sentences.
  [FULL_POOL, FISH, PHRASE_POOL, SENTENCE_POOL] = await Promise.all([
    loadJson("data/words.json"), loadJson("data/fish.json"),
    loadJson("data/phrases.json"), loadJson("data/sentences.json"),
  ]);
  migrateLegacySave();
  showProfilePicker();
  syncInit();                        // fire-and-forget: wires sign-in + pulls when ready,
                                     // never blocks play if the network is slow or down

} catch (err) {
  setStatus("The word pool got away… reload to try again");
  console.error(err);
}
