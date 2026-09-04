// Unit tests for the pure game math in logic.js. Deterministic: RNG is
// injected, so no browser and no flakiness. Run with `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CONFIG } from "../config.js";
import {
  unlockedStageCount, lettersForStages, pickTier, weightClass, rollWeight, buildReelPool,
  applyTension, catchReward, isPersonalBest, countsTowardTiming, overallAccuracy,
  locationsForRods, rankForState, tokenize, wordCount, tierWithFallback,
  computeWpm, isPersonalBestWpm, isEvenCadence, pickDistinct, segmentsForTier,
  rankForProfile, earnsPrestige, speedTestPool, typingAccuracy,
  castArcPoint, lineSagPx, lineControlPoint, stepTug, rotateAboutPivot, easeIn, easeOut,
  easeInOut, reelProgressAtX, revealAt,
  gearFile, punPool, catchSubtitle, ambienceFor, nextVoiceDelayMs
} from "../logic.js";

const TIER_ORDER = ["legendary", "rare", "uncommon", "common"];   // hardest → easiest

const stages = [
  { letters: "asdf", catchesRequired: 0 },
  { letters: "ei",   catchesRequired: 3 },
  { letters: "ru",   catchesRequired: 8 },
];

test("unlockedStageCount gates on cumulative catches", () => {
  assert.equal(unlockedStageCount(stages, 0), 1);   // stage 1 is always open
  assert.equal(unlockedStageCount(stages, 2), 1);
  assert.equal(unlockedStageCount(stages, 3), 2);   // exactly at the threshold
  assert.equal(unlockedStageCount(stages, 7), 2);
  assert.equal(unlockedStageCount(stages, 99), 3);  // never exceeds stage count
});

test("lettersForStages accumulates letters across opened stages", () => {
  assert.deepEqual([...lettersForStages(stages, 1)].sort(), ["a", "d", "f", "s"]);
  assert.deepEqual([...lettersForStages(stages, 2)].sort(), ["a", "d", "e", "f", "i", "s"]);
  assert.equal(lettersForStages(stages, 0).size, 0);
});

test("pickTier walks the cumulative distribution", () => {
  const odds = { common: 0.6, uncommon: 0.3, rare: 0.1 };
  assert.equal(pickTier(odds, 0),    "common");   // bottom of the range
  assert.equal(pickTier(odds, 0.59), "common");
  assert.equal(pickTier(odds, 0.6),  "uncommon"); // boundary lands in the next bucket
  assert.equal(pickTier(odds, 0.89), "uncommon");
  assert.equal(pickTier(odds, 0.9),  "rare");
  assert.equal(pickTier(odds, 0.999),"rare");
});

test("pickTier falls back to common when odds under-sum (e.g. rounding, r≈1)", () => {
  assert.equal(pickTier({ common: 0.5, rare: 0.4 }, 0.95), "common");
});

test("weightClass flags lunkers, little ones, and the middle", () => {
  const size = CONFIG.size;
  const [min, max] = size.weightRangeByTier.rare;      // [4, 12]
  const at = frac => min + frac * (max - min);
  // assert just inside each boundary (exact-boundary reconstruction is float-fragile)
  assert.equal(weightClass(size, "rare", at(0.5)), "");
  assert.equal(weightClass(size, "rare", at(size.lunkerFrac + 0.01)), "lunker");
  assert.equal(weightClass(size, "rare", at(size.lunkerFrac - 0.01)), "");     // just below → middle
  assert.equal(weightClass(size, "rare", at(size.littleFrac - 0.01)), "little");
  assert.equal(weightClass(size, "rare", at(size.littleFrac + 0.01)), "");     // just above → middle
});

test("weightClass falls back to the common range for an unknown tier", () => {
  const size = CONFIG.size;
  // an unknown tier should classify against the common range, not throw
  const [cmin, cmax] = size.weightRangeByTier.common;
  const mid = cmin + 0.5 * (cmax - cmin);
  assert.equal(weightClass(size, "mystery", mid), "");
});

test("rollWeight stays in range, rounds to 0.1, and agrees with weightClass", () => {
  const size = CONFIG.size;
  const [min, max] = size.weightRangeByTier.legendary;
  for (const r of [0, 0.001, 0.25, 0.5, 0.849, 0.851, 0.999]) {
    const { weight, cls } = rollWeight(size, "legendary", () => r);
    assert.ok(weight >= min && weight <= max, `weight ${weight} out of [${min},${max}]`);
    assert.equal(Math.round(weight * 10), weight * 10, "weight not rounded to 0.1");
    // class is derived from the unrounded roll, so recompute from the same r
    assert.equal(cls, weightClass(size, "legendary", min + r * (max - min)));
  }
});

