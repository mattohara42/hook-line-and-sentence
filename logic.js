// logic.js — pure game math. No DOM, no module globals, no implicit RNG:
// everything a function needs comes in as an argument, so app.js can wire in
// its live CONFIG/save/word pool while tests can pass fixtures and a seeded
// roll. This is the layer worth unit-testing; app.js keeps thin wrappers.

// How many unlock stages a lifetime catch count has opened.
export function unlockedStageCount(stages, totalCatches) {
  return stages.filter(s => totalCatches >= s.catchesRequired).length;
}

// The cumulative set of letters unlocked across the first `count` stages.
export function lettersForStages(stages, count) {
  return new Set(stages.slice(0, count).flatMap(s => [...s.letters]));
}

// Which tier a bite is, given a tier→probability map and a roll r in [0,1).
// Walks the cumulative distribution; falls back to "common" if odds under-sum.
export function pickTier(odds, r = Math.random()) {
  for (const [tier, p] of Object.entries(odds)) {
    r -= p;
    if (r < 0) return tier;
  }
  return "common";
}

// Classify a weight within its tier's range: "lunker" | "little" | "".
// Unknown tiers fall back to the common range (matches the roll below).
export function weightClass(sizeCfg, tier, weight) {
  const [min, max] = sizeCfg.weightRangeByTier[tier] ?? sizeCfg.weightRangeByTier.common;
  const frac = (weight - min) / (max - min);
  return frac >= sizeCfg.lunkerFrac ? "lunker"
       : frac <= sizeCfg.littleFrac ? "little" : "";
}

// Roll a catch weight (lb, rounded to 0.1) for a tier plus its class.
// rnd() defaults to Math.random; class is taken from the unrounded weight.
export function rollWeight(sizeCfg, tier, rnd = Math.random) {
  const [min, max] = sizeCfg.weightRangeByTier[tier] ?? sizeCfg.weightRangeByTier.common;
  const w = min + rnd() * (max - min);
  return { weight: Math.round(w * 10) / 10, cls: weightClass(sizeCfg, tier, w) };
}

// Tension after one processed keystroke while reeling. The SPEC's core rule:
// tension reacts to errors only, never speed. A correct key relieves tension
// (at any typing speed — slow-but-careful is always safe); a wrong key adds.
// Result is clamped to [0, escapeAt]; `escaped` is the game's one fail state,
// true only when a wrong key pushes tension to the escape ceiling.
export function applyTension(current, correct, reelCfg) {
  if (correct) {
    return { tension: Math.max(0, current - reelCfg.correctRelief), escaped: false };
  }
  const tension = Math.min(reelCfg.escapeAt, current + reelCfg.errorTension);
  return { tension, escaped: tension >= reelCfg.escapeAt };
}

// Coins awarded for a catch: the fish's base value plus a one-time bonus the
// first time a species is landed.
export function catchReward(fishCoins, firstCatch, firstCatchBonus) {
  return fishCoins + (firstCatch ? firstCatchBonus : 0);
}

// A caught weight is a new personal best when it beats the stored record — or
// when there is no record yet (previousBest undefined → treated as 0).
export function isPersonalBest(previousBest, weight) {
  return weight > (previousBest ?? 0);
}

// Whether a correct keystroke's latency counts toward timing stats: it needs a
// prior keystroke this word (lastKeyTime set) and a gap under the "kid stepped
// away" ceiling, so idle pauses don't pollute the silent timing data.
export function countsTowardTiming(lastKeyTime, now, maxLatencyMs) {
  return lastKeyTime > 0 && (now - lastKeyTime) < maxLatencyMs;
}

// Overall accuracy across a per-letter stats map ({ letter: { n, errors } }):
// the fraction of keystrokes that were correct, plus the total keys seen.
// Empty map → 0% over 0 keys (badge thresholds gate on a key minimum).
export function overallAccuracy(letters) {
  let n = 0, e = 0;
  for (const k in letters) { n += letters[k].n; e += letters[k].errors; }
  return { pct: n + e ? n / (n + e) : 0, keys: n + e };
}

// Which locations a profile has unlocked, derived from the rods it owns (like
// letters derive from catches). tiers[0].location is the always-open home spot.
// Tiers are an ordered curriculum, so this is *cumulative*: owning a rod that
// opens a later spot opens every spot up to it, even if the kid skipped that
// tier's own rod. Without this, saving straight for the deep-sea rod (A6) would
// unlock the Ocean while leaving the Stream shut — dropping the kid into
// punctuated sentences without the spacebar/capitals the Stream teaches, and
// showing them a Stream group in the journal they couldn't fish. Returns tier
// order (never rod order), so it's stable however the shop is arranged.
export function locationsForRods(tiers, rods, ownedRodIds) {
  const opened = new Set(rods.filter(r => r.unlocksLocation && ownedRodIds.includes(r.id))
                             .map(r => r.unlocksLocation));
  let furthest = 0;
  tiers.forEach((t, i) => { if (opened.has(t.location)) furthest = i; });
  return tiers.slice(0, furthest + 1).map(t => t.location);
}

// The earned rank: the furthest tier whose location the profile has unlocked.
// tiers are ordered easiest→hardest; pond is always unlocked so this is never
// below tiers[0].rank. (Muskie is a prestige rank awarded on the legendary
// catch, not location-derived — see BUILD_PLAN_ADVANCED A8.)
export function rankForState(tiers, locations) {
  let rank = tiers[0].rank;
  for (const t of tiers) if (locations.includes(t.location)) rank = t.rank;
  return rank;
}

