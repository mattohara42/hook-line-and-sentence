# HANDOFF.md: where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers*, never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **T4: junk art**, `BUILD_PLAN_TACKLE.md`. Prompt written, **waiting on one generation from Matt**. T1–T3 shipped 2026-09-04. |
| **R7** | ✅ **21 of 21 gear pieces**, `BUILD_PLAN_REFRESH.md`. Both done-when clauses met: a bought hat changes the angler everywhere and persists, and the rod you bought is the rod in your hand at every spot. |
| **The epic** | **Tackle & Junk (T1–T4)**, opened 2026-09-04: the bobber/fly/nothing per spot, and junk trophies plus the last pixel-era art. |
| **The refresh** | ✅ **R1–R7 all shipped.** Every angler, vessel, background, fish and shop item is painted in the new direction. |
| **Catch Feel** | ✅ **F1–F5 all shipped 2026-09-03**, `BUILD_PLAN_FEEL.md`. One thing left and it is Matt's: play it. |
| `origin/main` | clean, nothing unpushed |
| Tests | 95/95 (`npm test`) |
| Open PRs | **#55 only**: close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**Nothing is half-finished.** Two epics closed in two days and the list below is
all that is outstanding, none of it code: the play-tests are Matt's, and the
carried debts are decisions rather than bugs.

**R5's last debt is paid too: the four shop hulls work** (2026-09-04). They are
CSS tints of the Pond rowboat's own painting, chosen over four repaints after
shooting both in the real game; the repaints stay an option in `BACKLOG.md` if
the tinted thwarts bother you once you have played it.

**The delivery palette check was wrong and is fixed** (2026-09-04): it rejected
23% of the art the game ships. `tools/palette-check.py` is the runnable version
and `--corpus` is its control.

**The one piece of work left on the list**, in `BACKLOG.md` and not started:

- **`cut-angler.py`'s despill should move to `cut-gear.py`'s unmix model.** It
  reddens thin neutral pieces by about 11 points of R − B. Deliberately not
  done inside a delivery, because it changes how every rod is cut and they all
  re-cut byte-identically today (`BACKLOG.md` has the numbers). It is the only
  thing left on this list.

**Before any cut in a fresh container:** `pip install Pillow numpy scipy`, and
for the browser checks `cd /tmp && npm install playwright`. `tools/README.md`
indexes all twelve tools; the gear pipeline is `gear-ref.py` → prompt →
`gear-register.py` → `cut-angler.py --rod` → one `rig.gearArt` line.

**Two findings from the rod column worth keeping, because both cost real time:**

- **A low "shaft inside the half-width" figure usually is not a shave.** The two
  deepsea rods both posted ~30% of their paint outside the corridor; the Pond's
  blank really was 3 px too fat and the Stream's fitted with room to spare. The
  percentage cannot tell a fat rod from a rod with hardware on it: the guides
  and reel land outside by design. Walk outward from the centreline until the
  paint stops instead, and only then reach for `half`. No `--half` override
  exists and none was needed.
- **A layer defect hidden by the gate rod's own hardware stays invisible until
  gear arrives without it.** The Ocean's brass reel left 2,766 px of itself in
  the *body* layer from R4 until a reel-less rod exposed it. The Stream was
  checked for the same thing when its multiplier moved above the hand, and is
  clean.

**One judgement call is made and should not be relitigated.**
`rod-carbon-stream` cost R7's only reroll and was accepted warm on Matt's call:
both attempts came back warm against a neutral Pond carbon, which points at
`[STYLE]`'s "warm muted color palette" rather than the rod wording.
`rod-carbon-ocean` then came back grey first attempt on the same strengthened
wording, so the Stream is variance, not a broken prompt. If a neutral colour is
ever needed again, `[STYLE]` is where to aim.

## Waiting on Matt (all of it, now: nothing is blocked on code)