test("buildReelPool keeps to the exact difficulty when the pool is deep enough", () => {
  const words = Array.from({ length: 10 }, (_, i) => ({ w: "w" + i, d: 2 }));
  const pool = buildReelPool(words, 2, 8);
  assert.equal(pool.length, 10);
  assert.ok(pool.every(e => e.d === 2));
});

test("buildReelPool mixes in easier words only when the pool is too thin", () => {
  // one hard word, several easy: minSize forces the easier tier in
  const words = [{ w: "hard", d: 3 }, ...Array.from({ length: 8 }, (_, i) => ({ w: "e" + i, d: 1 }))];
  const thin = buildReelPool(words, 3, 8);
  assert.ok(thin.length >= 8, "should have widened to reach minSize");
  assert.ok(thin.some(e => e.d < 3), "should have pulled in easier words");
  // if minSize is satisfiable at the exact difficulty, it stays strict
  const strict = buildReelPool([{ w: "hard", d: 3 }], 3, 1);
  assert.deepEqual(strict.map(e => e.w), ["hard"]);
});

// The SPEC's central invariant: tension reacts to errors only, never speed.
const reel = CONFIG.reel;

test("applyTension: correct keys only ever relieve, never escape (any speed is safe)", () => {
  // from a high tension, a correct key drops it by exactly correctRelief
  const hot = applyTension(50, true, reel);
  assert.equal(hot.tension, 50 - reel.correctRelief);
  assert.equal(hot.escaped, false);
  // even sitting at the escape ceiling, a correct key pulls back and never escapes
  const atCeiling = applyTension(reel.escapeAt, true, reel);
  assert.equal(atCeiling.tension, reel.escapeAt - reel.correctRelief);
  assert.equal(atCeiling.escaped, false);
});

test("applyTension: correct keys clamp at zero (careful typing can't go negative)", () => {
  const r = applyTension(1, true, reel);
  assert.equal(r.tension, 0);              // 1 - correctRelief would be negative → clamped
  assert.equal(r.escaped, false);
});

test("applyTension: wrong keys add tension and clamp at the escape ceiling", () => {
  const r = applyTension(0, false, reel);
  assert.equal(r.tension, reel.errorTension);
  assert.equal(r.escaped, false);
  // a wrong key can't push tension past escapeAt
  const over = applyTension(reel.escapeAt, false, reel);
  assert.equal(over.tension, reel.escapeAt);
  assert.equal(over.escaped, true);
});

test("applyTension: escape triggers exactly at the ceiling, not before", () => {
  const justBelow = reel.escapeAt - reel.errorTension;
  assert.equal(applyTension(justBelow - 1, false, reel).escaped, false); // stays under
  assert.equal(applyTension(justBelow, false, reel).escaped, true);      // reaches ceiling
});

test("catchReward adds the first-catch bonus only on a first catch", () => {
  assert.equal(catchReward(5, true, 2), 7);
  assert.equal(catchReward(5, false, 2), 5);
});

test("isPersonalBest treats a missing record as beatable by any weight", () => {
  assert.equal(isPersonalBest(undefined, 0.1), true);  // no record yet → any catch is a best
  assert.equal(isPersonalBest(3, 4), true);
  assert.equal(isPersonalBest(4, 4), false);           // ties are not a new best
  assert.equal(isPersonalBest(5, 4), false);
});

test("countsTowardTiming ignores the first key of a word and long idle gaps", () => {
  assert.equal(countsTowardTiming(0, 1000, 5000), false);      // no prior key this word
  assert.equal(countsTowardTiming(1000, 1300, 5000), true);    // 300ms gap → counts
  assert.equal(countsTowardTiming(1000, 7000, 5000), false);   // 6s gap → kid stepped away
});

const tiers = [
  { rank: "minnow",   location: "pond"   },
  { rank: "mackerel", location: "stream" },
  { rank: "marlin",   location: "ocean"  },
];
// mirrors the real CONFIG.shop.rods shape (A6): bamboo gates the Stream,
// deepsea gates the Ocean, and carbon is a luck-only upgrade in between
const rods = [
  { id: "stick"  },                              // no unlocksLocation
  { id: "bamboo",  unlocksLocation: "stream" },
  { id: "carbon"  },                             // luck upgrade, opens nothing
  { id: "deepsea", unlocksLocation: "ocean"  },
];

test("locationsForRods: pond is always open; rods add their locations", () => {
  assert.deepEqual(locationsForRods(tiers, rods, ["stick"]), ["pond"]);
  assert.deepEqual(locationsForRods(tiers, rods, ["stick", "bamboo"]), ["pond", "stream"]);
  // a locationless rod adds nothing; owning every rod opens everything
  assert.deepEqual(locationsForRods(tiers, rods, ["stick", "carbon"]), ["pond"]);
  assert.deepEqual(locationsForRods(tiers, rods, ["stick", "bamboo", "carbon", "deepsea"]),
                   ["pond", "stream", "ocean"]);
});

