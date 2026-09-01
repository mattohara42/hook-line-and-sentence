# HANDOFF.md — where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers* — never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **R4 — the angler**, `BUILD_PLAN_REFRESH.md` |
| **Done when** | at 1x, in all three levels, the rod looks held and the costume suits the water; casting (R1) moves the arm and rod, not the whole kid |
| **State** | Pond and Stream anglers **cut, wired and verified**; the Ocean is all R4 still needs |
| `origin/main` | `658e5cf`, tree clean, nothing unpushed |
| Tests | 81/81 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**The next action is Matt's, and it needs no decisions: run the Ocean prompt.**
It is written and waiting in `ART.md` → *R4 — the Ocean angler, in the fighting
chair*. Paste, generate, paste the image back. When it is cut and wired, **R4's
done-when is met** and the epic moves to R5.

Then Claude, in order: run the delivery checks (`GEMINI_NOTES.md`'s checklist —
backdrop bled into the subject first, it is the only one that forces a reroll) ·
add an `ocean` entry to `tools/cut-angler.py`'s `POSES`, measuring the rod axis,
arm skeleton and pivots off the new painting · `python3 tools/cut-angler.py
ocean <file>`, which prints the `CONFIG.rig.poses.ocean` block · wire it ·
verify in a browser at the Ocean.

**Three things about that cut that are not obvious**, all learned the expensive
way and all recorded in full where they belong:

- `figure_h` comes from **matching the head** to the other two poses, never from
  scaling the figure — the generator draws every pose to fill its frame.
- The rod will probably run off the canvas corner. That is not a defect and not
  a reroll: the tool extends the shaft to a length set in design px.
- **Measure a complaint before spending a reroll on it.** Two of three faults
  called on the Stream's first attempt did not survive testing.

`GEMINI_NOTES.md` has all three, plus everything else about the generator. Read
it before writing any prompt.

**Where R4 stands:** the pose machinery, both finished poses and the cut tool
are on `main`. A location with no pose of its own falls back to the Pond's, so
the Ocean currently wears pond clothes — the wrong shirt rather than no angler.

**The Pond's boat is the loudest wrong thing on screen** — a pixel rowboat under
a painterly kid. That is R5, and it is expected. The Stream has no boat any
more; R5's section lists what else R4 left it.

## Waiting on Matt (none of it blocks R4)

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