- **The new reel feel wants an eye test** (#135). The fish now tweens between
  words instead of jumping, and stays an unnamed shape until it is reeled close.
  Every number was picked from measurement, never from watching a kid play:
  `CONFIG.fish.pull` is the four durations, `CONFIG.fish.reveal` is how late the
  species arrives (`startAt` 0.3 was a judgement call about what "gradual"
  means). Each is one line. Netlify is manual, so this is not live.
- **Close PR #55 unmerged.** Verified 2026-09-01: it is a strict *subset* of
  `main`: merging it would delete 3463 lines including R1, R2 and the whole
  refresh epic. Full evidence in PR #60. Its branch
  `claude/graphics-assets-plan-rza791` (a9e4e73) goes with it.
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
- **The GitHub repo description still says "pixel-art"**, which R2 removed
  game-wide. It is the first thing a stranger reads.
- **R1's line prototype wants an eye test.** Serve the repo, open
  `/prototype/line-animation.html`, cast it, drag the tension slider.
  `ANIMATION.md` flags its own assumption (a Bezier with a tension-driven
  control point, not a physics rope). If it fails, the shape is in `logic.js`
  and the feel is in `CONFIG.anim`: it swaps out without touching the loop.
- **The bite now emerges 32px higher** (#103): at the old offset the fish
  appeared fully behind the finger panel on a 2:1 screen. Worth an eye test, and
  a one-line revert (`CONFIG.fish.approach.spawn.dy`) if you liked it deeper.
- **A7 fight beats have never been tested on a real kid.**
  `CONFIG.fight.clauseRunMs` (550) and `segmentRunMs` (900) were picked by feel.
- **The Firebase blast-radius decision**, in `BACKLOG.md`.
- **The whole Catch Feel epic wants a play** (F1–F5, 2026-09-03). Netlify is
  manual, so none of it is live. Four things to look at, each one line in
  `config.js` if it is wrong:
  - **`CONFIG.wiggle.wordsRange`**: the number most likely to be wrong in the
    epic. Two or three short words to twitch the bait measures 3.3s typed at
    220ms a key; a six-year-old is nearer 800–1000ms, which makes it ten
    seconds. `[1, 2]` is the lighter version and `chance` is the other knob.
  - **`CONFIG.anim.cast.landing`**: the lure lands 28px lower. That is as low
    as the guide panel allows on a 900x600 window, not as low as it could look.
  - **Baloo 2**, the display face, everywhere but the frozen keyboard. One line
    in `style.css`; Nunito was the runner-up.
  - **The catch card and plaque**, held until you type: the pacing after a
    catch is now yours rather than a timer's.

## Rules of thumb

- **Verify visual and motion claims in a real browser, past the startup modal.**
  `tools/spot-check.mjs` takes one still of a spot with its layer stack printed;
  `tools/play-check.mjs` plays a whole catch and shoots every beat. Serve the
  repo first, and both want playwright on `NODE_PATH`.
- **Draw what you measured before believing it.** R6 shipped four bugs past
  green assertions. The muskie was checked by painting its configured mouth on
  the live scene next to the line's own endpoint: they coincided, which is the
  test the catfish and the unicornfish both failed. Now in `CLAUDE.md`.
- **A new test is worth nothing until you have watched it fail.** R7's five
  config traps were each checked by breaking the invariant they guard.
- **When a delivery measures like a redraw, suspect the measurement first**, and
  **get a control before you judge one.** The cutting tools print raw numbers
  with no thresholds, so re-cut a committed delivery and compare: one command,
  byte-identical, and it turns an alarming figure into a normal one (#128, #124).
  R7's rods went further: a low "shaft inside the half-width" is usually the
  rod's own guides and reel falling outside by design, not a shave.
- **Some bugs are only wrong for three frames.** All three F1 found were, and
  none would ever have failed an assertion. That is what `play-check` is for.
- **A registry beats a filename convention.** `CONFIG.fish.species`,
  `CONFIG.rig.poses` and now `CONFIG.rig.gearArt` are one idea three times: the
  config lists what exists, anything absent falls back, and a half-finished set
  stays playable. Reach for it again rather than inventing something.
- **A piece that doesn't fit is a reroll, not an offset tweak**: G1's lesson,
  and R3's for backgrounds. But **placement is wiring, not art**: R5 seated the
  Ocean kid in a fighting chair the generator put wherever it liked, using
  `vessel.x/y` and the pose's `anchor`, and spent no reroll on it. And **the
  reroll decision itself is a measurement**: R7 rejected a good sou'wester for
  looking like the straw hat, and one command comparing the two silhouettes
  disproved it (#133). A wrong rejection costs as much as a wrong acceptance and
  nothing downstream ever complains about it.

## Which doc owns what

| doc | owns |
|---|---|
| `SPEC.md` | the game's design, and its non-goals |
| `BUILD_PLAN_TACKLE.md` | **the active epic**, T1–T4: tackle per spot, and junk |
| `BUILD_PLAN_REFRESH.md` | the Art & Animation Refresh, R1–R7: **closed 2026-09-04** |
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
It reached 199 lines once by accreting finished investigations.