test("locationsForRods is cumulative: a skipped tier still opens (A6)", () => {
  // saving straight for the deep-sea rod must not leave the Stream shut behind
  // it: the Ocean's sentences build on the phrases/capitals the Stream teaches
  assert.deepEqual(locationsForRods(tiers, rods, ["stick", "deepsea"]),
                   ["pond", "stream", "ocean"]);
  // always tier order, never rod order or insertion order
  assert.deepEqual(locationsForRods(tiers, rods, ["deepsea", "bamboo", "stick"]),
                   ["pond", "stream", "ocean"]);
});

test("rankForState: furthest unlocked location, never below the home rank", () => {
  assert.equal(rankForState(tiers, ["pond"]), "minnow");
  assert.equal(rankForState(tiers, ["pond", "stream"]), "mackerel");
  assert.equal(rankForState(tiers, ["pond", "stream", "ocean"]), "marlin");
  assert.equal(rankForState(tiers, []), "minnow");   // defends to the home rank
});

test("tokenize splits a phrase into ordered word/space tokens", () => {
  assert.deepEqual(tokenize("ask a lad"), [
    { type: "word", text: "ask" },
    { type: "space", text: " " },
    { type: "word", text: "a" },
    { type: "space", text: " " },
    { type: "word", text: "lad" },
  ]);
  assert.deepEqual(tokenize("hi"), [{ type: "word", text: "hi" }]);
  assert.deepEqual(tokenize(""), []);
});

test("tokenize keeps punctuation as its own token (forward reach for A5 sentences)", () => {
  assert.deepEqual(tokenize("go, cat!"), [
    { type: "word", text: "go" },
    { type: "punct", text: "," },
    { type: "space", text: " " },
    { type: "word", text: "cat" },
    { type: "punct", text: "!" },
  ]);
  // capitals still tokenize as words (A2 adds Shift; tokenizer is ready)
  assert.deepEqual(tokenize("Go Fish").map(t => t.type), ["word", "space", "word"]);
});

test("wordCount is the number of reel segments a phrase takes to land", () => {
  assert.equal(wordCount("ask a lad"), 3);
  assert.equal(wordCount("dad"), 1);
  assert.equal(wordCount("half a salad"), 3);
  assert.equal(wordCount(""), 0);
});

test("computeWpm is 5-chars-per-word over active minutes, rounded (A4)", () => {
  assert.equal(computeWpm(25, 60000), 5);     // 25 chars = 5 words in 1 min → 5 wpm
  assert.equal(computeWpm(100, 60000), 20);
  assert.equal(computeWpm(50, 30000), 20);    // 10 words in half a minute → 20 wpm
  assert.equal(computeWpm(0, 60000), 0);      // no chars
  assert.equal(computeWpm(25, 0), 0);         // no time → never divides by zero
});

test("isPersonalBestWpm beats the stored best, and any real wpm beats no record", () => {
  assert.equal(isPersonalBestWpm(undefined, 20), true);
  assert.equal(isPersonalBestWpm(null, 20), true);
  assert.equal(isPersonalBestWpm(18, 20), true);
  assert.equal(isPersonalBestWpm(20, 20), false);   // a tie is not a new best
  assert.equal(isPersonalBestWpm(25, 20), false);
  assert.equal(isPersonalBestWpm(undefined, 0), false); // a zero wpm is never a best
});

test("isEvenCadence praises a steady cadence and withholds on spread/short input", () => {
  assert.equal(isEvenCadence([200, 210, 190, 205], 2, 0.5), true);   // tight → even
  assert.equal(isEvenCadence([120, 600, 130, 700], 2, 0.5), false);  // lumpy → not even
  assert.equal(isEvenCadence([200], 2, 0.5), false);                 // too few gaps
  assert.equal(isEvenCadence([], 2, 0.5), false);                    // nothing typed
  assert.equal(isEvenCadence([300, 300, 300], 2, 0.5), true);        // perfectly even
});

test("tierWithFallback degrades a rolled tier to what the spot actually has (A3)", () => {
  const stream = new Set(["common", "uncommon", "rare"]);   // no legendary yet
  assert.equal(tierWithFallback(stream, "legendary", TIER_ORDER), "rare"); // steps down
  assert.equal(tierWithFallback(stream, "rare", TIER_ORDER), "rare");      // present → unchanged
  assert.equal(tierWithFallback(stream, "common", TIER_ORDER), "common");
  const all = new Set(["common", "uncommon", "rare", "legendary"]);        // the Pond
  assert.equal(tierWithFallback(all, "legendary", TIER_ORDER), "legendary");
  // only a high tier present → a low roll steps up rather than returning empty
  assert.equal(tierWithFallback(new Set(["rare"]), "common", TIER_ORDER), "rare");
  // nothing present → hand back the desired tier (caller handles the empty pick)
  assert.equal(tierWithFallback(new Set(), "uncommon", TIER_ORDER), "uncommon");
});

