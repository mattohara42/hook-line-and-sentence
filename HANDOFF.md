# HANDOFF.md — where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers* — never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **R7 — gear in the new style**, `BUILD_PLAN_REFRESH.md`. The last one in the epic. |
| **Done when** | buying and equipping a hat changes the angler everywhere and persists, and the rod you bought is the rod in your hand |
| **State** | **R6 closed 2026-09-02 at 33 of 33 fish.** R7 has no code and no art yet. |
| `origin/main` | clean, nothing unpushed |
| Tests | 86/86 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**R7's code half, against placeholders, before any generation goes out** — the
order every art milestone in this epic has used, and the reason none of them
ever blocked on Gemini. Three things are missing and none is hard:

1. **`shop.hats` does not exist** in `config.js`. `renderShopList` already
   generalises over `(items, container, kind, hint)`, so a hats section is a
   config block, a container in `index.html` and one call.
2. **`shop.rods` has no `file`**, the way `shop.boats` does. R4 established the
   `rod-<id>-<pose>` convention and drew the diagonal of the grid (each pose
   holds its own gate rod), so the wiring is a lookup, not a redesign.
3. **`renderRig` hardcodes the rod.** `CONFIG.rig.poses.pond.layers` names
   `rod-stick-pond` literally; it needs to read the equipped rod the way the
   vessel already reads the equipped boat (`app.js`, the `vessel()` helper is
   the pattern to copy).

Then write the prompts. **`GEMINI_NOTES.md` before writing any of them**, and
the grid is 4 rods × 3 poses + hats × 3 poses, minus R4's diagonal.

**One thing R6 proved that R7 should reuse:** a sheet is the only way to *ask
for* a difference rather than describe one. Four hats on one canvas will come
back as four different hats; four separate generations will come back as one hat
four times.

## Waiting on Matt (none of it blocks R7)

- **Close PR #55 unmerged.** Verified 2026-09-01: it is a strict *subset* of
  `main` — merging it would delete 3463 lines including R1, R2 and the whole
  refresh epic. Full evidence in PR #60. Its branch
  `claude/graphics-assets-plan-rza791` (a9e4e73) goes with it.
- **Delete stale branches** (SHAs recorded so it is reversible):
  `claude/advanced-game-progression-ejj4yx` (49f2abb) ·
  `claude/docs-dynamic-intent-generation-p14kbx` (a50a15c) ·
  `claude/epic-continuation-81tdvp` (69f79ea) ·
  `claude/gemini-game-asset-prompts-aeopww` (c47e021) ·
  `claude/next-steps-0v0xeg` (98762e7) · **`g1/layered-rig`** (5e855b5 — ⚠️
  Matt's own branch, confirm first; the parts that survived merged via #42/#43).
- **The GitHub repo description still says "pixel-art"**, which R2 removed
  game-wide. It is the first thing a stranger reads.
- **R1's line prototype wants an eye test.** Serve the repo, open
  `/prototype/line-animation.html`, cast it, drag the tension slider.
  `ANIMATION.md` flags its own assumption (a Bezier with a tension-driven
  control point, not a physics rope). If it fails, the shape is in `logic.js`
  and the feel is in `CONFIG.anim` — it swaps out without touching the loop.
- **The bite now emerges 32px higher** (#103): at the old offset the fish
  appeared fully behind the finger panel on a 2:1 screen. Worth an eye test, and
  a one-line revert (`CONFIG.fish.approach.spawn.dy`) if you liked it deeper.
- **A7 fight beats have never been tested on a real kid.**
  `CONFIG.fight.clauseRunMs` (550) and `segmentRunMs` (900) were picked by feel.
- **The Firebase blast-radius decision**, in `BACKLOG.md`.

## Three decisions R6 left behind, none blocking

- **`data/fish.json`'s per-species `color` has almost no job left.** The painted
  bodies run darker and duller than it, and now that all 33 have art it only
  tints the collection blob for *uncaught* species — a silhouette. Either
  re-pass the 33 values toward the paintings or decide the field is vestigial;
  a data test still enforces `#rrggbb`.
- **The two Ocean sheets are drawn tighter than the rest.** Tonal stdev 53–71
  against the Pond and Stream's 26–45. It does not survive the downscale and at
  54–78px they sit with the other twenty, so this is taste, not a defect.
  `ART.md` → *R6 wave 3* has the numbers.
- **Asset weight, a policy call rather than a bug.** A cut fish is ~150KB at
  ~525px for something that renders at 54. Resampling to 320px is provably
  invisible even at retina scene scale (mean channel diff ~1 of 255) and halves
  it — ~2.4MB across the full roster. It would set the rule for the anglers and
  vessels too, which is why it is a question rather than a commit.

**Carried from R5, and still user-visible:** both painted vessels are
`skinnable: false`, so equipping one of `shop.boats`' four alternate hulls does
nothing at any spot. It is the closest neighbour to R7's work — same shop, same
equip path — so it may be cheapest to fix while that code is already open.
Prompt, registration check and a cheaper CSS-tint fallback: `ART.md` → *R5 debt*.

## Rules of thumb

- **`git fetch origin main` before branching**, and re-branch from it after
  every squash-merge — reusing a branch across merges makes its history diverge
  and the next PR conflicts against work that is already in.
- **Verify visual and motion claims in a real browser**, not just unit tests —
  and **screenshot past the startup modal**. `app.js` is an ES module, so
  nothing is on `window`: drive the game by seeding `tf:profile:*` in
  localStorage before load, which boots straight past the picker on the real
  code path.
- **Draw what you measured before believing it.** R6 shipped four bugs past
  green assertions. The muskie was checked by painting its configured mouth on
  the live scene next to the line's own endpoint — they coincided, which is the
  test the catfish and the unicornfish both failed. Now in `CLAUDE.md`.
- **A piece that doesn't fit is a reroll, not an offset tweak** — G1's lesson,
  and R3's for backgrounds. But **placement is wiring, not art**: R5 seated the
  Ocean kid in a fighting chair the generator put wherever it liked, using
  `vessel.x/y` and the pose's `anchor`, and spent no reroll on it.
- **Nothing may land in the bottom-center finger-guide panel.** It covers the
  lower third and it is the best part of the game.
- **The keyboard is frozen and tested.** Never point `--kb-*` at a scene token.

## Which doc owns what

| doc | owns |
|---|---|
| `SPEC.md` | the game's design, and its non-goals |
| `BUILD_PLAN_REFRESH.md` | the active epic, R1–R7 |
| `ART_DIRECTION.md` | what the art should **look like** |
| `ANIMATION.md` | how the cast, line and reel **move** |
| `ART.md` | the art **pipeline** and the open requests |
| `GEMINI_NOTES.md` | how the **generator** behaves, and how to salvage it |
| `BACKLOG.md` | everything deliberately not being done yet |
| `FIRESTORE.md` | the sync contract |
| this file | state and pointers, nothing else |

`BUILD_PLAN_VISUAL.md` and `BUILD_PLAN_GRAPHICS.md` are superseded and kept only
for the trail.

## Keeping this file cheap

`CLAUDE.md` owns these rules and this file should not restate them, which is
itself one of them: **rewrite, never append** · **a resolved thread becomes one
line or disappears** · **never restate another doc** · **no session narrative**.
It reached 199 lines once by accreting finished investigations.
