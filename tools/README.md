# tools/ — the art pipeline, two browser checks, and one word generator

**None of this is the game.** Nothing in here is loaded at runtime, nothing is a
build step, and the no-build-step rule in `CLAUDE.md` is not bent by any of it.
These exist so every asset in `assets/` is *reproducible*: if a better source
ever arrives — a larger canvas, a cleaner download, a corrected cut — you re-run
a command instead of redoing the work by hand.

Each tool's own docstring is the real reference, and it carries the reasoning
and the numbers that set its constants. This file is the index, so a new session
knows what exists before inventing a tenth one.

## Which doc owns what

`ART.md` owns the pipeline and the open art requests. `GEMINI_NOTES.md` owns how
the generator behaves. This file owns **what the tools are**; neither of the
others should restate it.

## Dependencies, and a fresh container has none of them

```
pip install Pillow numpy scipy          # every cut-*.py, gear-ref.py, hat-transplant.py
cd /tmp && npm install playwright       # spot-check.mjs and play-check.mjs
```

Both `.mjs` verification tools also need the repo served
(`python3 -m http.server 8080`) and are run as
`NODE_PATH=/tmp/node_modules node tools/<tool>.mjs …`. Chromium is already on
the box; do not let playwright download its own.

## The cutting family

The shared argument, and the reason there are four of these: **don't generate a
piece you could cut.** A side-on boat already contains its own far and near
halves; an angler already contains arm, body and rod. Asking the generator for
two images that then have to register with each other invents a problem the
single painting does not have. Pieces cut from one source register by
construction.

| tool | milestone | cuts |
|---|---|---|
| `cut-angler.py <pose> <src>` | R4 | one pose painting → `rod` / `arm` / `body` layers |
| `cut-vessel.py` | R5 | one boat painting → `far` / `near` halves along the gunwale |
| `cut-fish.py <sheet> [src]` | R6 | one sheet → each species' `body` and `tail` |
| `cut-gear.py <pose> <stem> <src>` | R7 | a delivered **edit** of a pose → just the gear |

`cut-gear.py` is the odd one and worth knowing about before you use it: gear is
asked for as an *edit* of the pose (attach the painting, ask for it back with
one thing added), so the piece is found **by difference** rather than keyed out
of a fresh canvas. Its docstring carries the three things that has to get right,
each paid for by a real delivery.

## The R7 support tools

| tool | does |
|---|---|
| `gear-ref.py [pose]` | flattens `angler-<pose>.png` back onto magenta → `assets/ref-angler-<pose>.png`, the file you **attach** to a gear prompt |
| `hat-transplant.py <stem> <from> <to>` | lands a hat painted for one pose on another pose's head, by matching the two head silhouettes |

**Attach the ref, never the keyed PNG.** `angler-<pose>.png` has an alpha
backdrop, and an attachment carrying no magenta gives "keep the backdrop exactly
as it is" nothing to hold onto. The refs are gitignored on purpose: one line of
derivation from a committed file is not game art.

**`hat-transplant.py` refuses when it should.** It measured out at head IoU
0.904 Pond→Stream (indistinguishable from a real generation at game size) and
0.837 Pond→Ocean, where the transform carries no rotation and the Ocean's head
is the one that is not upright — so it declines that pair rather than producing
a perched hat. That threshold sits between two real measurements rather than at
a round number someone liked. In R7 it turned nine hats into six generations.

## Verification

`spot-check.mjs --loc <pond|stream|ocean> [--hat X] [--rod Y] [--out path]`

Drives the real game in a real browser, **past the startup modal**, and
screenshots a spot. It prints the rig's resolved layer stack and any failed
asset request, which is how an unregistered gear PNG shows itself.

This exists because `#profiles` covers the whole viewport until an angler is
created, so a screenshot taken on load is a picture of a scrim. `app.js` is an
ES module and nothing is on `window`, so the way in is to seed a profile in
localStorage, reload, and click the card — re-derived three times in one session
before it got written down.

`play-check.mjs --loc <spot> [--tag name] [--out dir]`

Plays one whole catch and shoots every beat of it — cast, wait, approach, bite,
reel, landing, and the beat after. Where `spot-check` takes a still of a spot,
this takes the moment, which is what F1 needed: **its three bugs were each wrong
for about three frames and none of them would have failed an assertion.** It
prints the numbers behind each shot too — `#fish`'s position and class list, how
many species layers are mounted, and where the line's `<path>` really ends (in
design px; the path is drawn inside the scaled `#scene-frame`, so those are not
page coordinates). The class list is what caught `.rigged` being wiped.

Take a baseline before you change anything (`--tag base`) and the same run after
(`--tag f1`). A before/after pair of the same beat is the whole argument.

Two flags reach beats an ordinary catch never gets to:

- `--catches N` seeds the collection so the catch you play lands **on an unlock
  boundary** (`--catches 2` makes it the third, which unlocks stage 2). The
  ladder counts the collection, not `save.totalCatches`, which is worth knowing
  before you seed the wrong field and wonder where the banner went.
- `--escape` types the wrong letter until tension reaches `reel.escapeAt`. It is
  the game's only failure state and it wears the same card, so it needs looking
  at too.

One trap it now avoids, recorded because it cost a wrong conclusion: **break the
reel loop on an empty word box, not on the reel counter.** The counter reads
`landing…` on the last word rather than emptying, so a loop watching it spins
for seconds after the catch and every "just landed" reading is taken long after
the fact. That is how the first attempt at F3 concluded the letter banner was
not firing when it was firing and clearing perfectly.

`spot-check.mjs` loops cheaply, which is how R7 closed:

```bash
for loc in pond stream ocean; do for hat in straw bucket beanie souwester; do
  NODE_PATH=/tmp/node_modules node tools/spot-check.mjs --loc $loc --hat $hat \
    --out /tmp/grid-$loc-$hat.png
done; done
```

## Not art pipeline

`generate-words.mjs <wordlist.txt> <out.json>` builds `data/words.json` from a
frequency-ordered list. Its stop-list is shared with `tests/data.test.mjs`.

## Two habits these tools assume

- **Draw what you measured before believing it.** An assertion proves the code
  ran, not that the picture is right. R6 shipped four bugs past green
  assertions and every one was obvious the moment something was rendered.
- **Keep a control.** These tools print raw numbers and no thresholds, so a
  first delivery's figures have nothing to be judged against. Re-cutting an
  already-committed delivery costs one command, comes back byte-identical, and
  turns an alarming number into a normal one — or confirms it is not.