const prestige = { rank: "muskie", fishId: "muskie", label: "Muskie Master" };

test("rankForProfile: prestige outranks any location-derived rank (A8)", () => {
  // without it, rank is exactly what the locations say
  assert.equal(rankForProfile(tiers, ["pond"], prestige, false), "minnow");
  assert.equal(rankForProfile(tiers, ["pond", "stream", "ocean"], prestige, false), "marlin");
  // with it, prestige wins from anywhere: it isn't a place you travel to
  assert.equal(rankForProfile(tiers, ["pond", "stream", "ocean"], prestige, true), "muskie");
  assert.equal(rankForProfile(tiers, ["pond"], prestige, true), "muskie");
  // a missing/!rank prestige config must never blank out a real rank
  assert.equal(rankForProfile(tiers, ["pond", "stream"], undefined, true), "mackerel");
  assert.equal(rankForProfile(tiers, ["pond", "stream"], {}, true), "mackerel");
});

test("earnsPrestige fires once, for the right fish only (A8)", () => {
  assert.equal(earnsPrestige(prestige, "muskie", false), true);    // the moment
  assert.equal(earnsPrestige(prestige, "muskie", true), false);    // already had it, no encore
  assert.equal(earnsPrestige(prestige, "tuna", false), false);     // wrong fish
  assert.equal(earnsPrestige(prestige, "koi", false), false);      // a legendary, but not THE one
  assert.equal(earnsPrestige(undefined, "muskie", false), false);  // no config → never throws
  assert.equal(earnsPrestige({}, "muskie", false), false);
});

test("the prestige rank is not one of the location tiers (A8: it can't be bought)", () => {
  assert.ok(!CONFIG.tiers.some(t => t.rank === CONFIG.prestige.rank),
    "prestige rank must stay out of CONFIG.tiers, or a rod could grant it");
});

test("pickDistinct fills a fight without repeating while the pool allows (A7)", () => {
  const pool = ["a", "b", "c", "d"];
  const seq = [0, 0, 0, 0];                    // always take the first of what's left
  let i = 0;
  const rnd = () => seq[i++ % seq.length];
  assert.deepEqual(pickDistinct(pool, 3, rnd), ["a", "b", "c"]);   // no repeats
  assert.equal(pickDistinct(pool, 1, rnd).length, 1);
  assert.deepEqual(pickDistinct(pool, 0, rnd), []);
  assert.deepEqual(pickDistinct([], 3, rnd), []);                  // empty pool never throws
});

test("pickDistinct repeats only once the pool is genuinely exhausted (A7)", () => {
  const rnd = () => 0;
  // a 2-entry pool asked for 5 must still return 5, cycling rather than stalling
  const got = pickDistinct(["a", "b"], 5, rnd);
  assert.equal(got.length, 5);
  assert.deepEqual([...new Set(got)].sort(), ["a", "b"]);
  // the first pass uses each entry before any repeat appears
  assert.deepEqual([...new Set(got.slice(0, 2))].sort(), ["a", "b"]);
});

test("segmentsForTier scales the fight by tier, and only at fight waters (A7)", () => {
  const cfg = { fromLocations: ["ocean"], segmentsByTier: { common: 1, rare: 2, legendary: 3 } };
  assert.equal(segmentsForTier(cfg, "ocean", "legendary"), 3);
  assert.equal(segmentsForTier(cfg, "ocean", "rare"), 2);
  assert.equal(segmentsForTier(cfg, "ocean", "common"), 1);
  // the Pond and the Stream never fight: one segment whatever the tier
  assert.equal(segmentsForTier(cfg, "stream", "legendary"), 1);
  assert.equal(segmentsForTier(cfg, "pond", "legendary"), 1);
  // unknown tier, missing config, and a bad count all defend to a single segment
  assert.equal(segmentsForTier(cfg, "ocean", "mythic"), 1);
  assert.equal(segmentsForTier(undefined, "ocean", "rare"), 1);
  assert.equal(segmentsForTier({ fromLocations: ["ocean"], segmentsByTier: { rare: 0 } }, "ocean", "rare"), 1);
});

test("a fight's segments never exceed the sentence pool's real content (A7 sanity)", () => {
  // guards the config against asking for more sentences than the Ocean has
  const most = Math.max(...Object.values(CONFIG.fight.segmentsByTier));
  assert.ok(most >= 1 && most <= 5, `segmentsByTier tops out at ${most}: that's a long fight for a kid`);
});