// The rank a profile actually wears (A8). Normally the furthest location it has
// unlocked, but the prestige rank outranks all of them — it isn't a place you
// travel to, it's the legendary you landed, so it can't be derived from rods.
export function rankForProfile(tiers, locations, prestigeCfg, hasPrestige) {
  return hasPrestige && prestigeCfg?.rank ? prestigeCfg.rank : rankForState(tiers, locations);
}

// Does landing this fish earn the prestige rank *right now* (A8)? Only the
// prestige species, and only the first time — a second Muskie is a great day,
// not a second ceremony.
export function earnsPrestige(prestigeCfg, fishId, alreadyHad) {
  return !!prestigeCfg?.fishId && !alreadyHad && fishId === prestigeCfg.fishId;
}

// Words (or phrases) matched to a fish's difficulty, mixing in easier ones only
// when the pool is too thin to fill minSize (e.g. stage 1's lone hard word).
// Content-agnostic: works on any entry with a numeric `d`, so the phrase reel
// (AD2) draws from data/phrases.json through the same difficulty machinery.
export function buildReelPool(entries, difficulty, minSize) {
  let floor = difficulty, pool;
  do {
    const f = floor;
    pool = entries.filter(e => e.d >= f && e.d <= difficulty);
    floor--;
  } while (pool.length < minSize && floor >= 1);
  return pool;
}

// Split a reel string into ordered tokens for the token-at-a-time reel (AD2):
//   { type:"word",  text } — a run of letters; the unit you type
//   { type:"space", text } — the gap between words; a real (forgiving) key and
//                            the reel-crank beat (replaces word-mode's auto pause)
//   { type:"punct", text } — punctuation runs (A5 sentences), kept as their own
//                            token so the reel can pause on clause boundaries
// A1 phrases are letters + single spaces only; punct is here for forward reach.
export function tokenize(text) {
  const tokens = [];
  for (const m of text.matchAll(/[a-z]+|\s+|[^a-z\s]+/gi)) {
    const seg = m[0];
    const type = /[a-z]/i.test(seg[0]) ? "word" : /\s/.test(seg[0]) ? "space" : "punct";
    tokens.push({ type, text: seg });
  }
  return tokens;
}

// How many typeable words a reel string holds — the number of reel segments a
// phrase takes to land (its spaces are the beats between them).
export function wordCount(text) {
  return tokenize(text).filter(t => t.type === "word").length;
}

// Typing speed for a reeled catch (A4), the classic "5 chars = 1 word" WPM over
// the *active* typing time (idle gaps already excluded by the caller). A cozy
// number to beat, never a gate — 0 for empty/degenerate input, never throws.
export function computeWpm(chars, activeMs) {
  if (chars <= 0 || activeMs <= 0) return 0;
  return Math.round((chars / 5) / (activeMs / 60000));
}

// A caught WPM is a new personal best when it beats the stored one (and is a
// real, positive number). No record yet → any real WPM is a best.
export function isPersonalBestWpm(previousBestWpm, wpm) {
  return wpm > 0 && wpm > (previousBestWpm ?? 0);
}

// Fly-cast rhythm (A4): were these inter-key gaps (ms) an even, steady cadence?
// Cozy flavor only — needs at least minKeys gaps and a low spread (coefficient
// of variation = stddev/mean, at or under maxCv). Too few gaps or a stray idle
// pause → false (we simply withhold praise; there is never a penalty).
export function isEvenCadence(intervals, minKeys, maxCv) {
  const xs = intervals.filter(n => n > 0);
  if (xs.length < minKeys) return false;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (mean <= 0) return false;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance) / mean <= maxCv;
}

// Pick n entries for a multi-segment fight (A7), preferring not to repeat: a
// legendary that takes three sentences shouldn't reel the same one three times.
// Falls back to repeats only when the pool is genuinely smaller than n, and
// even then spreads them out by cycling rather than re-rolling. rnd() defaults
// to Math.random; pass a stub to make a fight deterministic in tests.
export function pickDistinct(items, n, rnd = Math.random) {
  if (!items.length || n <= 0) return [];
  const bag = [...items], out = [];
  while (out.length < n) {
    if (!bag.length) bag.push(...items);            // pool exhausted — refill and keep going
    out.push(...bag.splice(Math.floor(rnd() * bag.length), 1));
  }
  return out;
}

// How many segments (sentences) a fish takes to land at a fight location (A7).
// Unknown tiers — and every non-fight water — land in a single segment, so the
// Pond and the Stream are untouched by the Ocean's fight pacing.
export function segmentsForTier(fightCfg, location, tier) {
  if (!fightCfg?.fromLocations?.includes(location)) return 1;
  return Math.max(1, fightCfg.segmentsByTier?.[tier] ?? 1);
}

// The tier to actually serve when a rolled tier has no fish at the current spot
// (A3): step down the rarity order (hardest→easiest) to the first present tier,
// then up if still none. e.g. the Stream has no legendary yet, so a legendary
// roll there lands a rare. Returns `desired` untouched if nothing is present
// (the caller then handles an empty pick).
export function tierWithFallback(tiersPresent, desired, order) {
  const start = order.indexOf(desired);
  if (start < 0) return desired;
  for (let i = start; i < order.length; i++) if (tiersPresent.has(order[i])) return order[i];
  for (let i = start - 1; i >= 0; i--) if (tiersPresent.has(order[i])) return order[i];
  return desired;
}
