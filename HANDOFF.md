# HANDOFF.md: where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers*, never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **None.** Two epics are open and both are waiting on Matt, not on code. |
| **Last change** | **L1: the voices got bodies** (`BUILD_PLAN_LIVING.md`), 2026-09-05. |
| **Living Water** | L1 ✅. **L2 (the actors with no voice: heron, stream leaves, sail) is not started.** |
| **Tackle & Junk** | T1–T3 ✅. **T4 (junk art) is still waiting on one generation from Matt**, prompt written whole in `ART.md`. |
| **The refresh** | ✅ R1–R7 all shipped, `BUILD_PLAN_REFRESH.md`, closed 2026-09-04. |
| **Catch Feel** | ✅ F1–F5 shipped 2026-09-03, `BUILD_PLAN_FEEL.md`. One thing left and it is Matt's: play it. |
| `origin/main` | clean, nothing unpushed |
| Tests | 115/115 (`npm test`), plus `tools/ui-check.mjs` for the chrome (needs a served repo + playwright) |
| Open PRs | **#55 only**: close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**L1 is the last thing that landed.** The Pond's frog and dragonfly and the
Ocean's gull now have bodies, in CSS, spawned off the same tick as their sound.
`BUILD_PLAN_LIVING.md` has the whole of it, including the measured table of what
each screen shape can actually see. Three things in it are worth knowing before
touching the scene again:

- **The voice schedule no longer lives in the audio system.** S1 built it inside
  `startAmbient()`, so it only existed once the `AudioContext` did, and that
  needs both a gesture and the sound switched on. A kid playing silently would
  have had a pond with nothing in it. It belongs to the spot now, next to the
  costume and the tackle.
- **Where a scene element may sit is arithmetic.** The canvas is scaled to
  *cover* and anchored bottom-left, so a portrait phone sees only design
  **x 0..166** of 720, and the keyboard's top edge reaches design **y=240** at
  900x600. The band that survives both is x 150..470, y 100..240.
- **Which turned up something much bigger, and it is in `BACKLOG.md` at the
  top: a phone held upright cannot see the fishing at all.** The lure lands at
  design x=458, which is viewport x 1063 in a 390px window. Verified by typing a
  real cast at that size. Not fixed: the three candidate fixes all move numbers
  that R1, F1 and T2 each measured against the current geometry, so it wants its
  own milestone rather than a patch.

**What to build next is Matt's call**, and the shortlist is still at the top of
`BACKLOG.md`: L2, then weather, then a daily goal, with the argument for *not*
adding modes, gates or an idle earner. The portrait-phone finding above now has
a claim to being first.

**Nothing is half-finished.** The play-tests below are Matt's and the carried
debts are decisions rather than bugs.

