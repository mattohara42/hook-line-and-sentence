# HANDOFF.md — where things were left

**Read this first, then `CLAUDE.md`.** This file is a *state snapshot and a set
of pointers* — never a design doc and never a record of reasoning. Reasoning
lives in the commit and PR that did the work; if you want to know *why*
something is the way it is, `git log` and the PR body have it in full.

## At a glance

| | |
|---|---|
| **Active milestone** | **R7 — gear in the new style**, `BUILD_PLAN_REFRESH.md`. One rod is all that is left of the refresh. |
| **Done when** | buying and equipping a hat changes the angler everywhere and persists, and the rod you bought is the rod in your hand |
| **State** | both done-when clauses met. **20 of 21 painted and wired** — 12 hats, `rod-stick` x2, `rod-bamboo` x2, `rod-carbon` x3, `rod-deepsea` at the Pond. Left: **1 rod**, `rod-deepsea-stream`, prompt written out and ready to send. |
| **Catch Feel** | ✅ **F1–F5 all shipped 2026-09-03**, `BUILD_PLAN_FEEL.md`. One thing left and it is Matt's: play it. |
| `origin/main` | clean, nothing unpushed |
| Tests | 95/95 (`npm test`) |
| Open PRs | **#55 only** — close it unmerged, see below |
| Deploys | Netlify is **manual**; merging to `main` does not go live |

## Start here

**R7 has 1 rod left: `rod-deepsea-stream`.** Its prompt is written out whole in
`ART.md` → *R7* → *The rods*, and the loop is four commands:

```
python3 tools/gear-ref.py <pose>                  # the attachment
#   ... paste that rod's prompt from ART.md, attach the ref ...
python3 tools/gear-register.py <pose> <download>  # -> assets/reg-<name>.png
python3 tools/cut-angler.py <pose> assets/reg-<name>.png --rod <stem>
#   then add "<stem>-<pose>" to CONFIG.rig.gearArt, or it is never drawn
```

Eight rods have gone through it in nine generations. The pipeline is settled:
the last five deliveries needed no tool changes at all, and every shipped rod
re-cuts byte-identically.

**Before your first cut in a fresh container:** `pip install Pillow numpy scipy`,
and for the browser checks `cd /tmp && npm install playwright`.
`tools/README.md` indexes all eleven tools.

**One judgement call is already made and should not be relitigated.**
`rod-carbon-stream` cost the column's only reroll and was accepted warm on
Matt's call: both attempts came back warm against a neutral Pond carbon, which
points at `[STYLE]`'s "warm muted color palette" rather than the rod wording. At
95 design px it reads dark and is nothing like the honey bamboo. **`rod-carbon-ocean`
then came back grey first attempt on the same strengthened wording**, so the
Stream is variance, not a broken prompt, and the accept stands. If a neutral
colour is ever needed again, `[STYLE]` is still where to aim.

**Two things the rods left behind, both written up where they belong:**
`cut-angler.py`'s despill reddens thin neutral pieces and should move to
`cut-gear.py`'s unmix model — deliberately not done, because it changes how every
rod is cut (`BACKLOG.md`, with the numbers) · and `ART.md`'s *"no pure black"*
delivery check is wrong as written and would reject every rod in the game, R4's
included; the measure that means something is the shaft's **interior** colour,
not the presence of any (0,0,0) pixel.

**The one habit worth carrying into the last three rods:** a layer defect hidden
by the gate rod's own hardware stays invisible until gear arrives without it.
The Ocean's brass reel had left 2,766 px of itself in the *body* layer since R4,
and only a reel-less rod could ever have exposed it. Both remaining `deepsea`
rods are the thickest and heaviest in the set, so the corridor's `half` was the
one flag still open. **`rod-deepsea-pond` closed it:** the predicted shave was
exact (1.99 design px of blank against a 1.82 corridor) and invisible at 65
design px, so no `--half` override exists and the Stream, which has more room
than the Pond, needs no special handling either. `ART.md` → that delivery's
section, for why its 81.1% reads worse than it is.

## Waiting on Matt (none of it blocks R7)

