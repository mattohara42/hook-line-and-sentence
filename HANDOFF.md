# HANDOFF.md — session-to-session notes

Read this first when picking the project back up. It's a short-lived
snapshot, not a design doc — `SPEC.md`, `BUILD_PLAN*.md`, `BACKLOG.md`, and
`ART.md` are the durable sources of truth and are kept in sync at the end of
each session. This file just says *where things were left* and *what's
waiting on a human*.

## Where things stand (as of 2026-08-31)

v1 core (M1–M10) and Advanced Progression (A0–A8) are done and playable:
Minnow → Mackerel → Marlin → Muskie, three biomes, all their art landed.

The active epic is the **Visual Rework** — `BUILD_PLAN_VISUAL.md`, V1–V5.
**V1 is done. V2 is next and is waiting on art** (four Gemini prompts in
`ART.md`). This epic replaced the Graphics & Character Rig plan mid-session,
which is the main thing to understand before touching the visuals; see below.

## The arc of this session, in one paragraph

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

## Open threads / waiting on Matt

- **The rename is live except for the production deploy and the GitHub side**
  (2026-08-31). Done: the repo-side rename (#50), the Firebase authorized
  domain, and the **Netlify site rename** — the site is now
  `hook-line-and-sentence` and serves at
  **https://hook-line-and-sentence.netlify.app**. Netlify does *not* redirect
  the freed `fishtyping` subdomain and it is claimable by anyone, so any old
  bookmark is dead. What's left:
  1. **Promote a production deploy.** Production is still pinned to the
     pre-rename deploy `6a8e18a6…`, so the live site is *older than `main`* and
     still says "Typing Fishing". Publish the build for `main` @ `8a92dc9` from
     the Deploys tab, or run `netlify deploy --prod` locally.
     **Claude cannot do this step from a web session** — `api.netlify.com` and
     `netlify-mcp.netlify.app` are both refused by the sandbox egress policy
     (403 on CONNECT), so the MCP deploy path fails with a bare
     `Failed to deploy site: 403 Forbidden`. Renaming the project *does* work,
     because that goes over the MCP server rather than a direct upload.
  2. **Verify sign-in on the new URL.** The whole point of the Firebase step;
     Claude has no network route to the site and cannot self-verify it.
  3. **GitHub:** rename the repo to `hook-line-and-sentence`, and re-upload the
     social preview (Settings → General → Social preview) once the re-lettered
     PNG lands — the current card still says "TYPING FISHING". Old repo URLs
     redirect, so existing clones keep working. No tooling for the repo rename
     in a web session either (no `gh` CLI, and the GitHub MCP server has no
     repo-edit operation).
- **V2 art — four prompts in `ART.md`, and the order matters.**
  `body-kid-boat.png` (open C-curl hand) is generated first, then
  `hand-kid-boat.png`, `hat-straw.png` and `rod-basic.png` are each generated
  **from it as an attached reference image**, returned on the **same canvas**.
  Watch for Gemini tight-cropping the subject — that's the reroll case.
- **The Stream scene, re-shot** (prompt in `ART.md`). The current art is a
  top-down forest pool; V3's standing angler in waders needs a bank to stand
  on, and `.loc-stream`'s framing workaround comes out when it lands.
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

## Likely next steps

1. Generate the four V2 PNGs; Claude composites them locally and checks the
   stack at game scale *before* wiring.
2. Then V3 (vessels: rowboat / waders / Whaler with fighting chair), which
   wants the re-shot Stream background first.
3. The kid playtest of the A7 fight beats, whenever a kid is available.

## Housekeeping

- Full test suite: 67/67 passing (`npm test` — Node's built-in runner).
- Every PR this session was opened ready-for-review and squash-merged
  immediately, per `CLAUDE.md`.
- Netlify deploys are **manual** — merging to `main` does not go live.
