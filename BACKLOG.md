# Hook, Line and Sentence: Backlog

Ideas captured during design/build. Nothing here expands the current milestone.

## Flavor & fun
- **Groan counter**: after each catch pun, a 🙄 button increments a lifetime "Dad Jokes Endured" stat per profile. Zero gameplay impact, maximum family lore.
- Kids contribute puns: pun pools are one data structure; add a simple way for family to submit new ones.
- Kid-drawn fish as real sprites (scan/photo → cleaned up to match
  `ART_DIRECTION.md`; the "pixel-ify" step retired with the pixel direction).

## Gameplay (v2 candidates: see SPEC.md)
- Adaptive tension meter (accuracy/timing stats already being logged in v1 for this).
- Themed word packs; custom school spelling lists (parent-editable).
- Accuracy-gated letter unlocks as an alternative to fish-count milestones.
- Shift key as a late "letter unlock" (capitals).

## World
- More ponds/locations; weather; real day/night tied to clock.
- Sound design pass beyond ambient loop.

## Playtest before anything else (A7/A8, 2026-08-22)
- **The fight beats are guesses.** `CONFIG.fight.clauseRunMs` (550) and
  `segmentRunMs` (900) were picked by feel, not by watching a kid. They're the
  kind of number that only reveals itself as "too long" with a real six-year-old
  typing. Both are in `config.js`; set either to `0` to keep the drama and drop
  the pause entirely.
- **Keystrokes typed *during* a run are dropped.** Input is locked for the beat,
  so a fast typist loses the couple of characters they type into it. It's
  harmless: dropped keys never count as errors and never touch tension, so the
  catch is never at risk, but it may read as "the game ate my typing". Watch for
  it; if it bites, the fix is either shorter beats or buffering keystrokes
  through the lock rather than ignoring them. Noticed while writing the A8 test,
  which desynced on exactly this before the harness was taught to wait out runs.
- **Is a 3-sentence legendary fight too long?** `segmentsByTier` gives the
  legendary three sentences. It felt right in testing, but testing was a robot
  that types perfectly and never gets bored.

## Finger guide
- **✅ Punctuation finger guidance (found during A5, fixed 2026-08-22).** The
  guide keyboard was only `qwertyuiop` / `asdfghjkl;` / `zxcvbnm`, so when a
  sentence's next character was `.` `,` `!` or `?`, `updateGuide()` found no
  `LETTER_FINGER` entry and returned early: the hands went **blank**
  mid-sentence. Gameplay was fine; the teaching aid wasn't, which matters in a
  tutor. Fixed by extending the bottom row to the real `zxcvbnm,./` with proper
  finger zones (`,`→right middle, `.`→right ring, `/`→right pinky), rendering
  the three as quiet **ghost keys** like the `;` anchor so the Pond stays calm,
  and routing capitals *and* shifted punctuation through one `keyForTarget()`
  path so `?` lights `/` + the opposite hand's Shift exactly like a capital does.
  The guide is now also **sized from its actual laid-out keys and scaled to fit
  narrow windows**: it used to carry a hardcoded width that would silently crop
  the rightmost key (the right Shift, the very key a capital points at) below
  ~580px; it now fits at any width down to 420px.
  - **Still unguided: `!`**, it's Shift+1, on a number row the guide doesn't
    render (10 keys a beginner never uses, and numbers aren't in the unlock
    ladder at all). It types correctly, it just gets no finger animation, and
    `updateGuide` leaves no stale highlight. `SHIFTED_PUNCT` already maps it to
    `"1"`, so it lights up for free the day a number row is ever added. Same
    class of accepted gap as the look-ahead limitation in `SPEC.md`.

## Release hygiene
- **✅ The 🧪 test shortcut can no longer ship on (fixed 2026-08-22).** It used to
  be a hand-flipped `true`, and it was live on the production site for a while
  because a flag is easy to forget. `CONFIG.dev.testShortcuts` is now *derived*
  from the hostname (`isDevHost()`): localhost, `.local` machines and Netlify
  deploy previews get it, production and anything unfamiliar fail closed. A data
  test pins both directions.
