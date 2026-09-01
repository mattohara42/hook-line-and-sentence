# HANDOFF.md — where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers* — never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **R5 — vessels**, `BUILD_PLAN_REFRESH.md` (R4 closed 2026-09-01) |
| **Done when** | switching spots swaps vessel, costume and pose together; the hull overlaps the angler correctly; the line still leaves the rod tip in all three |
| **State** | R5: rowboat **landed and wired**. Waiting on the Whaler, plus four shop hulls. |
| `origin/main` | `93db370`, tree clean, nothing unpushed |
| Tests | 81/81 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**The next action is Matt's: run the Whaler prompt** in `ART.md` → *R5 — the two
vessels*. The rowboat beside it has landed and is wired; the Stream needs no
vessel.

**And four more after it, which is new work R5 gained rather than inherited:**
the Pond vessel is `skinnable: false` because `shop.boats`' alternate hulls
(`boat-red`, `boat-blue`, `boat-leaf`, `boat-purple`) are still single pixel-era
PNGs with no far/near split. **Equipping a boat skin currently does nothing at
the Pond.** Each needs the same prompt with the hull colour swapped, then
`tools/cut-vessel.py`.

**The code to receive them is already on `main`.** A pose owns its `anchor`
(where `#rig` sits and the point it rocks about), its `bob`, and its `vessel` —
`far` behind the angler, `near` in front so the kid sits *in* the hull rather
than on it, `skinnable` for the one the boat shop reskins, or `null`. So landing
a vessel is filenames and measured numbers, not new machinery.

**One painting per vessel, cut locally into two halves.** A side-on boat already
contains both: everything above the near gunwale paints behind the angler, the
near hull side paints in front. Asking for two images that must register would
invent a problem the cut doesn't have — R4's *don't generate a piece you could
cut*, applied to hulls.

Then Claude: add the vessel to `tools/cut-vessel.py`'s `VESSELS` dict with
coarse sheer anchors (within ~35px; the detector refines per column) · wire ·
**seat the Ocean angler in the fighting chair, which is a wiring step, not a
reroll** (the pose has two knobs for it, the vessel's own `x/y` and the pose's
`anchor`) · composite at 1x before believing any of it.

**Don't trace the sheer by eye.** That was tried on the rowboat and ran 25px
high, crossing the thwarts — and a thwart's near end *is* the sheer. The
detector reads what the painting gives: the rail is a lighter band with a darker
line above it.

**R4's asset is `tools/cut-angler.py`** — one delivered painting per pose in,
three registered layers out. R6's fish are the same shape of problem
(body/fin/tail from one painting), so read it before inventing anything there.

Read `GEMINI_NOTES.md` before writing any prompt. Its *Characters* section is
everything R4 paid for, including the two that cost the most: **measure a
complaint before spending a reroll on it**, and **seed a synthesised
continuation from the measured width at the seam, never a nominal constant**.

## Waiting on Matt (none of it blocks R5)

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
- **A7 fight beats have never been tested on a real kid.**
  `CONFIG.fight.clauseRunMs` (550) and `segmentRunMs` (900) were picked by feel.
- **The Firebase blast-radius decision**, in `BACKLOG.md`. Unchanged by the
  above: the rules document the problem, they do not solve it.

> **Correction, 2026-09-01:** the old note here said a web session's git
> credentials are read-only. They are not — this session pushed and squash-merged
> ten PRs (#85–#94). Closing PR #55 and deleting branches are still Matt's, but
> because they are his calls, not because Claude cannot reach them.

## Rules of thumb

- **`git fetch origin main` before branching**, and re-branch from it after
  every squash-merge — reusing a branch across merges makes its history diverge
  and the next PR conflicts against work that is already in.
- **Verify visual and motion claims in a real browser**, not just unit tests —
  and **screenshot past the startup modal**. Every R3 preview was shot through
  the profile picker's scrim and looked half as bright as the game really is.
  Measuring the right number on the wrong image is the failure mode.
- **A piece that doesn't fit is a reroll, not an offset tweak** — G1's lesson,
  and R3's for backgrounds. The exception R3 found is in `GEMINI_NOTES.md`:
  *featureless* content can be fitted, drawn content cannot.
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

It reached 199 lines by accreting finished reasoning — one resolved thread alone
ran 35 lines restating an investigation that PR #60 already recorded in full. So:

- **Rewrite it, never append.** It is a snapshot, not a log.
- **A resolved thread becomes one line, or disappears.** Point at the PR.
- **Never restate another doc.** Link it. If a rule belongs to the generator,
  it goes in `GEMINI_NOTES.md` and this file does not repeat it.
- **Drop session narrative entirely.** "What happened last session" is `git
  log`; what the next session needs is state, the next action, and what is
  blocked on a human.
