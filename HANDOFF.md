# HANDOFF.md — session-to-session notes

Read this first when picking the project back up. It's a short-lived
snapshot, not a design doc — `SPEC.md`, `BUILD_PLAN*.md`, `BACKLOG.md`, and
`ART.md` are the durable sources of truth and are kept in sync at the end of
each session. This file just says *where things were left* and *what's
waiting on a human*.

## Where things stand (as of 2026-08-31, second session)

v1 core (M1–M10) and Advanced Progression (A0–A8) are done and playable:
Minnow → Mackerel → Marlin → Muskie, three biomes, all their art landed.

**The art direction and the animation were restarted this session.** Matt likes
the engine — progression, the keyboard, the unlockables — and wants a fresh
start on backgrounds, boats and characters. Two new docs he supplied are now in
the repo and are the source of truth:

- **`ART_DIRECTION.md`** — warm painterly storybook, Ghibli-anchored. Muted
  palette, banded skies, glow not discs, thin warm-brown outlines, **no pure
  black**. Replaces the pixel-art direction the game shipped v1 with.
- **`ANIMATION.md`** — casting arc, sagging Bezier line, tension-driven curve,
  per-keystroke rod tug. Fixes the oldest visual gap in the game: the line
  currently *appears* instead of travelling.

The active epic is the **Art & Animation Refresh** — `BUILD_PLAN_REFRESH.md`,
**R1–R7, and R1 is next**. It supersedes `BUILD_PLAN_VISUAL.md` (V2–V5) and
`BUILD_PLAN_GRAPHICS.md`. This session was scoping only — **no game code
changed**, so the build on `main` is exactly what it was.

**Three decisions Matt made when the direction was adopted** (all recorded at
the bottom of `ART_DIRECTION.md`; don't relitigate):

1. The restyle reaches **everything except the keyboard grid** — including the
   collection screen's CSS-drawn fish icons. The game is no longer pixel art.
2. **One protagonist with three costumes.** The angler-assigned-from-age+sex
   decision is retired; the favorite-color accent tint survives.
3. **One rig per species** for the fish — all **33** of them, not shape
   families. That is ~99 generated pieces, so R6 ships in waves by biome with
   the current tinted placeholder standing in for anything that hasn't landed.

**R1 and R2 need no art at all**, deliberately — so there is nothing for Matt
to generate until R3, and `ART.md`'s open-request queue is empty (both previous
requests were withdrawn with the old direction).

## ⚠️ Pending from the 2026-08-31 branch audit

A cross-repo audit of unmerged branches found **real unlanded work here** —
this repo had more of it than any other.

### PR #55 — pre-release pass — needs a decision

https://github.com/mattohara42/hook-line-and-sentence/pull/55 (draft)

Branch `claude/graphics-assets-plan-rza791`, from 2026-08-22, never had a PR.
Confirmed still absent from `main`. It carries:

- **`config.js` — dev shortcuts derived from the hostname, not a flag.** Adds
  `currentHostname()` / `isDevHost()` and sets
  `dev: { testShortcuts: isDevHost(currentHostname()), testCoins: 200 }`. Its
  own rationale: the 🧪 button was live on the production site for a while
  precisely because a manual flag is easy to forget. Fails closed on an
  unknown host; split into a pure function so the Node data tests can import it.
- **`firestore.rules` — hardening + a written-out threat note.** Ownership
  helpers (`isMine`/`wasMine`), `boundedMap()` size caps, and a long comment
  spelling out that `request.auth != null` is authentication, **not**
  family-authorisation — any Google account can create documents, and this
  database is shared with Family Hub. Lists real fixes in order: separate
  Firebase project → App Check → uid allowlist → ship public with no Firebase
  config at all.
- **Content depth** in `data/phrases.json` (+44) and `data/sentences.json` (+29).
- **`LICENSE`** (new) and a README pointer.