test("the catch card's subtitle joins its parts with exactly one separator each", () => {
  assert.equal(catchSubtitle(1.3, "normal"), "1.3 lb");
  assert.equal(catchSubtitle(12.4, "lunker"), "12.4 lb · a LUNKER!");
  assert.equal(catchSubtitle(0.7, "little"), "0.7 lb · a little one");
  // the regression: a Stream catch read "1.3 lb · a little one · · 255 wpm",
  // because the weight clause and the wpm clause each brought their own dot
  assert.equal(catchSubtitle(1.3, "little", 255), "1.3 lb · a little one · 255 wpm");
  assert.equal(catchSubtitle(3.4, "normal", 41), "3.4 lb · 41 wpm");
  assert.ok(!/·\s*·/.test(catchSubtitle(1.3, "little", 255)), "no doubled separator, ever");
  // a spot that does not measure speed says nothing about it, rather than 0 wpm
  assert.equal(catchSubtitle(2, "normal", 0), "2 lb");
  assert.equal(catchSubtitle(2, "normal"), "2 lb");
});

test("punPool prefers the spot's own lines and falls back to the shared pool", () => {
  const pools = { shared: { cast: ["shared cast"], junk: ["shared junk"] },
                  pond: { cast: ["pond cast"] }, ocean: {} };
  assert.deepEqual(punPool(pools, "pond", "cast"), ["pond cast"], "a spot's own lines win");
  assert.deepEqual(punPool(pools, "pond", "junk"), ["shared junk"], "a moment it does not override falls back");
  assert.deepEqual(punPool(pools, "ocean", "cast"), ["shared cast"], "an empty spot pool still falls back");
  // the three ways this gets called before there is anything to say: no profile
  // yet, a spot the pools have never heard of, a moment nobody wrote. All of
  // them have to be an empty list rather than undefined, because app.js picks
  // out of the result and a crash here would be a crash mid-cast.
  assert.deepEqual(punPool(pools, undefined, "cast"), ["shared cast"]);
  assert.deepEqual(punPool(pools, "lagoon", "cast"), ["shared cast"]);
  assert.deepEqual(punPool(pools, "pond", "nosuchmoment"), []);
  assert.deepEqual(punPool(undefined, "pond", "cast"), []);
});

test("ambienceFor falls back to the shared bed, and to nothing at all", () => {
  const amb = { shared: { bed: "quiet" }, pond: { bed: "frogs" } };
  assert.deepEqual(ambienceFor(amb, "pond"), { bed: "frogs" }, "a spot's own soundscape wins");
  assert.deepEqual(ambienceFor(amb, "lagoon"), { bed: "quiet" }, "a spot with no entry gets shared");
  assert.deepEqual(ambienceFor(amb, undefined), { bed: "quiet" }, "and so does no spot at all");
  // A registry with no fallback in it must be null rather than undefined: the
  // caller skips building a bed on it, and building one out of undefined is a
  // crash at boot rather than a quiet game.
  assert.equal(ambienceFor({ pond: { bed: "frogs" } }, "ocean"), null);
  assert.equal(ambienceFor(undefined, "pond"), null);
});

test("nextVoiceDelayMs lands inside its range, and never at zero", () => {
  assert.equal(nextVoiceDelayMs([1000, 3000], () => 0), 1000);
  assert.equal(nextVoiceDelayMs([1000, 3000], () => 0.5), 2000);
  assert.equal(nextVoiceDelayMs([1000, 3000], () => 0.999), 2998);
  assert.equal(nextVoiceDelayMs(1500, () => 0.5), 1500, "a bare number is a fixed gap");
  // A malformed range must not become a zero-delay timer: that is a voice
  // firing every tick, which is a locked tab rather than a wrong sound.
  assert.equal(nextVoiceDelayMs([3000, 1000], () => 0.9), 3000, "a backwards range holds at its floor");
  assert.equal(nextVoiceDelayMs([0, 500], () => 0.5), 60000);
  assert.equal(nextVoiceDelayMs(undefined), 60000);
  assert.equal(nextVoiceDelayMs([]), 60000);
});

test("buildReelPool works on phrase entries too (content-agnostic on .d)", () => {
  const phrases = [{ text: "a sad lad", d: 1 }, { text: "a red hat", d: 2 }];
  assert.deepEqual(buildReelPool(phrases, 1, 1).map(e => e.text), ["a sad lad"]);
  // difficulty 2 includes both (d>=1 after widening isn't needed; d in [2,2] is thin → widens)
  assert.equal(buildReelPool(phrases, 2, 2).length, 2);
});

