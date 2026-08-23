# HANDOFF.md — session-to-session notes

Read this first when picking the project back up. It's a short-lived
snapshot, not a design doc — `SPEC.md`, `BUILD_PLAN*.md`, `BACKLOG.md`, and
`ART.md` are the durable sources of truth and are kept in sync at the end of
each session. This file just says *where things were left* and *what's
waiting on a human*.

## Where things stand (as of 2026-08-23)

v1 core (M1–M10) and the Advanced Progression epic (A0–A8) are both done —
Minnow → Mackerel → Marlin → Muskie is fully playable. There is **no active
milestone right now.** The last few sessions have been a pre-release
hardening pass followed by a light, fun pass adding family-specific easter
eggs. `BUILD_PLAN_ADVANCED.md` names **Graphics & Character Rig** as the next
epic, but it's still parked in `BACKLOG.md`, not yet broken into milestones —
don't start it without scoping it into real milestones first.

## Last session's changes (PRs #32–#34, all squash-merged to `main`)

- **#32 — docs sync.** Fixed three stale doc references left over from the
  pre-release pass (`#31`): `CLAUDE.md`/`BUILD_PLAN_ADVANCED.md` still said
  "first buildable milestone is A0" and listed three pending art PNGs
  (Stream background had already landed); `FIRESTORE.md` told a new-project
  reader to paste "the complete reference ruleset from the bottom of
  `firestore.rules`," a block that pre-release pass #31 intentionally removed.
- **#33 — pun-pool easter eggs.** Added family-favorite flavor lines to
  `app.js`'s `PUNS` pools (`wait`/`niceCast`/`bite`/`catchCommon`/
  `catchRare`) — Kate (Bluey, unicorns, 80s pop), Frankie (Zelda, weights,
  Rubik's cube), Jack (Simpsons, classic rock, hip hop). Left `cast` (must
  keep the literal instruction) and `escape`/`junk` (deliberately gentle
  tone) alone.
- **#34 — three new fish + a queued art request.** `data/fish.json` gained
  Una Corn (Unicornfish/ocean/uncommon, Kate), Major Grouper (ocean/
  uncommon, Frankie), Muddy Waters (Channel Catfish/stream/rare, Jack) — all
  reuse the shared per-tier sprites tinted by `color`, so no art dependency.
  Also queued a dino-chicken-nugget junk item as a real `ART NEEDED` block in
  `ART.md` for Frankie — **deliberately not wired into `config.js` yet**
  (same reasoning as the Muskie sprite: it's a straight sprite replace, so
  wiring it before the PNG exists would show a broken image on that roll).

**Discussed and declined:** LLM-driven dynamic content generation (tier
2/tier 3 phrases/sentences personalized live to a kid's favorite characters,
or parameterized by arbitrary player input). Matt didn't want to go down
that road — this is a static, no-build-step, offline-capable app with no
backend, and it would also relitigate the locked "sentences are hand-curated,
not generated" call in `BUILD_PLAN_ADVANCED.md`. He went with static,
hand-picked easter eggs instead (the three PRs above). Worth remembering so
it doesn't get re-proposed from scratch.

## Open threads / waiting on Matt

- **Art pending** — exact Gemini prompts are in `ART.md`:
  - `assets/background-ocean.png` (Ocean biome scene)
  - `assets/fish-muskie.png` (the legendary's hero sprite)
  - `assets/junk-nugget.png` (new this session — Frankie's dino nugget)
- **A7 fight-beats real kid playtest** still hasn't happened — the
  `clauseRunMs`/`segmentRunMs` timings in `config.js` were picked by feel,
  not by watching a six-year-old type. See `BACKLOG.md` → "Playtest before
  anything else."

## Likely next steps

Nothing is scoped or started. In rough order of what seems to matter most:

1. Wire in each art asset as it lands — every request in `ART.md` already
   says exactly what one-line change makes it live.
2. Get a real kid playtest of the A7 fight beats; adjust the two timing
   knobs in `config.js` if they read as too long.
3. If Matt wants to keep building, scope **Graphics & Character Rig**
   (`BACKLOG.md`) into real milestones the way `BUILD_PLAN_ADVANCED.md` did
   for Advanced Progression — it touches all three locations at once, so it
   isn't a single-session slice.

## Housekeeping

- Full test suite: 65/65 passing (`node --test`).
- Every PR this session was opened ready-for-review and squash-merged
  immediately (Matt's standing preference, `CLAUDE.md`). Because of that,
  each new PR's branch was reset to `origin/main` before committing the next
  batch of work, rather than stacking commits on already-squashed history.

---
*Update this file at the end of each session: replace "Last session's
changes" with the new one, fold anything still open into "Open threads," and
keep "Where things stand" current. Completed work doesn't need to be
preserved here — git history and the PR descriptions already have it.*