**Blocker:** conflicts with `main` in `firestore.rules` and
`tests/data.test.mjs` (`main`'s rules are 4132 bytes vs 4114 here). Needs a
human call on which version of the rules wins — that's why it's a draft.

Given the security content, this is the most valuable thing outstanding in the
repo. Worth doing before the game's URL is shared any wider.

### Branches to delete

All stale or superseded; SHAs recorded so any deletion is reversible
(`git push origin <sha>:refs/heads/<branch>`):

```
git push origin --delete claude/advanced-game-progression-ejj4yx     # was 49f2abb
git push origin --delete claude/docs-dynamic-intent-generation-p14kbx # was a50a15c
git push origin --delete claude/epic-continuation-81tdvp              # was 69f79ea
git push origin --delete claude/gemini-game-asset-prompts-aeopww      # was c47e021
git push origin --delete claude/next-steps-0v0xeg                     # was 98762e7
git push origin --delete g1/layered-rig                               # was 5e855b5
```

Why each is safe:

- **`advanced-game-progression`** — made `BUILD_PLAN_ADVANCED.md` discoverable
  and describes A0 as "first buildable milestone". `main` now says A0–A8 all
  shipped. Merging it would *regress* the docs.
- **`docs-dynamic-intent-generation`** — added `HANDOFF.md`. It's here, and
  `CLAUDE.md` already carries the identical "read HANDOFF first" instruction.
- **`gemini-game-asset-prompts`** — A6 Ocean art prompts. `ART.md` on `main`
  already marks A6/A8 landed (2026-08-25).
- **`epic-continuation`** — the 🧪 unlock shortcut as a hardcoded
  `testShortcuts: true`. **Superseded by PR #55's** hostname-derived version;
  don't delete this one until #55 lands, or the shortcut is lost entirely.
- **`g1/layered-rig`** — ⚠️ **your call.** This is your branch and real code
  (the layered angler, 8 files). `CLAUDE.md` says V2 supersedes
  `BUILD_PLAN_GRAPHICS.md` "after G1's layered angler didn't hold up in play",
  so it reads as deliberately abandoned — but confirm before deleting. Note
  #42/#43 already merged the parts that survived (`CONFIG.rig.lineOrigin` and
  the computed aim).

## The arc of the *previous* session, in one paragraph

*(Kept because it explains why the visuals were in the state Matt reacted to.)*

The three outstanding art PNGs landed and got wired (Ocean scene, Muskie hero
sprite, dino nugget). That exposed a scene-composition problem — the SVG wave
overlay was banding the new backgrounds, and the Stream's boat floated ~100px
above its water — which was fixed by deleting the overlay and reframing the
Stream art. Then the Graphics & Character Rig epic was scoped (G1–G6) and G1
shipped: the angler split into body/hat/rod layers. **Matt played it and G1
failed the eye test** — janky hat, rod not in the hand, boat floating, fish not
underwater. That prompted a full re-plan (`BUILD_PLAN_VISUAL.md`), whose V1
shipped the same session: a water surface painted *in front of* the boat and
fish. V2 keeps the gear shop but changes how art is generated so pieces
register by construction.

## Last session's changes (PRs #36–#47, all squash-merged to `main`)

**Art landed and wired**
- **#36 — Ocean scene + Muskie hero sprite.** `background-ocean.png` needed
  `background-position: center 11%` (it came back 1.83:1, not ~2.4:1, so
  `cover` cropped its horizon 13px high). `fish-muskie.png` got its own rule;
  `fish-legendary.png` stayed put because Koi Story now uses it.
- **#37 — Frankie's dino nugget.** Wired into `CONFIG.junk.items` with a new
  pun line.
- **#38 — the SVG wave overlay is gone.** It was pinned at the pond's
  waterline and banded the other two biomes with dark stripes. The Stream's
  boat-floating problem was fixed by **reframing the art** (scaled 1.246x,
  offset so its bank lands on y=198), after moving the furniture down was
  tried and abandoned — the whole rig ended up behind the finger-guide panel.
- **#39 — 🧪 dev shortcut unlocks the keyboard too.** Letter stages are earned
  by catch count, so a fresh test profile in the Ocean had only the home row,
  which filtered out every sentence and silently dropped the reel to single
  words.

