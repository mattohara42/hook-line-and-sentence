// Unit tests for the pure game math in logic.js. Deterministic — RNG is
// injected, so no browser and no flakiness. Run with `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import {
  unlockedStageCount, lettersForStages, pickTier, weightClass, rollWeight, buildReelPool,
  applyTension, catchReward, isPersonalBest, countsTowardTiming, overallAccuracy,
  locationsForRods, rankForState, tokenize,
} from "../logic.js";

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
const rods = [
  { id: "stick"  },                              // no unlocksLocation
  { id: "bamboo", unlocksLocation: "stream" },
  { id: "carbon", unlocksLocation: "ocean"  },
];

test("locationsForRods: pond is always open; rods add their locations", () => {
  assert.deepEqual(locationsForRods(tiers, rods, ["stick"]), ["pond"]);
  assert.deepEqual(locationsForRods(tiers, rods, ["stick", "bamboo"]), ["pond", "stream"]);
  // owning a rod twice / owning a locationless rod doesn't duplicate or add
  assert.deepEqual(locationsForRods(tiers, rods, ["stick", "carbon", "bamboo"]).sort(),
                   ["ocean", "pond", "stream"]);
});

test("rankForState: furthest unlocked location, never below the home rank", () => {
  assert.equal(rankForState(tiers, ["pond"]), "minnow");
  assert.equal(rankForState(tiers, ["pond", "stream"]), "mackerel");
  assert.equal(rankForState(tiers, ["pond", "stream", "ocean"]), "marlin");
  assert.equal(rankForState(tiers, []), "minnow");   // defends to the home rank
});

test("tokenize splits a phrase into ordered word and single-space tokens", () => {
  assert.deepEqual(tokenize("a lad has"), ["a", " ", "lad", " ", "has"]);
  assert.deepEqual(tokenize("hi"), ["hi"]);          // a single word is one token
  assert.deepEqual(tokenize(""), []);                // empty text → no tokens
  // the reel keeps only word tokens; the count is what wordsToLand uses
  assert.equal(tokenize("cast the line").filter(t => !/\s/.test(t)).length, 3);
});

test("overallAccuracy sums correct vs. error keystrokes across the letter map", () => {
  const empty = overallAccuracy({});
  assert.equal(empty.keys, 0);
  assert.equal(empty.pct, 0);
  const acc = overallAccuracy({ a: { n: 9, errors: 1 }, s: { n: 10, errors: 0 } });
  assert.equal(acc.keys, 20);
  assert.equal(acc.pct, 19 / 20);
});
