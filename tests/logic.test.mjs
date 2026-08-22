// Unit tests for the pure game math in logic.js. Deterministic — RNG is
// injected, so no browser and no flakiness. Run with `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import {
  unlockedStageCount, lettersForStages, pickTier, weightClass, rollWeight, buildReelPool,
  applyTension, catchReward, isPersonalBest, countsTowardTiming, overallAccuracy,
  locationsForRods, rankForState, tokenize, wordCount, tierWithFallback,
  computeWpm, isPersonalBestWpm, isEvenCadence, pickDistinct, segmentsForTier,
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
  // one hard word, several easy — minSize forces the easier tier in
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

test("locationsForRods is cumulative — a skipped tier still opens (A6)", () => {
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
  // the Pond and the Stream never fight — one segment whatever the tier
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
  assert.ok(most >= 1 && most <= 5, `segmentsByTier tops out at ${most} — that's a long fight for a kid`);
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