**Planning**
- **#40 — Graphics & Character Rig scoped** into G1–G6.
- **#41 — Matt's answers:** three poses (rowboat / waders / fighting chair),
  and the angler is assigned from **age + sex** rather than picked from a
  roster.
- **#45 — the re-plan.** `BUILD_PLAN_VISUAL.md` supersedes
  `BUILD_PLAN_GRAPHICS.md`, which is marked superseded but kept for the trail.
- **#47 — V2's approach**, after Matt confirmed he wants the gear shop.

**Built**
- **#42/#43 — G1.** The angler became `CONFIG.rig.layers` + `renderRig()`, and
  the three PNGs landed. `#line`'s hand-solved `275px`/`9.8deg` was replaced by
  `CONFIG.rig.lineOrigin` + a computed aim — **that part survives the re-plan.**
- **#44 — audio defaults to off** and the **day/night tint is gone**.
- **#46 — V1.** `#surface` paints the water in front of the rig and fish; the
  fish carries a `.submerged` treatment until it's landed; the boat rocks on a
  waterline pivot with a contact shadow.

## Last session also shipped: Quick Cast (2026-08-31)

A timed typing-speed test, added at Matt's request, **freely available at any
progression**. Tackle box → ⏱️ Quick cast → 3-2-1 → 30 seconds of words →
WPM, accuracy, and a personal best.

Shape of it, and the two decisions worth not re-litigating:

- **Outside the progression on purpose.** The button is never gated, and by
  default the run draws from the whole 2851-word pool rather than the kid's
  unlocked letters (`CONFIG.speedTest.useUnlockedLettersOnly`). Gating it would
  make a kid's own scores incomparable as they unlock letters, which defeats the
  point of a test.
- **Sealed off from the fishing save.** It writes only `save.speedBest`. It does
  not touch coins, catches, badges or `save.stats` — "Hooked on Typing" counts
  words reeled from real fish, and a timed run must not farm it; and folding
  rushed keystrokes into the Grown-ups heatmap would misreport which keys a kid
  actually struggles with.

Pure bits are in `logic.js` (`speedTestPool`, `typingAccuracy`, reusing
`computeWpm`/`isPersonalBestWpm`), tested — 70 green. The finger guide follows
the test's current letter and is handed back to the game on close.

