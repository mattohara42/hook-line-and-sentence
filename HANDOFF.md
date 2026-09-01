# HANDOFF.md — where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers* — never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **R6 — fish, a rig per species**, `BUILD_PLAN_REFRESH.md` (R5 closed 2026-09-01) |
| **Done when** | every species in `data/fish.json` has its own art, the collection screen reads as 33 different fish, and the landing has a visible moment — wave by wave, Pond first |
| **State** | R5 shipped: both vessels painted, cut and wired. One piece of R5 debt is open — see below. |
| `origin/main` | clean, nothing unpushed |
| Tests | 82/82 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**R6 is the big one and it has not been scoped yet.** ~33 species × body/fin/tail
in waves by biome, per `BUILD_PLAN_REFRESH.md`. Before writing a single prompt:

- **Read `tools/cut-angler.py` first.** R6 is the same shape of problem it
  already solves — several registered pieces out of one delivered painting — and
  R4 paid for every lesson in it. `tools/cut-vessel.py` is the simpler cousin,
  and its sheer detector is the model for *finding* a cut line rather than
  tracing one.
- **Read `GEMINI_NOTES.md`.** Its *Characters* section is what R4 bought, and
  R5 added the see-through recipe. Two that cost the most: **measure a complaint
  before spending a reroll on it**, and **position by edges and corners, never
  by percentage**.
- **A half-finished roster is a playable state**: the tinted placeholder stays
  for any species whose art has not landed, so ship a biome at a time and never
  block on the full 33.

**One piece of R5 debt, and it is user-visible:** both painted vessels are
`skinnable: false`, so **equipping one of `shop.boats`' four alternate hulls
does nothing at any spot**. They are still pixel-era PNGs with no far/near
split. The fix is *not* four fresh prompts — four fresh rowboats would be four
different boats under one shared vessel box. Generate them **from** the
delivered painting so they register by construction, then run the same cut.
Prompt, the registration check, and a cheaper CSS-tint fallback: `ART.md` →
*R5 debt — the four shop hulls*. It blocks nothing in R6.

## Waiting on Matt (none of it blocks R6)

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
- **The Firebase blast-radius decision**, in `BACKLOG.md`.

## Rules of thumb

- **`git fetch origin main` before branching**, and re-branch from it after
  every squash-merge — reusing a branch across merges makes its history diverge
  and the next PR conflicts against work that is already in.
- **Verify visual and motion claims in a real browser**, not just unit tests —
  and **screenshot past the startup modal**. Every R3 preview was shot through
  the profile picker's scrim and looked half as bright as the game really is.
  Measuring the right number on the wrong image is the failure mode.
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

It reached 199 lines by accreting finished reasoning — one resolved thread alone
ran 35 lines restating an investigation that PR #60 already recorded in full. So:

- **Rewrite it, never append.** It is a snapshot, not a log.
- **A resolved thread becomes one line, or disappears.** Point at the PR.
- **Never restate another doc.** Link it. If a rule belongs to the generator,
  it goes in `GEMINI_NOTES.md` and this file does not repeat it.
- **Drop session narrative entirely.** "What happened last session" is `git
  log`; what the next session needs is state, the next action, and what is
  blocked on a human.