test("overallAccuracy sums correct vs. error keystrokes across the letter map", () => {
  const empty = overallAccuracy({});
  assert.equal(empty.keys, 0);
  assert.equal(empty.pct, 0);
  const acc = overallAccuracy({ a: { n: 9, errors: 1 }, s: { n: 10, errors: 0 } });
  assert.equal(acc.keys, 20);
  assert.equal(acc.pct, 19 / 20);
});

// ---- Quick Cast (the timed speed test) ----

test("speedTestPool hands back the whole pool unless letter-gating is asked for", () => {
  const entries = [
    { w: "sad",  letters: "ads" },
    { w: "quiz", letters: "iquz" },
  ];
  const homeRow = new Set("asdfjkl");
  // the shipped default: every word, so a score means the same thing at any rank
  assert.deepEqual(speedTestPool(entries, homeRow, false), entries);
  // opt-in gating keeps a run inside the letters a kid has been taught
  assert.deepEqual(speedTestPool(entries, homeRow, true), [entries[0]]);
  // gating with nothing unlocked yields nothing (the caller falls back)
  assert.deepEqual(speedTestPool(entries, new Set(), true), []);
});

test("typingAccuracy is a whole percent and never NaN", () => {
  assert.equal(typingAccuracy(0, 0), 0);        // nothing pressed
  assert.equal(typingAccuracy(90, 10), 90);
  assert.equal(typingAccuracy(1, 0), 100);
  assert.equal(typingAccuracy(0, 7), 0);        // all wrong
  assert.equal(typingAccuracy(2, 1), 67);       // rounded, not truncated
});

test("a timed run scores WPM off the fixed duration, and a best must beat the old one", () => {
  // 150 correct chars in 30s = 30 words in half a minute = 60 wpm
  assert.equal(computeWpm(150, 30_000), 60);
  assert.equal(computeWpm(0, 30_000), 0);       // typed nothing
  assert.equal(isPersonalBestWpm(undefined, 60), true);   // no record yet
  assert.equal(isPersonalBestWpm(60, 60), false);         // tying is not beating
  assert.equal(isPersonalBestWpm(60, 61), true);
});

// ---- R1: cast, line and reel motion (ANIMATION.md) ----

test("the cast arc leaves the rod tip and hits the landing point, whatever the apex", () => {
  const rod = { x: 124, y: 140 }, water = { x: 394, y: 196 };
  for (const apex of [0, 34, 200]) {
    assert.deepEqual(castArcPoint(rod, water, apex, 0), rod);       // starts on the rod tip
    assert.deepEqual(castArcPoint(rod, water, apex, 1), water);     // ends where it lands
  }
  // and in between it arcs ABOVE the straight chord (smaller y is higher)
  const chordMidY = (rod.y + water.y) / 2;
  assert.equal(castArcPoint(rod, water, 40, 0.5).y, chordMidY - 40);
  assert.ok(castArcPoint(rod, water, 40, 0.25).y < chordMidY);
  // t is clamped, so a late frame can't fling the lure past the water
  assert.deepEqual(castArcPoint(rod, water, 40, 1.4), water);
});

test("tension tightens the line and never slackens it", () => {
  const slack = 26, taut = 3;
  assert.equal(lineSagPx(0, slack, taut), slack);       // calm: full sag
  assert.equal(lineSagPx(100, slack, taut), taut);      // maxed: nearly straight
  assert.ok(lineSagPx(50, slack, taut) < slack);        // monotonic between
  assert.ok(lineSagPx(50, slack, taut) > taut);
  // out-of-range and missing values clamp rather than invert the curve
  assert.equal(lineSagPx(140, slack, taut), taut);
  assert.equal(lineSagPx(-20, slack, taut), slack);
  assert.equal(lineSagPx(undefined, slack, taut), slack);
});

test("the line's control point hangs below the chord midpoint", () => {
  const c = lineControlPoint({ x: 100, y: 100 }, { x: 300, y: 200 }, 20);
  assert.deepEqual(c, { x: 200, y: 170 });   // midpoint (200,150) + 20 down
});

test("a tug decays back to rest and never runs away", () => {
  const cfg = { stiffness: 190, damping: 16 };
  let s = { angle: 0, vel: -46 };            // one keystroke's impulse
  let peak = 0;
  for (let i = 0; i < 400; i++) {            // ~6.6s at 60fps
    s = stepTug(s.angle, s.vel, 16.7, cfg);
    peak = Math.max(peak, Math.abs(s.angle));
  }
  assert.ok(peak < 12, `tug peaked at ${peak}deg: too wild for a rod tip`);
  assert.ok(Math.abs(s.angle) < 0.05, `rod never settled (${s.angle}deg)`);
  // a long stall between frames is clamped, not integrated in one lurch
  const lurch = stepTug(0, -46, 5000, cfg);
  assert.ok(Math.abs(lurch.angle) < 12);
});