- **Decide the Firebase blast-radius question before sharing the URL.** See the
  ⚠️ block at the top of `firestore.rules`: `request.auth != null` authorises
  *any* Google account, not just family, and the database is shared with Family
  Hub. Document shape/size is now capped, but rules cannot cap document *count*.
  Options, best first: a separate Firebase project for this game · App Check ·
  a uid allowlist · or ship the public build with no Firebase at all (the game
  is fully playable on localStorage, and then you collect no data about other
  people's children).
- **No analytics, no crash reporting, no third-party scripts.** Worth keeping
  that way: it's most of what makes this safe to hand to another family.

## Word pool
- **✅ Advanced content now grows with the letter ladder (fixed 2026-08-22).**
  Every phrase and sentence used to be home-row-only, so a Marlin-rank kid with
  all 26 letters unlocked reeled *"Dad has a flask."* forever: progressing
  bought you *less* variety, not more. Phrases 25 → 67, sentences 17 → 44,
  spread across all eight unlock stages. Difficulty now differentiates too: each
  fish tier draws its own band (d1 commons … d4 legendary) instead of everything
  widening down to d2. Fight lengths land at 2–5 / 3–9 / 16–22 / 21–27 words by
  tier. *Still thin next to 2,851 words: the advanced tiers will always want
  more, and they're hand-curated by design (AD1).*
- Stage 1 (home row) is intentionally small (37 words): keep stage 1 short (few fish to first unlock). Revisit supplements list if kids exhaust it.
- Difficulty scoring is length-based + rare-letter bump; could later weight by bigram awkwardness.
- **✅ Junk-word cleanup (done 2026-07-23).** The "sie" bug turned out not to be
  a lookup fix: a re-run against a 370k-word reference list (dwyl/english-words)
  found *zero* missing pool words: the original dict was equally permissive, so
  it was a curation call, not a filter gap. Curated a stop-list of **163
  non-words** now in `data/blocklist.json`: acronyms/initialisms (`usa`, `ibm`,
  `faq`…), abbreviations (`jan`, `dec`, `mon`, `dept`, `univ`…), foreign words
  (`sie`, `eau`, `bon`…), and prefix/junk tokens (`non`, `pre`, `dont`). Pool
  3014 → 2851; stage 1 (home row) untouched at 37 words, all later stages still
  hundreds deep. `generate-words.mjs` now reads the blocklist and a
  `data.test.mjs` guard fails if any blocklisted word reappears. Real words that
  merely *look* like junk were deliberately kept (`don`, `bob`, `jay`, `lee`,
  `ken`, `tom`, `sun`, `wed`, `mar`, `nil`, `gel`, `cod`, `chi`, `phi`, `psi`…).
  - **Still deferred (a bigger, more subjective cut):** proper first names and
    place names (`jim`, `joe`, `dan`, `texas`, `china`, `john`…) are still in the
    pool. They're real and typeable, so removing them is a separate policy call,
    revisit if they read as noise during a kid playtest.

## Fun brainstorm: July 2026 (all approved by Matt)

Design guardrail for every item: cozy first, never punish slow typing, only
carelessness (repeated errors). Rewards key off accuracy/collection, never speed.

**✅ Shipped (2026-07-22):**
- **Fish size variants**: every catch rolls a weight; "a little one" / "LUNKER" flavor; personal-best-per-species in `save.records`, shown in the collection screen. (`config.size`)
- **Parent GROWN-UPS view**: per-key accuracy heatmap + trouble-key summary, built from `save.stats.letters`. Read-only, no new data collection.
- **Fishing journal + badges**: nine punny milestone badges (First Mate, Home Row Hero, Hooked on Typing, Reel Regular, Landed a Lunker, The Deep End, Tackle Box Tycoon, Sharp Shooter, Alphabet Angler). Gold toast on earn (catch + shop), retroactive backfill on open. (`config.badges`, `save.badges`)
- Also shipped alongside: larger keyboard (palm ovals removed, `GUIDE_SCALE`) and the one-time 25-fish "REEL TALK" rod nudge (`config.economy.rodNudgeAt`).
- **Junk catches**: 8% of bites hook a boot / tin can / pond weed instead of a fish; reels like an easy common, lands with a `PUNS.junk` groan, no coins/collection, bumps `save.jokesEndured`. (`config.junk`; `assets/junk-{boot,can,weed}.png`)
- **Cosmetic boat shop**: buy boat skins (classic free + red/blue/leaf/purple); BOATS section in the shop, `applyBoatSkin()` swaps `#boat` on equip. (`config.shop.boats`; `assets/boat-{red,blue,leaf,purple}.png`). Gemini baked the checkerboard as opaque pixels, salvaged via strip + tight-crop (see `ART.md`).

**⏳ Deferred (post-v1):**
- **Cosmetic hats**: the kid sprite (`assets/kid.png`) has a hat baked in, so hats need alternate kid sprites. Boats shipped; hats wait on that.

**Reasons to come back (gentle, not grindy):**
- **Today's special fish**: date-seeded rare that only bites today. Cozy daily return hook, no streak-guilt.
- **The one that got away**: the only failure state (escape) becomes a quest: log the escapee as a silhouette + taunt; catching it later clears the grudge.

**Teaching depth (softly: it's a tutor):**
- **Trouble-letter casts**: quietly weight word selection toward each kid's weakest key. Invisible adaptive help; data already exists (and the GROWN-UPS view now surfaces which keys those are).
- **Clean-streak encouragement**: "three careful catches in a row!" flavor. Rewards accuracy, the game's one real lever.

**Family & world (cozy, never competitive):**
- **Family trophy wall**: each kid's biggest catch shown together (Firestore is already multi-profile). Sibling delight without a leaderboard.
- **Named nemesis fish**: Muskie Quixote already exists in `data/fish.json` as the legendary; give it recurring lore + a bigger landing celebration.
- **Home aquarium**: caught fish swim in a viewable tank. The ultimate "look what I made" for a kid. Needs art.

## EPIC: Catch Feel, the moment of the catch (F1-F5) ✅ SHIPPED 2026-09-03

*Raised by Matt from a play session, September 2026, and closed the same day.
Detailed milestones and what each one measured: `BUILD_PLAN_FEEL.md`. R7 has its
nine rods back. **Matt still has to play it**: the wiggle's word count is the
number most likely to be wrong, and it is one line.*

The refresh gave the game paintings; playing it showed that the moment those
paintings exist for is the weakest part of the loop. Four scene elements
disagree about where the fish is, and landing one pays out a two-line pixel-font
message in the corner that is gone in a second and a half. Seven complaints,
grouped into five milestones:

- **Two ripples on a landing** - one in open water and one directly above it at
  the waterline. `pullFishOneWord()` fires its per-word ring on the landing word
  too, where `surfaceBreak()` is already splashing. (F1)
- **The fish you hook is not the fish you saw.** The approach silhouette is one
  of the old shared placeholder bodies; it turns into the real species at the
  bite. `approach()` wipes the `.rigged` class that `renderFish` had just set.
  (F1)
- **The line lands at the far bank and jumps down at the bite.** It should land
  where the fish actually is. (F1)
- **The puns are in a tiny pixel font and vanish before they can be read.** (F2,
  and this finally answers open question 1 of `BUILD_PLAN_REFRESH.md`: Silkscreen
  goes, game-wide.)
- **The post-catch moment needs to be prominent, prettier, and to last** - held
  until the kid starts the next word rather than on a 1500ms timer. (F3)
- **A trophy plaque for a new species or a new record**, with the fish on it,
  dismissed the same way. One card that escalates rather than a second surface
  queued behind the first. (F3)
- **Fish should take longer to bite, and some casts should need a few short
  words to wiggle the bait** before anything is interested. Matt's call: no
  wiggle, no bite. (F4)

All seven shipped. `tools/play-check.mjs` came out of it: it plays a whole catch
in a real browser and shoots every beat, which is how each of the seven was seen
before it was written down and after it was fixed. **None of the first three
would ever have failed an assertion**: each was wrong for about three frames.

**Found while building it:**

- **The four junk sprites are the last pixel-era art in the game.** `junk-boot`,
  `junk-can`, `junk-weed` and `junk-nugget` were drawn under the old direction
  and the refresh never repainted them (they are not in `BUILD_PLAN_REFRESH.md`
  at all: R6 covered the 33 fish and nothing else that gets caught). At 54px in
  the scene it never showed; F3's card draws what you caught at 148px and it
  shows immediately. Mitigated, not fixed: `CONFIG.card.junkPx` draws junk at 96
  rather than 148, on the argument that a boot is a gag and not a trophy. Four
  small repaints would close it, and they are the same shape of ask as R6's
  fish sheets.
- **The junk puns repeat the item's name**, because `PUNS.junk` substitutes
  `{it}` into the sentence and the card now also shows the name in its own row
  ("a dinosaur chicken nugget: a dinosaur chicken nugget. Well, it's the sole
  of the lake…"). Reads fine on the fish cards, clumsy on junk. The fix is
  editing the pun pool, which is data and a separate pass.

## EPIC: Advanced Progression, tiers, phrases, sentences, WPM-as-goal (v2/v3)

*Approved by Matt, July 2026. A multi-milestone epic, NOT a single milestone,
scope it into its own build plan when v1 (M4b Firestore) is closed out. Work one
piece at a time; nothing here expands current work.*

**→ Detailed milestone breakdown: `BUILD_PLAN_ADVANCED.md`** (phased A0–A8,
code-accurate touch points, architecture decisions, art dependencies).

**Why:** three kids, ~3 years apart, will always sit at different capability
levels and need different challenges *at the same time*. The per-kid profile
system (M4) already keeps their state fully separate, so each kid can live in a
different tier simultaneously.

**The one rule that keeps this in keeping with the original intent:** advanced
progression is a **graduation into an opt-in tier, never a retrofit of the cozy
core.** The starting pond stays exactly as-is: error-only tension, no timers,
slow-is-safe. Depth is a door a kid *chooses* to walk through once ready, not a
difficulty ramp applied to a beginner.

### Tiers = a kid's rank; locations = the mode they unlock

| Rank | Location | Fishing style | Content | Typing focus |
|------|----------|---------------|---------|--------------|
| **Minnow** | **Pond** | still-water (current game) | single words | letters, home-row-out: *this is v1, untouched* |
| **Mackerel** | **Stream** | fly fishing | multi-word phrases | capitals + punctuation begin (Shift as the parked "late letter unlock") |
| **Marlin** | **Ocean** | sport fishing | full sentences | fluency, rhythm, personal-best pacing |
| **Muskie** | **Ocean (prestige)** | the legend | (no new content) | mastery: *earned, not a new biome* |

Rank is per-profile and permanent (you don't get demoted); a kid can always drop
back to a lower pond for a cozy session. Advancement gate mirrors the existing
letter-unlock model (fish-count / mastery milestone), not a speed test.

**Muskie = the prestige capstone (it closes a loop already in the data).**
`data/fish.json` already has **Muskie Quixote** as the legendary nemesis. So
Muskie isn't a fourth biome: it's the master-angler rank you earn *inside the
Ocean* by finally landing the un-landable legendary, and the existing legendary
fish becomes the finish line. Pairs with the parked "Named nemesis fish"
backlog item (recurring lore + a bigger landing celebration).

> **Note (2026-08-31 rename).** The four M-ranks (Minnow → Mackerel → Marlin →
> Muskie) were originally chosen as a pun on the old repo name, WordsPer**M**…
> That pun is gone. The ladder is kept as-is because it stands up on its own,
> it's a real small-to-huge fish progression, the alliteration still scans, and
> it's already shipped in `config.js` and in kids' saved profiles. Flagged here
> rather than silently rewritten: if the ranks are ever revisited, know that the
> reason they are all M's no longer applies.

### Graduation is gated by rods, and celebrated (decided)

- **Rods are the gate.** The shop already sells rods. Entering a new location is
  unlocked by *earning that tier's rod*: a **fly rod** to fish the Stream, a
  **deep-sea rod** for the Ocean, so progression rides the existing economy
  instead of a parallel system. (Rod cost/earn tuning → `config`, TBD when
  scoped.)
- **Rank-up ceremony.** Reuse the M5 "new letter unlocked!" celebration pattern
  and the badge-toast system, but *bigger* for a rank-up: a one-time **"You made
  Mackerel!"** moment. It's the emotional payoff that makes a kid want the next
  tier. Each rank also fits naturally as a badge (`config.badges`).

### Fish are separated by tier (decided)

Each location has its **own distinct fish set**, not shared species that scale:

- **Pond**: the current pond fish (`data/fish.json` as-is).
- **Stream**: fly-fishing quarry: trout, salmon, grayling, etc.
- **Ocean**: sport fish: marlin, tuna, mahi, etc., up to the **Muskie Quixote**
  legendary capstone.

Rationale: distinct sets make each biome feel like a *new place* and give the
collection screen fresh silhouettes to chase per tier (the "catch 'em all" pull
resets pleasantly at each graduation). The existing 3-rarity-tier + word-
difficulty mapping repeats *within* each set. Art scope grows accordingly →
`ART.md` (Gemini prompts + Matt generates); new fish are new tagged entries in
the same `data/fish.json` structure, no new system.

### WPM: a goal, not a punishment (Matt's explicit call, July 2026)

- The "no visible WPM / no speed pressure" Non-Goal **still holds for the Minnow
  pond**: the beginner experience never changes.
- WPM surfaces **only in the higher tiers**, and only ever as a **self-paced
  personal-best** a kid is chasing against their *own* past, never a fail bar you
  can drop below and lose the fish. Slow is still always safe; speed is a
  *bonus* to beat, not a floor to clear.
- Data groundwork already exists: SPEC's v2 note has us logging per-word
  timing/accuracy silently since v1 *specifically* so this tier has data on day
  one. This is mostly a "decide how to surface data we already have" problem, not
  a new timing system.

### Per-tier mechanic sketches (brainstorm, not locked)

- **Stream / fly fishing (Mackerel):** casting gets a gentle *rhythm*: type the
  phrase in an even cadence to "lay the fly" well. Rewards flow/consistency, not
  raw speed. Phrases introduce the spacebar and word-to-word transitions.
- **Ocean / sport fishing (Marlin):** landing a big fish is a *fight*: a longer
  sentence reeled in bursts, the fish "runs" (pauses) between clauses. Sentences
  bring capitals, commas, periods. This is where personal-best WPM lives, as the
  "how cleanly did you land the marlin" flourish.

### Graphics

Each biome is a new background scene: reuses the M9 `#scene-frame` scaling
system. This is the existing "more ponds/locations" v2 World item, now given
concrete identities (Pond / Stream / Ocean). Real art scope → `ART.md` (Gemini
prompts + Matt generates). Palette stays the locked ~16-color set.

### Open threads to resolve when this is scoped for real
- Exact advancement gates per tier: catch count vs. species mastery (never
  speed). Rods are the *gate mechanism* (decided); the *earn threshold* is still
  TBD.
- Punctuation/capital unlock order: is it its own progression inside Stream, or
  a prerequisite to entering it?
- How personal-best WPM is shown so it reads as an invitation, not a scoreboard
  (and whether it's ever sibling-visible: leans NO, per the no-leaderboard cozy
  stance).
- Sentence content source & schema: the word pool has no phrase/sentence entry
  type today; that's a real data-shape addition.
- Stream/Ocean fish rosters: pick the actual species per set and their rarity
  tiers (fish *are* separated by tier, decided; the specific lists are open).

## EPIC: Graphics & Character Rig (superseded, see `BUILD_PLAN_VISUAL.md`)

*Brainstormed August 2026, after A0-A4 shipped and the three locations (Pond/
Stream/Ocean) had real shape. Parked until the Ocean shipped; that condition is
met (A0-A8 all landed 2026-08-22), and the epic was broken into milestones
G1-G6 on 2026-08-25. G1 shipped and then failed the eye test, so the epic was
re-planned the same day: **`BUILD_PLAN_VISUAL.md` is the plan of record** and
`BUILD_PLAN_GRAPHICS.md` is marked superseded. This section stays as the
brainstorm both came from.*

**Why now, not earlier:** hats have been deferred since the boat-skin shop
because `assets/kid.png` bakes hat+body+rod into one PNG (see the "Cosmetic
hats" deferred item above). Once the game has three real locations, that same
one-sprite-per-variant pattern would also block a rowboat/waders/bigger-boat
split, so it's worth fixing once instead of working around it three more
times.

### Locked decisions (Matt, August 2026)

1. **Layered + tinted rig, not full-sprite-per-variant.** Split the character
   into separate transparent PNGs: `body-<character>.png`, `hat-<style>.png`,
   `rod-<style>.png`: composited as independently positioned layers, the same
   way `#boat`/`#kid` already work in `style.css`. A kid's **favorite color**
   is a tint applied at runtime to one neutral "accent" region per item (hat
   band, boat trim, rod wrap), reusing the `--fish-color` / `color-mix()` /
   `hue-rotate()` trick already used for fish tiers (`style.css:186-203,
   463-478`), **not** a new PNG per color. This keeps the art count fixed
   regardless of how many colors or characters get added later.
2. **The angler is assigned from age + sex, not picked from a roster.**
   *(Revised 2026-08-25: supersedes the original "family avatars styled after
   Matt's kids" call.)* The kid answers two short questions at profile setup
   and gets the matching sprite set plus a favorite color, on the existing
   per-kid Firestore profile (M4). Each set needs three poses: rowboat,
   waders, fighting chair, so roster size costs art in threes. See
   `BUILD_PLAN_GRAPHICS.md` (AD2/AD5).

### Scope, by category

- **Backgrounds + foreground depth, all 3 locations.** Pond has `background.png`
  + a CSS-only foreground (`.reeds`, `style.css:165-177`, no PNG). Stream
  (`background-stream.png`) and Ocean (`background-ocean.png`, prompt already
  drafted in `ART.md`) still need their PNGs generated, **plus** a foreground
  layer each for depth: extend the CSS-shape pattern (cheap, always-safe,
  easy to recolor) rather than commissioning full-width foreground PNGs that
  risk drifting over the boat/fish/line on resize.
- **Vessels: one rig per location.**
  - Pond: small rowboat (likely a re-crop of the existing `boat.png`).
  - Stream: **waders**, no boat, a distinct standing-pose body layer, kid
    repositioned lower/centered in the scene (no `#boat` div for this
    location).
  - Ocean: a **Boston Whaler** (Matt, August 2026), center console, high
    freeboard, rod holders, and a **fighting chair in the stern** the kid sits
    in. Named specifically because it changes the prompt: a Whaler is a
    particular hull with a distinctive sheer line, not just a bigger rowboat.
  - Favorite-color tint applies to whichever rig is currently active.
- **Hats & rods as real swappable shop items.** Splits out of the layered-rig
  work above; adds HATS and RODS sections to the shop mirroring BOATS. Closes
  the "Cosmetic hats" deferred item and the rod-icon gap `ART.md` already
  flagged (rods have no `file` field the way boats do today).
- **Fish: shape families, not just color.** Today: 3 shared silhouettes
  (common/uncommon share one, rare, legendary) tinted by species `color`
  (`style.css:186-203`). Add 2-3 more shape families (round panfish / slender
  predator / flat-bodied) so species read as genuinely different fish, species
  → shape *and* color. Muskie Quixote keeps its bespoke sprite as-is.
  `.cfish` (the collection-grid silhouette, `style.css:459-478`) needs a
  matching shape update so uncaught fish still read correctly.
- **Level navigation: already done, no new work.** `renderLocations()` /
  `switchLocation()` (A0, `app.js:1063-1094`) already let a kid move freely
  between any unlocked location; the Pond never re-locks, so remedial practice
  is already free, and the 🧪 dev shortcut already covers testing.

- **`cut-gear.py`'s neck guard truncates a sou'wester, and no constant fixes
  it (R7, #133).** `neck` is a per-pose row below which nothing can be part of
  a hat. Right for eleven hats; wrong for the one whose defining feature is
  sweeping down over the neck. Both sou'westers ship clipped, ending 1 px above
  their pose's line on a flat run with no taper. It is visible: 212 px of a
  152x168 sprite differ by >30 at true game scale against an unclipped cut.
  Lowering the row does **not** fix it: swept to 900/960/1000 the piece's
  bottom lands at exactly `neck - 1` every time and keeps growing, because that
  delivery differs from the reference across the whole body (22.3% below the
  neck) so "changed" runs to the canvas floor; at 900 the flat edge just
  relocates to a seam across the shoulder and vest, which looks worse. The fix
  is shape-aware rather than a row: below the neck keep only what is connected
  to the brim above it AND distinguishable from the body underneath. Full
  measurements in `ART.md` → the `hat-souwester-ocean` record.

### Nice-to-haves noticed along the way

- Animate the vessel swap (rowboat → waders → bigger boat) into the existing
  rank-up ceremony (A0) for a visible "look how far I've come" beat.
- Location-flavored junk items (a starfish in the Ocean instead of a boot),
  same `config.junk` pattern, just new tagged entries + tiny sprites.
- Real shape variety compounds nicely with two already-parked backlog items:
  **Home aquarium** and **Family trophy wall**, no extra work, just a better
  payoff once it lands.

### Sequencing note

Foreground layers + the Ocean background are cheap enough to bundle into the
A6 Ocean art request when that milestone starts (background prompt already
drafted in `ART.md`). The rig/hat/rod/character/color work is a real code
change (new layered rendering + shop sections + profile-setup UI), not just
art: scope it as its own milestone(s) once A5-A8 close, since it touches all
three locations at once rather than landing as one vertical slice.

## `cut-angler.py`'s despill reddens thin neutral pieces (R7, 2026-09-03)

Its alpha is a distance ramp plus an asymmetric despill: `B → min(B, G)` and
`R → min(R, 1.9·G)`. The 1.9 was tuned for terracotta, tan skin and honey cane,
where R legitimately runs high. On the first *neutral* subject the pipeline has
met: `rod-carbon-stream`, the thinnest rod in the set at 15.6 px against the
Pond's 29.7: it turns a grey-taupe shaft into a plum one. Measured on the same
pixels: ramp + despill gives R − B **+50**, `cut-gear.py`'s unmix model
(`gap = min(R,B) − G`, adopted there precisely because a JPEG's ringing against a
saturated key is not a linear mix) gives **+39**. About 11 points of the warmth
is ours.

Not done with the delivery it was found on, because it changes how **every** rod
is cut and all six shipped ones would need re-cutting and re-verifying. Confine
it to `--rod` mode and the committed angler layers stay untouched. Worth doing
before any further neutral or very thin gear.

## Three decisions R6 left behind (2026-09-02, none blocking)

Carried out of `HANDOFF.md` when the refresh closed, because none of them is
state: they are questions nobody has answered yet.

- **`data/fish.json`'s per-species `color` has almost no job left.** The painted
  bodies run darker and duller than it, and now that all 33 have art it only
  tints the collection blob for *uncaught* species: a silhouette. Either
  re-pass the 33 values toward the paintings or decide the field is vestigial;
  a data test still enforces `#rrggbb`.
- **The two Ocean sheets are drawn tighter than the rest.** Tonal stdev 53–71
  against the Pond and Stream's 26–45. It does not survive the downscale and at
  54–78px they sit with the other twenty, so this is taste, not a defect.
  `ART.md` → *R6 wave 3* has the numbers.
- **Asset weight, a policy call rather than a bug.** A cut fish is ~150KB at
  ~525px for something that renders at 54. Resampling to 320px is provably
  invisible even at retina scene scale (mean channel diff ~1 of 255) and halves
  it: ~2.4MB across the full roster. It would set the rule for the anglers and
  vessels too, which is why it is a question rather than a commit.

## Four repainted hulls, if the tinted thwarts ever bother anyone (R5 debt, 2026-09-04)

The shop hulls were broken: every vessel was `skinnable: false`, so buying one
did nothing, and that is **fixed**: they are CSS tints of the Pond rowboat's own
painting now, chosen over four repaints after shooting both in the real game.
The one thing the tint gets wrong is that the thwarts and the interior colour
along with the planking, where `ART.md`'s repaint prompt asks for bare timber.

Matt's call was to ship the tint and keep the repaints as a later option, so the
prompt stays written out in `ART.md` → *R5 debt*, along with what taking that
path now costs: four generations, four cut pairs, a per-pose registry like
`CONFIG.rig.gearArt`, and dropping the `tint` field. Play it first: the tinted
thwarts may well not be worth four generations.

**Unreferenced since the tint shipped:** `assets/boat-red.png`, `boat-blue.png`,
`boat-leaf.png`, `boat-purple.png` and `boat.png` are pixel-era files nothing
loads any more. They are exactly the filenames the repaint prompt says to
overwrite, which is the only reason they are still in the repo.

## The wait puns are not location-aware (noticed during T2, 2026-09-04)

`play-check --loc ocean` surfaced "The trout are impressed" and "Don't trout
yourself now" while fishing the Ocean. `PUNS.wait` and friends are one shared
pool per *moment*, and only phrases and sentences are filtered by
`save.location` (`buildPhrasePool`). So freshwater jokes land at sea.

Small and purely flavour, and the fix is a choice rather than a bug: either tag
the handful of species-specific puns with a location the way `PHRASES` already
are, or just reword the offenders to be water-agnostic. The second is cheaper
and probably right: the pools are meant to be groan-first, not accurate.
