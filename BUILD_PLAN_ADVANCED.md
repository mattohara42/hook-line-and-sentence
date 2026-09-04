# Hook, Line and Sentence: Advanced Progression Build Plan

Companion to `SPEC.md`, `BUILD_PLAN.md` (v1), and the **Advanced Progression**
epic in `BACKLOG.md`. This breaks the epic into sized, ordered, verifiable
milestones: same rules as v1: **one milestone at a time, each ends playable.**

**Status: ✅ COMPLETE (2026-08-22), A0 through A8 all shipped.** Minnow →
Mackerel → Marlin → Muskie is playable end to end: single home-row words at the
Pond, phrases and capitals at the Stream, punctuated sentences fought in clauses
at the Ocean, and the Muskie capstone to close it. Outstanding work is **art
only**: two PNGs pending (Ocean background, Muskie hero sprite; the Stream
background already landed), requests in `ART.md`; the scenes self-resolve
when they land: plus a real kid playtest of the A7 fight beats (see
`BACKLOG.md`).
**Prerequisite:** close v1 (M4b Firestore live-verified) first: this epic
adds new save fields, so it wants a stable sync base and a clean migration
story. (Met: v1 complete.)

## Guardrails (inherited, non-negotiable)

1. **Error-only tension in *every* tier.** Speed never feeds tension. Slow +
   careful always lands the fish. WPM is a *bonus to beat*, never a floor.
2. The **Pond (Minnow) experience never changes**, no timers, no WPM, no
   speed pressure. Everything advanced is opt-in graduation.
3. **No canvas/Phaser; no build step.** DOM/CSS, vanilla JS, the existing
   `index.html` / `app.js` / `logic.js` / `style.css` / `config.js` +
   `data/*.json` shape.
4. **All tuning in `config.js`.** New pure logic goes in `logic.js` **with
   tests** (mirrors the existing `logic.js` + `tests/` split).
5. **Firestore stays one-read-per-launch / one-write-per-catch.** New fields
   ride the existing per-kid doc, no subcollections, no per-keystroke writes.

## Architecture decisions (locked: Matt, July 2026)

| # | Decision | Recommendation | Why |
|---|----------|----------------|-----|
| **AD1** | Where phrases/sentences live | New `data/phrases.json` + `data/sentences.json`, **same tag schema** as words (`letters`, `d`, `theme`, + `location`) | Honors SPEC's "just more tagged entries" while being honest that phrases/sentences are **hand-curated**, not frequency-generated from a word list |
| **AD2** | Reel engine content unit | Generalize word-at-a-time → **token-at-a-time** (a catch = a token stream: words, spaces, punctuation). The ~450ms beat becomes the space/clause pause | Phrases already *want* word-at-a-time with a beat; this is an extension, not a rewrite. `buildReelPool` gains a content-type-aware sibling |
| **AD3** | Rank vs. location | Split: `save.rank` (earned, permanent badge), `save.location` (currently fishing), `save.unlockedLocations`. Tier table → `CONFIG.tiers` | A kid *keeps* their rank but can drop back to the Pond for a cozy session |
| **AD4** | Graduation gate | **Rods unlock locations.** Extend `CONFIG.shop.rods` with `unlocksLocation`; rank derives from furthest unlocked location | Rides the existing shop/economy, no parallel system |
| **AD5** | WPM storage | Widen `save.records[fishId]` from a bare weight to `{weight, wpm}` (with migration). New pure `computeWpm()` in `logic.js` + tests. Shown **only** Stream+ | Reuses the personal-best-per-species machinery that already exists for size |
| **AD6** | Caps & punctuation | New earned unlock track (Shift → Stream, punctuation → Ocean), extending the `CONFIG.unlock.stages` idea | Shift-as-late-unlock is already parked in SPEC/BACKLOG |

## Phase 0: Foundation (shared plumbing)

