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
| `origin/main` | `74e9a51`, tree clean, nothing unpushed |
| Tests | 80/80 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

R4 is the first milestone to generate **character** art rather than
backgrounds. Two things to read before writing a single prompt:

1. **`GEMINI_NOTES.md`** — how the generator actually behaves. R3 spent
   thirteen generations on nine images learning this; it is why five of the last
   six landed first attempt. Do not re-derive it.
2. **`ART.md`'s same-canvas rule** — every rig piece is drawn *from* the torso
   as a reference image and returned on the *same canvas*, so offsets are zero
   by construction. This matters more in R4 than anywhere else in the epic, and
   G1 is the cautionary tale: it asked for pieces in isolation, tuned offsets at
   4x zoom, and shipped a hat that sat on the hair like a sticker.

`BUILD_PLAN_REFRESH.md`'s R4 section has the rest. Note its sequencing point:
R1 landed before R4 deliberately, so the rig is cut for motion that already
works rather than for guesses.

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

> A web session's git credentials are **read-only**, so PR-closing and branch
> deletion are console steps, not something to attempt here.

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
