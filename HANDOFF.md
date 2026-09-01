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
| **State** | **R4 is done** — all three anglers painted, cut, wired, verified. R5 has not started. |
| `origin/main` | `cf2468a`, tree clean, nothing unpushed |
| Tests | 81/81 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**R4 is closed.** All three anglers are painted, cut into rod/arm/body, wired and
verified frame by frame — the tip-to-line gap peaks at 0.13 / 0.37 / 0.19px
across the Pond, Stream and Ocean. Three poses cost four generations; the Ocean
landed first attempt because everything the first two cost was priced into its
prompt.

**R5 — vessels — is next, and it needs art**, so the first move is writing its
requests in `ART.md`: a **rowboat** (Pond) and a **Boston Whaler with a stern
fighting chair** (Ocean), each with a **near-side layer painted in front of the
angler** so the kid sits down *in* the hull. The Stream needs no vessel.

**Three things R4 deliberately left R5**, all listed in its section of
`BUILD_PLAN_REFRESH.md`:

- `#boat`/`#hull-shadow` are hidden in the Stream by one CSS rule — fold that
  into proper per-location vessel handling rather than leaving a special case.
- **`#rig` still bobs like a hull**, which is right for a boat and wrong for a
  kid standing in a river. About a pixel, so not urgent; placement is where the
  bob should become a per-pose property.
- **The Ocean's fighting chair was deliberately not drawn.** Its angler is posed
  as if braced with nothing under him, so R5 can paint the chair in front of him
  the way the hull is painted in front.

**The one visible thing that is not a bug:** the Ocean angler reads as sitting
*on* the pixel rowboat's gunwale rather than in it. A reclined, legs-forward pose
does not fit a rowboat — it fits the Whaler R5 draws. Placement was left untuned
on purpose rather than fitted to art that is about to be replaced.

**`tools/cut-angler.py` is the R4 asset:** one delivered painting per pose in,
three registered layers out, every per-pose number in a `POSES` dict. R6's fish
are the same shape of problem (body/fin/tail from one painting), so read it
before inventing anything there.

Read `GEMINI_NOTES.md` before writing any prompt. Its *Characters* section is
everything R4 paid for.

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
