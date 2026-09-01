// Content + config invariant tests. Zero dependencies — Node's built-in
// runner: `node --test` (or `npm test`). These guard the hand-edited JSON and
// tuning knobs, the stuff a bad merge or a fat-fingered edit silently breaks
// (e.g. the "junk word 'sie'" class of bug in BACKLOG.md). Pure game logic
// still lives inside app.js (DOM-bound, not importable) — see the README note.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONFIG, isDevHost } from "../config.js";
import { wordCount, buildReelPool } from "../logic.js";

const load = p => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const words = load("../data/words.json");
const fish  = load("../data/fish.json");
const phrases = load("../data/phrases.json");     // A1: Stream phrase content
const sentences = load("../data/sentences.json"); // A5: Ocean sentence content
const blocklist = new Set(load("../data/blocklist.json"));
const TIERS = new Set(Object.keys(CONFIG.size.weightRangeByTier)); // source of truth

// report the actual offenders, not just a count — a failing test should point at the row
const offenders = (arr, bad, show = x => JSON.stringify(x)) =>
  arr.filter(bad).slice(0, 5).map(show).join("  |  ");

test("words.json is a non-empty array of well-formed entries", () => {
  assert.ok(Array.isArray(words) && words.length > 0);
  assert.equal(offenders(words, w => !/^[a-z]+$/.test(w.w)), "", "non-lowercase-alpha word");
  assert.equal(offenders(words, w => w.w.length < 2 || w.w.length > 8), "", "word length outside 2..8");
  assert.equal(offenders(words, w => !Number.isInteger(w.d) || w.d < 1 || w.d > 4), "", "difficulty d not in 1..4");
  assert.equal(offenders(words, w => !w.theme), "", "missing theme");
});

test("word.letters is the sorted unique letters of the word (unlock-gating invariant)", () => {
  const wrong = w => w.letters !== [...new Set(w.w)].sort().join("");
  assert.equal(offenders(words, wrong, w => `${w.w}→${w.letters}`), "", "letters ≠ dedup-sorted(w)");
});

test("no duplicate words", () => {
  const list = words.map(w => w.w);
  const dupes = [...new Set(list.filter((w, i) => list.indexOf(w) !== i))];
  assert.deepEqual(dupes.slice(0, 5), [], "duplicate word(s)");
});

test("no blocklisted non-word slips into the pool (the 'sie' class of bug)", () => {
  assert.ok(blocklist.size > 0, "blocklist.json should be non-empty");
  assert.equal(offenders(words, w => blocklist.has(w.w), w => w.w), "", "blocklisted word in pool");
});

test("phrases.json is a non-empty array of well-formed entries (A1/A2)", () => {
  assert.ok(Array.isArray(phrases) && phrases.length > 0);
  // letters (either case, A2 capitals) joined by single spaces, 2+ words — this
  // also rules out leading/trailing/double spaces and any non-alpha character
  assert.equal(offenders(phrases, p => !/^[A-Za-z]+( [A-Za-z]+)+$/.test(p.text), p => p.text), "",
    "phrase.text must be words joined by single spaces, 2+ words");
  assert.equal(offenders(phrases, p => !Number.isInteger(p.d) || p.d < 1 || p.d > 4, p => p.text), "", "difficulty d not in 1..4");
  assert.equal(offenders(phrases, p => !p.theme, p => p.text), "", "missing theme");
  assert.equal(offenders(phrases, p => !p.location, p => p.text), "", "missing location");
});

test("phrase.letters is the sorted unique lowercase base letters of the text", () => {
  const wrong = p => p.letters !== [...new Set(p.text.toLowerCase().replace(/ /g, ""))].sort().join("");
  assert.equal(offenders(phrases, wrong, p => `${p.text}→${p.letters}`), "", "letters ≠ dedup-sorted(lowercase text)");
});

test("capitals appear only in content tagged for a caps location (A2)", () => {
  const capsOk = new Set(CONFIG.capitals.fromLocations);
  const bad = p => /[A-Z]/.test(p.text) && !capsOk.has(p.location);
  assert.equal(offenders(phrases, bad, p => `${p.text}@${p.location}`), "", "capital in a non-caps location");
});