### ✅ A0: Rank & location model + graduation gate + rank-up ceremony (done 2026-07-23)
The skeleton every tier rides on; **no new content yet** (Stream/Ocean
temporarily serve existing words so the plumbing is verifiable in isolation).
- `config.js`: `CONFIG.tiers` (Minnow/Mackerel/Marlin/Muskie → location, rod,
  label, badge); add `unlocksLocation` to `shop.rods`.
- `logic.js`: `rankForState(unlockedLocations)` pure fn + tests.
- `app.js`: save fields `rank` / `location` / `unlockedLocations` + migration
  for existing saves; a location switcher (reuse the nav tray); rank-up
  ceremony reusing the M5 unlock banner + badge-toast.
- **Done when:** earning a location-unlocking rod graduates the profile
  (Minnow→Mackerel), unlocks the Stream, fires the ceremony, and persists; the
  kid can switch back to the Pond; two profiles stay independent.

## Phase 1: Stream / Mackerel (fly fishing) · *vertical slice, ships whole*

### ✅ A1: Phrase content + reel generalization (done 2026-07-23)
- `data/phrases.json`: hand-curated multi-word phrases, starting home-row-easy
  (15-phrase home-row seed; richer/harder phrase content is future work).
- `logic.js`: `tokenize()`/`wordCount()` (`text` → word/space/punct tokens);
  `buildReelPool` generalized to any `{d}` content so phrases reuse the same
  difficulty-widening machinery. Tests in `tests/logic.test.mjs`.
- `app.js`: the reel serves a phrase when typeable phrase content is tagged for
  the current `save.location` (data-driven, no per-tier config flag); the
  **spacebar is a real but forgiving key**: it advances between words and sits
  entirely outside the tension system, so a mistimed/stray space is a no-op and
  only wrong *letters* can escape (error-only intact). The Pond is byte-for-byte
  unchanged (`reelMode` stays `"words"`). A visible `␣` cue marks the space.
- **Done when:** the Stream reels real multi-word phrases including the
  spacebar; a slow careful typist still always lands; tension reacts to errors
  only. *(Verified: 38 unit tests + a faithful phrase-reel guardrail simulation.)*

### ✅ A2: Capitals via Shift (+ finger guide) (done 2026-07-23)
- `config.js`: `CONFIG.capitals.fromLocations`, capitals are a Stream+ feature;
  the Pond stays lowercase-only. The data test enforces it.
- `data/phrases.json`: capitalised Stream phrases (Title Case + proper-noun
  names) at `d:2`, so capitals ramp in with uncommon+ catches while common
  catches stay lowercase.
- `app.js`: case-aware keystroke matching, a **capital target must be typed
  with Shift** (exact case), while a lowercase target accepts either case so the
  Pond is untouched; `recordKey` folds capitals into their base-letter stat
  bucket; the finger guide gains two **Shift keys** and animates the opposite
  hand's pinky reaching for Shift on a capital.
- **Done when:** a phrase containing a capital reels correctly and the guide
  animates the Shift press. *(Verified: 39 unit tests + a case-handling reel
  simulation; guide reach verified by the finger/hand mapping.)*

### 🟡 A3: Stream fish set + biome scene (code-complete 2026-07-23; Stream background pending art)
- `data/fish.json`: existing 10 fish tagged `location:"pond"`; **9 `location:
  "stream"` fish** (dace, chub, trout, salmon…) across common/uncommon/rare.
  They reuse the shared per-tier sprites tinted by `color`, so **no per-fish
  art**: Muskie stays the Pond legendary until the Ocean/A8.
- `logic.js`: `tierWithFallback()` (+ test) so a rolled tier the spot lacks (the
  Stream has no legendary yet) degrades to the nearest present tier.
- `app.js`: `bite()` picks fish by `save.location` with that fallback;
  `applyScene()` swaps the biome via a `loc-<location>` class on `#scene`; the
  collection screen groups silhouettes by location.
- `ART.md`: the one real art request (`assets/background-stream.png`) already
  wired (`#scene.loc-stream` layers it over the pond scene, self-resolving).