test("rotating the rod tip about the grip keeps the line attached", () => {
  const grip = { x: 58, y: 18 }, tip = { x: 104, y: -28 };
  const still = rotateAboutPivot(tip, grip, 0);
  assert.ok(Math.hypot(still.x - tip.x, still.y - tip.y) < 1e-9);   // no rotation, no move
  const back = rotateAboutPivot(tip, grip, -20);                    // pulled back over the kid
  assert.ok(back.y < tip.y, "a backswing lifts the rod tip");
  assert.ok(back.x < tip.x, "…and brings it back toward the angler");
  // rotation is rigid: the tip stays the same distance from the grip
  const before = Math.hypot(tip.x - grip.x, tip.y - grip.y);
  const after = Math.hypot(back.x - grip.x, back.y - grip.y);
  assert.ok(Math.abs(before - after) < 1e-9);
});

test("the cast easings are clamped and end where they should", () => {
  for (const f of [easeIn, easeOut]) {
    assert.equal(f(0), 0);
    assert.equal(f(1), 1);
    assert.equal(f(-3), 0);   // clamped, so an early/late frame can't overshoot
    assert.equal(f(9), 1);
  }
  assert.ok(easeIn(0.5) < 0.5);    // slow to load
  assert.ok(easeOut(0.5) > 0.5);   // decays into the landing
});

// R7: the gear shop swaps a rod or a hat into the angler's layer stack, and the
// grid of <item> x <pose> paintings is filled in one delivery at a time. So the
// interesting cases are all the MISSING ones: what a kid sees between buying a
// rod and that rod being painted for the water they're standing in. Getting
// this wrong doesn't throw: it 404s into an invisible rod mid-cast, which is
// the failure R4 refused to ship for poses and R6 for fish.
test("a gear layer falls back rather than pointing at a painting that isn't there", () => {
  const rods = [
    { id: "stick",  file: "rod-stick"  },
    { id: "bamboo", file: "rod-bamboo" },
  ];
  const hats = [
    { id: "none" },                        // the free default paints nothing, on purpose
    { id: "straw", file: "hat-straw" },
  ];
  const art = ["rod-stick-pond", "rod-bamboo-stream", "hat-straw-pond"];
  const rodLayer = { id: "rod", gear: "rod", file: "rod-stick-pond" };
  const hatLayer = { id: "hat", gear: "hat" };
  const fixed    = { id: "body", file: "angler-pond-body" };

  // fixed art ignores every gear argument
  assert.equal(gearFile(fixed, "pond", "bamboo", rods, art), "angler-pond-body");
  assert.equal(gearFile(fixed, "ocean", null, null, []), "angler-pond-body");

  // the equipped rod, where its art for this pose exists
  assert.equal(gearFile(rodLayer, "stream", "bamboo", rods, art), "rod-bamboo-stream");
  assert.equal(gearFile(rodLayer, "pond", "stick", rods, art), "rod-stick-pond");

  // …and the pose's own painted rod where it doesn't. This is the case that
  // matters: bamboo is bought and equipped, but nobody has painted it for the
  // Pond yet, so the kid keeps holding the Pond's stick rather than nothing.
  assert.equal(gearFile(rodLayer, "pond", "bamboo", rods, art), "rod-stick-pond");

  // a hat slot has no fallback art, so it correctly resolves to nothing
  assert.equal(gearFile(hatLayer, "pond", "straw", hats, art), "hat-straw-pond");
  assert.equal(gearFile(hatLayer, "stream", "straw", hats, art), null,  "no straw hat painted for the Stream yet");
  assert.equal(gearFile(hatLayer, "pond", "none", hats, art), null,     "Just Hair is a bare head, not a missing file");

  // and nothing here throws on a save that predates the slot, or a bad id
  assert.equal(gearFile(hatLayer, "pond", undefined, hats, art), null);
  assert.equal(gearFile(rodLayer, "pond", "nosuchrod", rods, art), "rod-stick-pond");
  assert.equal(gearFile(rodLayer, "pond", "bamboo", undefined, art), "rod-stick-pond");
});

// ---- The reel pull, and the reveal riding on it ----
// The bug these guard: the reel used to chase its target with `fishX +=
// (fishTX - fishX) * 0.08` once per FRAME. Two faults in one line: the speed
// depended on the monitor's refresh rate, and an exponential's velocity peaks
// on its first frame, so a completed word threw the fish a third of the way to
// its new mark in ~100ms from a standstill and then crept. That is seen as a
// jump. What makes the fix a fix is the START of the curve, not the end.

