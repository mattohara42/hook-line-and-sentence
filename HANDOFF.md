# HANDOFF.md: where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers*, never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **None.** Nothing is blocked on code. The next one is Matt's call, and the shortlist is below. |
| **Last change** | **Four backlog decisions, shipped together**, 2026-09-05: cloud saves removed, mobile closed with a keyboard notice, the last pixel-era art deleted, and nothing is monospace but the keyboard. |
| **The game has been played** | By Matt, and shared with friends and family. Verdict: fun, and it looks good. **It is close to release-ready**, and the Firebase question that gated sharing is now answered. |
| **Living Water** | L1 ✅. **L2 (the actors with no voice: heron, stream leaves, sail) is not started.** |
| **Tackle & Junk** | T1–T3 ✅. **T4 (junk art) is still waiting on one generation from Matt**, prompt written whole in `ART.md`. |
| **The refresh** | ✅ R1–R7 all shipped, `BUILD_PLAN_REFRESH.md`, closed 2026-09-04. |
| **Catch Feel** | ✅ F1–F5 shipped 2026-09-03, `BUILD_PLAN_FEEL.md`. |
| `origin/main` | clean, nothing unpushed |
| Tests | 117/117 (`npm test`), plus `tools/ui-check.mjs` for the chrome (needs a served repo + playwright) |
| Open PRs | **#55 only**: close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**Matt played it, and then shared it.** That is the thing that changed. Six
findings came out of one session at the Stream and they are the top section of
`BACKLOG.md`, each with the code checked so the entry carries a number rather
than an impression. **Two are done** (#183, and the two that needed nobody's
opinion): the shop's gate rods now read "opens the Stream · luck ★★", and
holding Shift capitalises the guide's caps. Four are left, in the order I would
do them:

1. **The Stream chirps too high and too often.** Almost certainly config-only:
   the `bubble` voice fires every 70–480ms at 700–2200Hz and then ramps up to
   2.7x. Cheapest real improvement on the list, and it needs ears, not a
   spectrogram.
2. **You cannot tell which letters are locked.** Opacity 0.18 and nothing else.
   **Not yet reproduced in a browser at the Stream**, so confirm the faint style
   is the whole story before designing a fix. A guide screenshot with Shift held
   is in #183 if a starting picture helps.
3. **Numbers, symbols and more punctuation.** Its own epic, not a milestone.
4. **The pixel boot is still on screen.** Already T4, already prompted, still
   waiting on one generation. The new fact is only that the scene shows it too,
   so the card's 96px mitigation does not cover it.

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

**One step that code cannot do, and it is the only thing still exposed:
publish `firestore.rules` in the Firebase console.** Cloud saves are gone from
the game (no config, no SDK, no sign-in, no write path), and the file now denies
everything, but **the rules that are live are the ones published in the
console**. Until they are replaced, any Google account on earth can still create
documents in the `typingFishing` collection of the project shared with Family
Hub, whatever the game does. The file's header has the four steps; the one that
matters is pasting only the `typingFishing` block, never the whole file, or
Family Hub's rules go with it. Old documents are not deleted by this, just
unreachable from a browser: the console still reads them if the saves are
wanted before the collection is cleared.

Still open, and all one-line knobs:

- **Watch the water** (L1). Three calls in `CONFIG.life`: how often (it inherits
  the voices' gaps, so the frog is every 7–19s and the gull every 17–52s), how
  long each lasts (`ms`), and where the frog may surface (`box`, a 45px stretch
  hemmed between the boat and the word box). The frog on a **lily pad** was cut
  for a measured reason and it is a real loss: every pad in the painting sits
  behind the keyboard.
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

- **Close PR #55 unmerged.** Verified 2026-09-01: it is a strict *subset* of
  `main` and merging it would delete 3463 lines including the whole refresh
  epic. Evidence in PR #60. Its branch `claude/graphics-assets-plan-rza791`
  (a9e4e73) goes with it.
- **Delete stale branches** (SHAs recorded so it is reversible). Safe:
  `advanced-game-progression-ejj4yx` (49f2abb) ·
  `docs-dynamic-intent-generation-p14kbx` (a50a15c) ·
  `epic-continuation-81tdvp` (69f79ea) ·
  `gemini-game-asset-prompts-aeopww` (c47e021) · `next-steps-0v0xeg` (98762e7) ·
  `fish-work-lbjzkz` (53a68f6), all `claude/`-prefixed. Check first:
  **`g1/layered-rig`** (5e855b5: ⚠️ Matt's own; what survived merged via
  #42/#43), and two July branches whose commits are **not** ancestors of `main`
  (pre-squash, so the work looks landed but confirm one):
  `claude/game-ui-visuals-wt1amv` (73f76c8) · `claude/open-this-3wbx9w`
  (720ca36).
- **The GitHub About panel: a paste, not a task.** All three fields are wrong. A
  session reaches the GitHub API fine but the proxy refuses this write: `403
  Repository settings writes are not permitted through this proxy`. Values
  composed, production URL confirmed against Netlify:

  ```
  gh repo edit mattohara42/hook-line-and-sentence \
    --description "A typing tutorial that's a fishing game. Or is it a fishing game that's a typing tutorial? Cozy painterly keyboard practice for kids: cast, reel and catch your way from single words up to full punctuated sentences. Vanilla JS, no build step." \
    --homepage "https://hook-line-and-sentence.netlify.app" \
    --remove-topic pixel-art \
    --add-topic touch-typing --add-topic typing-practice
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