Verified in a real browser, not just by unit test: a full run, the maths checked
against hand-computed expectations (1 word + 5 deliberate misses → "1 words ·
50% accurate · 10 keys", 2 wpm), GO AGAIN, and a worse second run correctly
*not* overwriting the stored best. Two bugs were found that way and fixed —
the word queue could run dry and strand the run with a blank word, and the
finger guide sat on the fishing word's letter until the first keypress.

`SPEC.md`'s "no timers or WPM" non-goal was rewritten rather than quietly
contradicted: it was always about the fishing loop, and now says so.

## Open threads / waiting on Matt

- **PR #55 and the branch deletions** — see the audit section above. #55 is the
  one with real substance (Firestore rules hardening + the dev-flag fix).
- **The rename is complete** (2026-08-31), end to end, nothing outstanding.
  Landed: the codebase and docs (#50), the Firebase authorized domain, the
  Netlify project rename, a published production deploy with sign-in verified,
  the GitHub repo rename, the About-panel Website link, and the re-lettered
  social preview (#53) — now uploaded at Settings → General → Social preview.
  The game is at **https://hook-line-and-sentence.netlify.app** and the repo is
  `mattohara42/hook-line-and-sentence`; old repo URLs redirect, so existing
  clones keep working. Two lasting consequences worth remembering: the freed
  `fishtyping` subdomain is **not** redirected and is claimable by anyone, so
  any old bookmark is dead; and social cards cache hard, so Slack/iMessage may
  serve the old image for a while even though the repo page is correct.
- **Three rename steps a web session cannot do, so don't burn time trying**
  (learned 2026-08-31). **Netlify deploys**: `api.netlify.com` and
  `netlify-mcp.netlify.app` are both refused by the sandbox egress policy (403
  on CONNECT), so the MCP deploy path dies with a bare `Failed to deploy site:
  403 Forbidden`. Renaming the *project* works fine, because that goes over the
  MCP server rather than a direct upload — "Netlify works" and "Netlify deploys
  work" are different claims here. **GitHub repo rename**: no `gh` CLI, and the
  GitHub MCP server has no repo-edit operation — that also rules out setting the
  About-panel description, topics and Website link, and direct `api.github.com`
  calls come back `403: GitHub access is not enabled for this session` even
  though the host resolves. **Social preview upload**: not in the repo tree at
  all. All three are console steps. **Add to this list: deleting a remote
  branch.** A web session's git credentials are read-only — `git push` returns
  HTTP 403 on `git-receive-pack` — so branch deletions are a local or console
  step too, even though merging a PR through the GitHub MCP server works fine.
- ~~V2 art — four prompts in `ART.md`~~ and ~~the re-shot Stream scene~~ —
  **both withdrawn 2026-08-31** with the pixel direction. Nothing to generate
  right now. The next art request is R3's Pond background layers, and it won't
  be written until R1 and R2 (both code-only) are done. The *method* from those
  requests survives as `ART.md`'s standing same-canvas rule.
- **R1's prototype needs a review from Matt.** `ANIMATION.md` flags its own
  central assumption — Bezier line with a tension-driven control point, rather
  than a physics rope — and asks that it be prototyped once and looked at before
  it's treated as final. That's the first thing that will want Matt's eyes.
- **A7 fight-beats playtest with a real kid** still hasn't happened —
  `clauseRunMs`/`segmentRunMs` in `config.js` were picked by feel.

## Rules of thumb this session earned

- **Fetch before branching.** The local clone was 12 commits behind
  `origin/main` at session start, which produced a set of art prompts for work
  that had already been requested upstream.
- **A piece that doesn't fit is a reroll, not an offset tweak.** Tuning
  offsets at 4x zoom is how G1 shipped something that looked wrong at 1x.
- **Gemini fakes transparency in a new way every batch** — gray/gray,
  black/gray, blue/black so far. `ART.md`'s salvage detects the pair per file
  rather than assuming.
- **Nothing may land in the bottom-center finger-guide panel.** It covers the
  lower third of the scene and it's the best part of the game.
- **A branch being "ahead" of `main` doesn't mean it holds unmerged work.**
  Squash-merging rewrites the SHA, so the old ref reads as ahead forever. The
  test that actually settles it is whether merging changes anything:
  `git merge-tree --write-tree origin/main origin/<branch>` and compare the
  result to `git rev-parse origin/main^{tree}`.

## Likely next steps

1. **R1 — the line and the cast actually move.** Prototype in `prototype/`
   first (`ANIMATION.md` asks for exactly that), get Matt's look at it, then
   wire it: `#line` becomes an SVG `<path>`, the lure travels an arc, the curve
   reacts to tension. No art needed. Read `ANIMATION.md`'s "Where the current
   build stands" section before starting — the diff is smaller than the spec
   sounds, and it names the one trap (`LINE_ORIGIN` is computed once at load and
   has to follow the rod tip once the rod moves).
2. **R2 — palette and treatment pass.** Also code-only. Includes a re-pass on
   `data/fish.json`'s 33 per-species `color` values, which were picked against
   the old locked palette.
3. **R3** opens the first art request of the epic: the Pond's three background
   layers, wired and judged before the other two levels are generated.
4. The kid playtest of the A7 fight beats, whenever a kid is available.

## Housekeeping

- Full test suite: 67/67 passing (`npm test` — Node's built-in runner).
- Every PR this session was opened ready-for-review and squash-merged
  immediately, per `CLAUDE.md`. (PR #55 is the exception — it's a draft
  because it conflicts and needs a decision, not because the convention
  changed.)
- Netlify deploys are **manual** — merging to `main` does not go live.