**Landed before this, one line each, reasoning in the PR:** nine of the code
review's ten findings plus the tray bug they turned up (#176) · the README and
the repo's own picture (#177) · two junk words blocklisted (#178) · S1 (a
soundscape per spot) and P1 (panels with tabs and a reachable close) (#175) ·
the top bar as one flex row and per-spot pun pools (#170) · `tools/ui-check.mjs`
(#171) · T1–T3, the thin line, per-spot tackle and junk trophies (#165–#168).

**One debt still open and not started:** `cut-angler.py`'s despill should move
to `cut-gear.py`'s unmix model. It reddens thin neutral pieces by about 11
points of R − B. Deliberately not done inside a delivery, because it changes how
every rod is cut and they all re-cut byte-identically today (`BACKLOG.md` has
the numbers).

**One question and one finding are Matt's**, in `BACKLOG.md` → *Code review,
whole repo*: whether the ~4.8MB of unreferenced art and the 32 `Gemini_*` source
deliveries belong in `assets/` at all, and whether `#word` is meant to be
monospace.

**Before any cut in a fresh container:** `pip install Pillow numpy scipy`, and
for the browser checks `cd /tmp && npm install playwright`. `tools/README.md`
indexes all fifteen tools; the gear pipeline is `gear-ref.py` → prompt →
`gear-register.py` → `cut-angler.py --rod` → one `rig.gearArt` line.

## Waiting on Matt (all of it, now: nothing is blocked on code)

- **Watch the water** (L1, new). Three judgement calls, each one line in
  `CONFIG.life`: how often (it inherits the voices' gaps, so the frog is every
  7–19s and the gull every 17–52s), how long each one lasts (`ms`), and where
  the frog is allowed to surface (`box`, currently a 45px stretch hemmed between
  the boat and the word box). The frog on a **lily pad** was cut for a measured
  reason and it is a real loss: every pad in the painting sits behind the
  keyboard.
- **Listen to the game** (S1). Every level came from a spectrogram, never from
  ears. The knobs are one line each in `CONFIG.audio.ambience`, and the first to
  disagree with is that the Stream sits louder than the other two (medians
  22 / 50 / 33). Sound is also **on by default** now, one line in `app.js`.
- **The panels want a thumb** (P1). Two judgement calls: the collection is a tab
  per spot, so you cannot see all 33 fish at once any more, and Quick Cast kept
  its own big buttons rather than the new top-left close.
- **The new reel feel wants an eye test** (#135). Every number came from
  measurement, never from watching a kid: `CONFIG.fish.pull` and
  `CONFIG.fish.reveal` (`startAt` 0.3 was a judgement call about "gradual").
- **The whole Catch Feel epic wants a play** (F1–F5). Four knobs, each one line
  in `config.js`: **`CONFIG.wiggle.wordsRange`** (the number most likely to be
  wrong in the epic: two or three short words measures 3.3s at adult speed and
  nearer ten at a six-year-old's), `CONFIG.anim.cast.landing`, Baloo 2 as the
  display face, and the catch card held until you type.
- **The new top bar wants a play on a real phone.** Two knobs, both one line:
  the bubble's type size and how many of the three spots' lines land as jokes.
- **The bite emerges 32px higher** (#103) and **R1's line prototype** wants an
  eye test (`/prototype/line-animation.html`, and `ANIMATION.md` flags its own
  assumption). Both are one-line reverts.
- **A7 fight beats have never been tested on a real kid.**
  `CONFIG.fight.clauseRunMs` (550) and `segmentRunMs` (900) were picked by feel.
- **Close PR #55 unmerged.** Verified 2026-09-01: it is a strict *subset* of
  `main` and merging it would delete 3463 lines including the whole refresh
  epic. Evidence in PR #60. Its branch `claude/graphics-assets-plan-rza791`
  (a9e4e73) goes with it.
- **Delete stale branches** (SHAs recorded so it is reversible). Safe:
  `advanced-game-progression-ejj4yx` (49f2abb) ·
  `docs-dynamic-intent-generation-p14kbx` (a50a15c) ·
  `epic-continuation-81tdvp` (69f79ea) ·
  `gemini-game-asset-prompts-aeopww` (c47e021) · `next-steps-0v0xeg` (98762e7) ·
  `fish-work-lbjzkz` (53a68f6), all `claude/`-prefixed. Check first:
  **`g1/layered-rig`** (5e855b5: ⚠️ Matt's own; what survived merged via
  #42/#43), and two July branches whose commits are **not** ancestors of `main`
  (pre-squash, so the work looks landed but confirm one):
  `claude/game-ui-visuals-wt1amv` (73f76c8) · `claude/open-this-3wbx9w`
  (720ca36).
- **The GitHub About panel: a paste, not a task.** All three fields are wrong. A
  session reaches the GitHub API fine but the proxy refuses this write: `403
  Repository settings writes are not permitted through this proxy`. Values
  composed, production URL confirmed against Netlify:

  ```
  gh repo edit mattohara42/hook-line-and-sentence \
    --description "A typing tutorial that's a fishing game. Or is it a fishing game that's a typing tutorial? Cozy painterly keyboard practice for kids: cast, reel and catch your way from single words up to full punctuated sentences. Vanilla JS, no build step." \
    --homepage "https://hook-line-and-sentence.netlify.app" \
    --remove-topic pixel-art \
    --add-topic touch-typing --add-topic typing-practice
  ```

- **Upload the social preview** at Settings → General → Social preview. The
  image is committed at `docs/images/social-preview.png` (#177). Web UI only.
- **The Firebase blast-radius decision**, in `BACKLOG.md`.

## Rules of thumb

- **Verify visual and motion claims in a real browser, past the startup modal.**
  `tools/spot-check.mjs` takes one still of a spot with its layer stack printed;
  `tools/play-check.mjs` plays a whole catch and shoots every beat;
  `tools/ui-check.mjs` sweeps the chrome across twelve viewports and asserts;
  `tools/life-check.mjs` spawns the ambient actors on demand and measures how
  much of each one any screen shape can actually see. Serve the repo first, and
  all of them want playwright on `NODE_PATH`.
- **A layout bug is arithmetic, so stop looking at it and measure it.** Four
  hand-checked viewports missed seven real collisions that a rectangle-overlap
  loop found in fifteen seconds. L1 found two more the same way, and then found
  the biggest one of all by asking what a phone can see at all.
- **Draw what you measured before believing it.** R6 shipped four bugs past
  green assertions. L1's frog passed every assertion while surfacing behind the
  word box, where a kid would hear a croak and see nothing: only a screenshot
  said so.
- **A new test is worth nothing until you have watched it fail.** L1's five
  config traps were each checked by breaking the invariant they guard, and the
  first run failed a *sixth* way that was the test being wrong rather than the
  config: a crossing actor is supposed to enter from off-crop.
- **When a delivery measures like a redraw, suspect the measurement first**, and
  **get a control before you judge one** (#128, #124).
- **A registry beats a filename convention.** `CONFIG.fish.species`,
  `CONFIG.rig.poses`, `CONFIG.rig.gearArt` and now `CONFIG.life` are one idea
  four times: the config lists what exists, anything absent falls back, and a
  half-finished set stays playable. Reach for it again rather than inventing
  something.
- **A piece that doesn't fit is a reroll, not an offset tweak**, but **placement
  is wiring, not art**, and **the reroll decision is itself a measurement**
  (#133): a wrong rejection costs as much as a wrong acceptance and nothing
  downstream ever complains about it.

## Which doc owns what

| doc | owns |
|---|---|
| `SPEC.md` | the game's design, and its non-goals |
| `BUILD_PLAN_LIVING.md` | **Living Water, L1–L3**: the ambient actors, and what each shape can see |
| `BUILD_PLAN_TACKLE.md` | Tackle & Junk, T1–T4: tackle per spot, and junk |
| `BUILD_PLAN_REFRESH.md` | the Art & Animation Refresh, R1–R7: closed 2026-09-04 |
| `BUILD_PLAN_FEEL.md` | Catch Feel, F1–F5, shipped, and what each one measured |
| `ART_DIRECTION.md` | what the art should **look like** |
| `ANIMATION.md` | how the cast, line and reel **move** |
| `ART.md` | the art **pipeline** and the open requests |
| `GEMINI_NOTES.md` | how the **generator** behaves, and how to salvage it |
| `tools/README.md` | **what the pipeline tools are**, and the deps a fresh box lacks |
| `BACKLOG.md` | everything deliberately not being done yet |
| `FIRESTORE.md` | the sync contract |
| this file | state and pointers, nothing else |

`BUILD_PLAN_VISUAL.md` and `BUILD_PLAN_GRAPHICS.md` are superseded and kept only
for the trail.

## Keeping this file cheap

`CLAUDE.md` owns these rules and this file should not restate them, which is
itself one of them: **rewrite, never append** · **a resolved thread becomes one
line or disappears** · **never restate another doc** · **no session narrative**.
It reached 251 lines by accreting finished investigations and was cut back on
2026-09-05.
