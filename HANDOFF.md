# HANDOFF.md — session-to-session notes

Read this first when picking the project back up. It's a short-lived
snapshot, not a design doc — `SPEC.md`, `BUILD_PLAN*.md`, `BACKLOG.md`, and
`ART.md` are the durable sources of truth and are kept in sync at the end of
each session. This file just says *where things were left* and *what's
waiting on a human*.

## Where things stand (as of 2026-08-31, third session)

**Third session: R3's Pond half is done, start to finish.** All three painted
layers were generated, salvaged, wired and verified in a real browser, and a new
doc now carries the generator lessons so the next batch is cheaper.

- **`GEMINI_NOTES.md` is new and is required reading before writing any art
  prompt** (`CLAUDE.md` says so now). It is the memory of how Gemini actually
  behaves. Two rules reshape every future prompt: **position by edges and
  corners, never by percentage** — percentages missed by up to 65px — and **name
  a flat backdrop colour instead of asking for transparency, then detect the
  colour you actually got**, because you will not get the one you asked for.
  `ART.md`'s two "gotcha" sections moved into it wholesale; `ART.md` now points
  there rather than duplicating.
- **The Pond is wired** (PR #66): three `#bg-*` planes inside `#scene` with
  independent drift, `#scene`'s own background image dropped, V1's CSS `.reeds`
  hidden in the Pond because the painted foreground doubled them up. Verified in
  Chromium: waterline at design y=198, drift running, `prefers-reduced-motion`
  stops all three.
- **PR #55 is fully superseded and should be closed unmerged** — see "Open
  threads" below.

**R3 is still open, for the Stream and the Ocean.** Their prompts are not
written yet; that is the obvious next task, and `GEMINI_NOTES.md` should shape
them. `.loc-stream`'s `scale 1.246` workaround can only be deleted when the
Stream is repainted.

### The picture as of the end of the second session

v1 core (M1–M10) and Advanced Progression (A0–A8) are done and playable:
Minnow → Mackerel → Marlin → Muskie, three biomes. **This session restarted
the art direction and animation from scratch** — Matt likes the engine
(progression, the keyboard, the unlockables) and wants a fresh visual layer.
Two new docs he supplied are now the source of truth:

- **`ART_DIRECTION.md`** — warm painterly storybook, Ghibli-anchored. Muted
  palette, banded skies, glow not discs, thin warm-brown outlines, **no pure
  black**. Replaces the pixel-art direction the game shipped v1 with.
- **`ANIMATION.md`** — casting arc, sagging Bezier line, tension-driven curve,
  per-keystroke rod tug. Closes the oldest visual gap in the game (the line
  used to *appear* rather than travel).

The active epic is the **Art & Animation Refresh** — `BUILD_PLAN_REFRESH.md`,
R1–R7. **R1 and R2 shipped and are merged to `main` (PRs #56–#58, all
squash-merged). R3 is next, and it is the first milestone that needs Matt to
generate anything** — R1/R2 were deliberately code-only so nothing blocked on
a generation. Working tree is clean; nothing is uncommitted or unpushed.

Three decisions Matt made when the direction was adopted (recorded at the
bottom of `ART_DIRECTION.md`; don't relitigate):

1. The restyle reaches **everything except the keyboard grid** — including the
   collection screen's CSS-drawn fish icons. The game is no longer pixel art.
2. **One protagonist with three costumes.** The angler-assigned-from-age+sex
   decision is retired; the favorite-color accent tint survives.
3. **One rig per species** for the fish — all **33** of them, not shape
   families. ~99 generated pieces, so R6 ships in waves by biome with the
   tinted placeholder standing in for anything that hasn't landed.

## Superseded: the R3 Pond art session (kept for one cycle)

**`ART.md` already has the R3 Pond prompts written and ready to hand to
Matt** — three layers (far/water/foreground), full Gemini prompts, filenames,
sizes, and the waterline constraint (55% down / design y=198, or every tuned
scene coordinate moves). Pond only, on purpose: wired and judged before the
Stream and Ocean are requested, so a miss costs one level's three prompts
instead of nine.

Sequence:
1. Hand Matt the three Pond prompts from `ART.md`'s "R3 — the Pond, repainted
   as three layers" section.
2. When the PNGs land, **composite them locally first** (Pillow, at game
   scale) before wiring — the established habit, and how G1's misregistration
   got caught late last time.
3. Wire `#scene`'s background to the three-layer stack, confirm the waterline
   still reads at y=198, then mark R3's Pond half done in
   `BUILD_PLAN_REFRESH.md` and write the Stream + Ocean prompts.
4. `image-rendering: pixelated` is already off (R2) — the old pixel
   `background.png` is currently smooth-scaled as a placeholder; it disappears
   once `background-pond-far.png` lands.

**Two things a fresh session needs to know that aren't obvious from the code:**

- **`CONFIG.anim` (R1) and the new `:root` palette (R2) are both real,
  load-bearing config** — not leftover scaffolding. Read `ANIMATION.md`'s
  history section and the top of `style.css` before touching either.
- **The keyboard is frozen and tested.** Its colours are `--kb-*` tokens and a
  test (`tests/data.test.mjs`) fails if that block ever references a scene
  token. Never point it at a scene token even if the values look equivalent —
  see `CLAUDE.md`.

## Open threads / waiting on Matt

- **R1's prototype still wants Matt's eye test.** `ANIMATION.md` flags its own
  central assumption — a Bezier line with a tension-driven control point,
  rather than a physics rope — and asks for it to be looked at before it's
  treated as final. `prototype/line-animation.html` (serve the repo, open
  `/prototype/line-animation.html`; cast it, then drag the tension slider) is
  that review. The wiring shipped alongside it rather than waiting on the
  review — if it fails the eye test, the curve is
  `logic.lineControlPoint`/`lineSagPx` and the feel is all in `CONFIG.anim`, so
  it swaps out without touching the game loop.
- **✅ PR #55 — resolved 2026-08-31: it is fully superseded, and should be
  closed unmerged.** The earlier note here (repeated over several sessions) said
  it was blocked on a human call between "two different rule sets". That was
  wrong, and it cost the thread a month. Checked file by file against
  `origin/main`:
  - `firestore.rules` — **the hardening is already on `main`.** The two files
    differ by exactly two lines, both comments carrying the pre-rename game name
    ("Typing Fishing" vs "Hook, Line and Sentence"). The ownership checks
    (`wasMine()`/`isMine()`), the `sane()` shape caps and the ⚠️ threat note are
    all live. The byte-count difference that read as two rule sets was the
    rename, nothing else.
  - `tests/data.test.mjs` — `main` is a strict **superset**: the same hostname
    test (with the *correct* post-rename hostnames — the PR still asserts
    against `fishtyping.netlify.app`), plus the R1/G1 tests the branch predates.
  - `LICENSE`, `data/phrases.json` (67), `data/sentences.json` (44) — byte
    identical to `main`. `config.js`'s `isDevHost()` dev-shortcut derivation is
    on `main` too (`config.js:301,310`).

  Every unique thing PR #55 contributed was carried onto `main` by later work.
  Diffing `main → the PR branch` is **-3463 lines**: merging it now would
  *delete* R1, R2, the whole refresh epic and the rename. **Close it, don't
  merge it.** (Closing needs Matt — a web session's git credentials are
  read-only.)

  What is genuinely still open is the *design* question the rules only document,
  not the rules themselves: `request.auth != null` authorises any Google account,
  and the database is shared with Family Hub. That decision lives in
  `BACKLOG.md`'s "Decide the Firebase blast-radius question before sharing the
  URL", where it belongs — separate Firebase project · App Check · uid
  allowlist · or ship public with no Firebase at all.
- **The GitHub repo description is stale, and it now contradicts the epic.**
  It still reads "Cozy **pixel-art** keyboard practice for kids". R2 took the
  pixel direction off the game (`image-rendering: pixelated` is gone game-wide),
  so the About panel now advertises a look the project has deliberately
  abandoned. It is the first thing a stranger reads. Needs `gh repo edit` or the
  GitHub settings UI — not something a web session can do (read-only creds).
- **Branches to delete** (stale/superseded, SHAs recorded so reversible):
  `claude/advanced-game-progression-ejj4yx` (49f2abb),
  `claude/docs-dynamic-intent-generation-p14kbx` (a50a15c),
  `claude/epic-continuation-81tdvp` (69f79ea — **the hold on this one is now
  lifted**: it was kept for the 🧪 dev-unlock shortcut, and that is on `main`
  as `isDevHost()`),
  `claude/gemini-game-asset-prompts-aeopww` (c47e021),
  `claude/next-steps-0v0xeg` (98762e7),
  `claude/graphics-assets-plan-rza791` (a9e4e73 — PR #55's branch; close the PR
  first), and **`g1/layered-rig`** (5e855b5) —
  ⚠️ that one's Matt's own branch, confirm before deleting (the parts that
  survived — `CONFIG.rig.lineOrigin` + the computed aim — already merged via
  #42/#43). A **web session's git credentials are read-only**, so branch
  deletion is a local/console step, not something to attempt here.
- **A7 fight-beats playtest with a real kid** still hasn't happened —
  `clauseRunMs`/`segmentRunMs` in `config.js` were picked by feel, not tested
  against an actual kid's reading speed.

## Rules of thumb worth carrying forward

- **`git fetch origin main` before branching.** More than one session this
  project has produced work against a stale local `main`.
- **A piece that doesn't fit is a reroll, not an offset tweak** — for rig
  pieces (G1's lesson) and now for background layers too (the waterline
  constraint above is the same principle).
- **Everything about the generator now lives in `GEMINI_NOTES.md`** — read it
  before writing a prompt, and add to it whenever a batch teaches something.
- **Nothing may land in the bottom-center finger-guide panel** — it covers the
  lower third and it's the best part of the game.
- **Verify claims in a real browser, not just unit tests**, for anything
  visual or motion-related — screenshot it, or diff computed styles, rather
  than trusting the diff reads correctly. This is how the R1 tension curve and
  the R2 keyboard-untouched claim both got proven rather than asserted.

## Housekeeping

- Full test suite: 80/80 passing (`npm test` — Node's built-in runner).
- Every PR this session (#56, #57, #58) was opened ready-for-review and
  squash-merged immediately, per `CLAUDE.md`. All three GitHub PR subscriptions
  closed out cleanly on merge — nothing left watching.
- `origin/main` and this session's working tree are identical; nothing
  uncommitted, nothing unpushed.
- Netlify deploys are **manual** — merging to `main` does not go live.

## Superseded plans, kept for the trail

`BUILD_PLAN_VISUAL.md` (V2–V5) and `BUILD_PLAN_GRAPHICS.md` (G2–G6) both
planned art in the old pixel style and are superseded by
`BUILD_PLAN_REFRESH.md`. V1's three-plane scene (`#surface` in front of the mid
plane) survives untouched — it's the one part of the old visual work that
worked. G1's same-canvas, reference-drawn generation rule also survives, now a
standing rule near the top of `ART.md`. Full PR-by-PR history from earlier
sessions lives in git log and in those two files' own text, not repeated here.