- **Done when:** entering the Stream shows the stream scene and its own fish
  silhouettes; catching a stream species flips its silhouette. *(Code + fish +
  collection grouping done and verified: 42 unit tests + a fish-selection sim;
  the **scene visual is the pond scene until `background-stream.png` lands**,
  then it appears with no code change.)*

### ✅ A4: Fly-cast rhythm mechanic + WPM personal-best (intro) (done 2026-07-23)
- `logic.js`: `computeWpm()`, `isPersonalBestWpm()`, `isEvenCadence()` + tests;
  `records[fishId]` widened `weight → {weight, wpm}` with a lazy migration.
- `app.js`: WPM measured over **active** reel time (idle gaps excluded, so a
  pause never hurts); the Stream catch card shows a **self-paced per-species
  personal-best WPM** (Stream/phrase catches only: the Pond shows none). An
  even fly-cast cadence on graduated waters earns a cozy "nice cast" line
  (`PUNS.niceCast`): praise only, never a penalty. Tuning in `CONFIG.flyCast`.
- **Done when:** landing a Stream fish shows a self-paced personal-best WPM; the
  Pond is unaffected; missing your best is never a fail state. *(Verified: 45
  unit tests + a WPM/records/migration simulation.)*

**→ Stream ships:** a Mackerel kid fly-fishes real phrases, learns spacebar +
capitals, and chases their own best time.

## Phase 2: Ocean / Marlin + Muskie (sport fishing) · *vertical slice*

### ✅ A5: Sentence content + punctuation (done 2026-08-22)
- `data/sentences.json`: 17 curated home-row sentences (same `a s d f g h j k l`
  vocabulary as `phrases.json`, so they're typeable the moment a kid could
  reach the Ocean) tagged `location:"ocean"`, teaching `. , ! ?` and
  mid-sentence capitals.
- `config.js`: `CONFIG.punctuation`, `. , ! ?` gated to `fromLocations:
  ["ocean"]`, one tier later than capitals (AD6), enforced by a data test.
- `app.js`: a punctuation mark is a real typed key, like the spacebar, but
  **forgiving**: `handlePunct()` advances only on an exact match and never
  touches tension on a miss (mirrors `handleSpace`). A shared `finishReelUnit()`
  handles "the content is fully typed" from either a letter *or* a
  sentence-final mark, since a sentence can end in punctuation. Clause-boundary
  detection for A7 needs no extra work: `tokenize()`'s existing `punct`
  tokens (A1) already mark every boundary; A7 consumes them directly.
- **Bug fix along the way:** `PHRASE_POOL`/`SENTENCE_POOL` were declared but
  never actually `fetch`ed in the app's init `Promise.all`: a leftover gap
  since A1. The Stream had been silently reeling words only (no phrases, no
  capitals, no WPM) at runtime despite A1-A4 shipping. Fixed here, so both
  the Stream and the Ocean's new content now actually reel.
- **Done when:** the Ocean reels a full sentence with punctuation, correctly.
  *(Verified: 51 unit tests (data + logic) + a real-browser Playwright run,
  a full sentence catch with a personal-best WPM, a wrong key while a
  punctuation mark was due confirmed not to raise tension, and a mid-sentence
  comma confirmed not to land the catch early.)*

### ✅ A6: Ocean fish set + biome scene + deep-sea rod gate (done 2026-08-22)
- `data/fish.json`: **10 `location:"ocean"` sport fish** across common/uncommon/
  rare (Red Herring, Holy Mackerel, Mahi Mahi Mia, Marlin Brando, Tuna Turner,
  En Garde…), with **Muskie Quixote moved from the Pond** to be the ocean
  legendary, per the locked plan. They reuse the shared per-tier sprites tinted
  by `color`, so **no per-fish art**.
- **New Pond legendary: `Koi Story`.** Moving Muskie out left the Pond with no
  legendary at all, which both broke the "home water has a fish for every
  rollable tier" data test and quietly made the Pond *worse* (a legendary roll
  would degrade to rare forever): against the "the Pond never changes"
  guardrail. A new gold koi keeps the Pond whole. *Assumption recorded: existing
  saves that caught Muskie keep the catch, but it now files under the Ocean in
  the journal, no data loss, just a nicer-than-expected souvenir.*