test("no duplicate phrases", () => {
  const list = phrases.map(p => p.text);
  const dupes = [...new Set(list.filter((t, i) => list.indexOf(t) !== i))];
  assert.deepEqual(dupes.slice(0, 5), [], "duplicate phrase(s)");
});

test("no blocklisted non-word slips into a phrase (same guard as the word pool)", () => {
  const bad = p => p.text.toLowerCase().split(" ").some(w => blocklist.has(w));
  assert.equal(offenders(phrases, bad, p => p.text), "", "blocklisted word in phrase");
});

test("sentences.json is a non-empty array of well-formed entries (A5)", () => {
  assert.ok(Array.isArray(sentences) && sentences.length > 0);
  // words (optionally comma-suffixed) joined by single spaces, ending in . ! or ?
  // — rules out leading/trailing/double spaces and any other stray character
  const shapeOk = text => /^([A-Za-z]+,? )*[A-Za-z]+[.!?]$/.test(text);
  assert.equal(offenders(sentences, s => !shapeOk(s.text), s => s.text), "",
    "sentence.text must be words joined by single spaces, ending in . ! or ?");
  assert.equal(offenders(sentences, s => wordCount(s.text) < 2, s => s.text), "", "sentence must have 2+ words");
  assert.equal(offenders(sentences, s => !Number.isInteger(s.d) || s.d < 1 || s.d > 4, s => s.text), "", "difficulty d not in 1..4");
  assert.equal(offenders(sentences, s => !s.theme, s => s.text), "", "missing theme");
  assert.equal(offenders(sentences, s => !s.location, s => s.text), "", "missing location");
});

test("sentence.letters is the sorted unique lowercase base letters of the text (punctuation stripped)", () => {
  const wrong = s => s.letters !== [...new Set(s.text.toLowerCase().replace(/[^a-z]/g, ""))].sort().join("");
  assert.equal(offenders(sentences, wrong, s => `${s.text}→${s.letters}`), "", "letters ≠ dedup-sorted(lowercase letters)");
});

test("capitals appear only in content tagged for a caps location, phrases and sentences alike (A2/A5)", () => {
  const capsOk = new Set(CONFIG.capitals.fromLocations);
  const bad = p => /[A-Z]/.test(p.text) && !capsOk.has(p.location);
  assert.equal(offenders(sentences, bad, s => `${s.text}@${s.location}`), "", "capital in a non-caps location");
});

test("punctuation appears only in content tagged for a punctuation location (A5)", () => {
  const punctOk = new Set(CONFIG.punctuation.fromLocations);
  const chars = [...CONFIG.punctuation.chars];
  const hasPunct = t => chars.some(ch => t.includes(ch));
  const bad = p => hasPunct(p.text) && !punctOk.has(p.location);
  assert.equal(offenders(sentences, bad, s => `${s.text}@${s.location}`), "", "punctuation in a non-punctuation location (sentences)");
  assert.equal(offenders(phrases, bad, p => `${p.text}@${p.location}`), "", "punctuation in a non-punctuation location (phrases)");
});

test("no duplicate sentences", () => {
  const list = sentences.map(s => s.text);
  const dupes = [...new Set(list.filter((t, i) => list.indexOf(t) !== i))];
  assert.deepEqual(dupes.slice(0, 5), [], "duplicate sentence(s)");
});

test("no blocklisted non-word slips into a sentence (same guard as the word pool)", () => {
  const bad = s => s.text.toLowerCase().replace(/[.,!?]/g, "").split(" ").some(w => blocklist.has(w));
  assert.equal(offenders(sentences, bad, s => s.text), "", "blocklisted word in sentence");
});

test("the prestige fish exists, is legendary, and lives at a fight water (A8)", () => {
  const p = fish.find(f => f.id === CONFIG.prestige.fishId);
  assert.ok(p, `prestige.fishId "${CONFIG.prestige.fishId}" matches no fish in fish.json`);
  assert.equal(p.tier, "legendary", `the capstone fish "${p.id}" should be legendary`);
  assert.ok(CONFIG.fight.fromLocations.includes(p.location),
    `the capstone "${p.id}" lives at "${p.location}", which isn't a fight water — it should be the hardest catch in the game`);
});

