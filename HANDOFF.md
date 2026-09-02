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
| **State** | **12 of 21 painted, 2026-09-02. The hat column is COMPLETE, 12 of 12**, from six paintings (each Pond hat transplanted to the Stream for free). All twelve verified in Chromium at all three spots in one sweep. Both done-when clauses are met. Left: **the 9 rods only.** |
| `origin/main` | clean, nothing unpushed |
| Tests | 89/89 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**R7 has one thing left: the nine rods.** The hat column closed at 12 of 12 on
2026-09-02 and every hat was verified in a real browser at every spot. Both
done-when clauses have been met since the straw hat landed.

**A rod is not cut the way a hat is, and that is the whole job.** A hat is found
by *difference* (`cut-gear.py`); a rod cannot be, because the shaft under the
hand is exactly where the two paintings agree. A rod is cut by `cut-angler.py`'s
fitted corridor instead — its axis, half-width, butt, hand band and reel circle
— and every one of those numbers stays valid **only if the new rod lands on the
same axis**, which is what the rod prompt spends its weight on. That is also the
argument for holding the axis rather than accepting a well-drawn rod elsewhere
on the canvas: nine freely drawn rods are nine axes to measure and nine chances
to bite into the body.

**Their prompt is still a template**, not written out per rod, in `ART.md` → *R7*
→ *The rods*. Writing the first one out whole is the natural next step; `<W> by
<H>` comes from the pose table above it. The hats proved that pays for itself —
a prompt recorded as "that one with the block swapped" is not something anyone
can paste, and the eight substitutions include the canvas size, which is per
pose and costs a generation when wrong.

**Before your first cut in a fresh container:** `pip install Pillow numpy scipy`,
and for `spot-check.mjs`, `cd /tmp && npm install playwright`. `tools/README.md`
indexes all eight tools and what each is for.

**Two things the hats left behind.**

- **A good delivery was rejected by mistake** for looking like the straw hat,
  and was a sou'wester all along; measuring the two silhouettes settled it in
  one command (reach behind vs in front, 2.44 against 2.01). A glance is not a
  measurement, and a wrong rejection costs as much as a wrong acceptance while
  being far harder to notice. Both hats were amber and wide-brimmed because
  nothing in the prompts separated their *colour* — see `GEMINI_NOTES.md`.
- **`cut-gear.py`'s neck guard truncates both sou'westers** and no constant
  fixes it. Measured, visible at game scale, and in `BACKLOG.md` with the
  numbers rather than bodged.

**A delivered PNG is not live until it is registered** in `CONFIG.rig.gearArt`,
and an unregistered one looks exactly like art that never arrived.

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
  `claude/next-steps-0v0xeg` (98762e7) · `claude/fish-work-lbjzkz` (53a68f6,
  fully contained in `main`, so it is the safe one) · **`g1/layered-rig`**
  (5e855b5 — ⚠️ Matt's own branch, confirm first; the parts that survived merged
  via #42/#43). Two more are older and carry commits that are **not** ancestors
  of `main` (July, pre-squash): `claude/game-ui-visuals-wt1amv` (73f76c8, 29
  commits) and `claude/open-this-3wbx9w` (720ca36, 10). Their work looks landed
  by squash, but check one before deleting either.
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
nothing at any spot. R7's `gearArt` is now the pattern that would fix it —
a hull is a gear slot with a per-pose registry, and the boat shop is the one
shop kind still on its own older mechanism. Worth folding in rather than
re-solving. Prompt and a cheaper CSS-tint fallback: `ART.md` → *R5 debt*.

## Rules of thumb

- **`git fetch origin main` before branching**, and re-branch from it after
  every squash-merge — reusing a branch across merges makes its history diverge
  and the next PR conflicts against work that is already in.
- **Verify visual and motion claims in a real browser**, not just unit tests —
  and **screenshot past the startup modal**. `node tools/spot-check.mjs --loc
  ocean --hat straw --rod deepsea` does it: it seeds a profile, clicks through
  the picker, prints the rig's layer stack and any failed asset request, and
  saves a shot. Serve the repo first, and it needs playwright on `NODE_PATH`.
- **Draw what you measured before believing it.** R6 shipped four bugs past
  green assertions. The muskie was checked by painting its configured mouth on
  the live scene next to the line's own endpoint — they coincided, which is the
  test the catfish and the unicornfish both failed. Now in `CLAUDE.md`.
- **A new test is worth nothing until you have watched it fail.** R7's five
  config traps were each checked by breaking the invariant they guard.
- **When a delivery measures like a redraw, suspect the measurement first**, and
  **get a control before you judge one.** `cut-gear.py` prints raw numbers with
  no thresholds, so re-cut a committed delivery and compare: it is one command,
  it comes back byte-identical, and it turns "14.3% of the body differs" from an
  alarm into a normal reading (#128). The Stream hat cost a scare for want of
  this: IoU 0.54 with 70% "changed", and a perfectly faithful edit whose fit was
  keying on a landing net that had swung (#124).
- **A registry beats a filename convention.** `CONFIG.fish.species`,
  `CONFIG.rig.poses` and now `CONFIG.rig.gearArt` are one idea three times: the
  config lists what exists, anything absent falls back, and a half-finished set
  stays playable. Reach for it again rather than inventing something.
- **A piece that doesn't fit is a reroll, not an offset tweak** — G1's lesson,
  and R3's for backgrounds. But **placement is wiring, not art**: R5 seated the
  Ocean kid in a fighting chair the generator put wherever it liked, using
  `vessel.x/y` and the pose's `anchor`, and spent no reroll on it. And **the
  reroll decision itself is a measurement**: R7 rejected a good sou'wester for
  looking like the straw hat, and one command comparing the two silhouettes
  disproved it (#133). A wrong rejection costs as much as a wrong acceptance and
  nothing downstream ever complains about it.
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
It reached 199 lines once by accreting finished investigations.
