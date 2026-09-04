// logic.js: pure game math. No DOM, no module globals, no implicit RNG:
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
// (at any typing speed: slow-but-careful is always safe); a wrong key adds.
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

// A caught weight is a new personal best when it beats the stored record, or
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

// R7: which painting a rig layer actually shows.
//
// A layer with no `gear` is fixed art and shows its own `file`. A gear layer
// shows the EQUIPPED item of that kind, named <the item's file stem>-<pose>,
// but only when that painting exists in `gearArt`. Otherwise it falls back to
// the layer's own `file`, and a layer with neither shows nothing at all.
//
// The fallback is the point. Without it, equipping a rod whose art for the
// current pose has not been painted yet asks for a PNG that isn't there and
// hands a kid an invisible rod mid-cast. With it, they get the pose's own
// painted rod until the real one lands: the same "wrong shirt rather than no
// angler" trade R4 made for poses and R6 made for fish.
export function gearFile(layer, poseName, equippedId, items, gearArt) {
  if (!layer.gear) return layer.file ?? null;
  const item = items?.find(i => i.id === equippedId);
  const stem = item?.file ? `${item.file}-${poseName}` : null;
  return (stem && gearArt.includes(stem)) ? stem : (layer.file ?? null);
}

// Which locations a profile has unlocked, derived from the rods it owns (like
// letters derive from catches). tiers[0].location is the always-open home spot.
// Tiers are an ordered curriculum, so this is *cumulative*: owning a rod that
// opens a later spot opens every spot up to it, even if the kid skipped that
// tier's own rod. Without this, saving straight for the deep-sea rod (A6) would
// unlock the Ocean while leaving the Stream shut: dropping the kid into
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
// catch, not location-derived: see BUILD_PLAN_ADVANCED A8.)
export function rankForState(tiers, locations) {
  let rank = tiers[0].rank;
  for (const t of tiers) if (locations.includes(t.location)) rank = t.rank;
  return rank;
}

// The rank a profile actually wears (A8). Normally the furthest location it has
// unlocked, but the prestige rank outranks all of them: it isn't a place you
// travel to, it's the legendary you landed, so it can't be derived from rods.
export function rankForProfile(tiers, locations, prestigeCfg, hasPrestige) {
  return hasPrestige && prestigeCfg?.rank ? prestigeCfg.rank : rankForState(tiers, locations);
}

// Does landing this fish earn the prestige rank *right now* (A8)? Only the
// prestige species, and only the first time: a second Muskie is a great day,
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

// The catch card's subtitle: the weight, what size that counts as, and the reel
// speed at a spot that measures one. A pure join, and it lives here rather than
// in app.js because separators are exactly the kind of thing that goes wrong
// quietly. It shipped reading "1.3 lb · a little one · · 255 wpm" at every
// Stream and Ocean catch, because two of the pieces each carried the dot. One
// separator, in one place, cannot do that.
//
// `wpm` is 0 at a spot that does not measure it (the Pond reels single words,
// so there is no self-paced speed to report). Whether the speed is a personal
// best is not in here: the card flies that as a FASTEST YET ribbon instead.
export function catchSubtitle(weight, sizeClass, wpm = 0) {
  const parts = [`${weight} lb`];
  if (sizeClass === "lunker") parts.push("a LUNKER!");
  else if (sizeClass === "little") parts.push("a little one");
  if (wpm > 0) parts.push(`${wpm} wpm`);
  return parts.join(" · ");
}

// The game's voice, resolved for one moment at one spot (data/puns.json). Per
// spot first, then the shared pool: a spot overrides the moments where the
// water matters (the Ocean does not tell pond jokes) and inherits the rest.
// Pure, so the fallback chain is testable without a browser; app.js picks a
// line out of what comes back.
export function punPool(pools, location, moment) {
  return pools?.[location]?.[moment] ?? pools?.shared?.[moment] ?? [];
}

// Split a reel string into ordered tokens for the token-at-a-time reel (AD2):
//   { type:"word",  text }: a run of letters; the unit you type
//   { type:"space", text }: the gap between words; a real (forgiving) key and
//                            the reel-crank beat (replaces word-mode's auto pause)
//   { type:"punct", text }: punctuation runs (A5 sentences), kept as their own
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

