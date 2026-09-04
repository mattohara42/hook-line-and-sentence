# HANDOFF.md: where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers*, never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **None.** T4 (junk art) is still open and still **waiting on one generation from Matt**. |
| **Last change** | **The code-review backlog, nine of its ten findings**, 2026-09-04, on `claude/backlog-ksh09h`. See *Start here*. |
| **R7** | ✅ **21 of 21 gear pieces**, `BUILD_PLAN_REFRESH.md`. Both done-when clauses met: a bought hat changes the angler everywhere and persists, and the rod you bought is the rod in your hand at every spot. |
| **The epic** | **Tackle & Junk (T1–T4)**, opened 2026-09-04: the bobber/fly/nothing per spot, and junk trophies plus the last pixel-era art. |
| **The refresh** | ✅ **R1–R7 all shipped.** Every angler, vessel, background, fish and shop item is painted in the new direction. |
| **Catch Feel** | ✅ **F1–F5 all shipped 2026-09-03**, `BUILD_PLAN_FEEL.md`. One thing left and it is Matt's: play it. |
| `origin/main` | clean, nothing unpushed |
| Tests | 113/113 (`npm test`), plus `tools/ui-check.mjs` for the chrome (needs a served repo + playwright) |
| Open PRs | **#55 only**: close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**Nine of the code review's ten findings are fixed (2026-09-04).** One pass
over the section it left in `BACKLOG.md`; each fix is its own commit and the
reasoning and the numbers are there.

- **`tools/ui-check.mjs` no longer races the wiggle roll.** It was failing about
  one run in three, which mattered because `CLAUDE.md` makes it the gate on
  every chrome change. It waits for the cast to come to rest before judging the
  bubble, and it covers **both** branches of the jokes toggle now instead of
  whichever one the roll handed it.
- **Switching water ends the cast.** A Pond cast could land an Ocean fight, with
  the Pond's cork still floating at a spot that floats nothing. `gameGen++` and
  `startCast()`; the "Now fishing the Ocean." status went with it, and putting
  it back is one line.
- **Found while proving that: the word box made tackle-box menu items
  untappable.** `#word` (z-index 7) painted over the middle of the open tray,
  which sits inside a z-index 6 bar it cannot climb out of, so on a phone the
  button under the word took no taps. Which button depended on the random cast
  word's width, which is why it looked like a flake. The bar moves while the
  menu is open, and `ui-check.mjs` hit-tests every tray button now instead of
  assuming a menu covers what is behind it. **Matt's call to make: whether the
  tray should keep winning over `#word` in landscape**, where the two genuinely
  compete for the same strip.
- **The rest, one line each:** the em-dash test catches the HTML entity (three
  were hiding behind it) · `firestore.rules` bounds `junk` · opening the journal
  no longer spends a Firestore write · `renderProgress()` uses
  `logic.overallAccuracy` · `bobberRippleTimer` goes through `later()` · Escape
  closes the topmost overlay rather than all of them · the eaten sentence at the
  top of `style.css` · and the four junk sprites went from 2.4MB to 263KB with
  no visible difference at either size the game draws them.
- **One finding and one question are left, and both are Matt's**, in
  `BACKLOG.md` → *Code review, whole repo*: whether the ~4.8MB of unreferenced
  art and the 32 `Gemini_*` source deliveries belong in `assets/` at all, and
  whether `#word` is meant to be monospace.
- **What to build next is still Matt's call**, and the shortlist is at the top
  of `BACKLOG.md`: living water first (the frogs and dragonflies you can now
  hear but not see), then weather, then a daily goal, with the argument for
  *not* adding modes, gates or an idle earner.

**Nothing is half-finished.** The play-tests below are Matt's and the carried
debts are decisions rather than bugs.

**Landed just before this and all merged**, one line each, reasoning in the PR:
S1 (a soundscape per spot) and P1 (panels with tabs and a close you can reach)
(#175) · the top bar is one flex row and the pun pools are per spot in
`data/puns.json` (#170) · `tools/ui-check.mjs` and three node tests (#171) · the
catch card's doubled separator, now `logic.catchSubtitle` (#172) · the four shop
hulls work, as CSS tints of the Pond rowboat (R5's last debt).

**One debt still open and not started:**

- **`cut-angler.py`'s despill should move to `cut-gear.py`'s unmix model.** It
  reddens thin neutral pieces by about 11 points of R − B. Deliberately not
  done inside a delivery, because it changes how every rod is cut and they all
  re-cut byte-identically today (`BACKLOG.md` has the numbers).

**Before any cut in a fresh container:** `pip install Pillow numpy scipy`, and
for the browser checks `cd /tmp && npm install playwright`. `tools/README.md`
indexes all thirteen tools; the gear pipeline is `gear-ref.py` → prompt →
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

**Settled, do not relitigate:** `rod-carbon-stream` is warm on Matt's call, and
the Ocean's came back grey on the same wording, so it was variance rather than a
broken prompt. If a neutral colour is ever needed again, aim at `[STYLE]`.

## Waiting on Matt (all of it, now: nothing is blocked on code)

- **Listen to the game** (S1). Every level in it came from a spectrogram, never
  from ears, so the judgement calls are all open. The knobs are one line each in
  `CONFIG.audio.ambience`, and the first to disagree with is that the Stream
  sits louder than the other two (medians 22 / 50 / 33): a brook is continuous
  and the other two are quiet water with events in them. Sound is also **on by
  default** now, which is one line in `app.js` to put back.
- **The panels want a thumb** (P1). Swept at twelve shapes by `ui-check.mjs`
  pass 3, never touched. Two judgement calls: the collection is a tab per spot,
  so you cannot see all 33 fish at once any more, and Quick Cast deliberately
  kept its own big buttons rather than taking the new top-left close.
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
- **The new top bar wants a play on a real phone** (2026-09-04). Swept at twelve
  viewport shapes by `ui-check.mjs`, but never touched with a thumb. Two knobs
  are yours and both are one line: the bubble's type size (`#status`,
  `clamp(17px, 2.4vw, 22px)`) and how many of the three spots' lines land as
  jokes. The known limit: a phone held sideways has ~55px of sky and the catch
  card does not fit there at all (`BACKLOG.md` has the numbers, and it is a
  design call rather than a bug to nudge).
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
  `tools/play-check.mjs` plays a whole catch and shoots every beat;
  `tools/ui-check.mjs` sweeps the chrome across twelve viewports and asserts.
  Serve the repo first, and all three want playwright on `NODE_PATH`.
- **A layout bug is arithmetic, so stop looking at it and measure it.** Four
  hand-checked viewports missed seven real collisions that a rectangle-overlap
  loop found in fifteen seconds, including a catch card under the tackle box on
  a 320px phone.
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
| `tools/README.md` | **what the pipeline tools are** (`ui-check.mjs` and `audio-check.mjs` included), and the deps a fresh box lacks |
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