test("the reel easing leaves and arrives at rest, which is what stops the jump", () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.equal(easeInOut(-3), 0);       // clamped like the cast easings
  assert.equal(easeInOut(9), 1);
  assert.equal(easeInOut(0.5), 0.5);    // symmetric about the halfway point
  // it only ever moves forward
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const k = easeInOut(t);
    assert.ok(k >= prev, `easeInOut went backwards at t=${t}`);
    prev = k;
  }
  // THE point: the first tenth of the tween covers a small fraction of the
  // travel, where the old exponential covered ~28% of it in the same tenth.
  assert.ok(easeInOut(0.1) < 0.05, `opens too fast (${easeInOut(0.1)}): that reads as a jump`);
  const exponentialInAFrame = 1 - Math.pow(1 - 0.08, 6);   // the old curve, 6 frames ≈ 100ms
  assert.ok(easeInOut(0.1) < exponentialInAFrame / 4);
  // …and it decelerates into the mark rather than creeping at it forever
  assert.ok(easeInOut(0.9) > 0.95);
});

test("reel progress is read back out of the fish's own x", () => {
  const path = CONFIG.fish.path;
  assert.equal(reelProgressAtX(path, path.fromX), 0);   // just hooked
  assert.equal(reelProgressAtX(path, path.toX), 1);     // at the boat
  assert.ok(Math.abs(reelProgressAtX(path, (path.fromX + path.toX) / 2) - 0.5) < 1e-9);
  // the fish spawns OUTSIDE the path (deep and right of it) and runs back out
  // during a fight, so both ends have to clamp rather than go negative
  assert.equal(reelProgressAtX(path, path.fromX + 60), 0);
  assert.equal(reelProgressAtX(path, path.toX - 60), 1);
  assert.equal(reelProgressAtX({ fromX: 100, toX: 100 }, 100), 1);   // degenerate path
});

test("the species stays a shape until the fish is close", () => {
  const { startAt: s, fullAt: f } = CONFIG.fish.reveal;
  assert.ok(s > 0 && s < f && f <= 1, "the ramp needs room for both a murk and a reveal");
  assert.equal(revealAt(0, s, f), 0);         // at the bite: the approach silhouette
  assert.equal(revealAt(s, s, f), 0);         // still nothing at the threshold
  assert.equal(revealAt(f, s, f), 1);         // and a nameable fish by fullAt
  assert.equal(revealAt(s / 2, s, f), 0, "nothing may clear before startAt");
  const mid = revealAt((s + f) / 2, s, f);
  assert.ok(mid > 0.49 && mid < 0.51);
  // clamped at both ends
  assert.equal(revealAt(-1, s, f), 0);
  assert.equal(revealAt(9, s, f), 1);
  // 1 is a plain linear reveal across the whole reel; an inverted or collapsed
  // range degrades to a hard switch at fullAt rather than dividing by zero
  assert.equal(revealAt(0.5, 0, 1), 0.5);
  assert.equal(revealAt(0.69, 0.7, 0.7), 0);
  assert.equal(revealAt(0.7, 0.7, 0.7), 1);
  assert.equal(revealAt(0.9, 0.8, 0.2), 1);
});

// The reveal has to COMPLETE, and it is not the reel that decides where it
// stops. land() fires in the same tick the last word sets its target, so the
// fish is never drawn at progress 1: the furthest it reaches is one word
// short of the boat, and the cheapest tier reaches the least. Setting fullAt
// to 1 left a common fish 36% revealed when it broke the surface, which is
// what this catches.
test("every tier is fully revealed before it is landed", () => {
  const { startAt, fullAt } = CONFIG.fish.reveal;
  for (const [tier, words] of Object.entries(CONFIG.reel.wordsToLandByTier)) {
    const furthestDrawn = (words - 1) / words;
    assert.equal(revealAt(furthestDrawn, startAt, fullAt), 1,
      `a ${tier} (${words} words) is only ${revealAt(furthestDrawn, startAt, fullAt)} revealed when it lands`);
  }
});

// A floor rather than a test of behaviour. logic.js is where the pure decisions
// go as they come out of app.js (which is DOM-bound and cannot be imported
// here), so the one thing that must not happen quietly is a function landing in
// it with no test at all: that is how the untested half grows back.
test("every function logic.js exports is exercised by this file", () => {
  const src = readFileSync(new URL("../logic.js", import.meta.url), "utf8");
  const exported = [...src.matchAll(/^export function ([A-Za-z0-9_]+)/gm)].map(m => m[1]);
  assert.ok(exported.length > 20, "no exports found: this test lost its grip on logic.js");
  const here = readFileSync(new URL(import.meta.url), "utf8");
  const untested = exported.filter(name => !new RegExp(`\\b${name}\\b`).test(here));
  assert.deepEqual(untested, [], "logic.js exports these with no test in logic.test.mjs");
});