// How many typeable words a reel string holds: the number of reel segments a
// phrase takes to land (its spaces are the beats between them).
export function wordCount(text) {
  return tokenize(text).filter(t => t.type === "word").length;
}

// Typing speed for a reeled catch (A4), the classic "5 chars = 1 word" WPM over
// the *active* typing time (idle gaps already excluded by the caller). A cozy
// number to beat, never a gate: 0 for empty/degenerate input, never throws.
export function computeWpm(chars, activeMs) {
  if (chars <= 0 || activeMs <= 0) return 0;
  return Math.round((chars / 5) / (activeMs / 60000));
}

// ---- Quick Cast (the timed speed test) ----
// Which words a timed run draws from. The mode is deliberately available at any
// progression, so by default it uses the WHOLE pool: a speed score is only worth
// anything measured against the same content every time, and gating it by
// unlocked letters would make a kid's own scores incomparable as they progress.
// Flip useUnlockedOnly to keep a run inside the letters they've been taught.
export function speedTestPool(entries, unlockedLetters, useUnlockedOnly) {
  if (!useUnlockedOnly) return entries;
  return entries.filter(e => [...e.letters].every(l => unlockedLetters.has(l)));
}

// Accuracy over a timed run: correct keys as a whole percent of every key
// pressed. Nothing pressed → 0, never NaN.
export function typingAccuracy(correct, wrong) {
  const total = correct + wrong;
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

// A caught WPM is a new personal best when it beats the stored one (and is a
// real, positive number). No record yet → any real WPM is a best.
export function isPersonalBestWpm(previousBestWpm, wpm) {
  return wpm > 0 && wpm > (previousBestWpm ?? 0);
}

// Fly-cast rhythm (A4): were these inter-key gaps (ms) an even, steady cadence?
// Cozy flavor only: needs at least minKeys gaps and a low spread (coefficient
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
    if (!bag.length) bag.push(...items);            // pool exhausted: refill and keep going
    out.push(...bag.splice(Math.floor(rnd() * bag.length), 1));
  }
  return out;
}

// How many segments (sentences) a fish takes to land at a fight location (A7).
// Unknown tiers (and every non-fight water) land in a single segment, so the
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

// ---- R1: cast, line and reel motion (ANIMATION.md) ----------------------
// Pure geometry only: the DOM side lives in app.js, and the prototype at
// prototype/line-animation.html imports these same functions, so what Matt
// reviewed and what ships are the same math.

// The lure in flight: a projectile arc from the rod tip to where it lands,
// `t` in [0,1]. Linear in x, with a parabolic lift that peaks `apexPx` above
// the straight chord at t=0.5 and is exactly 0 at both ends, so the lure
// leaves the rod tip and arrives at the landing point no matter the apex.
export function castArcPoint(from, to, apexPx, t) {
  const k = Math.min(1, Math.max(0, t));
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k - apexPx * 4 * k * (1 - k),
  };
}

// How far the line's control point hangs below the straight rod-tip→end chord.
// Tension only ever *tightens* it: 0 sags by `slackPx`, 100 pulls in to
// `tautPx`. Tension rises on errors and nothing else (SPEC.md), so a taut line
// reads as "you're making mistakes", never as "you're typing too slowly".
export function lineSagPx(tension, slackPx, tautPx) {
  const t = Math.min(100, Math.max(0, tension ?? 0)) / 100;
  return slackPx + (tautPx - slackPx) * t;
}

// Control point for the quadratic Bezier that draws the line. Offset straight
// down in screen space, which is what sells weight. Note a quadratic sits half
// way to its control point at the midpoint, so the visible dip is sagPx/2.
export function lineControlPoint(from, to, sagPx) {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 + sagPx };
}