- `config.js`: the **deep-sea rod** ("The Deep Endeavor", 150 coins,
  `unlocksLocation:"ocean"`) + a `rodLevel: 4` entry in `bite.tierOddsByRod`
  (the best odds in the game). Ocean fish keep flat coin values, matching how
  the Stream priced against the Pond.
- `logic.js`: **`locationsForRods` is now cumulative.** Saving straight for the
  deep-sea rod used to unlock the Ocean while leaving the Stream shut: dropping
  a kid into punctuated sentences without the spacebar/capitals the Stream
  teaches, and showing a Stream journal group they couldn't fish. Tiers are an
  ordered curriculum, so a later unlock now opens everything up to it.
- `style.css`: `#scene.loc-ocean`, mirroring `.loc-stream`'s self-resolving
  layering: the Ocean shows pond art until `background-ocean.png` lands.
- `tests/`: three new data guards (every rod's `rodLevel` has tier odds, a
  missing one crashed `pickTier` at bite; every non-home spot has a rod that
  opens it; every tier has fish) + cumulative-unlock logic tests.
- **Done when:** the deep-sea rod gates the Ocean; ocean fish + scene present.
  *(Verified: 55 unit tests + a real-browser Playwright run, rod unbuyable at 0
  coins, rank-up ceremony on purchase, rank→marlin, all three spots in the
  switcher, ocean fish actually served, sentences reeling, journal grouped.)*

### ✅ A7: Sport-fish "fight" mechanic (done 2026-08-22)
- `config.js`: `CONFIG.fight`, `fromLocations:["ocean"]`,
  `segmentsByTier` (common/uncommon 1, rare 2, legendary 3), plus the two beat
  lengths and the dart distance. *Deviation from the sketch, deliberate:* this
  is its own knob rather than an extension of `reel.wordsToLandByTier`, because
  that one belongs to word-mode: i.e. **the Pond**. Widening it would have
  changed the one thing this epic promises never to touch.