test("every fight water has enough sentences to fill its longest fight without repeats (A7)", () => {
  // mirrors app.js's buildPhrasePool: content for this spot, widened to the
  // fish's difficulty by the same machinery words use
  for (const loc of CONFIG.fight.fromLocations) {
    const here = sentences.filter(s => s.location === loc);
    assert.ok(here.length, `fight water "${loc}" has no sentences at all`);
    for (const f of fish.filter(f => f.location === loc)) {
      const segs = CONFIG.fight.segmentsByTier[f.tier] ?? 1;
      const pool = buildReelPool(here, f.difficulty, CONFIG.reel.minPhrasePoolSize);
      assert.ok(pool.length >= segs,
        `"${f.id}" (${f.tier}, d${f.difficulty}) fights ${segs} segments but only ${pool.length} sentence(s) are reachable at ${loc}`);
    }
  }
});

test("fish.json is a non-empty array of well-formed entries", () => {
  assert.ok(Array.isArray(fish) && fish.length > 0);
  assert.equal(offenders(fish, f => !TIERS.has(f.tier), f => `${f.id}:${f.tier}`), "", "unknown tier");
  assert.equal(offenders(fish, f => !Number.isInteger(f.difficulty) || f.difficulty < 1, f => f.id), "", "bad difficulty");
  assert.equal(offenders(fish, f => !Number.isInteger(f.coins) || f.coins < 1, f => f.id), "", "coins < 1");
  assert.equal(offenders(fish, f => !/^#[0-9a-fA-F]{6}$/.test(f.color || ""), f => `${f.id}:${f.color}`), "", "color not #rrggbb");
  assert.equal(offenders(fish, f => !f.name || !f.blurb, f => f.id), "", "missing name/blurb");
});

test("no duplicate fish ids", () => {
  const ids = fish.map(f => f.id);
  assert.equal(ids.length, new Set(ids).size, "duplicate fish id");
});

test("every fish has a known location (A3)", () => {
  const locs = new Set(CONFIG.tiers.map(t => t.location));
  assert.equal(offenders(fish, f => !locs.has(f.location), f => `${f.id}:${f.location}`), "", "unknown fish location");
});

test("the home water has a fish for every rollable tier (so it never needs the A3 fallback)", () => {
  const rollable = new Set();
  for (const odds of Object.values(CONFIG.bite.tierOddsByRod))
    for (const [tier, p] of Object.entries(odds)) if (p > 0) rollable.add(tier);
  const home = CONFIG.tiers[0].location;
  const homeTiers = new Set(fish.filter(f => f.location === home).map(f => f.tier));
  for (const t of rollable) assert.ok(homeTiers.has(t), `home water "${home}" has no ${t} fish`);
});

test("every fish tier can actually be rolled by some rod", () => {
  const rollable = new Set();
  for (const odds of Object.values(CONFIG.bite.tierOddsByRod))
    for (const [tier, p] of Object.entries(odds)) if (p > 0) rollable.add(tier);
  for (const f of fish)
    assert.ok(rollable.has(f.tier), `fish "${f.id}" is tier "${f.tier}" but no rod ever rolls it`);
});

test("tier odds per rod sum to 1 and cover only known tiers", () => {
  for (const [lvl, odds] of Object.entries(CONFIG.bite.tierOddsByRod)) {
    const sum = Object.values(odds).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `rod ${lvl} tier odds sum to ${sum}, not 1`);
    for (const tier of Object.keys(odds)) assert.ok(TIERS.has(tier), `rod ${lvl} references unknown tier "${tier}"`);
  }
});

test("every rod's rodLevel has tier odds (a missing entry crashes pickTier at bite)", () => {
  for (const rod of CONFIG.shop.rods)
    assert.ok(CONFIG.bite.tierOddsByRod[rod.rodLevel],
      `rod "${rod.id}" is rodLevel ${rod.rodLevel} but bite.tierOddsByRod has no such entry`);
});

test("every location-unlocking rod points at a real location, and every non-home spot is reachable (A0/A6)", () => {
  const locs = new Set(CONFIG.tiers.map(t => t.location));
  for (const rod of CONFIG.shop.rods)
    if (rod.unlocksLocation)
      assert.ok(locs.has(rod.unlocksLocation), `rod "${rod.id}" unlocks unknown location "${rod.unlocksLocation}"`);
  // every tier past the always-open home water needs a rod that opens it,
  // or a kid could never legitimately fish there
  const unlockable = new Set(CONFIG.shop.rods.map(r => r.unlocksLocation).filter(Boolean));
  for (const t of CONFIG.tiers.slice(1))
    assert.ok(unlockable.has(t.location), `location "${t.location}" has no rod that unlocks it`);
});

test("every location with fish can serve content, and every content location has fish", () => {
  const fishLocs = new Set(fish.map(f => f.location));
  for (const t of CONFIG.tiers)
    assert.ok(fishLocs.has(t.location), `location "${t.location}" has no fish of its own`);
});

test("unlock stages start at 0 catches and never decrease", () => {
  const reqs = CONFIG.unlock.stages.map(s => s.catchesRequired);
  assert.equal(reqs[0], 0, "first stage must need 0 catches");
  for (let i = 1; i < reqs.length; i++)
    assert.ok(reqs[i] >= reqs[i - 1], `stage ${i} requires fewer catches than stage ${i - 1}`);
});

test("shop items have unique ids; boats each reference a sprite file", () => {
  for (const [kind, items] of Object.entries(CONFIG.shop)) {
    const ids = items.map(i => i.id);
    assert.equal(ids.length, new Set(ids).size, `duplicate ${kind} id`);
  }
  assert.ok(CONFIG.shop.boats.some(b => b.cost === 0), "need a free default boat");
  for (const b of CONFIG.shop.boats) assert.ok(b.file, `boat "${b.id}" missing sprite file`);
});

test("the 🧪 dev shortcut can never be on in production", () => {
  // the real site and anything unfamiliar must fail closed
  for (const host of ["hook-line-and-sentence.netlify.app", "hooklineandsentence.app", "example.com",
                      "", "localhost.evil.com", "notlocalhost", "deploy-preview-x--hook-line-and-sentence.netlify.app"])
    assert.equal(isDevHost(host), false, `dev shortcuts must be off on "${host}"`);
  // …and stay available where we actually playtest
  for (const host of ["localhost", "127.0.0.1", "[::1]", "matts-mac.local",
                      "deploy-preview-30--hook-line-and-sentence.netlify.app"])
    assert.equal(isDevHost(host), true, `dev shortcuts should be on for "${host}"`);
  // importing config.js outside a browser (these tests) must not switch them on
  assert.equal(CONFIG.dev.testShortcuts, false, "dev shortcuts leaked into a non-browser build");
});

test("junk config is well-formed", () => {
  assert.ok(CONFIG.junk.chance > 0 && CONFIG.junk.chance < 1, "junk.chance must be in (0,1)");
  const ids = CONFIG.junk.items.map(i => i.id);
  assert.equal(ids.length, new Set(ids).size, "duplicate junk id");
  for (const j of CONFIG.junk.items) assert.ok(j.id && j.name && j.file, `junk "${j.id}" missing a field`);
});

// The Stream's phrases and the Ocean's sentences are filtered by the kid's
// unlocked letters, so content using a letter no stage ever grants is content
// nobody can reel — it silently drops the reel back to single words. (That's
// the shape of the bug the 🧪 shortcut had: full spots, home-row keys.)
test("every phrase and sentence is typeable once all letter stages are unlocked", () => {
  const all = new Set(CONFIG.unlock.stages.flatMap(s => [...s.letters]));
  const untypeable = e => [...e.letters].some(l => !all.has(l));
  assert.equal(offenders(phrases, untypeable, p => p.text), "", "phrase needs a letter no stage grants");
  assert.equal(offenders(sentences, untypeable, s => s.text), "", "sentence needs a letter no stage grants");
});

// G1: the angler's layer stack. It's data now, so a fat-fingered edit here is a
// kid rendered wrong (or not at all) rather than a syntax error. R4 made it one
// stack per location, so every pose gets checked, not just the one on screen.
test("every CONFIG.rig pose is a well-formed paint stack", () => {
  const poses = Object.entries(CONFIG.rig.poses);
  assert.ok(poses.length > 0, "no poses at all — the angler would not render");
  for (const [name, pose] of poses) {
    const layers = pose.layers;
    assert.ok(Array.isArray(layers) && layers.length > 0, `${name}: no layers`);
    // Paint order is a property of the art, not a rule: R4's angler is drawn
    // with the hand in front of the pole, so the rod paints BEHIND the body.
    // What must hold is that both pieces exist — a pose missing either renders
    // a kid with no rod, or a rod with no kid, and neither throws.
    assert.ok(layers.some(l => l.id === "body"), `${name}: no body layer`);
    assert.ok(layers.some(l => l.id === "rod"), `${name}: no rod layer`);
    assert.equal(new Set(layers.map(l => l.id)).size, layers.length, `${name}: duplicate layer id`);
    assert.equal(offenders(layers, l => !/^[a-z0-9-]+$/.test(l.file ?? "")), "", `${name}: bad layer filename`);
    assert.equal(offenders(layers, l => !(l.w > 0 && l.h > 0)), "", `${name}: layer with no size`);
    assert.equal(offenders(layers, l => ![l.x, l.y].every(Number.isFinite)), "", `${name}: layer with no offset`);
  }
});

// R5: the pose's vessel and its shadow are written straight into inline styles
// by renderRig(), so a leftover from an older shape — `shadow: true` from before
// it became a box — does not throw, it writes `left: undefinedpx` and the shadow
// silently stacks up in the scene's top-left corner.
test("every vessel is a well-formed hull with a placed shadow", () => {
  for (const [name, pose] of Object.entries(CONFIG.rig.poses)) {
    const v = pose.vessel;
    if (v == null) continue;                       // the Stream: no boat, on purpose
    assert.ok(/^[a-z0-9-]+$/.test(v.far ?? ""), `${name}: vessel has no far half`);
    assert.ok(v.near == null || /^[a-z0-9-]+$/.test(v.near), `${name}: bad near half`);
    assert.ok(v.w > 0 && v.h > 0, `${name}: vessel with no size`);
    assert.ok([v.x, v.y].every(Number.isFinite), `${name}: vessel with no offset`);
    if (v.shadow == null) continue;
    assert.equal(typeof v.shadow, "object", `${name}: shadow is a flag, not a box`);
    assert.ok(v.shadow.w > 0, `${name}: shadow with no width`);
    assert.ok([v.shadow.x, v.shadow.y].every(Number.isFinite), `${name}: shadow with no place`);
  }
  // the anchor moves the whole rig, hull included, so it is the same kind of
  // silent failure one level up
  for (const [name, pose] of Object.entries(CONFIG.rig.poses)) {
    const a = pose.anchor;
    assert.ok(a && [a.x, a.y].every(Number.isFinite), `${name}: pose is not anchored`);
    assert.ok(a.pivot && [a.pivot.x, a.pivot.y].every(Number.isFinite), `${name}: no rock pivot`);
  }
});

// R4: a pose is looked up by location, and anything without one falls back to
// the default. A typo in either key is an angler in the wrong clothes at best
// and no angler at all at worst, and neither throws.
test("rig poses are keyed by real locations, and the fallback exists", () => {
  const locations = CONFIG.tiers.map(t => t.location);
  assert.ok(CONFIG.rig.poses[CONFIG.rig.defaultPose], "defaultPose names no pose");
  assert.ok(locations.includes(CONFIG.rig.defaultPose), "defaultPose is not a real location");
  assert.equal(offenders(Object.keys(CONFIG.rig.poses), k => !locations.includes(k)), "",
    "pose keyed by something that is not a fishing spot");
});

// R1 (ANIMATION.md): the rod rotates about the grip for the cast and the tug,
// and the line leaves the tip. Both points are config, and both are only
// meaningful relative to the rod layer's box — so a rod swapped in by the gear
// shop (R7) with a different box, or a retuned layer, must move them together.
// Getting this wrong doesn't throw: it detaches the line from a rod that is
// visibly swinging, which is exactly the bug R1 exists to fix.
test("the rod's pivot and the line's origin sit on the rod layer's box", () => {
  for (const [name, pose] of Object.entries(CONFIG.rig.poses)) {
    const rod = pose.layers.find(l => l.id === "rod");
    assert.ok(rod, `${name}: no rod layer to swing`);
    // R4 loosened this from an equality to a containment, because the corners
    // stopped meaning anything. The G1 rod had its own tight canvas running
    // grip-corner to tip-corner, so the grip and tip WERE box corners. Under
    // the same-canvas rule the rod shares the body's canvas, so its box is the
    // whole pose and the rod crosses it diagonally somewhere in the middle.
    // The intent is unchanged: a gear-shop rod (R7) swapped in with a different
    // box must move these with it, or the line detaches from a rod that is
    // visibly swinging.
    for (const [what, p] of [["rodPivot", pose.rodPivot], ["lineOrigin", pose.lineOrigin]]) {
      assert.ok(p.x >= rod.x && p.x <= rod.x + rod.w && p.y >= rod.y && p.y <= rod.y + rod.h,
        `${name}: ${what} is outside the rod layer's box`);
    }
    // and the rod points up and to the right, which is what the cast assumes
    assert.ok(pose.lineOrigin.x > pose.rodPivot.x, `${name}: the rod tip is not right of the grip`);
    assert.ok(pose.lineOrigin.y < pose.rodPivot.y, `${name}: the rod tip is not above the grip`);
  }
});

test("CONFIG.anim's timings and curve numbers are sane", () => {
  const a = CONFIG.anim;
  for (const [k, v] of Object.entries(a.cast)) {
    if (typeof v === "number") assert.ok(v > 0, `anim.cast.${k} must be positive`);
  }
  assert.ok(a.cast.landing.x > 0 && a.cast.landing.y > 0, "the lure lands off-canvas");
  assert.ok(a.cast.landing.y < 360 && a.cast.landing.x < 720, "the lure lands off-canvas");
  assert.ok(a.rod.backswingDeg < 0, "the backswing loads the rod backwards");
  assert.ok(a.rod.forwardDeg > 0, "the swing throws the rod forwards");
  // tension tightens the line, so taut must be the smaller sag
  assert.ok(a.line.tautSagPx < a.line.slackSagPx, "max tension has to pull the line straighter");
  assert.ok(a.line.idleSagPx > 0 && a.line.widthPx > 0);
  assert.ok(a.tug.stiffness > 0 && a.tug.damping > 0, "a tug with no spring never comes back");
  assert.ok(a.tug.keyImpulse !== 0 && Math.abs(a.tug.wordImpulse) >= Math.abs(a.tug.keyImpulse),
    "a whole word should pull at least as hard as one letter");
  assert.ok(a.tug.jitter >= 0 && a.tug.jitter < 1, "jitter is a fraction of the impulse");
});

// R2 (ART_DIRECTION.md): two rules that are easy to break by habit months from
// now, and invisible in a diff. Both are cheap to check mechanically, so they
// are checked rather than trusted.
test("no pure black anywhere in the stylesheet", () => {
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
  const offences = [];
  css.split("\n").forEach((line, i) => {
    if (/^\s*(\/\*|\*)/.test(line)) return;                 // prose about the rule is fine
    if (/#000\b|#000000\b|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]|:\s*black\b|,\s*black\s/.test(line)) {
      offences.push(`${i + 1}: ${line.trim()}`);
    }
  });
  assert.equal(offences.join("\n"), "",
    "ART_DIRECTION.md: shadows and outlines are warm dark browns, never pure black");
});

test("the ghost-hands keyboard stays exempt from the palette", () => {
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
  const start = css.indexOf("/* R2: the keyboard is EXEMPT");
  const end = css.indexOf("/* ============ OVERLAY SCREENS");
  assert.ok(start > 0 && end > start, "the keyboard block's markers moved — update this test");
  const block = css.slice(start, end);
  // it may reference its own frozen tokens and nothing else from the palette
  const scenePalette = [...block.matchAll(/var\(--([a-z-]+)/g)].map(m => m[1])
    .filter(name => !name.startsWith("kb-"));
  assert.deepEqual([...new Set(scenePalette)], [],
    "CLAUDE.md: the keyboard is off limits — it must use only the frozen --kb-* tokens");
});

// R6: CONFIG.fish.species is the registry that decides whether a species renders
// its own art or the tier placeholder, so every entry in it has to be complete —
// a half-written one renders a fish with no mouth for the line to attach to, or
// a tail that sweeps about the box's corner. The suite is deliberately written
// to pass on an EMPTY registry: that is the correct state until a wave lands,
// and these are the traps set for when one does.
test("every landed fish species is a well-formed rig", () => {
  const ids = new Set(fish.map(f => f.id));
  const species = Object.entries(CONFIG.fish.species);
  for (const [id, art] of species) {
    assert.ok(ids.has(id), `${id}: art for a species that isn't in fish.json`);
    assert.ok(art.w > 0 && art.h > 0, `${id}: no box`);
    assert.ok(Array.isArray(art.layers) && art.layers.length > 0, `${id}: no layers`);
    assert.ok(art.layers.some(l => l.id === "body"), `${id}: no body layer`);
    assert.equal(new Set(art.layers.map(l => l.id)).size, art.layers.length, `${id}: duplicate layer id`);
    assert.equal(offenders(art.layers, l => !/^[a-z0-9-]+$/.test(l.file ?? "")), "", `${id}: bad layer filename`);
    // the line attaches at the mouth and the tail swings about the peduncle;
    // both are measured off the painting, so both must land on the box
    const on = p => p && p.x >= 0 && p.x <= art.w && p.y >= 0 && p.y <= art.h;
    assert.ok(on(art.mouth), `${id}: the mouth is off the fish's box`);
    assert.ok(art.mouth.x < art.w / 2, `${id}: the mouth is not on the leading half — is the art facing right?`);
    if (art.layers.some(l => l.id === "tail")) {
      assert.ok(on(art.tail), `${id}: a tail layer with no pivot on the box`);
      assert.ok(art.tail.x > art.w / 2, `${id}: the tail pivot is not on the trailing half`);
    }
  }
});

// A species' length comes from its RANK, not from its painting — the generator
// draws every subject to fill its frame, so scaling from the source would make a
// minnow and a pike the same size (GEMINI_NOTES.md records the same trap for the
// standing and seated anglers). This is what stops 33 separate generations
// drifting into 33 separate scales.
test("a fish's box length is the one its rank calls for", () => {
  const byId = new Map(fish.map(f => [f.id, f]));
  for (const [id, art] of Object.entries(CONFIG.fish.species)) {
    const want = CONFIG.fish.lengthByTier[byId.get(id)?.tier];
    assert.equal(art.w, want, `${id}: ${art.w}px against the ${byId.get(id)?.tier} length of ${want}px`);
  }
  for (const tier of TIERS) {
    assert.ok(CONFIG.fish.lengthByTier[tier] > 0, `no length for the ${tier} rank`);
  }
});

// The placeholder is what every unlanded species renders as, which is most of
// them for the length of R6 — so it stays well-formed the whole time.
test("the fish placeholder still has a box and a mouth", () => {
  const p = CONFIG.fish.placeholder;
  assert.ok(p.w > 0 && p.h > 0, "the placeholder has no box");
  assert.ok(p.mouth.x >= 0 && p.mouth.x < p.w / 2, "the placeholder's mouth is not on its leading half");
  assert.ok(p.mouth.y >= 0 && p.mouth.y <= p.h, "the placeholder's mouth is off its box");
  assert.ok(CONFIG.fish.swim.tailDeg > 0 && CONFIG.fish.swim.tailPeriodMs > 0, "the tail doesn't sweep");
});
