# HANDOFF.md: where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers*, never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **None.** Nothing is blocked on code. The next one is Matt's call, and the shortlist is below. |
| **Last change** | **The catch card names the real species** under the joke name ("Sunny Gill", then *Bluegill*), and **an escape shows the shadow of the fish that got away**, cut from its own art, instead of the last pixel-era fish a kid could still see (2026-10-17). |
| **Before that** | **The Firestore story was wrong and is corrected**, 2026-09-07: the rules file could not have closed anything and the exposure it described was not what Family Hub's rules do. File deleted, `FIRESTORE.md` owns it. |
| **Older** | **The keyboard says which letters are locked** (#192) · **T4, and the art is finished** (#188, #189, #190). No pixel-era art is left in the game. |
| **Older still** | **The Stream stops chirping** (#186), which **still wants ears** · the picker can edit a player (#185) · four backlog decisions (#184). |
| **The game has been played** | By Matt, shared with friends and family, and **the kids love it and said thank you** (2026-09-07). Verdict: fun, and it looks good. **It is close to release-ready**, and the Firebase question that gated sharing is now answered. |
| **Living Water** | L1 ✅. **L2 (the actors with no voice: heron, stream leaves, sail) is not started.** |
| **Tackle & Junk** | ✅ **T1–T4 all shipped, epic complete 2026-09-07.** T4 grew from four junk pieces to ten and took two sheets, first attempt each. No pixel-era art is left in the game. |
| **The refresh** | ✅ R1–R7 all shipped, `BUILD_PLAN_REFRESH.md`, closed 2026-09-04. |
| **Catch Feel** | ✅ F1–F5 shipped 2026-09-03, `BUILD_PLAN_FEEL.md`. |
| `origin/main` | clean, nothing unpushed |
| Tests | 126/126 (`npm test`), plus `tools/ui-check.mjs` for the chrome (needs a served repo + playwright) |
| Open PRs | none. **#55 is closed unmerged** (2026-09-05), reason on the PR. |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**Matt played it, and then shared it.** Six findings came out of one session at
the Stream and they are the top section of `BACKLOG.md`. **Three are done**: the
gate rods say which water they open and Shift capitalises the guide's caps
(#183), and the Stream's chirping is retuned. Three are left:

1. **The Stream needs a listen**, which is the other half of the retune. 218
   bubbles a minute became 74, an octave lower, and the two numbers to move if
   it has gone too far under are `everyMs` and the voice `gain` in
   `CONFIG.audio.ambience.stream`. Before and after recordings and spectrograms
   are in the PR.
2. **You cannot tell which letters are locked** is **half fixed** (2026-09-07).
   Measuring it per key found the cause was worse than reported: six locked keys
   across the Stream and the Ocean rendered *brighter* than the live ones,
   because the panel was 55% opaque and the water behind it is brighter than a
   key's own fill. The panel has its own ground now (0.88, derived, with a test
   holding the floor). **What is left is the other half and it is a feature:**
   nothing names the live letter set or says what earns the next one, which is
   what a kid at the Stream actually needs. `BACKLOG.md` has it.
3. **Numbers, symbols and more punctuation.** Its own epic, not a milestone.

**The art is finished.** T4 shipped whole on 2026-09-07: ten junk pieces (the
original four plus a toy unicorn, a toy ninja turtle, a puzzle cube, a frisbee,
a chocolate bar and a superhero mask) from two sheets, first attempt each, cut
by the new `tools/cut-junk.py`. The junk jokes were then made per item, so a
boot joke can no longer land on a can (#190). Both calls the deliveries raised
are made: the rarity stays and the mask stays as delivered.

**Mobile is closed, not fixed.** A phone held upright still cannot see the
fishing (the lure lands at design x=458, which is viewport x 1063 in a 390px
window), and it never will: the game is typing and a phone has nothing to type
on. Matt's call is that mobile stays a shop window. What shipped instead of a
layout milestone is a dismissible "you'll need a keyboard" notice on any device
that points with a finger and has no mouse behind it, which closes itself on
the first real keystroke. The landscape overlaps in `ui-check.mjs`'s `KNOWN`
are accepted now rather than owed.

**L1 was the last milestone to land.** The Pond's frog and dragonfly and the
Ocean's gull have bodies now, in CSS, spawned off the same tick as their sound.
`BUILD_PLAN_LIVING.md` owns it. Two rules from it carry anywhere else in the
scene: **an actor and its sound are one event off one tick, never two
schedules**, and **where a thing may sit is measured, not chosen** (the canvas
covers and crops from the right, so a portrait phone sees only design x 0..166
of 720, and the keyboard's top edge reaches y=240 at 900x600).

**Landed, reasoning in each PR:** the four backlog decisions above, plus the
two play-session fixes and a shop row that wraps rather than squeezing (#183) · L1's bodies (#180) · nine of the
code review's ten findings plus the tray bug they turned up (#176) · the README
and the repo's own picture (#177) · S1 and P1, the soundscape per spot and the
panels (#175). Anything older is `git log`'s job.

**One debt still open and not started:** `cut-angler.py`'s despill should move
to `cut-gear.py`'s unmix model. It reddens thin neutral pieces by about 11
points of R − B. Deliberately not done inside a delivery, because it changes how
every rod is cut and they all re-cut byte-identically today (`BACKLOG.md` has
the numbers).

**Before any cut in a fresh container:** `pip install Pillow numpy scipy`, and
for the browser checks `cd /tmp && npm install playwright`. `tools/README.md`
indexes all fifteen tools; the gear pipeline is `gear-ref.py` → prompt →
`gear-register.py` → `cut-angler.py --rod` → one `rig.gearArt` line.

## Waiting on Matt

**Nothing here is known to be exposed, and the entry that said otherwise was
wrong.** Until 2026-09-07 this file led with "publish `firestore.rules` in the
Firebase console" and described the `typingFishing` collection as open to any
Google account. `FIRESTORE.md` now carries the correction in full; the short
version is two facts. Firestore `allow` rules are additive with no `deny`, so
the `if false` block that file held could never have closed a collection that
Family Hub's recursive `match /{document=**}` already covers. And Family Hub's
checked-in rules gate on an email allowlist of one address, not on
`request.auth != null`, so the exposure described was not what those rules do.
`firestore.rules` is deleted rather than fixed.

**What is genuinely unknown**, and only the console can answer it: whether the
live ruleset matches the one checked into `mattohara42/family-hub`. If it is
still an older `request.auth != null` version then the original exposure is
real, and the deleted block would not have closed it either. **If the collection
is wanted closed, delete the collection**: the game never reads it again, so
there is nothing to protect, and that is far cheaper than carving a path out of
a working wildcard in an app this repo does not own.

Still open, and all one-line knobs:

- **Watch the water** (L1). Three calls in `CONFIG.life`: how often (it inherits
  the voices' gaps, so the frog is every 7–19s and the gull every 17–52s), how
  long each lasts (`ms`), and where the frog may surface (`box`, a 45px stretch
  hemmed between the boat and the word box). The frog on a **lily pad** was cut
  for a measured reason and it is a real loss: every pad in the painting sits
  behind the keyboard.
- **The retuned Stream wants a listen** (above). `tools/audio-check.mjs --loc
  stream` writes a webm and a spectrogram if a second opinion helps, but the
  verdict is an ear's.
- **`CONFIG.wiggle.wordsRange`** is the one Catch Feel knob no play session has
  reported back on, and it is the number in that epic most likely to be wrong:
  two or three short words measures 3.3s at adult speed and nearer ten at a
  six-year-old's.
- **A7's fight beats have never been tested on a real kid.**
  `CONFIG.fight.clauseRunMs` (550) and `segmentRunMs` (900) were picked by feel.
- **The panels want a thumb** (P1). The collection is a tab per spot, so you
  cannot see all 33 fish at once any more, and Quick Cast kept its own big
  buttons rather than the new top-left close.
- **The bite emerges 32px higher** (#103) and **R1's line prototype** wants an
  eye test (`/prototype/line-animation.html`, and `ANIMATION.md` flags its own
  assumption). Both are one-line reverts.

Repo housekeeping, unchanged and all still true:

- **Delete nine stale branches: a paste, not a task.** A session can read them
  but the proxy refuses a delete-ref push (`403`), the same wall as the settings
  write below. All nine were verified on 2026-09-05 by diffing each against
  `main`: none holds a file `main` lacks, except one PNG noted below. SHAs are
  recorded so it stays reversible.

  ```
  for b in claude/advanced-game-progression-ejj4yx claude/docs-dynamic-intent-generation-p14kbx \
           claude/epic-continuation-81tdvp claude/gemini-game-asset-prompts-aeopww \
           claude/next-steps-0v0xeg claude/fish-work-lbjzkz \
           claude/graphics-assets-plan-rza791 claude/open-this-3wbx9w g1/layered-rig; do
    git push origin --delete "$b"
  done
  ```

  SHAs in that order: 49f2abb · a50a15c · 69f79ea · c47e021 · 98762e7 ·
  53a68f6 · a9e4e73 (was PR #55) · 720ca36 · 5e855b5 (⚠️ Matt's own; what
  survived merged via #42/#43). **One judgement call is held back:**
  `claude/game-ui-visuals-wt1amv` (73f76c8) is the only branch carrying a file
  `main` does not have, `assets/Gemini_Boat_Purple.png`, a raw delivery for a
  boat skin that #184 deliberately deleted. Delete it too if that provenance is
  not wanted; it is the one irreversible bit.
- **The GitHub About panel is nearly done.** The description, the homepage and
  the topic edits all landed. What is left is two topics that stopped being true
  when cloud saves went: `firebase` and `firestore`. Still a paste, because the
  proxy refuses this write (`403 Repository settings writes are not permitted
  through this proxy`).

  ```
  gh repo edit mattohara42/hook-line-and-sentence \
    --remove-topic firebase --remove-topic firestore
  ```

- **Upload the social preview** at Settings → General → Social preview. The
  image is committed at `docs/images/social-preview.png` (#177). Web UI only.

## Rules of thumb

- **Verify visual and motion claims in a real browser, past the startup modal.**
  `tools/spot-check.mjs` takes one still of a spot with its layer stack printed;
  `tools/play-check.mjs` plays a whole catch and shoots every beat;
  `tools/ui-check.mjs` sweeps the chrome across twelve viewports and asserts;
  `tools/life-check.mjs` spawns the ambient actors on demand and measures how
  much of each one any screen shape can actually see. Serve the repo first, and
  all of them want playwright on `NODE_PATH`.
- **None of that replaces playing it.** Every one of Matt's six findings sat
  behind 115 green tests and four browser tools. Three of them are single config
  numbers that no assertion could ever have called wrong.
- **A layout bug is arithmetic, so stop looking at it and measure it.** Four
  hand-checked viewports missed seven real collisions that a rectangle-overlap
  loop found in fifteen seconds. L1 found two more the same way, and then found
  the biggest one of all by asking what a phone can see at all.
- **Draw what you measured before believing it.** R6 shipped four bugs past
  green assertions. L1's frog passed every assertion while surfacing behind the
  word box, where a kid would hear a croak and see nothing: only a screenshot
  said so.
- **A new test is worth nothing until you have watched it fail.** L1's five
  config traps were each checked by breaking the invariant they guard, and the
  first run failed a *sixth* way that was the test being wrong rather than the
  config: a crossing actor is supposed to enter from off-crop.
- **When a delivery measures like a redraw, suspect the measurement first**, and
  **get a control before you judge one** (#128, #124).
- **A registry beats a filename convention.** `CONFIG.fish.species`,
  `CONFIG.rig.poses`, `CONFIG.rig.gearArt` and now `CONFIG.life` are one idea
  four times: the config lists what exists, anything absent falls back, and a
  half-finished set stays playable. Reach for it again rather than inventing
  something.
- **A piece that doesn't fit is a reroll, not an offset tweak**, but **placement
  is wiring, not art**, and **the reroll decision is itself a measurement**
  (#133): a wrong rejection costs as much as a wrong acceptance and nothing
  downstream ever complains about it.

## Which doc owns what

| doc | owns |
|---|---|
| `SPEC.md` | the game's design, and its non-goals |
| `BUILD_PLAN_LIVING.md` | **Living Water, L1–L3**: the ambient actors, and what each shape can see |
| `BUILD_PLAN_TACKLE.md` | Tackle & Junk, T1–T4: tackle per spot, and junk |
| `BUILD_PLAN_REFRESH.md` | the Art & Animation Refresh, R1–R7: closed 2026-09-04 |
| `BUILD_PLAN_FEEL.md` | Catch Feel, F1–F5, shipped, and what each one measured |
| `ART_DIRECTION.md` | what the art should **look like** |
| `ANIMATION.md` | how the cast, line and reel **move** |
| `ART.md` | the art **pipeline** and the open requests |
| `GEMINI_NOTES.md` | how the **generator** behaves, and how to salvage it |
| `tools/README.md` | **what the pipeline tools are**, and the deps a fresh box lacks |
| `BACKLOG.md` | everything deliberately not being done yet |
| `FIRESTORE.md` | the sync contract |
| this file | state and pointers, nothing else |

`BUILD_PLAN_VISUAL.md` and `BUILD_PLAN_GRAPHICS.md` are superseded and kept only
for the trail.

## Keeping this file cheap

`CLAUDE.md` owns these rules and this file should not restate them, which is
itself one of them: **rewrite, never append** · **a resolved thread becomes one
line or disappears** · **never restate another doc** · **no session narrative**.
It reached 251 lines by accreting finished investigations and was cut back on
2026-09-05.