- `logic.js`: `segmentsForTier()` (1 everywhere that isn't a fight water, so
  the Pond and Stream can't be reached by this) and `pickDistinct()`, which
  fills a multi-segment fight without reeling the same sentence three times,
  it only repeats once the pool is genuinely exhausted. Both tested.
- `app.js`: a catch now spans `reelSegments`; `wordsToLand` sums the whole
  fight so the reel meter still counts down truthfully to the landing. The
  fish runs at every mid-sentence clause break and again between sentences.
- **The run is pure theatre.** It nudges `fishTX` outward and lets the existing
  swim RAF ease the fish away, then restores the true target, so **no progress
  is ever undone and tension is never touched.** It's drama, not a setback, and
  the flavour lines are encouraging rather than scolding: the kid hasn't done
  anything wrong. Slow + careful still always lands, exactly as guardrail 1
  requires. Set `clauseRunMs`/`segmentRunMs` to 0 to keep the drama, drop the pause.
- `tests/`: a data guard that every fight water has enough reachable sentences
  to fill its longest fight without repeats.
- **Done when:** an Ocean landing has clause-runs; tension is still error-only.
  *(Verified: 60 unit tests + two real-browser Playwright runs. The fight run
  asserted a clause run mid-sentence, a segment run between sentences, a rare
  fought over 14 words across two sentences, and (the guardrails) that a run
  never raises tension, never undoes progress, and that accurate typing never
  escapes. A separate regression confirmed the **Pond and Stream see no runs at
  all**, still land catches, and throw no errors.)*

### ✅ A8: Muskie prestige capstone (done 2026-08-22)
- `config.js`: `CONFIG.prestige`, rank, fish id, label, badge, hold time. It is
  deliberately **not** in `CONFIG.tiers` (a logic test enforces this): everything
  in that table is unlocked by buying a rod, and the capstone must not be
  purchasable.
- `logic.js`: `rankForProfile()` (prestige outranks any location-derived rank)
  and `earnsPrestige()` (the right fish, first time only: a second Muskie is a
  great day, not a second ceremony). Both tested, including the defensive cases
  where the config is missing.
- **Prestige is derived, not stored.** It's held by *having caught the fish*
  (`collection[prestige.fishId] > 0`) rather than a save flag, so it can never
  desync from the collection, needs no migration, and credits a save that landed
  the legendary before A8 existed the moment it loads: the same way badges
  already backfill.
- `app.js`: the capstone ceremony, the rank-up banner held longer, gold-framed
  and glowing, with rolling confetti and the rare-catch chime, plus a
  `Muskie Master` journal badge ("The Deep End" is *any* legendary; this is
  *the* one). It queues **after** any letter-unlock banner so two celebrations
  never collide, and the recast waits for both.
- **Also surfaced the rank at all.** `save.rank` had been written since A0 and
  **read by nothing**: "You made Mackerel!" was a one-off toast with no lasting
  record anywhere. The journal now shows the current rank under the badge count,
  for every tier, not just Muskie.
- **Done when:** catching the legendary awards the Muskie rank with its own
  ceremony. *(Verified: 64 unit tests + a 21-check real-browser run that landed
  Muskie Quixote (45 lb LUNKER), saw the gold capstone banner, confirmed the
  rank flips to `muskie` **without a reload**, the badge and collection record,
  the journal reading "🏆 Muskie Master", prestige surviving a reload, and a
  second Muskie **not** re-firing the ceremony. A Pond regression confirmed the
  restructured `land()` still lands catches, keeps recasting, and never grants
  prestige by accident.)*

**→ The Ocean ships, and with it the whole Advanced Progression epic: A0–A8
complete.** A kid can go Minnow → Mackerel → Marlin → Muskie, from single home-row
words to punctuated sentences fought in clauses. The only outstanding work is
art (three PNGs, see `ART.md`) and a real kid playtest of the fight beats.

**→ Ocean ships:** Marlin kids fight full sentences; Muskie is the endgame.

## Data-shape additions (summary)

- **Save (per kid):** `+ rank`, `+ location`, `+ unlockedLocations`;
  `records[fishId]` widens `weight → {weight, wpm}` (migrated).
- **`config.js`:** `+ CONFIG.tiers`; `shop.rods[].unlocksLocation`; a
  caps/punctuation unlock track; clause-run + rhythm-window tuning.
- **`data/`:** `+ phrases.json`, `+ sentences.json`; `fish.json` entries gain
  `location`.

## Art dependency (the long pole: flag to Matt early, see `ART.md`)

~~Stream background~~ (landed) · Ocean background · Muskie Quixote hero
sprite: the stream/ocean fish sets need no new art (shared per-tier sprites
tinted by species `color`), and fly-rod + deep-sea-rod shop icons remain
optional/unwired (see `ART.md`). All within the locked ~16-color palette.
This is the slowest, most serial dependency (Gemini-generated, Matt-in-the-
loop).

## Decisions (locked: Matt, July 2026)

All five confirmed as the recommended defaults:

1. **Content schema**: ✅ separate `data/phrases.json` + `data/sentences.json`,
   sharing the word tag-schema (AD1). Not one pool with a `type` field.
2. **Spacebar & punctuation**: ✅ real typed keys (they *are* the skill),
   forgiving. Not auto-inserted beats.
3. **Sequence**: ✅ vertical slices per tier: ship all of Stream (Phase 1)
   before starting Ocean (Phase 2). Not horizontal (all content, then all art).
4. **Sentence sourcing**: ✅ hand/family-curated (small set; quality +
   kid-appropriateness matter). Not generated.
5. **WPM visibility**: ✅ per-species personal best on the catch card, Stream+
   only; **never sibling-visible** (upholds the no-leaderboard cozy stance).