- **The new reel feel wants an eye test** (#135). The fish now tweens between
  words instead of jumping, and stays an unnamed shape until it is reeled close.
  Every number was picked from measurement, never from watching a kid play:
  `CONFIG.fish.pull` is the four durations, `CONFIG.fish.reveal` is how late the
  species arrives (`startAt` 0.3 was a judgement call about what "gradual"
  means). Each is one line. Netlify is manual, so this is not live.
- **Close PR #55 unmerged.** Verified 2026-09-01: it is a strict *subset* of
  `main` — merging it would delete 3463 lines including R1, R2 and the whole
  refresh epic. Full evidence in PR #60. Its branch
  `claude/graphics-assets-plan-rza791` (a9e4e73) goes with it.
- **Delete stale branches** (SHAs recorded so it is reversible):
  `claude/advanced-game-progression-ejj4yx` (49f2abb) ·
  `claude/docs-dynamic-intent-generation-p14kbx` (a50a15c) ·
  `claude/epic-continuation-81tdvp` (69f79ea) ·
  `claude/gemini-game-asset-prompts-aeopww` (c47e021) ·
  `claude/next-steps-0v0xeg` (98762e7) · `claude/fish-work-lbjzkz` (53a68f6,
  fully contained in `main`, so it is the safe one) · **`g1/layered-rig`**
  (5e855b5 — ⚠️ Matt's own branch, confirm first; the parts that survived merged
  via #42/#43). Two more are older and carry commits that are **not** ancestors
  of `main` (July, pre-squash): `claude/game-ui-visuals-wt1amv` (73f76c8, 29
  commits) and `claude/open-this-3wbx9w` (720ca36, 10). Their work looks landed
  by squash, but check one before deleting either.
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
- **A7 fight beats have never been tested on a real kid.**
  `CONFIG.fight.clauseRunMs` (550) and `segmentRunMs` (900) were picked by feel.
- **The Firebase blast-radius decision**, in `BACKLOG.md`.
- **The whole Catch Feel epic wants a play** (F1–F5, 2026-09-03). Netlify is
  manual, so none of it is live. Four things to look at, each one line in
  `config.js` if it is wrong:
  - **`CONFIG.wiggle.wordsRange`** — the number most likely to be wrong in the
    epic. Two or three short words to twitch the bait measures 3.3s typed at
    220ms a key; a six-year-old is nearer 800–1000ms, which makes it ten
    seconds. `[1, 2]` is the lighter version and `chance` is the other knob.
  - **`CONFIG.anim.cast.landing`** — the lure lands 28px lower. That is as low
    as the guide panel allows on a 900x600 window, not as low as it could look.
  - **Baloo 2**, the display face, everywhere but the frozen keyboard. One line
    in `style.css`; Nunito was the runner-up.
  - **The catch card and plaque**, held until you type — the pacing after a
    catch is now yours rather than a timer's.

## Three decisions R6 left behind, none blocking

- **`data/fish.json`'s per-species `color` has almost no job left.** The painted
  bodies run darker and duller than it, and now that all 33 have art it only
  tints the collection blob for *uncaught* species — a silhouette. Either
  re-pass the 33 values toward the paintings or decide the field is vestigial;
  a data test still enforces `#rrggbb`.
- **The two Ocean sheets are drawn tighter than the rest.** Tonal stdev 53–71
  against the Pond and Stream's 26–45. It does not survive the downscale and at
  54–78px they sit with the other twenty, so this is taste, not a defect.
  `ART.md` → *R6 wave 3* has the numbers.
- **Asset weight, a policy call rather than a bug.** A cut fish is ~150KB at
  ~525px for something that renders at 54. Resampling to 320px is provably
  invisible even at retina scene scale (mean channel diff ~1 of 255) and halves
  it — ~2.4MB across the full roster. It would set the rule for the anglers and
  vessels too, which is why it is a question rather than a commit.

**Carried from R5, and still user-visible:** both painted vessels are
`skinnable: false`, so equipping one of `shop.boats`' four alternate hulls does
nothing at any spot. R7's `gearArt` is now the pattern that would fix it —
a hull is a gear slot with a per-pose registry, and the boat shop is the one
shop kind still on its own older mechanism. Worth folding in rather than
re-solving. Prompt and a cheaper CSS-tint fallback: `ART.md` → *R5 debt*.

## Rules of thumb

- **Verify visual and motion claims in a real browser, past the startup modal.**
  `tools/spot-check.mjs` takes one still of a spot with its layer stack printed;
  `tools/play-check.mjs` plays a whole catch and shoots every beat. Serve the
  repo first, and both want playwright on `NODE_PATH`.
- **Draw what you measured before believing it.** R6 shipped four bugs past
  green assertions. The muskie was checked by painting its configured mouth on
  the live scene next to the line's own endpoint — they coincided, which is the
  test the catfish and the unicornfish both failed. Now in `CLAUDE.md`.
- **A new test is worth nothing until you have watched it fail.** R7's five
  config traps were each checked by breaking the invariant they guard.
- **When a delivery measures like a redraw, suspect the measurement first**, and
  **get a control before you judge one.** `cut-gear.py` prints raw numbers with
  no thresholds, so re-cut a committed delivery and compare: it is one command,
  it comes back byte-identical, and it turns "14.3% of the body differs" from an
  alarm into a normal reading (#128). The Stream hat cost a scare for want of
  this: IoU 0.54 with 70% "changed", and a perfectly faithful edit whose fit was
  keying on a landing net that had swung (#124).
- **Some bugs are only wrong for three frames.** All three F1 found were, and
  none would ever have failed an assertion. That is what `play-check` is for.
- **A registry beats a filename convention.** `CONFIG.fish.species`,
  `CONFIG.rig.poses` and now `CONFIG.rig.gearArt` are one idea three times: the
  config lists what exists, anything absent falls back, and a half-finished set
  stays playable. Reach for it again rather than inventing something.
- **A piece that doesn't fit is a reroll, not an offset tweak** — G1's lesson,
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
| `BUILD_PLAN_REFRESH.md` | the active epic, R1–R7 — nine rods left |
| `BUILD_PLAN_FEEL.md` | Catch Feel, F1–F5, shipped — and what each one measured |
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