// One frame of the rod-tip tug: a damped spring pulling the rod back to rest.
// A spring rather than a tween on purpose: fast typing stacks impulses into
// an irregular judder, where a tween would keep restarting and read as
// mechanical. Returns the next {angle, vel}; dtMs is clamped so a backgrounded
// tab can't integrate one enormous step and fling the rod.
export function stepTug(angle, vel, dtMs, cfg) {
  const dt = Math.min(dtMs, 50) / 1000;
  const acc = -cfg.stiffness * angle - cfg.damping * vel;
  const v = vel + acc * dt;
  return { angle: angle + v * dt, vel: v };
}

// Where a point rig-relative to #rig lands once the rod has rotated by `deg`
// about the grip. The rod tip is the line's origin, so this is what keeps the
// line attached to a rod that is being pulled back, swung, and tugged.
export function rotateAboutPivot(point, pivot, deg) {
  const r = deg * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  const dx = point.x - pivot.x, dy = point.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

// Eased progress helpers for the cast timeline. `easeIn` for the anticipation
// (slow to load, quick to release), `easeOut` for the flight (the lure decays
// into its landing rather than arriving at full speed).
export function easeIn(t)  { const k = Math.min(1, Math.max(0, t)); return k * k; }
export function easeOut(t) { const k = Math.min(1, Math.max(0, t)); return 1 - (1 - k) * (1 - k); }

// `easeInOut` is for a move that both STARTS and ENDS at rest, which is what a
// reeled fish does between words. It exists because the reel used to chase its
// target with a per-frame exponential (`x += (target - x) * 0.08`), and an
// exponential's velocity is highest on its very first frame: from a standstill
// the fish covered a third of the word's travel in ~100ms and then crept, which
// the eye reads as a jump rather than a swim. Quadratic in and out of the
// halfway point, so the fish gathers, swims and settles.
export function easeInOut(t) {
  const k = Math.min(1, Math.max(0, t));
  return k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
}

// Where along the reel the fish is, read back out of its x. The reel path is a
// straight run from `fromX` (deep and right, where it bites) to `toX` (the
// boat), so the fish's own position IS the progress, no second counter to
// keep in step with `wordsLeft`, and it moves smoothly because the fish does.
export function reelProgressAtX(path, x) {
  const span = path.toX - path.fromX;
  if (!span) return 1;
  return Math.min(1, Math.max(0, (x - path.fromX) / span));
}

// How much of the fish that progress has revealed. 0 is the murk it bites in,
// 1 is a fish you can name; nothing clears before `startAt` and it is fully
// itself by `fullAt`, so the first part of the fight is a shape in the water
// and the species arrives before the landing does.
//
// `fullAt` is below 1 on purpose. The fish never renders at progress 1: the
// last word calls land() in the same tick it sets that target, which stops the
// swim and hands over to the landing arc, so the furthest it is ever DRAWN is
// (wordsToLand - 1) / wordsToLand: 0.75 for a common, 0.875 for a legendary.
// A reveal that finished at 1 would therefore never finish at all.
export function revealAt(progress, startAt, fullAt = 1) {
  const s = Math.min(1, Math.max(0, startAt ?? 0));
  const f = Math.min(1, Math.max(0, fullAt));
  if (f <= s) return progress >= f ? 1 : 0;
  return Math.min(1, Math.max(0, (progress - s) / (f - s)));
}

// S1: which soundscape a spot gets. Same fallback shape as punPool above: a
// spot the game grows later, with no entry of its own, gets `shared` rather
// than silence, and a registry with nothing in it at all returns null so the
// caller can skip building a bed.
export function ambienceFor(ambience, location, fallbackKey = "shared") {
  return ambience?.[location] ?? ambience?.[fallbackKey] ?? null;
}

// The gap before an ambient voice speaks again. Random inside `everyMs` so a
// frog never lands on a beat, which is the whole difference between a place
// and a loop. A malformed or missing range is a long silence rather than a
// zero-delay timer spinning the CPU.
export function nextVoiceDelayMs(everyMs, rnd = Math.random) {
  const [lo, hi] = Array.isArray(everyMs) ? everyMs : [everyMs, everyMs];
  const min = Number.isFinite(lo) && lo > 0 ? lo : null;
  if (min == null) return 60000;
  const max = Number.isFinite(hi) && hi > min ? hi : min;
  return Math.round(min + rnd() * (max - min));
}
