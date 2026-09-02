# HANDOFF.md — where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers* — never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **R6 — fish, a rig per species**, `BUILD_PLAN_REFRESH.md` |
| **Done when** | every species in `data/fish.json` has its own art, the collection screen reads as 33 different fish, and the landing has a visible moment — wave by wave, Pond first |
| **State** | **The Pond and the Stream are complete — 20 of 33 painted, cut and wired.** Five sheets, five first attempts. Only the Ocean remains. |
| `origin/main` | clean, nothing unpushed |
| Tests | 86/86 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**Write and generate the Ocean's sheets** — `ART.md` → *R6 wave 3*, which has no
prompts yet. Thirteen species, the biggest wave, and **sheets of six are now
proven**, so it is likely two or three generations rather than four.

**Copy the Pond and Stream structure, with one rule learned the hard way:** put
the species hardest to tell apart *on the same sheet*. The Stream's prompts were
written to keep a rainbow trout and a steelhead apart, and delivering them on one
canvas separated them better than any wording could — see `GEMINI_NOTES.md` →
*Several subjects on one sheet*.

**The muskie is the one with consequences.** It is the Ocean's legendary, it
already has an A8 hero sprite (`fish-muskie.png`) and a 96px CSS special case in
`style.css` (`#scene.loc-ocean #fish:not(.rigged).tier-legendary`), and **both
retire when its R6 art lands.** Don't leave them behind.

**Cutting is one command per sheet:** add it to `SHEETS` in `tools/cut-fish.py`
(species in reading order — rows are found automatically), run
`python3 tools/cut-fish.py <sheet>`, paste the printed block into
`CONFIG.fish.species`, `npm test`. The seam overlap and the mouth are both
derived per fish now, so a deep-peduncled legendary or a whiskered oddity needs
no special handling.

**Then look at the collection screen with the names covered.** Three bugs this
milestone — the eye dot over the sprites, every fish rendering tailless, and a
line attached to a catfish's forehead — were invisible to assertions and obvious
in a picture.

**One cosmetic item, cheap, best done when the Pond is complete:** the painted
bodies run darker and duller than `data/fish.json`'s per-species `color` (green
off by 29–51). That field now only tints the collection blob for *uncaught*
species, so it shows on a silhouette or not at all.

**Carried from R5, and still user-visible:** both painted vessels are
`skinnable: false`, so equipping one of `shop.boats`' four alternate hulls does
nothing at any spot. Prompt, registration check and a cheaper CSS-tint fallback:
`ART.md` → *R5 debt*. It blocks nothing in R6.

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
- **The bite now emerges 32px higher** (#103): at the old offset the fish
  appeared fully behind the finger panel on a 2:1 screen. Worth an eye test, and
  a one-line revert (`CONFIG.fish.approach.spawn.dy`) if you liked it deeper.
- **Asset weight, a policy call rather than a bug.** A cut fish is ~150KB at
  ~525px for something that renders at 54. Resampling to 320px is provably
  invisible even at retina scene scale (mean channel diff ~1 of 255) and halves
  it — ~2.4MB across the full roster. It would set the rule for the anglers and
  vessels too, which is why it is a question rather than a commit.
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
