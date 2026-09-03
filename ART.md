# Art Pipeline

How art gets made for Hook, Line and Sentence. It's a family project — a kid-drawn
sprite outranks a professional one (see `CLAUDE.md`). This doc is the workflow
for the *generated* art that fills the gaps.

## Who does what

- **Claude** decides when a feature needs new art, writes the **Gemini prompt**,
  and specifies the exact **filename + path** and any size/format constraints.
- **Matt** runs the prompt in **Gemini**, then drops the resulting PNG at the
  path Claude named. Matt is the only one who generates images.

Claude cannot generate images and must not block a feature on art — build the
feature so it works with a placeholder (e.g. a solid `--fish-color` shape),
then hand Matt the art request separately.

## The handoff format (Claude → Matt)

When art is needed, Claude gives all of this in one block:

```
ART NEEDED: <what it's for>
Prompt:   <the full Gemini prompt>
Save as:  assets/<filename>.png
Size:     <e.g. 64×64, transparent background>
Wired in: <where the code expects it — CSS selector / file:line, or "not yet">
```

Matt generates it, saves it, and the feature lights up (or Claude wires it in
once the file exists).

## Naming & placement

- All art lives flat in **`assets/`** (no subfolders currently).
- **Final** assets use lowercase, semantic, hyphenated names that match how the
  code references them: `background.png`, `boat.png`, `kid.png`,
  `fish-common.png`, `fish-rare.png`, `fish-legendary.png`. New art follows the
  same style: `hat-straw.png`, `boat-canoe.png`, `junk-boot.png`.
- **Raw** Gemini generations may be kept as `Gemini_*.png` for reference/reroll,
  but the code never points at those — only at the clean final name.

## How art is wired into the game

- Almost everything is a CSS `background: url("assets/…png")`. No sprite atlas,
  no build step — one PNG per thing. (**`image-rendering: pixelated` is gone**
  as of R2 — it belonged to the pixel era, and painterly art must not be
  nearest-neighbour scaled. The old pixel assets still on screen are smooth-
  scaled until R3 replaces them, which is very slightly softer and fine.)
- **Fish currently share one sprite per tier**, not per species:
  `fish-common.png`, `fish-rare.png`, `fish-legendary.png`, tinted per species
  from `data/fish.json`'s `color` via the `--fish-color` CSS var. **The refresh
  changes this** — R6 gives all 33 species their own rig. Until a species' art
  lands, the tinted placeholder is what it renders as, on purpose.

## Style guardrails (put these in every prompt)

> **Changed 2026-08-31.** `ART_DIRECTION.md` is now the authority on style, and
> it replaces the pixel-art guardrails that were here. The old ones are kept
> below, struck through, because every asset currently in `assets/` was made
> under them — so they still explain what's on screen today.

- **Warm painterly storybook**, Ghibli-anchored: soft diffused light, banded
  skies, glowing light sources rather than flat discs, gentle rounded
  proportions, clean readable silhouette (it renders small).
- **Palette:** muted and warm, never saturated or neon. Muted teal-green water
  with a darker depth band; warm slightly-desaturated wood and earth. **R2 put
  real numbers behind this** — `:root` in `style.css` is the reference, and new
  art should land inside it:

  | | | |
  |---|---|---|
  | sky, high | `#b7cfd8` | pale blue at the top of the band stack |
  | sky, low | `#f2ddbe` | cream/amber warming toward the horizon |
  | light source | `#f7e6bd` | the glow's core — never a hard-edged disc |
  | water | `#7aa89b` → `#4f7d76` → `#375c58` | surface, mid, depth band |
  | foam | `#e6eee4` | |
  | wood / earth | `#7a6350`, `#4b3d33` | warm, desaturated |
  | outlines & shadow | `#33291f` (umber) | the darkest tone in the game — **not black** |
  | accents | `#dcab63` gold, `#d4886a` ember, `#93ac78` moss | |

  A generated background whose sky is more saturated than `#b7cfd8`/`#f2ddbe`,
  or whose darks go past `#33291f`, is a reroll — it will fight every UI panel
  painted over it.
- **Outlines:** thin (~1–1.5px at sprite scale) and **warm brown — never
  black.** No pure black anywhere, in linework or shadow.
- **Framing:** single subject, **transparent background** for anything that
  isn't a full scene. For any piece belonging to a rig, see the same-canvas rule
  below — it beats "centered".
- **No text, no UI, no watermark, no drop shadow baked in.**
- Canvas sized to how it's used; rig pieces share the body's canvas exactly.

~~Old pixel-era guardrails (what the current assets were made under): cozy pixel
art, chunky pixels; warm dawn/dusk lake palette — teal water, muted purple
hills, warm sky, gold accents; single centered subject; square-ish canvas
~64×64 for small sprites.~~

## The same-canvas rule (any piece that belongs to a rig)

Learned the hard way in G1 and carried forward through V2 into the refresh —
this is the rule that makes layered characters and fish work at all:

1. **Every piece is drawn from the body sprite as an attached reference image**,
   not from a text description of it.
2. **Every piece comes back on the same canvas, in place** — a transparent
   canvas the same size as the body, with the hat (or fin, or rod) already
   sitting where it goes. Then all layers share one box and the offsets are
   literally zero. Registration is the generator's job, not a tuning session.
3. **The grip is a sandwich, not an alignment problem.** Body drawn with an
   *open* curled hand → rod paints over it → a fingers-only overlay paints over
   the rod. Any rod then looks held.

4. **Do not generate a piece you could cut.** (R4.) Any subdivision of a
   painted character that has no independent existence — a head off a torso, an
   arm off a shoulder — is a **local cut of one delivered image**. It registers
   perfectly because it is the same pixels, and it costs no generation and no
   reroll risk. Generate separately only what must exist apart from the body:
   the rod (the shop swaps it) and the fingers that close over it. The
   consequence is that **how many pieces a rig has is a code decision, not an
   art decision** — which is how `ART_DIRECTION.md`'s four-piece assumption got
   answered without costing a prompt.

A piece that doesn't fit is a **reroll, not an offset tweak**. Tuning offsets at
4x zoom is exactly how G1 shipped something that looked wrong at 1x.

**Rod files are named `rod-<shop id>-<pose>.png`, and a pose's default rod is
that level's *gate* rod.** Rods are not cosmetics — `shop.rods[].unlocksLocation`
makes them the progression gate, so you cannot reach the Stream without buying
**Bamboo Beauty** or the Ocean without **The Deep Endeavor**. The rod a kid is
holding in a given level is therefore that gate rod or better (a kid can
re-equip a cheaper one they own, but it costs them luck, so it is the exception).
Drawing one generic pole for every pose would mean drawing the wrong rod twice
and redoing it in R7; drawing each pose's gate rod starts R7's per-item-per-pose
grid with the three that matter already filled in. Pond → `stick`, Stream →
`bamboo`, Ocean → `deepsea`.

**Characters do not get the background style block.** `ART_DIRECTION.md` says
sprites take the palette and edge treatment of the backgrounds *"without
attempting full painterly texture on moving parts"*, so the gouache /
visible-brushwork language that `GEMINI_NOTES.md` records as the thing worth
spending prompt weight on for a background is wrong on a character — it is
invisible at 66×100 screen px and reads as noise. Keep the palette, the diffused
light and the thin warm-brown outline; swap brushwork for **soft two-tone
shading with blended edges**, and name the character failure modes instead: NOT
pixel art, NOT flat vector art with even line weight, NOT thick black cartoon
linework, NOT a glossy 3D render.

## How the generator behaves → `GEMINI_NOTES.md`

Everything about **how Gemini responds** — what it obeys, what it silently
ignores, the flat-magenta backdrop convention that replaced asking for
transparency, both alpha-salvage recipes, and the delivery checklist — lives in
**`GEMINI_NOTES.md`** so it is in one place and does not get re-derived each
session. **Read it before writing any prompt below.**

The two headline rules, because they change how every request here is worded:
**position by edges and corners, never by percentage**, and **name a flat
backdrop colour rather than asking for transparency — then detect the colour you
actually got.**

## Prompt template Claude should reuse

The base template from `ART_DIRECTION.md`, prefixed to **every** asset prompt so
separately generated pieces still agree on palette and mood:

> Soft painterly illustration in the style of Studio Ghibli background art, warm
> muted color palette, gentle diffused lighting, thin warm brown outlines rather
> than black, cozy and inviting mood, no harsh shadows, no neon or saturated
> colors.

Then the asset-specific part, then the framing constraints (transparent
background / same canvas as the reference / no text, no baked shadow).

~~Old template: "Pixel art <subject>, cozy retro game asset, chunky clean
pixels, warm dawn lake palette…"~~ — retired 2026-08-31 with the pixel
direction.

## Open art requests

### R7: gear, per pose (the wiring landed 2026-09-02; the prompts are below)

**Read this before delivering any gear PNG.** R7's code half is in, so a gear
painting is a three-step delivery rather than one, and skipping the last step
looks exactly like the art never arriving:

1. **Attach the pose's own painting** and ask for it back with one thing
   changed. Not a fresh drawing of a hat or a rod: an edit. See below for why,
   and for how to make the attachment.
2. **Cut it against that same painting** with `python3 tools/cut-gear.py <pose>
   <stem> <download>`, which registers the return, takes what changed and writes
   `assets/<stem>-<pose>.png` at the pose's whole canvas. `<stem>` is the shop
   item's `file` (`rod-carbon`, `hat-straw`) and `<pose>` is `pond`, `stream` or
   `ocean`. It prints every check below as it goes.
3. **Add that filename to `CONFIG.rig.gearArt`.** It is the registry that
   decides whether the shop's item shows up at all, the same switch
   `CONFIG.fish.species` is for fish. A PNG that is on disk but not in `gearArt`
   is silently never drawn, and a data test will tell you if you name a pose or
   an item that doesn't exist.

Until a stem is registered, the game falls back: a rod shows the pose's own
painted gate rod, and a hat shows nothing. That is deliberate, so the shop can
sell the whole grid before any of it is painted, and it means **no gear delivery
is ever urgent and none of them have to arrive together.**

#### Every gear painting is an edit of the pose, not a new painting

The same-canvas rule says a piece belonging to a rig is drawn *from* the body
and comes back on the same canvas. Gear takes that one step further, because by
now there is a finished painting to edit rather than a body to draw from:
**attach the pose's own painting, ask for it back with exactly one thing
changed.** Registration then costs nothing, because the pixels that did not
change are the reference's own.

It also settles the two cuts, which are not the same cut:

- **A hat is cut by difference.** The pixels that changed are the hat plus
  whatever hair it covers, which is exactly what the hat layer should paint over
  the body. Paint order is rod, arm, body, hat, so the hat covers everything and
  a slightly generous diff is correct rather than a defect. The one thing the
  diff must not reach is the face.
- **A rod is cut by corridor**, which is `cut-angler.py`'s fitted axis,
  half-width, butt, hand band and reel circle. Every one of those numbers stays
  valid *if the new rod lands on the same axis*, which is what the rod prompt
  spends its weight on. A difference cut cannot do this one: the rod paints
  behind the hand and the occluded stretch is synthesised from the cross-section
  above it, so the place needing the most work is the place where the two images
  agree exactly.

That second point is also the argument for holding the axis rather than
accepting a well-drawn rod somewhere else on the canvas. Nine freely drawn rods
are nine axes to measure and nine chances to bite into the body. One held axis
is zero.

#### It gives up R6's sheet, and takes the muskie's rule instead

R6's hardest-won lesson is that a sheet is the only way to *ask for* a
difference: four hats on one canvas come back as four different hats, four
passes come back as one hat four times. **A sheet is not available here**, and it
is worth saying why rather than leaving it looking like an oversight. Four hats
on one canvas would be four hats worn by four redrawn children, which throws away
the registration the edit is bought for, or four hats floating alone, which then
have to be positioned by numbers in `config.js`. R7's plan forbids the second and
G1 already paid for it.

So gear takes the fallback `GEMINI_NOTES.md` records for exactly this case, the
muskie, whose collision partner had been generated three waves earlier and could
not share a canvas with it: **state the difference positively, then as an
inversion of the thing already painted.** Each prompt below carries a `[NOT THE
OTHER ONE]` clause naming the gear already delivered for that pose, and the four
hats are specified as four different outlines rather than four different fabrics.
If they come back samey anyway, that is a finding rather than a reroll, and the
answer to it is the transplant below.

#### What it will read as: the head is 18 design px

Measured off the three cut poses rather than assumed. The head is **18.5, 18.9
and 17.2 design px wide** at the Pond, Stream and Ocean, which the three
paintings agree on despite being three sizes (their scales are 0.057, 0.084 and
0.057). A hat is about 24 design px across. On a 1280px window that is roughly 40
device px, and **anything finer than about 2 design px is not there at all.**

Silhouette is the whole budget, so each hat below is given a shape a child could
recognise as a black cut-out: a wide level brim, a small down-turned dome, a
smooth bobbled skull, a long tail at the back. Each prompt says that to the
generator in the picture's own terms, because "it will be shown small" is
otherwise the kind of instruction that changes nothing.

#### The attachment

`assets/angler-<pose>.png` is the keyed painting, so its backdrop is alpha. An
attachment with no magenta in it gives "keep the backdrop exactly as it is"
nothing to hold onto, and leaves the returned backdrop to whatever the upload
composites onto. Put the magenta back first:

```
python3 tools/gear-ref.py     # writes assets/ref-angler-{pond,stream,ocean}.png
```

Those three are gitignored on purpose: one line of derivation from a committed
file is not game art. **Attach the ref, never the keyed PNG.**

#### The grid, and the order to fill it

21 paintings: 4 rods x 3 poses less R4's diagonal (9 rods), and 4 hats x 3 poses
(12 hats). `hat-none` is not art. "Just Hair" is the bare head R4 painted on
purpose, and it is how a hat comes back off.

**Every hat before any rod**, because the two fallbacks are not equally good. An
unregistered rod falls back to the pose's own painted gate rod, which is still a
rod in a hand and costs a kid nothing they can see. An unregistered hat falls
back to nothing, so it is a purchase that visibly does nothing. That was the
half of R7's done-when the straw hat closed, and every unpainted hat in the shop
still has it.

1. ~~**`hat-straw-pond`, the probe.**~~ ✅ landed first attempt 2026-09-02; the
   edit comes back as an edit. See the record below.
2. ~~**`hat-straw-stream`** and **`hat-straw-ocean`**~~ ✅ both landed first
   attempt 2026-09-02, and the transplant is answered at both poses: the Stream
   takes a landed Pond hat, the Ocean does not.
3. The rest of the hats, cheapest first (`bucket` 30, `beanie` 50, `souwester`
   75). **Six generations, not nine**: Pond and Ocean are painted, the Stream is
   transplanted from the Pond hat as each one lands. All six prompts are written
   out under *The hats* below. ~~All nine landed 2026-09-02~~ ✅ — the three
   Pond generations each carried a free Stream transplant, and the three Ocean
   hats were generated against that pose. **The hat column is complete, 12 of
   12, from six paintings.** Every hat verified in Chromium at every spot.
4. The nine rods, `stick` and `bamboo` before `carbon` and `deepsea`. **All
   nine prompts are written out under *The rods* below**, in the order to send
   them, and a rod is cut by `cut-angler.py`'s corridor rather than
   `cut-gear.py`'s difference.

**The transplant was measured before the six generations were spent**, against
the straw hat at all three poses, and it saved three of them. The numbers and
the tool are in the `hat-straw-ocean` record below.

#### Checks on delivery, in the order that saves work

The standing checklist in `GEMINI_NOTES.md` still applies. These come first,
because they are the ones an edit can fail in a way a fresh painting cannot:

1. **Did the rest of the painting survive?** Diff the return against the ref
   with the changed region masked out (the head for a hat, the rod corridor for
   a rod). A faithful edit leaves the body, the clothes, the hands and the boots
   where they were. A redraw shows up as a large diff everywhere at once.
2. **If the figure moved but was not redrawn**, register the return to the ref
   by its head box before cutting, and say so in the commit. That is a measured
   salvage of the kind R4 used, not an offset tweak.
3. **If the pose changed** (a different angle, a different hand, a different
   rod position for a hat prompt), it is a reroll.
4. **Backdrop bled into the subject** is a reroll, as always, and is checked
   before anything else that costs work.
5. **A hat must not touch the face.** The eye, the nose and the mouth belong to
   the body layer, and a hat layer that covers them cannot be fixed downstream.
6. **A rod must be on the pose's own axis**, checked by cutting it with that
   pose's unchanged `cut-angler.py` corridor and recompositing. If the corridor
   misses it, the axis moved.
7. **Palette** against the table above: no pure black, nothing darker than
   `#33291f`.

#### ✅ `hat-straw-pond` landed first attempt (2026-09-02), and the edit shape holds

The probe answered its question. **The generator returned an edit, not a
redraw.** The figure did not move, the pose did not change, the rod stayed on
its axis, and the only new paint on the canvas is the hat.

| check | result |
|---|---|
| canvas | 1008x1056 against the 1344x1391 asked. Size ignored as always, **and the aspect drifted too**: 0.955 against 0.966, which is why the fit is per-axis |
| registration | silhouette IoU **0.898** after the fit, and only **1080 px** of the reference the delivery does not carry (the hair the brim pushed in) |
| the pose below the neck | median colour distance **8.1**, 9.3% over 40, which is JPEG and resampling. The clothes, hands, boots and rod are the same paint |
| backdrop | flat, key `(251,2,244)`, stdev 2-4 |
| the piece | 76,080 px, bbox 570x306, one component after the fill |
| the face | untouched: the brim crosses the forehead and stops above the eyebrow |
| palette | 0 pure-black px, 0.30% darker than umber and warm at `(80,26,2)` |

**Three things the cut had to learn, each paid for by this one delivery**, and
all three are in `tools/cut-gear.py` now:

- **A hat arrives as two components, not one.** The hatband is pale where the
  hair beneath it is pale, so a thin seam across the crown reads as unchanged
  and splits the crown from the brim. Take the largest component before filling
  the enclosed holes and you keep the crown and lose the brim, which is the
  bigger half of the silhouette. Close, fill, then take the largest.
- **Unmix, never the distance ramp.** The ramp calls a half-magenta edge pixel
  0.9 opaque and leaves a pink rim all round the brim, because a JPEG's ringing
  against a saturated key is not a linear mix. `gap = min(R,B) - G` is, and it
  clips to fully opaque on every warm or neutral colour in this palette, greys
  included. Residual key after unmixing: **0.000%**.
- **Do not force alpha to 1 where the piece covers the pose.** It looks safe,
  since the body layer carries what is underneath, but a brim pushes the hair
  silhouette *in*, and along that seam the delivery is backdrop where the
  reference was hair. Forcing it painted a violet blotch at the temple. Unmixing
  everywhere has no such case.

**And one thing the request had wrong.** A gear piece is written at the pose's
**whole painted canvas**, not cropped to its own content: the layer box lives on
the pose (`CONFIG.rig.poses.<pose>.layers`), so every hat that pose will ever
wear has to share one box, and this brim already reaches 47 source px further
left than the angler's own crop does. The canvas is the box they can all share
and it costs nothing, since transparent PNG rows compress away (148 KB). The
Pond's hat box is `x: 32.4, y: -44.5, w: 76.9, h: 79.6`, printed by the tool
from the pose's own numbers rather than tuned, and **it will not move again**.

Cut with `python3 tools/cut-gear.py pond hat-straw assets/Gemini_hat-straw-pond.jpg`.
Verified in Chromium past the profile modal: the hat is on the kid's head in the
rowboat, it survives a reload, and at the Stream the same equipped hat falls back
to nothing with no failed request anywhere in the run.

#### ✅ `hat-straw-stream` landed first attempt (2026-09-02), and it found the fit

Second delivery, second faithful edit: agreement below the neck 0.974, only
**591 px** of the reference the return does not carry, and the pose's clothes,
hands, net and rod all the same paint. 0 pure-black px, 0.73% darker than umber
and warm. Wired, and verified in Chromium at the Stream.

**It broke the registration fit, and the fix is the lesson.** The first version
matched bounding boxes of the lower 45% of the figure, which is stable for a
seated kid in a boat and not for a kid holding a **landing net on a string**: the
net hangs differently in the return, and one moved extremity skewed the box fit
to a scale of 1.204 x 1.399 for a figure whose proportions had not changed at
all. Every downstream number then looked like a redraw (IoU 0.54, 70% of the
body "changed"), which is exactly the false alarm that costs a reroll.

Two changes, both in `tools/cut-gear.py`:

- **Fit by searching, not by boxes.** Maximise silhouette agreement over
  everything outside a box a hat could occupy, which keeps the **rod** in the
  objective. A long thin diagonal across half the canvas pins scale and offset
  far harder than a seated child's blob does, and no hat touches it.
- **Pivot the search about the two figures' centroids.** With scale and offset
  measured from the canvas origin they trade off, so every single-parameter step
  from the seed is worse than the seed even when a diagonal step is better: the
  search sat on its seed, 0.02 of IoU short. Pivoting about the centroid
  decouples them and it converges.

The Pond was re-cut with the corrected fit (IoU 0.898, unchanged; its piece now
carries a little more of the hair under the brim, which the hat layer should
paint anyway).

#### ✅ `hat-straw-ocean` landed first attempt, and the transplant is answered

Third delivery, third faithful edit: agreement below the neck 0.975, IoU 0.896,
1092 px of the reference the return does not carry, and the brim genuinely tilts
back with the head, which is what this pose was asked for. 0 pure-black px and
2.0% darker than umber, warm at `(79,17,4)` — higher than the other two, and it
is the shadow the brim throws on the brow rather than a palette drift. The straw
hat is now on all three anglers, wired and verified in Chromium at each spot.

**The transplant question is settled, and the answer is different at each pose.**
Can a hat painted once at the Pond be *landed* on another pose's head instead of
generated again?

| | heads register at | transplant vs the real hat | verdict |
|---|---|---|---|
| Pond → Stream | **0.904** (uniform scale 0.672) | IoU 0.62, areas within 10%, indistinguishable at 54px | **transplant** |
| Pond → Ocean | **0.837** | IoU 0.712, and it sits *perched*: too high, too far back, forehead and fringe exposed, visible at 54px | **generate** |

The Ocean is the pose whose head is not upright, and the transform carries scale
and translation but no rotation, so this is the failure it was predicted to have.
`tools/hat-transplant.py` refused it on its own threshold before anything was
rendered, which is the check earning its keep: the number that separates the two
cases was set from the Stream and the Ocean fell the right side of it without
being told to.

**So the remaining nine hats are six generations rather than nine**: three at the
Pond (`bucket`, `beanie`, `souwester`), three free transplants to the Stream,
and three at the Ocean. The rods are unaffected, since a rod is not cut this way.

#### ✅ `hat-souwester-ocean` landed (2026-09-02) — the hat column is complete, 12 of 12

Ninth delivery, and the last hat in the grid. It also cost a wrong call and
turned up a limitation worth writing down.

**It was rejected once, wrongly.** The first read called it "the straw hat
again" off a glance at a wide tan brim, and asked for a reroll. It is a
sou'wester, and measuring the two silhouettes on the same canvas says so:

| | reach in front | reach behind | back/front | back brim below front |
|---|---|---|---|---|
| `hat-souwester-ocean` | 105 px | 256 px | **2.44** | **152 px** |
| `hat-straw-ocean` | 173 px | 348 px | 2.01 | 103 px |

Short at the front, sweeping long and low behind, with a chin strap the straw
hat does not have. **The lesson is the one `CLAUDE.md` already carries and this
session broke anyway: a glance is not a measurement.** Two hats can share a
palette and a rough outline and still be different objects, and the check that
separates them costs one command. Rejecting a good delivery is as expensive as
accepting a bad one, and harder to notice.

**The real finding: the neck guard truncates this hat, and no constant fixes
it.** `cut-gear.py`'s `neck` is a per-pose row below which nothing can be part
of a hat — a guard that is right for eleven hats and wrong for the one whose
defining feature is sweeping down over the neck. Both sou'westers hit it:

| | lowest row | its pose's `neck` | clear | last-row taper |
|---|---|---|---|---|
| `hat-souwester-ocean` | 819 | 820 | 1 px | **0.98** (flat = cut) |
| `hat-souwester-pond` | 799 | 800 | 1 px | 0.92 |
| `hat-beanie-ocean` | 805 | 820 | 15 px | — |
| `hat-bucket-ocean` | 781 | 820 | 39 px | — |
| `hat-straw-ocean` | 791 | 820 | 29 px | — |

It is visible: against a cut taken at `neck=900`, **212 px of a 152x168 sprite
differ by more than 30 at true game scale**, all of it the missing sweep behind
the neck.

**And lowering the guard does not fix it — it moves the flat edge somewhere
worse.** Sweeping `neck` to 900, 960 and 1000, the piece's bounding box bottom
lands at exactly `neck - 1` every time and the piece keeps growing: the diff
never finds a natural brim edge, because this delivery differs from the
reference across the whole body (22.3% below the neck, the highest of the nine)
so "changed" runs to the bottom of the canvas. At 900 the brim does reach its
taper, but the cut then lands as a straight horizontal seam across the shoulder
and life vest, which reads worse at full resolution than a truncation tucked
against the jaw. **Shipped as the unmodified tool cuts it**, and the tool was
restored byte-identical after the experiment.

A proper fix is shape-aware rather than a row: below the neck, keep only what is
connected to the brim above it AND distinguishable from the body underneath.
That is real work and it belongs to whoever wants it, not to this delivery.
Logged in `BACKLOG.md`.

Registration is otherwise the loosest of the nine (agreement below the neck
0.945, IoU 0.901), which is the same body-wide difference showing up. Face-box
coverage 461 px, backdrop stdev 3.0/4.7/4.2, 0 pure-black px, 2.06% darker than
umber at `(85,13,4)`.

**All twelve hats verified in Chromium at all three spots** in one sweep, every
one drawing its own art with no failed asset request.

#### ✅ `hat-beanie-ocean` landed first attempt (2026-09-02), and it is the best delivery of the grid

Eighth delivery, and the tightest of all eight on both registration numbers at
once: agreement below the neck **0.986**, silhouette IoU **0.939**, tied with
`hat-beanie-pond` for the highest IoU in the set and ahead of it below the
neck. Face-box coverage **0 px**, the second beanie in a row to touch nothing
there, which is starting to look like the shape rather than a coincidence: no
brim means nothing is ever asked to reach toward the eyebrow.

| check | this delivery | `hat-beanie-pond` | `hat-bucket-ocean` |
|---|---|---|---|
| agreement below the neck | **0.986** | 0.991 | 0.985 |
| silhouette IoU | **0.939** | 0.939 | 0.931 |
| face-box coverage | **0** | 0 | 109 |
| aspect (0.903 asked) | 0.897 | — | 0.897 |
| palette | 0 black, 4.27% darker than umber, `(88,6,3)` | 0, 2.34% | 0, 3.34% |

Highest darker-than-umber reading of any hat, 4.27%, and it is the same story
as the Pond beanie: ember red is dark and saturated, so more of its own pixels
sit under the threshold. Mean `(88,6,3)` is warm and there is no pure black.

The tilt held again: composited and at game size, the whole knitted dome
follows the head's backward lean rather than sitting level, matching
`hat-bucket-ocean` and `hat-straw-ocean` before it.

Verified in Chromium at the Ocean, plus a re-check of the Ocean bucket hat in
the same pass. One hat remains in the entire grid: `hat-souwester-ocean`.

#### ✅ `hat-bucket-ocean` landed first attempt (2026-09-02), and it is the tightest edit yet

Seventh delivery, and the first Ocean generation of the R7 gear grid, since the
Ocean is the one pose the transplant refuses. Best registration numbers of any
delivery so far: agreement below the neck **0.985**, silhouette IoU **0.931**,
only 553 px of the reference the return does not carry. Face-box coverage 109
px, checked against the fixed `cut-gear.py` (#130), so this is a genuine small
overlap rather than jitter.

| check | this delivery | best of the six Pond/Stream hats |
|---|---|---|
| agreement below the neck | **0.985** | 0.991 (beanie) |
| silhouette IoU | **0.931** | 0.939 (beanie) |
| px the reference has and the delivery does not | **553** | 1463 (beanie) |
| face-box coverage | 109 | 0 (beanie) |
| aspect (0.903 asked) | 0.897 | — |

**The brim tilts back with the head**, which was the one thing to watch on the
first Ocean generation: the Ocean is the only pose whose head is not upright,
and `hat-transplant.py` refuses it for exactly that reason (a Pond hat lands
perched and forehead-exposed there, per the `hat-straw-ocean` record). A
generated hat carries no such risk since the generator draws the tilt itself,
and it did: composited and rendered at game size, the brim visibly follows the
same backward lean as `hat-straw-ocean`'s.

Darkest palette reading yet at 3.34% below umber, mean `(64,16,10)` — still
warm, no pure black, and consistent with the Ocean's own generations running
slightly darker than the Pond and Stream (`ART.md` → R6 wave 3 found the same
pattern in the fish sheets).

Verified in Chromium at the Ocean and a re-check of the Pond bucket hat in the
same pass, both drawing exactly as before.

#### ✅ `hat-souwester-pond` landed first attempt (2026-09-02), and it broke the cut

Sixth delivery, and the first one the composite could not vouch for on its own.
`cut-gear.py` reported the piece covering **16,230 px of the face box**, two
orders of magnitude over anything the first five hats scored (0-1137 px), while
the rendered composite looked exactly as clean as every hat before it: eye,
nose, mouth and smile all untouched. Both readings were checked rather than
trusted, and both were partly right.

**The alarm was real, and it was not the strap.** Isolating the face-box
overlap by actual colour difference (not just alpha) found 2940 px of it
genuinely differs from what the body layer paints there, in a thin trace with
fill ratio 0.13 across a box-height-spanning bounding box — the shape of a
redrawn outline, not a physical object. A chin strap or hood edge is a compact
ribbon; this was a 1-3px-wide line following the eyebrow, the eye, the nose
bridge and the smile.

**Why the composite still looked perfect: the redrawn line agrees with the
original on colour, not on the exact pixel.** A faithful edit repaints the same
face from the same reference, so its line art lands within a few px of where it
started and in the same ink. Composited on top, it is indistinguishable from
what it is covering.

**Why it grew to 16,230 px instead of staying at 2940: the closing step that
exists to bridge a hood to its own brim is just as willing to bridge that trace
into a ring, and the hole-fill the SAME close needs for the hatband/hair case
then treats the ring's inside as one enclosed hole and paints it solid.** That
is `cut-gear.py`'s own documented fix for a different problem (a pale hatband
over pale hair splits the crown from the brim into two components; close, fill,
take the largest) landing on the one region it was never meant to reach. Every
prior hat carried the same 1-3px trace in miniature; straw and bucket, re-cut
with the fix below, each lost 861-1109px of face-box overlap that had shipped
invisibly since #123 and #128, confirmed by pixel diff to affect nothing else
on either canvas (957px on straw, 1152 on bucket, both entirely inside the
face box, both under 1000 in aggregate colour distance).

**The fix opens the face box's slice of the diff before closing ever runs**,
so the ring never forms: real hat material reaching the face is never as thin
as a redrawn outline, so whatever a 9px open removes there is jitter, not
fabric. `cut-gear.py`'s own docstring carries the full mechanism now. Re-cut
with the fix:

| check | souwester (fixed) | souwester (raw) | beanie, unaffected |
|---|---|---|---|
| face-box coverage | **815** | 16,230 | 0 |
| piece | 88,373 px | 107,833 px | 62,888 px |
| palette | 0 black, 0.60% darker than umber | 0, 1.04% | 0, 2.34% |
| agreement below the neck | 0.974 | (unchanged by the fix) | 0.991 |
| silhouette IoU | 0.902 | (unchanged) | 0.939 |

Registration and backdrop numbers are unaffected by the fix, since it only
touches what counts as the piece, not the fit: aspect 0.955, border stdev 2.3 /
4.0 / 3.4, agreement below the neck 0.974, silhouette IoU 0.902, all inside the
band the other five set.

Transplanted to the Stream at head IoU 0.904, the fourth hat to land on that
exact figure. Verified in Chromium at all three spots: drawn at the Pond and
the Stream, hat layer absent from the Ocean's stack, no failed asset request.
Bucket and beanie re-verified in the same pass since their Pond source and
Stream transplant were regenerated by the same fix; both draw exactly as
before, confirmed by pixel diff against the pre-fix renders (mean diff <1.2 at
threshold 30, entirely inside the two small regions the fix removed).

**The general lesson: a component surviving `largest()` is not proof it is one
real thing.** It proves it is one connected region after closing, which a
hole-fill can inflate far past what was ever actually "changed." Trust the
piece's shape (fill ratio, local thickness) over its membership in the biggest
blob, especially anywhere the tool has already been told nothing legitimate can
land.

#### ✅ `hat-beanie-pond` landed first attempt (2026-09-02), the cleanest edit yet

Fifth delivery, and it leads on every registration number the tool prints.
Transplanted to the Stream at the same head IoU 0.904 as the other two, which is
a property of the two heads rather than of the hat, so it should be 0.904 every
time from here.

| check | beanie | bucket | straw |
|---|---|---|---|
| agreement below the neck | **0.991** | 0.966 | 0.982 |
| silhouette IoU | **0.939** | 0.925 | 0.898 |
| body differing by >40 | **7.9%** | 14.3% | 11.8% |
| px the reference has and the delivery does not | **1463** | 6726 | 3194 |
| face-box coverage | **0** | 1137 | 935 |
| backdrop border stdev | 2.2 / 4.1 / 3.5 | 15.8 / 32.4 / 15.4 | 2.3 / 4.2 / 3.4 |
| aspect (0.966 asked) | 0.955 | 0.967 | 0.955 |
| palette | 0 black, 2.34% darker than umber, `(93,6,4)` | 0, 1.48% | 0, 1.19% |

**The zero is the prompt change earning its keep.** The shared frame says "The
brim must not cover the eye, the eyebrow or any part of the face", which
contradicts this hat's own "if it has a brim it is wrong" and could be read as
licence to draw one. For the two beanie prompts only, that sentence is now "No
part of the hat may cover the eye, the eyebrow or any part of the face". The
souwester keeps the original wording because it genuinely has a brim. First
delivery to touch the face box not at all.

**The aspect went back to 0.955**, exactly the straw's drift, so the bucket's
0.967 was one generation and not a trend. #127 declined to add a ratio
instruction to a working frame on the grounds that the per-axis fit absorbs the
drift; that reasoning stands, and the bucket is no longer evidence for either
side.

Highest "darker than umber" figure of the five at 2.34%, and it is the colour
rather than a palette drift: ember red is a dark saturated hue, so more of its
pixels sit below the threshold. Mean `(93,6,4)` is warm and there is no pure
black.

Verified in Chromium at all three spots (`--hat beanie`): drawn at the Pond and
the Stream, hat layer absent from the Ocean's stack, no failed asset request.
**And it answers #128's contrast note** — ember red reads hard against the
Stream's green forest where sage green went quiet. The low-contrast pairing was
that hat's colour, not a property of the Stream.

#### ✅ `hat-bucket-pond` landed first attempt (2026-09-02), and the Stream came free

Fourth delivery, fourth faithful edit, and the first one to use the transplant
for a shipped asset: one generation put the bucket hat on two anglers.

| check | result | the straw hat, re-cut as a control |
|---|---|---|
| canvas | 1008x1042 against 1344x1391 asked, **aspect 0.967 against 0.966** | 0.955 against 0.966 |
| registration | silhouette IoU **0.925**, agreement below the neck 0.966 | 0.898, 0.982 |
| the pose below the neck | median colour distance 7.3, 14.3% over 40 | 8.4, 11.8% |
| the piece | 78,675 px, bbox 396x385, and it covers 1137 px of the face box | 93,405 px, 935 px |
| backdrop | key `(251,2,249)`, border stdev **15.8 / 32.4 / 15.4** | 2.3 / 4.2 / 3.4 |
| palette | 0 pure-black px, 1.48% darker than umber, warm at `(72,17,6)` | 0 px, 1.19% |
| transplant to the Stream | heads register at **0.904**, uniform scale 0.672 | 0.904, 0.672 |

**The third column is the finding.** `cut-gear.py` prints raw numbers and no
thresholds, so "14.3% differs by >40 (a redraw shows here)" and "covers 1137 px
of the face box" both read as alarms on a first delivery when they are in fact
normal. **Re-cutting a committed delivery gives you a control for free** and it
comes back byte-identical to what is in the repo, so it costs one command and
proves the tool has not drifted either. Every number above lands in the straw
hat's band. Do this before deciding a delivery is bad.

The one genuine difference is the backdrop, an order of magnitude noisier. The
unmix did not care: 38 rim px despilled of 5791, against the straw's 4 of 8538,
and no violet anywhere in the composite. **A noisy backdrop is not the reroll
condition; backdrop bled into the subject is.**

**This was first written up as an artefact of the delivery path** (this PNG came
through a chat upload rather than a direct download, so a second JPEG pass). The
beanie arrived by the identical route, within 300 bytes of the same file size,
with a backdrop 8x cleaner. The explanation does not survive that, so the honest
reading is that backdrop flatness varies per generation and the unmix absorbs
the range. Do not use it to infer how a file reached you.

Verified in Chromium past the profile modal at all three spots
(`node tools/spot-check.mjs --loc <spot> --hat bucket`): the hat draws at the
Pond and the Stream, the Ocean falls back to the bare head with the hat layer
absent from the stack rather than 404ing, and no asset request failed anywhere.

**One thing for the eye rather than the tool.** Sage green on the Stream's green
forest is the lowest-contrast hat-against-background pairing in the game so far.
It reads, and the Pond and the Ocean are unaffected, but if it bothers you the
fix is the hat's colour in the prompt rather than anything downstream.

#### The hats

**Six generations close the hat column**, and all six are below, written out
whole, and **all six are struck through: the hat column is finished, 12 of 12,
2026-09-02.** Six paintings bought nine hats, because each Pond hat transplanted
to the Stream for free. The prompts are kept below because they are what a
reroll would ask for again. The Stream's three are not among them: the transplant measured above
lands a Pond hat on the Stream head for free, so the Stream is a command rather
than a request. Order is cheapest first, and each Pond hat should be
transplanted to the Stream as it lands rather than in a batch at the end, so
that a hat is either absent everywhere or present at two spots and never a
purchase that works at only one.

They are written out rather than left as a template plus a substitution table,
because "that prompt with the hat block swapped" is not something anyone can
paste, and R6 paid for that lesson twice. The eight substitutions include the
canvas size, which is per pose, and getting it wrong costs a generation.

**Nothing in the frame has moved.** Every word outside `[THE HAT]`, `[HOW IT
SITS]`, `[SHAPE]` and `[NOT THE OTHER ONE]` is the straw prompt's, which landed
three times out of three on the first attempt. That includes one thing it is
tempting to improve: the prompt states the canvas in pixels but never as a
ratio, and `GEMINI_NOTES.md` calls the ratio the most dependable instruction in
the set. The aspect drifted on all three straw deliveries (0.955 against 0.966)
and the per-axis fit in `cut-gear.py` absorbed it every time, so the drift is a
solved problem and the frame is a 3-for-3 one. Changing it would put all six of
these on a frame nothing has tested.

The canvas sizes below are read off `assets/angler-<pose>.png`, and the pose
lines are baked into the prompts. The rods section bakes them in too, so this
table is now the record of where those numbers came from rather than something
a prompt still substitutes from.

| `<pose>` | `<POSE LINE>` | `<W> by <H>` |
|---|---|---|
| `pond` | The child is sitting with his knees drawn up, seen from the side and facing right, and his head is upright. | 1344 by 1391 |
| `stream` | The child is standing in waders, seen from the side and facing right, and his head is upright. | 1387 by 1510 |
| `ocean` | The child is braced back as if leaning into a fish, seen from the side and facing right, and his head is tilted slightly back and up. The hat must tilt back with it rather than sitting level. | 1324 by 1466 |

The `[NOT THE OTHER ONE]` clause names the hats already delivered *for that
pose*, so it grows down the column. Straw is delivered at every pose, so the
Pond and Ocean prompts for a given hat carry the same clause.

##### At the Pond

~~**`hat-bucket-pond`**: Bucket List, 30 coins.~~ ✅ **Landed first attempt
2026-09-02**, and `hat-bucket-stream` was transplanted from it. The prompt is kept
below because it is what a reroll would ask for again.

```
ART NEEDED: R7 gear, Bucket List for the Pond angler
Reference: assets/ref-angler-pond.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing added: a hat on the child's head. Everything else
          must be identical to the picture I attached: the same child, the same
          face, the same hair below the hat, the same pose, the same clothes,
          the same fishing rod in the same place at the same angle, the same
          colours, the same brushwork, the same size, the same canvas, the
          figure in exactly the same position on it. Do not redraw the child.
          Do not change the crop, the zoom or the framing. Change nothing below
          the eyebrows.

          [THE HAT]
          A soft cotton bucket hat in muted sage green, with a squat
          flat-topped crown that sits close to the head and a short brim that
          slopes DOWN all the way round.

          [HOW IT SITS]
          The child is sitting with his knees drawn up, seen from the side and
          facing right, and his head is upright. The hat sits squarely on the
          crown and follows the tilt of the head. Some of the child's hair
          still shows below it, at the back and in front of the ear. The brim
          must not cover the eye, the eyebrow or any part of the face.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This hat will be shown at about the size of a fingernail: the child's
          head is 18 pixels wide on the screen it appears on. Its SHAPE is the
          only thing that will survive. As a plain black cut-out it must read
          as a small dome with its edge turned down. Paint it in two or three
          soft tones with blended edges and a thin warm brown outline. No fine
          texture, no small details, no lettering, no badges, no logos, no
          pins, no feathers, no fishing flies hooked into it, no dangling
          straps or cords.

          [NOT THE OTHER ONE]
          This child already owns a wide-brimmed straw sun hat in another
          picture, and this hat is its opposite: a small close-fitting dome
          with a SHORT brim turned DOWN, not a wide flat brim held level. The
          two must not be mistakable for each other at a glance.

          [BACKDROP]
          Every part of the image that is not the child is one completely flat,
          even magenta #FF00FF, exactly as in the attached picture: edge to
          edge and into all four corners, no gradient, no texture, no vignette,
          no shading. No water, no ground, no scenery, no other objects, and no
          drop shadow or reflection under the child.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: nothing else changes]
          Draw NO fishing line: no thread, string or filament of any kind, not
          on the reel, not through the guides, not trailing from the rod tip.
          Draw no fish, no water, no text, no labels, no watermark, no border
          and no frame.

          [CANVAS]
          Return the image at the same 1344 by 1391 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_hat-bucket-pond.jpg (the raw download, whatever extension
          it arrives with, kept so the cut can be re-run)
Wired in: `python3 tools/cut-gear.py pond hat-bucket assets/Gemini_hat-bucket-pond.jpg`,
          then add "hat-bucket-pond" to CONFIG.rig.gearArt
Then:     `python3 tools/hat-transplant.py hat-bucket pond stream`, and add
          "hat-bucket-stream" to CONFIG.rig.gearArt as well
```

~~**`hat-beanie-pond`**: Bean There, 50 coins.~~ ✅ **Landed first attempt
2026-09-02**, and `hat-beanie-stream` was transplanted from it. The prompt is
kept below, with its corrected face clause, because it is what a reroll would
ask for again.

```
ART NEEDED: R7 gear, Bean There for the Pond angler
Reference: assets/ref-angler-pond.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing added: a hat on the child's head. Everything else
          must be identical to the picture I attached: the same child, the same
          face, the same hair below the hat, the same pose, the same clothes,
          the same fishing rod in the same place at the same angle, the same
          colours, the same brushwork, the same size, the same canvas, the
          figure in exactly the same position on it. Do not redraw the child.
          Do not change the crop, the zoom or the framing. Change nothing below
          the eyebrows.

          [THE HAT]
          A knitted wool beanie in muted ember red, hugging the skull with NO
          brim at all, with a turned-up ribbed cuff across the forehead and a
          small round bobble on top.

          [HOW IT SITS]
          The child is sitting with his knees drawn up, seen from the side and
          facing right, and his head is upright. The hat sits squarely on the
          crown and follows the tilt of the head. Some of the child's hair
          still shows below it, at the back and in front of the ear. No part
          of the hat may cover the eye, the eyebrow or any part of the face.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This hat will be shown at about the size of a fingernail: the child's
          head is 18 pixels wide on the screen it appears on. Its SHAPE is the
          only thing that will survive. As a plain black cut-out it must read
          as a smooth skull with no brim and one bump on top. Paint it in two
          or three soft tones with blended edges and a thin warm brown outline.
          No fine texture, no small details, no lettering, no badges, no logos,
          no pins, no feathers, no fishing flies hooked into it, no dangling
          straps or cords.

          [NOT THE OTHER ONE]
          This child already owns a wide straw sun hat and a soft bucket hat.
          This one has NO brim of any kind: it is knitted wool pulled down over
          the ears, a smooth curve from the forehead to the back of the neck
          with a bobble on top. If it has a brim it is wrong.

          [BACKDROP]
          Every part of the image that is not the child is one completely flat,
          even magenta #FF00FF, exactly as in the attached picture: edge to
          edge and into all four corners, no gradient, no texture, no vignette,
          no shading. No water, no ground, no scenery, no other objects, and no
          drop shadow or reflection under the child.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: nothing else changes]
          Draw NO fishing line: no thread, string or filament of any kind, not
          on the reel, not through the guides, not trailing from the rod tip.
          Draw no fish, no water, no text, no labels, no watermark, no border
          and no frame.

          [CANVAS]
          Return the image at the same 1344 by 1391 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_hat-beanie-pond.jpg (the raw download, whatever extension
          it arrives with, kept so the cut can be re-run)
Wired in: `python3 tools/cut-gear.py pond hat-beanie assets/Gemini_hat-beanie-pond.jpg`,
          then add "hat-beanie-pond" to CONFIG.rig.gearArt
Then:     `python3 tools/hat-transplant.py hat-beanie pond stream`, and add
          "hat-beanie-stream" to CONFIG.rig.gearArt as well
```

~~**`hat-souwester-pond`**: Rain Check, 75 coins.~~ ✅ **Landed first attempt
2026-09-02**, and `hat-souwester-stream` was transplanted from it. It also
found a real bug in `cut-gear.py` — see the record below — so the prompt kept
here is exactly what shipped, verified against the corrected cut.

```
ART NEEDED: R7 gear, Rain Check for the Pond angler
Reference: assets/ref-angler-pond.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing added: a hat on the child's head. Everything else
          must be identical to the picture I attached: the same child, the same
          face, the same hair below the hat, the same pose, the same clothes,
          the same fishing rod in the same place at the same angle, the same
          colours, the same brushwork, the same size, the same canvas, the
          figure in exactly the same position on it. Do not redraw the child.
          Do not change the crop, the zoom or the framing. Change nothing below
          the eyebrows.

          [THE HAT]
          A rain hat (a sou'wester) in muted amber oilskin, short and turned up
          at the front, sweeping DOWN and OUT at the back to cover the neck,
          with a chin strap.

          [HOW IT SITS]
          The child is sitting with his knees drawn up, seen from the side and
          facing right, and his head is upright. The hat sits squarely on the
          crown and follows the tilt of the head. Some of the child's hair
          still shows below it, at the back and in front of the ear. The brim
          must not cover the eye, the eyebrow or any part of the face.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This hat will be shown at about the size of a fingernail: the child's
          head is 18 pixels wide on the screen it appears on. Its SHAPE is the
          only thing that will survive. As a plain black cut-out it must read
          as short at the front and a long tail at the back. Paint it in two or
          three soft tones with blended edges and a thin warm brown outline. No
          fine texture, no small details, no lettering, no badges, no logos, no
          pins, no feathers, no fishing flies hooked into it, no dangling
          straps or cords.

          [NOT THE OTHER ONE]
          This child already owns a wide straw sun hat, a soft bucket hat and a
          knitted beanie. This one is not symmetrical: it is SHORT at the front
          and LONG at the back, a stiff shiny oilskin that sheds rain, and the
          back brim reaches the child's collar.

          [BACKDROP]
          Every part of the image that is not the child is one completely flat,
          even magenta #FF00FF, exactly as in the attached picture: edge to
          edge and into all four corners, no gradient, no texture, no vignette,
          no shading. No water, no ground, no scenery, no other objects, and no
          drop shadow or reflection under the child.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: nothing else changes]
          Draw NO fishing line: no thread, string or filament of any kind, not
          on the reel, not through the guides, not trailing from the rod tip.
          Draw no fish, no water, no text, no labels, no watermark, no border
          and no frame.

          [CANVAS]
          Return the image at the same 1344 by 1391 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_hat-souwester-pond.jpg (the raw download, whatever extension
          it arrives with, kept so the cut can be re-run)
Wired in: `python3 tools/cut-gear.py pond hat-souwester assets/Gemini_hat-souwester-pond.jpg`,
          then add "hat-souwester-pond" to CONFIG.rig.gearArt
Then:     `python3 tools/hat-transplant.py hat-souwester pond stream`, and add
          "hat-souwester-stream" to CONFIG.rig.gearArt as well
```


##### At the Ocean

Same three hats, same clauses, against the one head that is not upright. The
transplant refuses this pose, which is why these are generations.

~~**`hat-bucket-ocean`**: Bucket List, 30 coins.~~ ✅ **Landed first attempt
2026-09-02**, the tightest registration of any delivery so far. The prompt
kept here is exactly what shipped.

```
ART NEEDED: R7 gear, Bucket List for the Ocean angler
Reference: assets/ref-angler-ocean.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing added: a hat on the child's head. Everything else
          must be identical to the picture I attached: the same child, the same
          face, the same hair below the hat, the same pose, the same clothes,
          the same fishing rod in the same place at the same angle, the same
          colours, the same brushwork, the same size, the same canvas, the
          figure in exactly the same position on it. Do not redraw the child.
          Do not change the crop, the zoom or the framing. Change nothing below
          the eyebrows.

          [THE HAT]
          A soft cotton bucket hat in muted sage green, with a squat
          flat-topped crown that sits close to the head and a short brim that
          slopes DOWN all the way round.

          [HOW IT SITS]
          The child is braced back as if leaning into a fish, seen from the
          side and facing right, and his head is tilted slightly back and up.
          The hat must tilt back with it rather than sitting level. The hat
          sits squarely on the crown and follows the tilt of the head. Some of
          the child's hair still shows below it, at the back and in front of
          the ear. The brim must not cover the eye, the eyebrow or any part of
          the face.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This hat will be shown at about the size of a fingernail: the child's
          head is 18 pixels wide on the screen it appears on. Its SHAPE is the
          only thing that will survive. As a plain black cut-out it must read
          as a small dome with its edge turned down. Paint it in two or three
          soft tones with blended edges and a thin warm brown outline. No fine
          texture, no small details, no lettering, no badges, no logos, no
          pins, no feathers, no fishing flies hooked into it, no dangling
          straps or cords.

          [NOT THE OTHER ONE]
          This child already owns a wide-brimmed straw sun hat in another
          picture, and this hat is its opposite: a small close-fitting dome
          with a SHORT brim turned DOWN, not a wide flat brim held level. The
          two must not be mistakable for each other at a glance.

          [BACKDROP]
          Every part of the image that is not the child is one completely flat,
          even magenta #FF00FF, exactly as in the attached picture: edge to
          edge and into all four corners, no gradient, no texture, no vignette,
          no shading. No water, no ground, no scenery, no other objects, and no
          drop shadow or reflection under the child.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: nothing else changes]
          Draw NO fishing line: no thread, string or filament of any kind, not
          on the reel, not through the guides, not trailing from the rod tip.
          Draw no fish, no water, no text, no labels, no watermark, no border
          and no frame.

          [CANVAS]
          Return the image at the same 1324 by 1466 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_hat-bucket-ocean.jpg (the raw download, whatever extension
          it arrives with, kept so the cut can be re-run)
Wired in: `python3 tools/cut-gear.py ocean hat-bucket assets/Gemini_hat-bucket-ocean.jpg`,
          then add "hat-bucket-ocean" to CONFIG.rig.gearArt
```

~~**`hat-beanie-ocean`**: Bean There, 50 coins.~~ ✅ **Landed first attempt
2026-09-02**, the best registration of the whole grid on both agreement and IoU
at once. The prompt kept here is exactly what shipped.

```
ART NEEDED: R7 gear, Bean There for the Ocean angler
Reference: assets/ref-angler-ocean.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing added: a hat on the child's head. Everything else
          must be identical to the picture I attached: the same child, the same
          face, the same hair below the hat, the same pose, the same clothes,
          the same fishing rod in the same place at the same angle, the same
          colours, the same brushwork, the same size, the same canvas, the
          figure in exactly the same position on it. Do not redraw the child.
          Do not change the crop, the zoom or the framing. Change nothing below
          the eyebrows.

          [THE HAT]
          A knitted wool beanie in muted ember red, hugging the skull with NO
          brim at all, with a turned-up ribbed cuff across the forehead and a
          small round bobble on top.

          [HOW IT SITS]
          The child is braced back as if leaning into a fish, seen from the
          side and facing right, and his head is tilted slightly back and up.
          The hat must tilt back with it rather than sitting level. The hat
          sits squarely on the crown and follows the tilt of the head. Some of
          the child's hair still shows below it, at the back and in front of
          the ear. No part of the hat may cover the eye, the eyebrow or any part
          of the face.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This hat will be shown at about the size of a fingernail: the child's
          head is 18 pixels wide on the screen it appears on. Its SHAPE is the
          only thing that will survive. As a plain black cut-out it must read
          as a smooth skull with no brim and one bump on top. Paint it in two
          or three soft tones with blended edges and a thin warm brown outline.
          No fine texture, no small details, no lettering, no badges, no logos,
          no pins, no feathers, no fishing flies hooked into it, no dangling
          straps or cords.

          [NOT THE OTHER ONE]
          This child already owns a wide straw sun hat and a soft bucket hat.
          This one has NO brim of any kind: it is knitted wool pulled down over
          the ears, a smooth curve from the forehead to the back of the neck
          with a bobble on top. If it has a brim it is wrong.

          [BACKDROP]
          Every part of the image that is not the child is one completely flat,
          even magenta #FF00FF, exactly as in the attached picture: edge to
          edge and into all four corners, no gradient, no texture, no vignette,
          no shading. No water, no ground, no scenery, no other objects, and no
          drop shadow or reflection under the child.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: nothing else changes]
          Draw NO fishing line: no thread, string or filament of any kind, not
          on the reel, not through the guides, not trailing from the rod tip.
          Draw no fish, no water, no text, no labels, no watermark, no border
          and no frame.

          [CANVAS]
          Return the image at the same 1324 by 1466 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_hat-beanie-ocean.jpg (the raw download, whatever extension
          it arrives with, kept so the cut can be re-run)
Wired in: `python3 tools/cut-gear.py ocean hat-beanie assets/Gemini_hat-beanie-ocean.jpg`,
          then add "hat-beanie-ocean" to CONFIG.rig.gearArt
```

~~**`hat-souwester-ocean`**: Rain Check, 75 coins.~~ ✅ **Landed 2026-09-02**, the
last hat in the grid. Rejected once by mistake before it was measured — see the
record below, and the neck-guard limitation it exposed.

```
ART NEEDED: R7 gear, Rain Check for the Ocean angler
Reference: assets/ref-angler-ocean.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing added: a hat on the child's head. Everything else
          must be identical to the picture I attached: the same child, the same
          face, the same hair below the hat, the same pose, the same clothes,
          the same fishing rod in the same place at the same angle, the same
          colours, the same brushwork, the same size, the same canvas, the
          figure in exactly the same position on it. Do not redraw the child.
          Do not change the crop, the zoom or the framing. Change nothing below
          the eyebrows.

          [THE HAT]
          A rain hat (a sou'wester) in muted amber oilskin, short and turned up
          at the front, sweeping DOWN and OUT at the back to cover the neck,
          with a chin strap.

          [HOW IT SITS]
          The child is braced back as if leaning into a fish, seen from the
          side and facing right, and his head is tilted slightly back and up.
          The hat must tilt back with it rather than sitting level. The hat
          sits squarely on the crown and follows the tilt of the head. Some of
          the child's hair still shows below it, at the back and in front of
          the ear. The brim must not cover the eye, the eyebrow or any part of
          the face.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This hat will be shown at about the size of a fingernail: the child's
          head is 18 pixels wide on the screen it appears on. Its SHAPE is the
          only thing that will survive. As a plain black cut-out it must read
          as short at the front and a long tail at the back. Paint it in two or
          three soft tones with blended edges and a thin warm brown outline. No
          fine texture, no small details, no lettering, no badges, no logos, no
          pins, no feathers, no fishing flies hooked into it, no dangling
          straps or cords.

          [NOT THE OTHER ONE]
          This child already owns a wide straw sun hat, a soft bucket hat and a
          knitted beanie. This one is not symmetrical: it is SHORT at the front
          and LONG at the back, a stiff shiny oilskin that sheds rain, and the
          back brim reaches the child's collar.

          [BACKDROP]
          Every part of the image that is not the child is one completely flat,
          even magenta #FF00FF, exactly as in the attached picture: edge to
          edge and into all four corners, no gradient, no texture, no vignette,
          no shading. No water, no ground, no scenery, no other objects, and no
          drop shadow or reflection under the child.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: nothing else changes]
          Draw NO fishing line: no thread, string or filament of any kind, not
          on the reel, not through the guides, not trailing from the rod tip.
          Draw no fish, no water, no text, no labels, no watermark, no border
          and no frame.

          [CANVAS]
          Return the image at the same 1324 by 1466 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_hat-souwester-ocean.jpg (the raw download, whatever extension
          it arrives with, kept so the cut can be re-run)
Wired in: `python3 tools/cut-gear.py ocean hat-souwester assets/Gemini_hat-souwester-ocean.jpg`,
          then add "hat-souwester-ocean" to CONFIG.rig.gearArt
```

#### The rods

Nine of the twelve, since R4 painted each pose holding its own gate rod. Every
prompt below holds the axis and changes the pole, and every one is **written out
whole**, for the reason the hats are: "that prompt with the rod block swapped"
is not something anyone can paste, and the substitutions include the canvas
size, which is per pose and costs a generation when it is wrong.

**Nothing in the frame has moved.** Every word outside `[HOW HE HOLDS IT]`,
`[THE ROD]`, `[NOT THE OTHER ONE]` and the one number in `[SHAPE]` is the hat
frame's, which landed six times out of six on the first attempt. Three blocks
are new because a rod needs them, and two of the three are about the reel the
*attachment* already has. `[WHERE THE ROD GOES]` is the whole point of the
request. `[THE REEL IS GONE]` is carried by the two `rod-stick` prompts only: the Stream
and Ocean gate rods both have a reel and the stick has none, so the space it
vacates has to be named or it comes back as a floating reel. `[THE REEL MOVES TO
THE OTHER SIDE]` is the same problem one step milder, and three prompts carry it
— `rod-deepsea-stream` moves the reel from below the hand to above it, and
`rod-bamboo-ocean` and `rod-carbon-ocean` move it the other way. Left unsaid,
"add a reel below" against a picture with a reel above is the kind of gap that
returns both — untested here, but it is the same gap that made the sou'wester
look like the straw hat (#133), where nothing in the prompts separated the two.

`[SHAPE]` quotes the rod's real rendered length from `cut-angler.py`'s
`rod_len`: **65 design px at the Pond and the Ocean, 95 at the Stream.** At that
size a rod is a two- or three-pixel stroke with one blob near the hand, so which
side of the pole the reel sits on is doing more work than anything else in the
painting. **It comes in two versions**, and the difference is not cosmetic: the
seven reeled rods are told the reel's side is the strongest of the three
surviving cues, and the two `rod-stick` prompts are told the *absence* of a reel
is what makes the stick recognisable. One `[SHAPE]` block for all nine would
have asked the two stick prompts to "keep the reel a clear simple round shape"
in the same breath as `[THE REEL IS GONE]`.

**The order to fill them** is `stick` and `bamboo` before `carbon` and
`deepsea`, and within a rod, the poses in the order below. `[NOT THE OTHER ONE]`
names the rods already delivered *for that pose* as well as the gate rod in the
attachment, so it grows down each pose's column the way the hats' did.
Delivering out of order is not wrong; it just leaves a clause naming a rod that
does not exist yet.

**The tip does not reach a canvas edge, and the prompts had said it did.**
Measured on all three paintings rather than assumed: no painted pixel touches
any edge of any of the three canvases, and in all three the **rod tip is the
topmost painted pixel** (y=367 of 1391 at the Pond, 486 of 1510 at the Stream,
442 of 1466 at the Ocean, each about three-quarters of the way across). That is
what makes `cut-angler.py`'s `t_edge` work: it takes the axis where it crosses
the top of the *cropped* frame, which is the tip. So `[WHERE THE ROD GOES]` now
says the tip stops in open backdrop short of the corner and must be neither
lengthened to reach it nor shortened — the opposite of what it said, inside the
block that carries the whole request.

**Three more of the corridor's numbers turn out to be per rod, not per pose.**
Flagged rather than solved, and it is a bigger flag than the one this section
carried before the prompts were written. `cut-angler.py`'s `POSES` dict was
measured off each pose's own painted gate rod, and three of its entries describe
*that rod* rather than that pose:

- **`reel`**, the off-axis circle a straight corridor would otherwise miss.
  The Pond's is `None` because the painted stick has no reel, the Stream's sits
  below the hand (a fly reel) and the Ocean's above it (a multiplier). Seven of
  the nine rods below carry a reel and each puts it where its own design says,
  not where that pose's gate rod put it. Cut `rod-bamboo-ocean` with the Ocean's
  circle and the reel is simply not in the layer.
- **`half`**, half the shaft's width: 16 / 15 / 22 source px at the Pond, Stream
  and Ocean, and the Ocean's is the outlier because a boat rod is thick.
  `rod-deepsea-pond` is a thick rod on a corridor fitted to a cane.
- **`rod_xmin`**, the Stream's hard left bound, which exists because that pose's
  butt passes close to the waders. A rod whose butt stops elsewhere may not need
  it, or may need it somewhere else.

The cheap shape, and the one to try first, is a per-**item** table read through
each pose's own axis and grip, rather than nine hand-measured circles: a reel is
*how far along the rod from the grip, which side, how big*, and the axis turns
that into a circle at any pose. `half` is one number per item. Four rows, not a
grid of nine.

It is deliberately not written yet. `cut-fish.py`'s four detectors were each
written against a real sheet, and the same applies here — the first delivered
rod is what says whether a generated reel lands where the geometry predicts.

**And one that is not a per-rod number at all: `cut-angler.py` has no
registration fit, and it is going to need one.** Every number in `POSES` is in
the *source pixels of the original painting*, applied to whatever image the tool
is handed. That was safe while the only input was `assets/angler-<pose>.png`
itself. It is not safe for a delivery: the generator ignores the canvas size
every single time (the straw hat came back 1008x1056 against the 1344x1391
asked, and the aspect drifted too), so a returned rod will have the axis, grip,
butt, hand band and reel circle all off by whatever it decided to draw at.
The corridor will sit nowhere near the rod, and it will look like the generator
missed the axis when it did not.

`cut-gear.py` already solved exactly this and the fix is to reuse it rather than
re-derive it: fit by **maximising silhouette agreement outside the box the
changed thing can occupy, pivoting the search about the two centroids** (the
Stream hat paid for both halves of that). For a rod the excluded box is the rod
corridor rather than the head, which leaves the child's whole body in the
objective — a better anchor than the diagonal the hat fit leans on. Register
first, then run the corridor. **This is the first thing that will go wrong on
the first rod delivery**, and it is worth doing before reading anything into a
bad cut.

##### Trusty Stick (`rod-stick`), at the Stream and the Ocean

R4 painted the Pond's angler holding it, so only the Stream and the Ocean still
need one.

**`rod-stick-stream`.**

```
ART NEEDED: R7 gear, Trusty Stick for the Stream angler
Reference: assets/ref-angler-stream.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is standing in waders, seen from the side and facing right,
          and he holds the rod in his near hand at about chin height, with his
          whole near arm held clear of his chest. His far arm hangs at his
          other side and the landing net on its cord stays exactly where it
          hangs. Nothing about the arm, the hand, the net or the clothes
          changes.

          [THE ROD]
          A plain cut cane pole, honey-tan and slightly knobbly, tapering
          evenly to a thin tip. It has NO reel, NO line guides and NO fittings
          of any kind: a pole a child cut for himself, with a single turn of
          dark cord whipped round it where his hand holds it.

          [THE REEL IS GONE]
          The rod in the attached picture has a reel on it. This one does not.
          Where that reel was there must now be nothing at all but the flat
          magenta backdrop: no reel, no reel seat, no stub of one, no shadow of
          one.

          [NOT THE OTHER ONE]
          The rod in the attached picture is a honey-coloured split-cane fly
          rod with a small dark reel. This one must be obviously different at a
          glance: a plain cut stick with no reel, no guides and no fittings at
          all.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 95 pixels long and only two or three
          pixels thick. Its overall thickness and its colour are the only
          things that will survive, and having NO reel is the whole of what
          makes it recognisable next to the others. Paint the whipped cord as a
          soft suggestion rather than fine detail. No lettering, no logos, no
          brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1387 by 1510 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-stick-stream.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py stream \
              assets/Gemini_rod-stick-stream.jpg`,
          save the rod layer as assets/rod-stick-stream.png, then add
          "rod-stick-stream" to CONFIG.rig.gearArt
```

**`rod-stick-ocean`.**

```
ART NEEDED: R7 gear, Trusty Stick for the Ocean angler
Reference: assets/ref-angler-ocean.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is braced back as if leaning into a fish, seen from the
          side and facing right, and he holds the rod in his near hand at about
          chin height, with his whole near arm held clear of his chest. His far
          arm stays resting along his far thigh. Nothing about the arms, the
          hands or the clothes changes.

          [THE ROD]
          A plain cut cane pole, honey-tan and slightly knobbly, tapering
          evenly to a thin tip. It has NO reel, NO line guides and NO fittings
          of any kind: a pole a child cut for himself, with a single turn of
          dark cord whipped round it where his hand holds it.

          [THE REEL IS GONE]
          The rod in the attached picture has a reel on it. This one does not.
          Where that reel was there must now be nothing at all but the flat
          magenta backdrop: no reel, no reel seat, no stub of one, no shadow of
          one.

          [NOT THE OTHER ONE]
          The rod in the attached picture is a thick dark boat rod with a big
          brass reel. This one must be obviously different at a glance: a plain
          cut stick, much thinner, with no reel, no guides and no fittings at
          all.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 65 pixels long and only two or three
          pixels thick. Its overall thickness and its colour are the only
          things that will survive, and having NO reel is the whole of what
          makes it recognisable next to the others. Paint the whipped cord as a
          soft suggestion rather than fine detail. No lettering, no logos, no
          brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1324 by 1466 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-stick-ocean.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py ocean \
              assets/Gemini_rod-stick-ocean.jpg`,
          save the rod layer as assets/rod-stick-ocean.png, then add
          "rod-stick-ocean" to CONFIG.rig.gearArt
```

##### Bamboo Beauty (`rod-bamboo`), at the Pond and the Ocean

R4 painted the Stream's angler holding it, so only the Pond and the Ocean still
need one.

**`rod-bamboo-pond`.**

```
ART NEEDED: R7 gear, Bamboo Beauty for the Pond angler
Reference: assets/ref-angler-pond.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is sitting with his knees drawn up, seen from the side and
          facing right, and he holds the rod in his near hand at about chin
          height. The butt of the pole tucks in behind his raised knee and his
          far arm stays resting on that knee. Nothing about the arm, the hand,
          the knee or the clothes changes.

          [THE ROD]
          A split-cane fly rod in warm honey amber with slightly darker bands
          at the nodes, a pale cork grip where his hand holds it, fine wire
          line guides spaced along its length, and a small round dark-bronze
          click reel mounted on the UNDERSIDE of the pole just BELOW his hand.

          [NOT THE OTHER ONE]
          The pole in the attached picture is a plain stick with no reel and no
          fittings. This one must be obviously different at a glance: a honey-
          amber split-cane fly rod with a cork grip, wire guides along it and a
          small dark reel below the hand. Do not paint another bare pole.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 65 pixels long and only two or three
          pixels thick. Its overall thickness, its colour and the blob of its
          reel are the only things that will survive, and which side of the
          pole the reel sits on is the clearest of the three. Paint the guides
          and the thread whipping as soft suggestions rather than fine detail,
          and keep the reel a clear simple round shape. No lettering, no logos,
          no brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1344 by 1391 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-bamboo-pond.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py pond \
              assets/Gemini_rod-bamboo-pond.jpg`,
          save the rod layer as assets/rod-bamboo-pond.png, then add
          "rod-bamboo-pond" to CONFIG.rig.gearArt
```

**`rod-bamboo-ocean`.**

```
ART NEEDED: R7 gear, Bamboo Beauty for the Ocean angler
Reference: assets/ref-angler-ocean.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is braced back as if leaning into a fish, seen from the
          side and facing right, and he holds the rod in his near hand at about
          chin height, with his whole near arm held clear of his chest. His far
          arm stays resting along his far thigh. Nothing about the arms, the
          hands or the clothes changes.

          [THE ROD]
          A split-cane fly rod in warm honey amber with slightly darker bands
          at the nodes, a pale cork grip where his hand holds it, fine wire
          line guides spaced along its length, and a small round dark-bronze
          click reel mounted on the UNDERSIDE of the pole just BELOW his hand.

          [THE REEL MOVES TO THE OTHER SIDE]
          In the attached picture the reel sits above the pole. On this rod it
          sits below the pole instead. Where the old reel was there must now be
          nothing at all but the flat magenta backdrop: no reel, no reel seat,
          no stub of one, no shadow of one, and only ONE reel in the picture.

          [NOT THE OTHER ONE]
          The rod in the attached picture is a thick dark boat rod with a big
          brass reel on top. This one must be obviously different at a glance:
          a slender honey-amber split-cane fly rod with a cork grip and a small
          dark reel hanging BELOW the hand. This child also owns a plain honey-
          tan stick, so this one is not bare: it has guides, a cork grip and a
          reel.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 65 pixels long and only two or three
          pixels thick. Its overall thickness, its colour and the blob of its
          reel are the only things that will survive, and which side of the
          pole the reel sits on is the clearest of the three. Paint the guides
          and the thread whipping as soft suggestions rather than fine detail,
          and keep the reel a clear simple round shape. No lettering, no logos,
          no brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1324 by 1466 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-bamboo-ocean.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py ocean \
              assets/Gemini_rod-bamboo-ocean.jpg`,
          save the rod layer as assets/rod-bamboo-ocean.png, then add
          "rod-bamboo-ocean" to CONFIG.rig.gearArt
```

##### The Carp Whisperer (`rod-carbon`), at all three poses

No pose was painted holding it, so all three need one.

**`rod-carbon-pond`.**

```
ART NEEDED: R7 gear, The Carp Whisperer for the Pond angler
Reference: assets/ref-angler-pond.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is sitting with his knees drawn up, seen from the side and
          facing right, and he holds the rod in his near hand at about chin
          height. The butt of the pole tucks in behind his raised knee and his
          far arm stays resting on that knee. Nothing about the arm, the hand,
          the knee or the clothes changes.

          [THE ROD]
          A modern carbon-fibre rod: a slim matte blank in warm charcoal grey
          (dark, but never pure black), fine gold thread whipping where each
          small guide is bound on, a dark ribbed grip where his hand holds it,
          and a small dark spinning reel hanging BELOW the pole just under his
          hand.

          [NOT THE OTHER ONE]
          The pole in the attached picture is a plain stick with no reel and no
          fittings. This one must be obviously different at a glance: a slim
          matte grey carbon rod with a small spinning reel below the hand. This
          child already owns a honey-tan stick and a honey-amber split-cane fly
          rod, so this one is neither cane nor honey-coloured: it is GREY and
          machine-made.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 65 pixels long and only two or three
          pixels thick. Its overall thickness, its colour and the blob of its
          reel are the only things that will survive, and which side of the
          pole the reel sits on is the clearest of the three. Paint the guides
          and the thread whipping as soft suggestions rather than fine detail,
          and keep the reel a clear simple round shape. No lettering, no logos,
          no brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1344 by 1391 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-carbon-pond.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py pond \
              assets/Gemini_rod-carbon-pond.jpg`,
          save the rod layer as assets/rod-carbon-pond.png, then add
          "rod-carbon-pond" to CONFIG.rig.gearArt
```

**`rod-carbon-stream`.**

```
ART NEEDED: R7 gear, The Carp Whisperer for the Stream angler
Reference: assets/ref-angler-stream.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is standing in waders, seen from the side and facing right,
          and he holds the rod in his near hand at about chin height, with his
          whole near arm held clear of his chest. His far arm hangs at his
          other side and the landing net on its cord stays exactly where it
          hangs. Nothing about the arm, the hand, the net or the clothes
          changes.

          [THE ROD]
          A modern carbon-fibre rod: a slim matte blank in warm charcoal grey
          (dark, but never pure black), fine gold thread whipping where each
          small guide is bound on, a dark ribbed grip where his hand holds it,
          and a small dark spinning reel hanging BELOW the pole just under his
          hand.

          [NOT THE OTHER ONE]
          The rod in the attached picture is a honey-coloured split-cane fly
          rod with a small dark reel. This one must be obviously different at a
          glance: a slim matte grey carbon rod with a small spinning reel below
          the hand. This child also owns a plain honey-tan stick, so this one
          is not a bare pole: it is grey, machine-made, and it carries a reel.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 95 pixels long and only two or three
          pixels thick. Its overall thickness, its colour and the blob of its
          reel are the only things that will survive, and which side of the
          pole the reel sits on is the clearest of the three. Paint the guides
          and the thread whipping as soft suggestions rather than fine detail,
          and keep the reel a clear simple round shape. No lettering, no logos,
          no brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1387 by 1510 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-carbon-stream.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py stream \
              assets/Gemini_rod-carbon-stream.jpg`,
          save the rod layer as assets/rod-carbon-stream.png, then add
          "rod-carbon-stream" to CONFIG.rig.gearArt
```

**`rod-carbon-ocean`.**

```
ART NEEDED: R7 gear, The Carp Whisperer for the Ocean angler
Reference: assets/ref-angler-ocean.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is braced back as if leaning into a fish, seen from the
          side and facing right, and he holds the rod in his near hand at about
          chin height, with his whole near arm held clear of his chest. His far
          arm stays resting along his far thigh. Nothing about the arms, the
          hands or the clothes changes.

          [THE ROD]
          A modern carbon-fibre rod: a slim matte blank in warm charcoal grey
          (dark, but never pure black), fine gold thread whipping where each
          small guide is bound on, a dark ribbed grip where his hand holds it,
          and a small dark spinning reel hanging BELOW the pole just under his
          hand.

          [THE REEL MOVES TO THE OTHER SIDE]
          In the attached picture the reel sits above the pole. On this rod it
          sits below the pole instead. Where the old reel was there must now be
          nothing at all but the flat magenta backdrop: no reel, no reel seat,
          no stub of one, no shadow of one, and only ONE reel in the picture.

          [NOT THE OTHER ONE]
          The rod in the attached picture is a thick dark boat rod with a big
          brass reel on top. This one must be obviously different at a glance:
          a slim matte grey carbon rod with a small spinning reel hanging BELOW
          the hand. This child also owns a honey-tan stick and a honey-amber
          split-cane fly rod, so this one is neither cane nor honey-coloured:
          it is GREY and machine-made.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 65 pixels long and only two or three
          pixels thick. Its overall thickness, its colour and the blob of its
          reel are the only things that will survive, and which side of the
          pole the reel sits on is the clearest of the three. Paint the guides
          and the thread whipping as soft suggestions rather than fine detail,
          and keep the reel a clear simple round shape. No lettering, no logos,
          no brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1324 by 1466 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-carbon-ocean.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py ocean \
              assets/Gemini_rod-carbon-ocean.jpg`,
          save the rod layer as assets/rod-carbon-ocean.png, then add
          "rod-carbon-ocean" to CONFIG.rig.gearArt
```

##### The Deep Endeavor (`rod-deepsea`), at the Pond and the Stream

R4 painted the Ocean's angler holding it, so only the Pond and the Stream still
need one.

**`rod-deepsea-pond`.**

```
ART NEEDED: R7 gear, The Deep Endeavor for the Pond angler
Reference: assets/ref-angler-pond.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is sitting with his knees drawn up, seen from the side and
          facing right, and he holds the rod in his near hand at about chin
          height. The butt of the pole tucks in behind his raised knee and his
          far arm stays resting on that knee. Nothing about the arm, the hand,
          the knee or the clothes changes.

          [THE ROD]
          A heavy boat rod: a thick tapered blank in dark warm brown,
          noticeably thicker than a garden cane, a broad pale cork grip where
          his hand holds it, a padded fore-grip above the hand, chunky guides,
          and a big round brass multiplier reel sitting ON TOP of the pole just
          ABOVE his hand.

          [NOT THE OTHER ONE]
          The pole in the attached picture is a plain stick with no reel and no
          fittings. This one must be obviously different at a glance: a thick
          heavy boat rod with a big brass reel on top. This child already owns
          a honey-tan stick, a honey-amber split-cane fly rod and a slim grey
          carbon rod, and all three are thin. This is the THICK one, in dark
          warm brown, and its reel sits ON TOP of the pole rather than below
          it.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 65 pixels long and only two or three
          pixels thick. Its overall thickness, its colour and the blob of its
          reel are the only things that will survive, and which side of the
          pole the reel sits on is the clearest of the three. Paint the guides
          and the thread whipping as soft suggestions rather than fine detail,
          and keep the reel a clear simple round shape. No lettering, no logos,
          no brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1344 by 1391 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-deepsea-pond.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py pond \
              assets/Gemini_rod-deepsea-pond.jpg`,
          save the rod layer as assets/rod-deepsea-pond.png, then add
          "rod-deepsea-pond" to CONFIG.rig.gearArt
```

**`rod-deepsea-stream`.**

```
ART NEEDED: R7 gear, The Deep Endeavor for the Stream angler
Reference: assets/ref-angler-stream.png (attach it, made with
           `python3 tools/gear-ref.py`); ask for the SAME painting back
Prompt:   [WHAT THIS IS]
          I have attached a picture of a child fishing. I want the SAME picture
          back with ONE thing changed: the fishing rod he is holding is a
          different rod. Everything else must be identical to the picture I
          attached: the same child, the same face, the same hair, the same
          pose, the same clothes, the same hands, the same colours, the same
          brushwork, the same size, the same canvas, the figure in exactly the
          same position on it. Do not redraw the child. Do not change the crop,
          the zoom or the framing.

          [WHERE THE ROD GOES, AND THIS IS THE IMPORTANT PART]
          The new rod lies along EXACTLY the same line as the old one: the same
          angle across the picture, the same straight path, the butt end
          stopping at the same point, the tip stopping at the same point, the
          same overall length. The tip does NOT reach the edge of the picture.
          It stops in open backdrop, short of the top-right corner, exactly
          where it stops now: do not lengthen it to reach the corner and do not
          shorten it. Think of it as the same pole repainted where it lies, not
          a new pole placed in the picture. The child's hand does not move, and
          his fingers still cross in FRONT of the pole exactly as they do now.

          [HOW HE HOLDS IT]
          The child is standing in waders, seen from the side and facing right,
          and he holds the rod in his near hand at about chin height, with his
          whole near arm held clear of his chest. His far arm hangs at his
          other side and the landing net on its cord stays exactly where it
          hangs. Nothing about the arm, the hand, the net or the clothes
          changes.

          [THE ROD]
          A heavy boat rod: a thick tapered blank in dark warm brown,
          noticeably thicker than a garden cane, a broad pale cork grip where
          his hand holds it, a padded fore-grip above the hand, chunky guides,
          and a big round brass multiplier reel sitting ON TOP of the pole just
          ABOVE his hand.

          [THE REEL MOVES TO THE OTHER SIDE]
          In the attached picture the reel sits below the pole. On this rod it
          sits above the pole instead. Where the old reel was there must now be
          nothing at all but the flat magenta backdrop: no reel, no reel seat,
          no stub of one, no shadow of one, and only ONE reel in the picture.

          [NOT THE OTHER ONE]
          The rod in the attached picture is a honey-coloured split-cane fly
          rod with a small dark reel. This one must be obviously different at a
          glance: a thick heavy boat rod with a big brass reel on top. This
          child also owns a plain honey-tan stick and a slim grey carbon rod,
          and both are thin. This is the THICK one, in dark warm brown, and its
          reel sits ON TOP of the pole rather than below it.

          [SHAPE, BECAUSE IT WILL BE SEEN SMALL]
          This rod will be shown about 95 pixels long and only two or three
          pixels thick. Its overall thickness, its colour and the blob of its
          reel are the only things that will survive, and which side of the
          pole the reel sits on is the clearest of the three. Paint the guides
          and the thread whipping as soft suggestions rather than fine detail,
          and keep the reel a clear simple round shape. No lettering, no logos,
          no brand names, no maker's marks, no tiny mechanical detail.

          [BACKDROP]
          Every part of the image that is not the child and his rod is one
          completely flat, even magenta #FF00FF, exactly as in the attached
          picture: edge to edge and into all four corners, no gradient, no
          texture, no vignette, no shading. No water, no ground, no scenery,
          and no drop shadow or reflection.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette,
          gentle diffused lighting, thin warm brown outlines rather than black,
          cozy and inviting mood, no harsh shadows, no neon or saturated
          colours. Soft two-tone shading with blended edges, matching the
          attached painting exactly. NOT pixel art, NOT flat vector art with
          even line weight, NOT thick black cartoon linework, NOT a glossy 3D
          render, NOT a photograph.

          [CRITICAL: draw NO fishing line]
          The rod must be completely bare. No thread, string or filament of any
          kind: none wound on the reel, none threaded through the guides, none
          trailing from the tip, none anywhere in the picture. A rod normally
          has line on it and this one must not.

          [ALSO NOT IN THE PICTURE]
          No fish, no hook, no float, no lure, no hat, no landing net that is
          not already there, no text, no labels, no watermark, no border, no
          frame.

          [CANVAS]
          Return the image at the same 1387 by 1510 pixels as the picture I
          attached. Output as PNG.
Save as:  assets/Gemini_rod-deepsea-stream.jpg (the raw download, whatever
          extension it arrives with, kept so the cut can be re-run)
Wired in: check the corridor's reel circle and half-width against THIS
          rod first (see the note above), then
          `python3 tools/cut-angler.py stream \
              assets/Gemini_rod-deepsea-stream.jpg`,
          save the rod layer as assets/rod-deepsea-stream.png, then add
          "rod-deepsea-stream" to CONFIG.rig.gearArt
```

### ✅ R6 wave 1 — the Pond's ten fish (all three sheets landed 2026-09-02)

> **✅ Sheet A landed and is wired — and the experiment succeeded, first attempt.**
> Four fish on one canvas came back as four clean components in the right
> quadrants, with the treatment consistent across the set. The roster is
> therefore **~11 generations, not 33**: generate B and C the same way, and the
> Stream and Ocean by the same pattern.
>
> | check | result |
> |---|---|
> | backdrop | key `(255,76,254)`, stdev 2 — flat; floods stably from tol 60 to 90 |
> | bleed into the subject | 99.9% of magenta-carrying px within 8px of an edge, deepest 11.7 on a fin — fringe residue, not the reroll kind |
> | components | 4 of 4, none touching, **0 px** of enclosed key-coloured pockets |
> | canvas | 1200×896 against the 1600×1200 asked; ratio 1.339 vs 1.333 — size ignored as always, and irrelevant at ~525px per fish |
> | palette | 0 pure-black px; 0.055% darker than umber and those average `(55,36,16)`, warm |
> | treatment | tonal stdev 26–36 and saturation 0.11–0.49, inside the accepted anglers' and hull's range — the "too field-guide" complaint did **not** survive measurement |
> | the cut | peduncle found on all four, 51–72px deep against a 116–170px tail fan (2.3–2.6×); recomposite tail+body vs the sheet **0 px differ** on every fish |
>
> Cut with `python3 tools/cut-fish.py pond-common`, which was written against
> this sheet and now owns the method. It uses the **`unmix`** alpha model rather
> than the distance ramp: fins are thin enough that the generator paints backdrop
> through them, and unmixing also leaves nothing to despill — which matters here
> because a "blue above green is residue" rule would have eaten the pumpkinseed's
> blue-green cheek lines.
>
> **One open item, cosmetic:** the painted bodies run darker and less saturated
> than `data/fish.json`'s per-species `color` (green off by 29–51; bluegill
> painted `#8e8c72` against `#8fbf88`). That field now only tints the collection
> blob for *uncaught* species, so it shows on a silhouette or not at all. Worth a
> cheap re-pass toward the paintings when the Pond wave is complete.

> **✅ Sheet B landed and is wired (2026-09-02), first attempt again.** The row
> of three works as well as the 2×2: canvas 1552×688 against the asked 1800×800,
> ratio 2.256 vs 2.25. Three of three components, nothing touching a canvas edge,
> **0 px** of enclosed pockets; magenta-carrying pixels 100% within 8px of an
> edge and only 6px deep at worst (better than sheet A's 11.7); 0 pure-black px
> and 0.039% darker than umber, warm at `(61,31,14)`; peduncles 77–79% back with
> a 2.19–2.31× rise; recomposite **0 px differ** on all three.
>
> Two deviations from the prompt, neither worth a reroll: **the bass and trout
> came back mouth-open** where the prompt said closed — a largemouth bass's mouth
> is the species' whole idiom, which is `GEMINI_NOTES.md`'s "excluding part of an
> object's own idiom" case, and it reads better for recognition. And the carp's
> tonal stdev is 22.4, just under the accepted band's 26 floor, which is what a
> heavy smooth-flanked carp actually looks like rather than a flat render.

> **✅ Sheet C landed and is wired (2026-09-02) — the Pond is complete, 10 of 33.**
> Third sheet, third first attempt. Canvas 1552×688 (ratio 2.256 vs 2.25); three
> of three components, nothing on a canvas edge, 0 px of enclosed pockets;
> recomposite **0 px differ** on all three. The koi is the Pond's legendary and
> renders at 96 design px, the biggest fish in the game.
>
> **The koi found a real bug in the cut, which is what a hero asset is for.** Its
> peduncle is 90 source px deep — the deepest of the ten — and the tool's fixed
> 3px seam overlap left **0.5 design px** of daylight when the tail swings to
> ±7°, which is 2.7 device px on a retina screen. The overlap is now derived per
> fish from its own measured peduncle and the sweep angle
> (`ceil(depth/2 · sin 7°) + 1`), which gives 4px for the pike and 7px for the
> koi. Re-cutting all three sheets closes the seam (enclosed holes at ±7°: koi 0
> source px, everything else ≤1) and **the printed config is byte-identical** —
> the overlap moves pixels between the two layers without touching the box, the
> peduncle, the mouth or the pivot.

### ✅ R6 wave 2 — the Stream's ten fish (both sheets landed 2026-09-02)

> **✅ Sheet A landed and is wired — fourth sheet, fourth first attempt.**
> Canvas 1200×896 (ratio 1.339 vs 1.333); four of four components, nothing on a
> canvas edge, 0 px of enclosed pockets; **the cleanest keying yet** — every
> magenta-carrying pixel within 8px of an edge and only 4px deep at worst,
> against sheet A of the Pond's 11.7; no pure black, 0.118% darker than umber
> and warm at `(59,32,11)`; peduncles 77–81% back with a 2.40–3.92× rise;
> recomposite **0 px differ** on all four.
>
> **The collision the wave was written around is resolved.** Composited at 54px
> on pond water beside the Pond's fathead minnow, the dace is plainly a different
> fish — the rosy blush at the cheek and fin bases and the crisper dark band do
> exactly the work they were asked to do. Dace against chub is settled the same
> way, by silver-blue against brassy gold.
>
> The sculpin was the cut worth checking, having the strangest silhouette in the
> game so far (a broad flat head, huge fan-shaped pectorals, a second dorsal
> running far back). The peduncle detector put the line exactly at the tail
> anyway, leaving both rear fins on the body where they belong.

> **✅ The trout landed as ONE sheet of six (2026-09-02), and the Stream is
> complete — 20 of 33.** Matt merged sheets B and C into a single 3×2 canvas,
> which was the better call and is now the rule: **the rainbow and the steelhead
> are the pair hardest to tell apart, and one canvas drew them against each other
> instead of in two separate passes.** The prompt had been written to work around
> exactly that, with the steelhead's clause carrying the comparison in words —
> unnecessary, as it turned out.
>
> Six of six components, nothing on a canvas edge, 0 px enclosed pockets;
> peduncles 77–80% back at 2.40–2.90×; recomposite **0 px differ** on all six.
> **Ranks still sort themselves** even with two tiers mixed on one canvas, because
> a box comes from `fish.json`'s tier and never from the sheet: 64px uncommons
> beside 78px rares.
>
> At game size all seven trout-shaped fish in the game now read apart — brook,
> rainbow, brown, grayling, steelhead, Chinook and catfish. The closest remaining
> pair is the **Pond's brook trout against the Stream's rainbow**, both rose-
> flanked; they sit in different biome sections of the journal, which is what
> keeps them separable, and it is worth knowing before the Ocean adds more.
>
> **The catfish found a bug in the mouth measurement.** Its leftmost pixel is the
> tip of a *barbel*, not its mouth, so the "leftmost column at its vertical
> centre" rule attached the fishing line to its forehead, 7 design px high. The
> mouth is now the alpha-weighted centre of the leading 15% of the fish, which
> gives a whisker almost no say and a head all of it. Across the other nineteen
> species it moved the attach point by at most 2px, and onto the head rather than
> onto whatever extremity reached furthest forward.

### ✅ R6 wave 3 — the Ocean's thirteen fish (all three sheets landed 2026-09-02)

The biggest wave and the last, in **three generations**: two sheets of six and
the muskie alone. Sheets of six are proven (the Stream's trout), and the grouping
below is not arbitrary — it follows the rule that wave bought:
`GEMINI_NOTES.md` → **put the subjects hardest to tell apart on the same sheet**,
because a sheet is the only way to *ask for* a difference rather than describe
one.

The Ocean has two collision groups, and each gets one canvas:

| group | why it collides | sheet |
|---|---|---|
| herring · mackerel · anchovy · sardine | **four small silvery pelagics** — the worst group in the game, worse than the trout, because all four are the same silver fish to a glance | A, all together |
| marlin · tuna · swordfish | three big torpedoes, two of them billed | B, all together |

And one collision that **cannot** be solved by a sheet, because the other half of
it is already generated and lives in another biome:

> **The muskie against the Pond's northern pike.** Same family, same silhouette,
> same duck-bill snout. The field mark is that their patterns are *inverted* — a
> pike is **pale bean-shaped spots on a darker flank**, a muskie is **dark bars
> and spots on a paler flank** — and the muskie's clause below says so in those
> words. If Gemini accepts a reference image, attaching
> `assets/Gemini_fish-pond-rare.jpg` and naming the leftmost fish as the one it
> must *not* resemble is worth doing; it is the same reference trick `ART.md`
> already uses for the R5 hull repaints.

**The muskie also has consequences in code.** It is the Ocean's legendary and it
already has an A8 hero sprite: when its R6 art lands, **delete `fish-muskie.png`
and the `#scene.loc-ocean #fish:not(.rigged).tier-legendary` rule in
`style.css`** (a 96px width override). Both are dead the moment the species has
a real entry, and leaving them is how a stale sprite outlives its replacement.

> **✅ Sheet A landed on the second attempt and is wired — 26 of 33.** The
> corrected prompt fixed the backdrop (flat magenta, key `(249,46,247)`, stdev
> 2–3) but **the captions came back anyway**, and that turned out not to matter:
> the six fish are 35,115–67,750 px and the largest caption fragment is 983, a
> **35.7× separation**, so the cut drops the text and no sprite ever sees it.
> `cut-fish.py` now takes the N largest components rather than everything over a
> fixed size, and refuses if the smallest fish is less than 4× the largest thing
> it drops. Six of six, 0 interior holes, recomposite **0 px differ** on all six.
>
> **One thing to know, and it is a judgment call rather than a defect.** The
> naturalist treatment survived the reroll: the sheet's tonal stdev is 53–71
> (mean 62) against the accepted Pond/Stream art's 26–45 (mean 36). This is the
> first time a style complaint has survived measurement in this milestone — but
> it does not survive the *downscale*: at the 54–64px these render, the contrast
> averages out and they sit with the other twenty. Composited side by side with
> the minnow, dace, sculpin and carp, they read as one set. Worth a look, and a
> reroll of the sheet is cheap now that the prompt is right.
>
> <details><summary>The first attempt, and why it was rerolled</summary>
>
> **⚠️ Sheet A was rerolled once (2026-09-02) — the first reroll in the
> milestone, and the prompt below is the corrected one.** The first attempt came
> back as a **scientific field-guide plate**: six specimens on aged cream paper,
> each captioned with its Latin binomial. Cream backdrop `(249,237,210)` with
> **0.00%** magenta anywhere, aspect 1.833 against the 4:3 asked (the project's
> first aspect miss), and paper at luminance 241 against the palest fish tones at
> 211 — 30 apart, unkeyable. Full write-up in `GEMINI_NOTES.md` → *Describing
> fish by field marks makes it draw a field guide*.
>
> **The species clauses were not the problem and are unchanged** — the
> differentiation worked first time. What is added below is a paragraph
> forbidding the field-guide idiom by name (the same treatment R4's rod needed
> for "no fishing line"), and a backdrop stated as a *place* rather than a colour.
>
> </details>

```
ART NEEDED: R6 wave 3, sheet A — the Ocean's four silver commons, plus two
Prompt:   [WHAT THIS IS]
          Six separate game sprites of fish, to be cut out and used in a
          children's video game. This is NOT a field guide, NOT a scientific
          specimen plate, NOT a museum illustration, NOT a poster. There is NO
          paper of any kind: no parchment, no aged paper, no paper texture, no
          canvas texture, no vignette, no border. There are NO captions, NO
          labels, NO species names, NO Latin names, NO handwriting and NO text
          anywhere in the image.

          [BACKDROP]
          The six fish float on a solid magenta screen, the way a subject stands
          in front of a photographer's backdrop. Every part of the image that is
          not a fish is one completely flat, even magenta #FF00FF, edge to edge
          and into all four corners: a single flat colour, no gradient, no
          texture, no vignette, no pattern, no shading.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette, gentle
          diffused lighting, thin warm brown outlines rather than black, cozy and
          inviting mood, no harsh shadows, no neon or saturated colours. Soft
          two-tone shading with blended edges. NOT pixel art, NOT flat vector art
          with even line weight, NOT thick black cartoon linework, NOT a glossy
          3D render, NOT a photograph.

          [LAYOUT]
          Six different fish on one canvas, in three rows of two: top-left,
          top-right, middle-left, middle-right, bottom-left, bottom-right. Every
          fish is fully separated from every other by a wide band of empty
          background — no fish touches, overlaps or crowds another, and none
          touches the edge of the canvas.

          [POSE — every fish]
          Exact side view, facing LEFT: the head at the left of its own space and
          the tail at the right, level and horizontal as if swimming straight
          across. One calm friendly eye. Fins spread and clearly separate from the
          body, the dorsal fin standing up and the tail fan open. A gentle
          storybook fish, NOT a googly-eyed grinning cartoon.

          [TELL THEM APART]
          The first four fish are all small silvery sea fish and they are the
          whole difficulty of this picture: a child must be able to tell them
          apart at a glance. Draw the named feature of each as the most obvious
          thing about it. Do NOT draw four versions of the same silver fish.

          [THE SIX FISH]
          Top-left — an Atlantic herring: a deep-bodied little silver fish with a
          blue-green back, a bright plain silver flank with NO spots and NO
          stripes, large soft scales, one small dorsal fin set halfway along the
          back, and a deeply forked tail.
          Top-right — an Atlantic mackerel: its whole flank is covered in DARK
          WAVY TIGER-STRIPE BARS running down from a steel-blue back over a silver
          belly, and there is a row of small separate FINLETS between its dorsal
          fin and its tail.
          Middle-left — a European anchovy: very slender and small, with an
          ENORMOUS MOUTH that opens back well past its huge eye, a pointed snout
          that overhangs the lower jaw, and one bright silver stripe running the
          length of the flank.
          Middle-right — a Pacific sardine: slimmer than the herring, with a ROW
          OF DARK ROUND SPOTS along the upper flank and fine dark oblique lines on
          the gill cover.
          Bottom-left — a mahi-mahi: a blunt steep FOREHEAD like a bull's, a long
          dorsal fin running almost the entire length of the back, a deeply forked
          tail, and green-gold colour with soft blue flecks.
          Bottom-right — a red snapper: a rosy-red fish with a pointed snout, a
          spiny dorsal fin, a slightly forked tail and a red eye.

          [CRITICAL: nothing but the fish]
          Draw NO water of any kind. No bubbles, no splash, no ripples, no waves,
          no weeds, no sand, no rocks, no coral, no bowl, no tank, no net, no
          hook, no fishing line, no scenery, no plants, no other animals. No drop
          shadow or reflection under any fish. No text, no labels, no names, no
          watermark, no border, no frame, no grid lines, no panel dividers between
          the fish.

          [CANVAS]
          The image is 1600 by 1200 pixels, aspect ratio 4:3 — wider than it is
          tall. Output as PNG.
Save as:  assets/Gemini_fish-ocean-shoal.jpg
Wired in: `python3 tools/cut-fish.py ocean-shoal` — already registered in SHEETS
```

> **✅ Sheet B landed first attempt with the corrected frame — 32 of 33.** Flat
> magenta (key `(249,39,254)`, stdev 2–4), **no captions this time**, no paper,
> ratio 1.339 against the 4:3 asked, nothing on a canvas edge, six of six
> components with nothing to drop, recomposite **0 px differ** on all six. The
> `[WHAT THIS IS]` block did the whole job on its second outing.
>
> **Marlin against swordfish separated**, which is what the sheet existed for:
> a round spear and a long dorsal ridge on a blue barred flank, against a flat
> broad sword and one tall lone fin on a bronze-purple one. At 78px they are
> plainly two fish.
>
> **The unicornfish found the last bug in the mouth measurement.** It leads with
> a *horn* above its snout, so even the alpha-weighted centre landed 3.2 design
> px off the fish — in the gap between horn and snout, where the line would
> attach to nothing. Two things were wrong: the rule snapped to the nearest
> painted pixel (which is the horn tip, the wrong end of the head), and it
> measured in source pixels then rounded into design ones — and half a design px
> is four source px, exactly the width of that gap. The mouth is now measured in
> the box the game actually draws, and holds its height while walking right to
> the first painted column. All 32 attach points now land on their fish (within
> the 1px the alpha edge allows), against one 3.2px outlier before.

**Sheet B**, in full — the same corrected frame with its own species block. The
`[WHAT THIS IS]` and `[BACKDROP]` blocks go first for the reason sheet A proved:
a list of field marks *is* a field guide, and the generator draws one unless the
picture is named as something else before it starts.

```
ART NEEDED: R6 wave 3, sheet B — the Ocean's deep water
Prompt:   [WHAT THIS IS]
          Six separate game sprites of fish, to be cut out and used in a
          children's video game. This is NOT a field guide, NOT a scientific
          specimen plate, NOT a museum illustration, NOT a poster. There is NO
          paper of any kind: no parchment, no aged paper, no paper texture, no
          canvas texture, no vignette, no border. There are NO captions, NO
          labels, NO species names, NO Latin names, NO handwriting and NO text
          anywhere in the image.

          [BACKDROP]
          The six fish float on a solid magenta screen, the way a subject stands
          in front of a photographer's backdrop. Every part of the image that is
          not a fish is one completely flat, even magenta #FF00FF, edge to edge
          and into all four corners: a single flat colour, no gradient, no
          texture, no vignette, no pattern, no shading.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette, gentle
          diffused lighting, thin warm brown outlines rather than black, cozy and
          inviting mood, no harsh shadows, no neon or saturated colours. Soft
          two-tone shading with blended edges. NOT pixel art, NOT flat vector art
          with even line weight, NOT thick black cartoon linework, NOT a glossy
          3D render, NOT a photograph.

          [LAYOUT]
          Six different fish on one canvas, in three rows of two: top-left,
          top-right, middle-left, middle-right, bottom-left, bottom-right. Every
          fish is fully separated from every other by a wide band of empty
          background — no fish touches, overlaps or crowds another, and none
          touches the edge of the canvas.

          [POSE — every fish]
          Exact side view, facing LEFT: the head at the left of its own space and
          the tail at the right, level and horizontal as if swimming straight
          across. One calm friendly eye. Fins spread and clearly separate from the
          body, the dorsal fin standing up and the tail fan open. A gentle
          storybook fish, NOT a googly-eyed grinning cartoon.

          [TELL THEM APART]
          The last three fish are all big fast open-sea fish of a similar shape
          and two of them carry a long bill — they are the difficulty of this
          picture. Draw the named feature of each as the most obvious thing about
          it.

          [THE SIX FISH]
          Top-left — an Atlantic cod: THREE separate dorsal fins along its back, a
          single WHISKER-LIKE BARBEL hanging from its chin, a pale curved line
          along the flank, and mottled olive-brown colour.
          Top-right — a grouper: a heavy stocky fish with a very large mouth and a
          jutting lower jaw, a broad ROUNDED tail rather than a forked one, and
          soft dark blotches over a muted green-brown body.
          Middle-left — a unicornfish: a reef fish with a single HORN projecting
          forward from its forehead in front of the eye, a tall oval body flattened
          side to side, a small mouth, and soft dusty lilac-pink colour.
          Middle-right — a blue marlin: a long ROUND SPEAR-LIKE BILL, a tall
          pointed dorsal fin at the front of a long ridge, pale vertical bars down
          a cobalt-blue flank, slender pelvic fins beneath, and a stiff crescent
          tail.
          Bottom-left — a bluefin tuna: NO BILL AT ALL — a smooth pointed snout on
          a fat torpedo body, a metallic dark blue back, a silver belly, a row of
          small finlets before a stiff crescent tail, and short pectoral fins.
          Bottom-right — a swordfish: its bill is a LONG FLAT BROAD SWORD, not a
          round spear, it has ONE tall stiff crescent dorsal fin standing alone
          near the front and NO pelvic fins underneath at all, a very large eye,
          and a dark bronze-purple back.

          [CRITICAL: nothing but the fish]
          Draw NO water of any kind. No bubbles, no splash, no ripples, no waves,
          no weeds, no sand, no rocks, no coral, no bowl, no tank, no net, no
          hook, no fishing line, no scenery, no plants, no other animals. No drop
          shadow or reflection under any fish. No text, no labels, no names, no
          watermark, no border, no frame, no grid lines, no panel dividers between
          the fish.

          [CANVAS]
          The image is 1600 by 1200 pixels, aspect ratio 4:3 — wider than it is
          tall. Output as PNG.
Save as:  assets/Gemini_fish-ocean-deep.jpg
Wired in: `python3 tools/cut-fish.py ocean-deep` — already registered in SHEETS
```

**Sheet C — the muskie, alone**, in full. The game's capstone: the fish the
Muskie Master rank is awarded for, and the largest sprite in the game at 96
design px. One subject, the whole canvas.

```
ART NEEDED: R6 wave 3, sheet C — the muskellunge, the game's capstone
Prompt:   [WHAT THIS IS]
          A single game sprite of a fish, to be cut out and used in a children's
          video game. This is NOT a field guide, NOT a scientific specimen plate,
          NOT a museum illustration, NOT a poster. There is NO paper of any kind:
          no parchment, no aged paper, no paper texture, no canvas texture, no
          vignette, no border. There are NO captions, NO labels, NO species names,
          NO Latin names, NO handwriting and NO text anywhere in the image.

          [BACKDROP]
          The fish floats on a solid magenta screen, the way a subject stands in
          front of a photographer's backdrop. Every part of the image that is not
          the fish is one completely flat, even magenta #FF00FF, edge to edge and
          into all four corners: a single flat colour, no gradient, no texture,
          no vignette, no pattern, no shading.

          [STYLE]
          Soft painterly storybook illustration, warm muted color palette, gentle
          diffused lighting, thin warm brown outlines rather than black, cozy and
          inviting mood, no harsh shadows, no neon or saturated colours. Soft
          two-tone shading with blended edges. NOT pixel art, NOT flat vector art
          with even line weight, NOT thick black cartoon linework, NOT a glossy
          3D render, NOT a photograph.

          [LAYOUT]
          One single fish, centred, with a wide band of empty background on every
          side. It does not touch the edge of the canvas.

          [POSE]
          Exact side view, facing LEFT: the head at the left and the tail at the
          right, level and horizontal as if swimming straight across. One calm
          friendly eye. Fins spread and clearly separate from the body, the dorsal
          fin standing up and the tail fan open. A gentle storybook fish, NOT a
          googly-eyed grinning cartoon.

          [THE FISH]
          A muskellunge: a long lean freshwater predator with a flat duck-bill
          snout and a large jaw, its dorsal fin set far back near the tail, and a
          deeply forked tail. Its markings are the important part: DARK vertical
          bars and dark spots on a PALE flank. This is the opposite of a northern
          pike, which has PALE spots on a DARK flank — do not draw pale spots on a
          dark body. Soft muted olive and lilac-grey colour, a big calm eye, and
          the most detail of any fish in the set: this one is the prize.

          [CRITICAL: nothing but the fish]
          Draw NO water of any kind. No bubbles, no splash, no ripples, no waves,
          no weeds, no sand, no rocks, no bowl, no tank, no net, no hook, no
          fishing line, no scenery, no plants, no other animals. No drop shadow or
          reflection under the fish. No text, no labels, no names, no watermark,
          no border, no frame.

          [CANVAS]
          The image is 1600 by 800 pixels, aspect ratio 2:1 — twice as wide as it
          is tall. Output as PNG.
Save as:  assets/Gemini_fish-ocean-muskie.jpg
Wired in: `python3 tools/cut-fish.py ocean-muskie` — already registered in SHEETS
```

**When they land:** count components first (six, six, one) · nothing on a canvas
edge · cut, wire, `npm test` · then the two checks this wave exists for — **the
four silvers side by side at 54px with the names covered**, and **the muskie
against the Pond's pike**, which sit in different biome sections of the journal
but are the same fish shape. And **delete `fish-muskie.png` and its CSS rule**
when the muskie lands.

> **✅ All three landed, and the muskie closed R6 at 33 of 33 (2026-09-02).**
> Sheet C came back first attempt like the rest, and the check it exists for
> passes on sight: rendered beside the Pond's pike at their real 96 and 78px,
> the pike is pale spots on a dark teal flank and the muskie dark bars on a pale
> olive one. Inverting the pattern in the prompt was enough; the negative clause
> ("do not draw pale spots on a dark body") never had to carry it alone.
>
> The cut needed no new detector — 1 component, recomposite 0 px, peduncle found
> at 81% back with a 2.80x depth-to-fan ratio, seam overlap 7 px. **Nine sheets,
> nine deliveries, one reroll** across the whole milestone.
>
> `fish-muskie.png` and the `#scene.loc-ocean #fish:not(.rigged).tier-legendary`
> rule are both gone, and the three comments that described the muskie as a CSS
> special case (`config.js` placeholder, `app.js` `fishBox`/`renderFish`) now say
> what is true instead.

Same three-sheet shape as the Pond, in the two layouts sheets A–C proved: four
commons in a 2×2, then two rows of three. All three Pond sheets landed first
attempt, so the format is not the risk here.

**The risk is that five of these ten are salmonids** — rainbow trout, brown
trout, grayling, steelhead and Chinook salmon — and a **steelhead *is* a rainbow
trout**, the sea-run form of the same species. Add the Pond's brook trout and
the game has six trout-shaped fish. The Pond's bluegill-versus-pumpkinseed pair
was the rehearsal; this is the real thing, and the species clauses below spend
their weight on the field marks that separate them rather than on the shape they
share:

| species | what makes it itself, at 64–78px |
|---|---|
| rainbow trout | the **colourful** freshwater form: a bright rose band down the flank, heavy black speckling over back *and* tail |
| brown trout | buttery gold-brown, big dark spots each **ringed with a pale halo**, plus red-orange spots; a square, unspotted tail |
| grayling | separates itself by **silhouette** — an enormous sail-like dorsal fin, which is why it needs no colour argument |
| steelhead | the **chrome** form: silver flank with the rose band faint or gone, steel-blue back, sparser spots. Its clause names the contrast with the rainbow explicitly |
| Chinook salmon | **bigger and deeper-bodied**, olive-bronze, spots on the back and on *both* tail lobes, a slightly hooked jaw and a dark mouth |

**Rainbow and steelhead deliberately land on different sheets** (they fall that
way by rank), so the two hardest to separate are never drawn side by side and
have to be told apart in the collection grid instead — which is why the
steelhead's clause carries the comparison in words.

Two further collisions worth knowing before they bite:

- **The dace against the Pond's fathead minnow.** Both are small, plain and
  pale (`#a9c6cf` against `#9db7b8`). The dace's clause gives it a rosy blush at
  the cheek and fin bases and a crisper dark band; if it still reads as the same
  fish at 54px, that is a reroll of the dace, not a config tweak.
- **The dace against the chub**, which are both minnow-family. The chub gets a
  blunt heavy head and brassy-olive colour against the dace's slender silver.

**Check with the names covered, at game size, before accepting a sheet** — the
Pond proved that is the check that matters, and two bugs this milestone were
only ever visible in a rendered picture.

```
ART NEEDED: R6 wave 2, sheet A — the Stream's four common fish
Prompt:   [STYLE]
          Soft painterly storybook illustration, warm muted color palette, gentle
          diffused lighting, thin warm brown outlines rather than black, cozy and
          inviting mood, no harsh shadows, no neon or saturated colours. Soft
          two-tone shading with blended edges. NOT pixel art, NOT flat vector art
          with even line weight, NOT thick black cartoon linework, NOT a glossy
          3D render, NOT a photograph.

          [LAYOUT]
          Four different fish on one canvas, one in each quarter of the image:
          top-left, top-right, bottom-left, bottom-right. Every fish is fully
          separated from every other by a wide band of empty background — no fish
          touches, overlaps or crowds another, and none touches the edge of the
          canvas. Each fish is drawn at a comfortable size within its own quarter.

          [POSE — every fish]
          Exact side view, facing LEFT: the head at the left of its own quarter
          and the tail at the right, level and horizontal as if swimming straight
          across. One calm friendly eye. Fins spread and clearly separate from the
          body, the dorsal fin standing up and the tail fan open. A gentle
          storybook fish, NOT a googly-eyed grinning cartoon.

          [TELL THEM APART]
          These are four DIFFERENT species and the point of the picture is that a
          child could tell them apart. Draw the features named below as the most
          obvious thing about each fish. Do not draw four versions of the same
          fish in four colours.

          [THE FOUR FISH]
          Top-left — a common dace: a small slender silver-blue river fish with a
          crisp dark band running along the flank, a soft rosy blush at the cheek
          and at the base of the fins, and a small neat mouth.
          Top-right — a creek chub: a stockier fish with a noticeably blunt heavy
          head and a larger mouth, big visible scales, brassy olive-tan colour and
          a dark stripe along the side.
          Bottom-left — a three-spined stickleback: a tiny slim fish whose most
          obvious feature is THREE separate sharp spines standing up along its
          back where a dorsal fin would normally be, with bony plates along the
          side, olive-green above and a pale belly.
          Bottom-right — a river sculpin: a bottom-dwelling fish with a broad
          flattened head, a wide mouth, very large fan-shaped pectoral fins spread
          out to the sides, a body tapering to the tail, and mottled brown
          camouflage markings.

          [CRITICAL: nothing but the fish]
          Draw NO water of any kind. No bubbles, no splash, no ripples, no waves,
          no weeds, no sand, no rocks, no coral, no bowl, no tank, no net, no
          hook, no fishing line, no scenery, no plants, no other animals. No drop
          shadow or reflection under any fish. No text, no labels, no names, no
          watermark, no border, no frame, no grid lines, no panel dividers between
          the fish.

          [BACKDROP]
          Every part of the canvas that is not a fish is one completely flat, even
          magenta #FF00FF, edge to edge and into all four corners. A single flat
          colour: no gradient, no texture, no vignette, no pattern.

          [CANVAS]
          The image is 1600 by 1200 pixels, aspect ratio 4:3. Output as PNG.
Save as:  assets/Gemini_fish-stream-common.jpg
Size:     4:3, flat magenta backdrop, four separated subjects
Wired in: `python3 tools/cut-fish.py stream-common` — already registered in SHEETS
```

Sheets **B** and **C** are that prompt with the layout, the species and the
canvas swapped, exactly as the Pond's were: *"Three different fish on one canvas,
side by side in a single row: one on the left, one in the middle, one on the
right…"*, "its own third" in place of "its own quarter", and **1800 by 800
pixels, aspect ratio 2.25:1**.

```
          [THE THREE FISH — sheet B, the uncommons]
          Left — a rainbow trout: the colourful freshwater form. An olive-green
          back covered in small black speckles, a BRIGHT ROSE-PINK BAND running
          the length of the flank, a pale belly, and black speckling carried onto
          the tail fin as well as the back.
          Middle — a brown trout: buttery gold-brown along the flank, covered in
          large dark spots that are each RINGED WITH A PALE HALO, with a scatter
          of red-orange spots among them, and a squared-off tail that carries no
          spots at all.
          Right — an Arctic grayling: its most obvious feature by far is an
          ENORMOUS SAIL-LIKE DORSAL FIN standing tall along its back, far bigger
          than any other fin, softly spotted and edged. A small neat mouth, a
          slender body, and a silver flank with a faint lilac and blue sheen.

          [THE THREE FISH — sheet C, the rares]
          Left — a steelhead: this is a SEA-RUN RAINBOW TROUT and it must look
          different from a freshwater rainbow trout — CHROME SILVER along the
          whole flank with the pink band very faint or absent altogether, a
          steel-blue back, only sparse fine speckling, and a sleek streamlined
          body built for travelling.
          Middle — a Chinook salmon: the biggest and deepest-bodied fish on this
          canvas, olive-bronze along the back fading to a pale flank, black spots
          scattered over the back AND over BOTH lobes of the tail, with a slightly
          hooked lower jaw and a dark mouth line.
          Right — a channel catfish: unmistakable and nothing like the other two —
          smooth skin with no visible scales, LONG WHISKER-LIKE BARBELS around a
          wide flat mouth, a broad flattened head, a deeply FORKED tail, and a
          soft mottled grey-brown body.
```

**When they land, in this order:** count the components first (four, then three,
then three — a short count means two fish are touching and that is a reroll, not
a cut problem) · check nothing sits on a canvas edge · then cut, wire, and
**look at the collection screen with the names covered.** The pairs to stare at
are rainbow-versus-steelhead across sheets B and C, and dace-versus-chub within
sheet A — and the dace against the Pond's fathead minnow one row up.

Ten species, and **the first generation is an experiment as much as an asset.**
33 fish one at a time is 33 round trips; if four fish share a canvas and still
come back right, the whole roster is ~11. Nothing downstream cares which way it
goes — the cut splits a sheet into components and crops each one to its own box —
so the sheet is worth finding out about on the cheapest four fish in the game.

**Generate sheet A first and look at it before doing anything else.** If the four
fish are separate, side-on and in the same painting's style, do B and C the same
way. If they have merged, drifted apart in treatment, or come back at wildly
different sizes, drop to one fish per canvas using the same species clauses —
they are written to work either way.

Three sheets, in rank order, so the Pond can ship in stages if the sheet fails:

| sheet | fish | canvas |
|---|---|---|
| **A** | bluegill · perch · minnow · pumpkinseed (the four commons) | 1600×1200, 4:3 |
| **B** | carp · bass · trout (the three uncommons) | 1600×1200, 4:3 |
| **C** | pike · walleye · koi (two rares and the legendary) | 1600×1200, 4:3 |

**Why one fish per canvas is still the fallback and not the plan:** a fish is a
single small subject with no composition to get wrong, which is the case where
the generator's compositional prior — the thing `GEMINI_NOTES.md` says never
moves — has nothing to push against. The risk on a sheet is *consistency between
subjects*, and that is the one thing a sheet is better at than four separate
generations.

```
ART NEEDED: R6 wave 1, sheet A — the Pond's four common fish
Prompt:   [STYLE]
          Soft painterly storybook illustration, warm muted color palette, gentle
          diffused lighting, thin warm brown outlines rather than black, cozy and
          inviting mood, no harsh shadows, no neon or saturated colours. Soft
          two-tone shading with blended edges. NOT pixel art, NOT flat vector art
          with even line weight, NOT thick black cartoon linework, NOT a glossy
          3D render, NOT a photograph.

          [LAYOUT]
          Four different fish on one canvas, one in each quarter of the image:
          top-left, top-right, bottom-left, bottom-right. Every fish is fully
          separated from every other by a wide band of empty background — no fish
          touches, overlaps or crowds another, and none touches the edge of the
          canvas. Each fish is drawn at a comfortable size within its own quarter.

          [POSE — every fish]
          Exact side view, facing LEFT: the head at the left of its own quarter
          and the tail at the right, level and horizontal as if swimming straight
          across. One calm friendly eye. Mouth closed. Fins spread and clearly
          separate from the body, the dorsal fin standing up and the tail fan
          open. A gentle storybook fish, NOT a googly-eyed grinning cartoon.

          [THE FOUR FISH]
          Top-left — a bluegill: a deep, round, plate-shaped little sunfish, olive
          back fading to a pale sage belly, faint darker vertical bars, a small
          dark spot at the rear edge of the gill cover, a small mouth. Overall a
          muted sage green.
          Top-right — a yellow perch: a rounder-backed fish with six or seven bold
          dark vertical bars over a brassy tan flank, two dorsal fins with the
          front one spiny, and muted amber lower fins.
          Bottom-left — a fathead minnow: a very small plain fish, blunt rounded
          snout, a soft dusky stripe along the flank, small simple fins. Overall a
          pale grey-teal.
          Bottom-right — a pumpkinseed sunfish: the same deep round plate shape as
          the bluegill but freckled — soft orange-gold flecks over olive, a few
          wavy blue-green lines on the cheek, a warm muted ember edge to the gill
          flap. Overall a warm tan.

          [CRITICAL: nothing but the fish]
          Draw NO water of any kind. No bubbles, no splash, no ripples, no waves,
          no weeds, no sand, no rocks, no coral, no bowl, no tank, no net, no
          hook, no fishing line, no scenery, no plants, no other animals. No drop
          shadow or reflection under any fish. No text, no labels, no names, no
          watermark, no border, no frame, no grid lines, no panel dividers between
          the fish.

          [BACKDROP]
          Every part of the canvas that is not a fish is one completely flat, even
          magenta #FF00FF, edge to edge and into all four corners. A single flat
          colour: no gradient, no texture, no vignette, no pattern.

          [CANVAS]
          The image is 1600 by 1200 pixels, aspect ratio 4:3. Output as PNG.
Save as:  assets/Gemini_fish-pond-common.png (the raw sheet — the cut writes the
          final names from it)
Size:     1600×1200, flat magenta backdrop, four separated subjects
Wired in: not yet — `tools/cut-fish.py` (to be written against this sheet) splits
          it and writes assets/fish-<id>-body.png + fish-<id>-tail.png per species,
          then prints the CONFIG.fish.species block. Nothing renders until that
          block exists; until then all four keep the tier placeholder, on purpose.
```

Sheets **B** and **C** are the same prompt with three blocks swapped: the layout,
the species, and the canvas. **A row of three gets a 2.25:1 canvas rather than
4:3**, so each fish still lands ~600px wide instead of being squeezed into a
narrow column — ratios are the most reliable instruction the generator takes
(`GEMINI_NOTES.md`), and the pixel count does not matter downstream because a
species' length comes from its rank.

```
          [LAYOUT]
          Three different fish on one canvas, side by side in a single row: one
          on the left, one in the middle, one on the right. Every fish is fully
          separated from the others by a wide band of empty background — no fish
          touches, overlaps or crowds another, and none touches the edge of the
          canvas. Each fish is drawn as large as it comfortably can be within its
          own third.

          [POSE — every fish]
          ... unchanged from sheet A, except "its own quarter" becomes "its own
          third" ...

          [CANVAS]
          The image is 1800 by 800 pixels, aspect ratio 2.25:1. Output as PNG.
```

Save as `assets/Gemini_fish-pond-uncommon.jpg` (B) and
`assets/Gemini_fish-pond-rare.jpg` (C), then add each to `SHEETS` in
`tools/cut-fish.py` with `layout={"left": ..., "middle": ..., "right": ...}`.
**Both sheets are already in the tool's `SHEETS` table**, so cutting them is one
command once the file is saved. It names species in *reading order* and finds the
rows itself, which is why a 2×2 sheet and a row of three need no different
handling.

The species clauses:

```
          [THE THREE FISH — sheet B]
          Left — a common carp: a heavy, deep-bodied fish with large soft scales,
          a blunt rounded head, two short barbels at the corners of the mouth and
          a long dorsal fin running well down the back. Overall a warm muted
          bronze-brown.
          Middle — a largemouth bass: a long, strong fish with a notably big mouth
          reaching back past the eye, a dark ragged horizontal stripe broken along
          the flank, olive-green back and a pale belly.
          Right — a brook trout: a smooth torpedo shape with a squared-off tail, a
          dark olive back marked with pale wavy worm-like lines, scattered pale
          and soft rose spots down the flank, and cream-edged lower fins. Overall a
          muted rose.

          [THE THREE FISH — sheet C]
          Left — a northern pike: long and lean with a flat duck-bill snout and a
          large jaw, rows of pale bean-shaped spots over a darker flank, and the
          dorsal fin set far back close to the tail. Overall a muted teal-blue.
          Middle — a walleye: long-bodied with a large glassy pale eye, a brassy
          gold flank softly mottled with darker olive, two dorsal fins, and a
          cream-white tip on the lower lobe of the tail.
          Right — a golden koi: plump and round-bellied with long flowing fins and
          a wide flowing tail, large soft scales and two short barbels. Pale soft
          gold with a few cream and warm ember patches. This one is the Pond's
          legendary and it renders the largest of the ten — give it the most
          detail on the sheet.
```

**When they land, in this order** (the checklist in `GEMINI_NOTES.md`, with the
fish-specific ones first because they are the reroll-forcing kind):

1. **Magenta bled into a fin?** Fins are thin and semi-transparent in painterly
   art, which is the case `cut-vessel.py`'s `unmix` alpha model was written for
   (`GEMINI_NOTES.md`, "when the subject is see-through"). Bleed *into a solid
   flank* is still a reroll; a magenta-tinted fin edge is probably not, and the
   tool decides which model to use per sheet.
2. **Does each fish face LEFT?** The line attaches at the mouth
   (`drawFish()` in `app.js`), and every reeling coordinate in the game assumes
   the head leads. A mirrored fish is a flip in the cut, not a reroll.
3. **Are the four separable?** Flood the backdrop and count connected components:
   four fish must be four. Two fish sharing a fin tip is a cut problem, not a
   reroll — but three components where there should be four is.
4. **Species read.** Cover the names and see whether the bluegill and the
   pumpkinseed are telling themselves apart. They are the closest pair in the
   Pond, and if a sheet cannot separate those two it will not separate the
   Stream's four trout either.
5. Then key, cut, and composite at game scale before wiring anything.

**Do not scale a fish from its painting.** The generator draws every subject to
fill its frame, so a minnow and a pike come back the same length — the same trap
`GEMINI_NOTES.md` records for the standing and seated anglers. A species' length
is decided by rank in `BUILD_PLAN_REFRESH.md` R6 (54 / 64 / 78 / 96 design px),
and the cut tool scales each painting to it.

**How the cut will work, so it is not re-derived:** the split is at the **caudal
peduncle**, the narrowest vertical section of any fish, found the way
`cut-vessel.py` finds a sheer — walk the rear third of the fish column by column,
count opaque pixels, and take the minimum. Everything right of it is the tail
layer, everything left is the body, both cropped to the *shared* bbox so they
register by construction. The pivot the tail sweeps about is the midpoint of that
section, and the mouth the line attaches to is the leftmost opaque column at its
own vertical centre. All three numbers are measured, not tuned.

### R5 debt — the four shop hulls (open — the only art R5 still owes)

`shop.boats` sells five rowboats and only one of them exists in the new style.
Both painted vessels are `skinnable: false`, so **buying and equipping a hull
changes nothing at any spot** — a shop item that has quietly stopped working.
The Whaler is not part of this and never will be: rowboat paint does not go on a
Boston Whaler, and `skinnable` is how the pose says so.

**Do not prompt these from scratch.** Four fresh rowboats would be four
different boats — a different sheer, a different crop, a different length — and
the vessel box (`x/y/w/h`) belongs to the *pose*, not the skin, so they would
each land somewhere slightly different under the same kid. This is the
same-canvas rule again: **generate from the delivered painting as a reference so
they register by construction**, then cut each with `boat-pond`'s own anchors,
which stay correct because the hull has not moved.

```
ART NEEDED: four repaints of the Pond rowboat (red / blue / green / purple)
Reference: assets/boat-pond.png — attach it, and ask for the SAME painting back
Prompt:   Repaint this exact rowboat in <COLOUR>. Keep everything else identical:
          the same boat at the same size in the same place on the same canvas,
          the same viewing angle, the same thwarts, the same shading and brush
          texture, the same warm brown outlines, the same flat magenta backdrop.
          Change only the colour of the hull planking and the gunwale rail: paint
          them a soft, muted <COLOUR> as if the timber were painted, keeping the
          existing light and shadow — a warm muted storybook colour, not a bright
          or saturated one, and no neon.
          Leave the thwarts and the boat's interior as bare warm timber.
          No water, no person, no scenery, no text, no watermark.
          Return the image at the same 1536 by 640 pixels. Output as PNG.
   <COLOUR> per skin, from ART.md's palette:
          red    → a soft weathered barn red      (shop id `red`,    Red Rover)
          blue   → a muted dusty slate blue       (shop id `blue`,   Blue Bayou)
          green  → a soft sage/lily-pad green     (shop id `leaf`,   Lily Pad)
          purple → a dusty muted heather purple   (shop id `purple`, Purple Reign)
Save as:  assets/boat-red.png, boat-blue.png, boat-leaf.png, boat-purple.png
          (overwriting the pixel-era files, whose names shop.boats already uses)
Wired in: not yet — cut each with `python3 tools/cut-vessel.py boat-pond <file>`
          after pointing its output name at the skin, then flip
          CONFIG.rig.poses.pond.vessel.skinnable back to true.
```

**Check registration before anything else when they land:** composite each
repaint against `boat-pond.png` and look at where the hull's edges fall. If a
skin's sheer has moved more than a pixel or two, the shared anchors stop being
shared and this becomes four cut entries instead of one — reroll rather than
carry that.

**The cheaper alternative, if the rerolls fight back:** tint the existing painted
layers in CSS — a `filter: hue-rotate()` + `saturate()` on `.vessel` driven by a
per-skin class needs no art at all, and a painted hull is exactly the kind of
flat colour shift a filter does well. It would tint the thwarts along with the
planking, which is the reason to try the repaints first, not a reason to rule it
out. Worth ten minutes before spending four generations.

### ✅ R5 — the two vessels (landed and wired 2026-09-01)

The Stream needs none: that angler stands in the water. So R5 is **two
paintings**, and the code to receive them is already on `main` — a pose owns its
vessel, its anchor and whether it rocks, so dropping these in is filenames and
measured numbers rather than new machinery.

**One painting per vessel, cut into two layers locally.** Same rule that made R4
work: *don't generate a piece you could cut.* A side-on boat already contains
both halves — everything above the near gunwale is what paints **behind** the
angler, and the near hull side is what paints **in front** of them. Asking for
two images that have to register would be inventing a registration problem the
cut does not have. `tools/cut-angler.py` is the model; the vessel cut is simpler,
one curve along the gunwale.

**Draw the whole hull, including below the waterline, and no water.** `#surface`
is a translucent front plane that tints whatever sits in it — that is how the
boat reads as floating rather than pasted on. Water painted into the art would
double up, the same mistake the Stream angler's baked-in fishing line was.

```
ART NEEDED: the Pond rowboat — one painting, cut into far and near halves
Prompt:   Soft painterly storybook illustration in the style of Studio Ghibli,
          warm muted color palette, gentle diffused lighting, thin warm brown
          outlines rather than black, cozy and inviting mood, no harsh shadows,
          no neon or saturated colors. Soft two-tone shading with the edges
          between tones blended, and soft brush texture visible inside the
          larger shapes. NOT pixel art, NOT flat vector art with even line
          weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A small wooden rowboat seen directly from the side, EMPTY, floating
          level, bow pointing to the RIGHT. Warm weathered timber in soft browns
          with a slightly darker waterline stripe along the hull. Simple clinker
          planking, a gently curved sheer, and TWO PLAIN WOODEN THWARTS (bench
          seats) visible inside — a child sits between them.
          Draw the WHOLE hull including the part that would be underwater: it
          floats in the game's own painted water, which is a translucent layer
          over the top.
          IMPORTANT: the NEAR side of the hull — the gunwale rail nearest the
          viewer and the planking below it — must be clearly readable as its own
          band, with an unbroken top edge running the length of the boat. That
          edge is where the painting is cut in two.
          No water, no waves, no reflection, no oars in the water, no person, no
          fish, no rope, no scenery, no other boats.
          The boat fills the frame edge to edge with a little clearance at the
          top and bottom.
          Everything that is not the boat must be flat, solid, uniform magenta
          (#FF00FF): a plain backdrop colour, not a checkerboard, not a gradient,
          not transparency. No magenta anywhere on the boat.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1536 by 640 pixels, aspect ratio 2.4:1. Output as PNG.
Save as:  assets/boat-pond.png   (the source painting — the cut layers are
          boat-pond-far.png and boat-pond-near.png)
Wired in: ✅ CONFIG.rig.poses.pond.vessel
```

**✅ Landed first attempt 2026-09-01, and it is the cleanest delivery of the
epic.** Canvas 1600×656 at aspect 2.439 against 2.4 asked; backdrop key
`(254,55,253)` at stdev under 3, the flattest magenta yet; residue in the subject
**stops entirely at 6px** with no enclosed pocket; and **0.000%** of it falls
below the umber floor, minimum luminance 42.

**The cut is exact.** Recompositing far + near against the delivered painting
leaves **0 px of 490,319 different** — not "sub-pixel", identical. A cut along a
detected line is lossless in a way a generated pair never could be, which is the
whole argument for one painting rather than two.

**The sheer is found, not traced**, which is what `tools/cut-vessel.py` exists
for. Reading it by eye failed first: the candidate polyline ran ~25px high and
crossed the thwarts — and a thwart's near end *is* the sheer. The detector uses
what the painting actually gives, that the rail is a lighter band with a darker
line above it, so per column it takes the brightest row in a window and walks up
to where the brightness falls away, then fits a 4th-order curve because a sheer
is a fair line and the fit removes jitter where a plank seam crosses it.
**1,506 columns, residual mean 1.8px.**

**One visible regression, worth knowing about:** the Pond vessel is
`skinnable: false` now, and so is the Whaler — so **equipping a boat skin does
nothing anywhere**. It is a shop item that has stopped changing anything, which
is the one piece of R5 debt carried forward; see the open request below.

```
ART NEEDED: the Ocean's Boston Whaler — one painting, cut into far and near
Prompt:   Soft painterly storybook illustration in the style of Studio Ghibli,
          warm muted color palette, gentle diffused lighting, thin warm brown
          outlines rather than black, cozy and inviting mood, no harsh shadows,
          no neon or saturated colors. Soft two-tone shading with the edges
          between tones blended, and soft brush texture visible inside the
          larger shapes. NOT pixel art, NOT flat vector art with even line
          weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A small centre-console sport fishing boat — a Boston Whaler — seen
          directly from the side, EMPTY, floating level, bow pointing to the
          RIGHT. Cream and soft grey hull with a warm teak rubbing strake, a
          low centre console with a small windscreen in the middle, and A
          PEDESTAL FIGHTING CHAIR IN THE STERN, which is the LEFT end of the
          boat: a simple raised seat on a post, with a low back and footrest,
          facing right along the boat.
          Draw the WHOLE hull including the part that would be underwater: it
          floats in the game's own painted water, which is a translucent layer
          over the top.
          IMPORTANT: the NEAR side of the hull — the gunwale rail nearest the
          viewer and the topsides below it — must be clearly readable as its own
          band, with an unbroken top edge running the length of the boat. That
          edge is where the painting is cut in two.
          No water, no waves, no reflection, no person, no fish, no rods, no
          outboard motor spray, no scenery, no other boats.
          The boat fills the frame edge to edge with a little clearance at the
          top and bottom.
          Everything that is not the boat must be flat, solid, uniform magenta
          (#FF00FF): a plain backdrop colour, not a checkerboard, not a gradient,
          not transparency. No magenta anywhere on the boat.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1536 by 640 pixels, aspect ratio 2.4:1. Output as PNG.
Save as:  assets/boat-ocean.png   (the cut layers are boat-ocean-far.png and
          boat-ocean-near.png)
Wired in: ✅ CONFIG.rig.poses.ocean.vessel, which stopped being `skinnable` at
          the same time: rowboat skins have no business on a Whaler.
```

**✅ Landed first attempt 2026-09-01**, and it measures like the rowboat: canvas
1600×656 at aspect 2.439 against 2.4 asked, backdrop key `(253,53,249)` at stdev
under 3.1, residue in the subject **stopping at 10px**, and **0.000%** of it
below the umber floor (minimum luminance 53). The cut is exact again — **0 px of
496,473 differ** on recomposite. The near gunwale came back unbroken along the
whole length, which is the one property the cut depends on, and the console and
the chair both sit clear above it.

**Its windscreen is glass, and the generator painted the backdrop through it** —
a violet panel, because that is what magenta looks like through pale glass. The
alpha ramp reads that as an opaque violet and paints a purple blob on a cream
boat. `cut-vessel.py` now carries a second alpha model for it, taking alpha from
how much key a pixel *carries* rather than how far it sits from it; the glass
comes out pale grey at 70% and shows the sky through it in the game. The full
recipe, and when to reach for it, is in `GEMINI_NOTES.md`.

**Seating the Ocean angler was a wiring step, not a prompt one**, and this is the
worked example of it. The chair landed where it landed; the pose met it with the
two knobs it carries. Measured off the painting, the chair's seat pan is 326,122
into the 1510×465 crop, so `vessel.x/y` put that pan under the kid's hips — and
then `anchor.y` dropped to 144 so the waterline the painting carries in its own
paint (the cool grey under the cream topsides, 85% down) lands on the scene's
y=198. **The whole rig rides 24px higher than the other two poses, and that is
the chair's doing, not the kid's:** a fighting chair is a raised seat, so he sits
above the gunwale with his feet braced on the console step. The near hull never
overlaps him, and that is correct here — unlike the rowboat, where it crosses his
shins. No reroll was spent on any of it.

### ✅ R4 — the Ocean angler, in the fighting chair (landed and wired 2026-09-01)

Third and last pose. The Pond and Stream are cut and wired; when this lands and
is cut, **R4's done-when is met** and the epic moves to R5.

**Seated again, like the Pond — but nothing carries over.** Each pose's cut
parameters are measured off its own painting (`tools/cut-angler.py`, `POSES`),
and the two seated poses are not the same seat: the Pond kid sits low with knees
drawn up in a rowboat, this one sits *back* in a fighting chair with feet braced.

**The rod is The Deep Endeavor** — the gate rod for this spot, per the naming
rule near the top of this file. A heavy boat rod: thicker, shorter in proportion,
with a big reel. Not a cane pole and not the Stream's split cane.

**Two asks carried forward, because both were paid for:**

- **The arm held clear of the body.** This is what made the Stream's arm cut
  clean, and a seated-back figure has no drawn-up knee to hide the upper arm the
  way the Pond's did.
- **A flagged, exhaustive no-line paragraph.** A plain "no fishing line" was
  ignored on the Stream's first attempt because a rod implies a line; the
  `CRITICAL:` paragraph naming every form it could take is what worked.

```
ART NEEDED: the Ocean angler, in the fighting chair — one image, cut locally
Prompt:   Soft painterly storybook character illustration in the style of
          Studio Ghibli, warm muted color palette, gentle diffused lighting,
          thin warm brown outlines rather than black, cozy and inviting mood,
          no harsh shadows, no neon or saturated colors. Soft two-tone shading
          with the edges between tones blended, and soft brush texture visible
          inside the larger shapes. NOT pixel art, NOT flat vector art with even
          line weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A school-age child of about eight, seen from the side, facing right,
          SEATED and leaning back as if braced in a boat's fighting chair: hips
          low, back reclined, both feet planted forward and braced, knees bent
          and apart — a bracing posture, NOT curled up. Slim school-age
          proportions with a visible neck, long limbs and slender fingers — NOT
          a toddler, NOT a baby. Bare head with short but full, softly tousled
          warm-brown hair that covers the ears and falls in a soft fringe — NOT
          a buzz cut. Warm tan skin, soft rounded cheeks. Deep-sea fishing
          clothes: a cream long-sleeved shirt, navy-grey shorts, simple deck
          shoes, and a soft terracotta buoyancy vest with broad straps over the
          chest.
          The child is HOLDING A HEAVY BOAT ROD IN THE NEAR HAND ONLY: a thick
          tapered pole in deep warm brown with a broad pale cork grip and a
          large round dark-bronze reel mounted on top just above the grip. It is
          a stout deep-sea rod, noticeably thicker than a garden cane. The near
          arm is bent at the elbow with the forearm angled up and forward, and
          the near hand holds the cork grip at about chin height, below the reel.
          From that hand the rod runs diagonally up and to the right, passing
          well clear of the child's head, its tip reaching the upper-right corner
          of the canvas.
          CRITICAL: draw NO FISHING LINE anywhere. No thread, string or filament
          of any kind — not on the reel, not threaded through the guides, not
          trailing from the rod tip. The rod must be completely bare.
          IMPORTANT: the whole near arm must be held CLEAR OF THE BODY, with a
          visible gap of background between the arm and the chest along its
          entire length — the shoulder, upper arm, elbow and forearm all fully
          visible and not overlapping the torso.
          The FAR arm rests along the child's far thigh, out of the way of the
          rod.
          The hand on the rod must read as genuinely gripping it, seen from the
          side: the fingers wrap around the cork and the separate fingers are
          visible crossing in FRONT of the grip, with the thumb behind or
          alongside them. NOT a pinch, NOT fingertips touching, NOT an open or
          reaching hand.
          No hook, no fish, no hat, no chair, no boat, no water, no scenery, no
          other characters — the child alone, as if seated on nothing.
          The child sits in the lower-left of the canvas with the shoes near the
          bottom edge, leaving the upper-right clear for the rod.
          Everything that is not the child and the rod must be flat, solid,
          uniform magenta (#FF00FF): a plain backdrop colour, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere on
          the child or the rod.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1024 by 1024 pixels, aspect ratio 1:1. Output as PNG.
Save as:  assets/angler-ocean.png   (the source painting — the cut layers are
          angler-ocean-body.png, angler-ocean-arm.png, rod-deepsea-ocean.png)
Wired in: not yet — a new CONFIG.rig.poses.ocean block. Until it exists the
          Ocean wears the Pond kid through the pose fallback.
```

**Note the "no chair".** The fighting chair is a *vessel* part and belongs to
R5, which draws each vessel with a near-side layer painted in front of the
angler. Asking for it here would bake it into the body layer and R5 could not
put the kid down into it. The pose has to read as braced without the chair being
drawn — hence the posture described at length.

**✅ Landed first attempt — the only pose that did.** Everything the first two
cost was already priced into the prompt: the arm came back clear of the body,
the rod came back bare, the hair matched, and the posture read as braced without
a chair to sit in.

Two measurements worth keeping. The **rod axis fitted with a maximum residual of
0.9px over 47 samples** — the cleanest of the three, because a stout boat rod
gives the fit more to work with than a fly rod does. And the **4,123px enclosed
magenta pocket** between the forearm and the thigh is not contamination but the
arm-clear-of-the-body instruction working exactly as asked; the flood seeds it
like any other silhouette hole.

**It is the first pose whose arm bends visibly enough to need two segments.** The
Pond hides its upper arm behind the drawn-up knee and the Stream hides its behind
the vest, so a single capsule sufficed for both; here the shoulder, elbow and
forearm are all in view. `tools/cut-angler.py`'s arm block now takes an optional
`elbow`.

**The head match held up as a method.** Measured consistently — the widest row in
the top 20% of the figure — the three heads come to 318 / 217 / 315 source px,
giving 50 / 75 / 51 design px. Two seated poses landing within a design pixel of
each other is the check that the method is measuring the child rather than the
frame.

Recomposite rod → arm → body against the delivered painting: **293px differ by
more than 10, of 302,351 (0.097%)** — twice the other two poses' rate, all of it
along the reel's edge and the rod's synthesis seam, and sub-pixel at sprite
scale.

Verified in Chromium at the Ocean: correct layers, no failed asset requests, the
line leaves the rod tip at design **(130.2, 122.8)** against a predicted
(129, 120), and the arm swings **−5.25° to +6.31°** with the tip-to-line gap
peaking at **0.19px**.

**The rod needed one fix after wiring, and it was the tool's fault, not the
generation's.** The shaft showed a visible step where the synthesised extension
began, then a long needle taper — it read as a spear. The extension was seeded
from the pose's *nominal* `half`, which is measured lower down where the shaft is
fatter, so it started wider than the shaft it was continuing. All three rods had
it: nominal 16/15/22 px against real seam widths of **11.5/6.0/15.5**, the
Stream's being the worst. `tools/cut-angler.py` now measures the alpha at the
seam and tapers from that, back-loaded (`k**1.6`) so the shaft stays full through
the middle and thins near the tip. All three rods were re-cut.

**Known and deliberately not tuned:** the angler reads as sitting *on* the pixel
rowboat's gunwale rather than down in it. A reclined, legs-forward pose does not
fit a rowboat — it fits the Boston Whaler's fighting chair that R5 draws. Tuning
placement against art that is about to be replaced would be wasted.

### ✅ R4 — the Pond angler, one generation (landed and wired 2026-09-01)

**First character request of the refresh.** It replaces `body-kid.png` /
`hat-straw.png` / `rod-basic.png`, which are pixel-era and were cut for a
body/hat/rod split the direction has since revised.

**Pond only, deliberately.** R3's one-level-at-a-time discipline is what kept a
framing miss down to three prompts instead of nine. The Stream and Ocean
costumes are this same prompt with the clothes swapped, so nothing is lost by
waiting until the Pond pose is cut, wired and judged at 1x.

#### It took three attempts, and the third changed the method

The plan started as three generations — the child with an empty open hand as a
reference, then a rod and a fingers overlay drawn onto it. **That plan was
wrong, and two rerolls proved it.**

| attempt | what came back |
|---|---|
| 1 | a well-keyed **toddler** reaching with a flat splayed palm |
| 2 | the right child, but the hand was a **pincer in the wrong plane** — the fingers curled within the picture plane, so the tube they formed pointed at the viewer, not up the rod |
| 3 ✅ | the child **holding an actual rod**, gripped properly |

The lesson is `GEMINI_NOTES.md`'s own rule one level down: **the subject carries
more weight than any qualifier attached to it.** A hand gripping *nothing* is a
hand gripping nothing, however carefully the grip is described — two rerolls of
increasingly precise anatomical language produced two different wrong gestures.
Give the generator the object and it draws the grip correctly first time.

So **the pose is one generation, not three.** That is the local-cut rule
(*"don't generate a piece you could cut"*, above) pushed to its conclusion: the
rod and the arm are both cut out of the delivered painting, and registration is
exact because it is the same pixels.

#### What the delivered image made unnecessary

**There is no fingers layer.** The grip sandwich exists so a swapped shop rod
looks held, and it assumed the fingers had to be a separate top layer. They
don't: in the delivered art the whole visible hand is painted **in front of**
the rod, so painting the arm over the rod does the same job. A swapped rod (R7)
still slides underneath it.

That is lucky as well as simpler, because the fingers could not have been keyed
out: finger skin is `(210,167,132)` and the rod's lit side is `(206,155,102)`,
**33 RGB apart**, so a fingers layer would have meant tracing four contours by
hand.

Paint order for the pose is therefore **body → rod → arm (hand included) → hat**,
and there are two cuts, not three.

```
ART NEEDED: the Pond angler, holding the rod — one image, cut locally into three
Prompt:   Soft painterly storybook character illustration in the style of
          Studio Ghibli, warm muted color palette, gentle diffused lighting,
          thin warm brown outlines rather than black, cozy and inviting mood,
          no harsh shadows, no neon or saturated colors. Soft two-tone shading
          with the edges between tones blended, and soft brush texture visible
          inside the larger shapes. NOT pixel art, NOT flat vector art with even
          line weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A school-age child of about eight, seen from the side, facing right,
          seated low as if in a small rowboat: knees drawn up, back gently
          rounded, a calm contented expression. Slim school-age proportions with
          a visible neck, long limbs and slender fingers — NOT a toddler, NOT a
          baby. Bare head, short warm-brown hair, warm tan skin. Cozy pond
          fishing clothes — a soft terracotta long-sleeved shirt, warm
          oat-coloured shorts, simple brown shoes.
          The child is HOLDING A FISHING ROD: a slender tapered pole of warm
          brown wood with a darker wrapped grip at its thick end. The far arm
          rests on the knee. The near arm is bent at the elbow with the forearm
          angled up and forward, and the near hand holds the rod's grip at about
          chin height. From that hand the pole runs diagonally up and to the
          right, passing well clear of the child's head, its thin tip reaching
          the upper-right corner of the canvas.
          The hand must read as genuinely gripping the pole, seen from the side:
          the fingers wrap around the grip and the separate fingers are visible
          crossing in FRONT of the pole, with the thumb behind or alongside
          them. NOT a pinch, NOT fingertips touching, NOT an open or reaching
          hand, NOT a hand held near the rod without closing on it.
          No fishing line, no hook, no reel, no fish, no hat, no boat, no water,
          no scenery, no other characters.
          The child's back is near the left edge and the shoes are near the
          bottom edge.
          Everything that is not the child and the rod must be flat, solid,
          uniform magenta (#FF00FF): a plain backdrop colour, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere on
          the child or the rod.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1024 by 1024 pixels, aspect ratio 1:1. Output as PNG.
Save as:  assets/angler-pond.png   (the source painting — the cut layers are
          angler-pond-body.png, angler-pond-arm.png and rod-stick-pond.png)
Size:     1024×1024 (1:1), delivered on flat magenta.
Wired in: not yet — CONFIG.rig.poses.pond.layers
```

**✅ Delivered, cut and wired 2026-09-01, third attempt.** Cut from the JPEG the
chat carried rather than waiting for a PNG, because the codec turned out not to
be the limiting factor: a deliberately brutal q30 re-encode of the delivered
file differs from it by a mean of **1.72 / 255** at sprite scale, where the art
renders at about an eighth of its canvas. The delivered file is around q88.

Measured on delivery: canvas exactly 1024×1024 at 1:1; backdrop residue in the
subject is **rim only** (7,088px at 0–2 from the edge, 3 at 6–8, none past 8,
and no enclosed pocket); darks sit above the umber floor at the 1st percentile.
One oddity worth recording: the backdrop arrived at key `(248,87,243)` with a
blue stdev of **14.6**, where the two earlier generations were under 2.5 — the
first time the magenta has not been dead flat. It floods fine at tolerance 90.

**The cut is scripted: `tools/cut-angler.py`.** Re-run it against any
better source and the layers regenerate. It is an art-pipeline tool, not a build
step — nothing loads it at runtime.

**What came out, and the two things the art decided for us:**

- **The rod paints BEHIND the body.** The hand is drawn in front of the pole and
  the butt tucks behind the knee, so `layers` is `[rod, body]`. Compositing them
  in that order reproduces the delivered painting **pixel for pixel** (mean diff
  0.00, max 0), which is the check that the split is lossless.
- **There is no hat layer.** The angler is bare-headed on purpose so R7 can draw
  hats against this pose; the old pixel `hat-straw` would not match it.

The rod's occluded stretch — where the hand covers it — is synthesised from the
cross-section just above the hand. It is never seen, because the rod paints
behind.

**The rod is also EXTENDED, and the first attempt at this got it backwards.**
The delivered painting ran the shaft off the top-right corner, so the *canvas*
decided the rod's length rather than the drawing. Reading that as a defect and
tapering the tip inward made a rod that was already too short shorter still: it
came out at **33.3 design px, 51% of the old browser-tuned rig's 65.1**, and it
read stubby on screen. Of the 32px missing, the taper cost 4.2 and the canvas
clipping cost 27.5 — so the fix was never un-tapering, it was extension.

`tools/cut-angler.py` now pads the canvas and walks the shaft out along its
own axis to a length **set in design px** (`ROD_LEN = 65.0`, the same 130% of the
kid's height the old rig had), resampling the real cross-section so the outline
tapers with it. 42% of the visible rod is synthesised, and it is invisible for
the same reason the occluded stretch is: a straight shaft is featureless content
with no recognisable form to violate. **Retuning the rod is now one number in
that script**, not a reroll and not a hand edit.

The general lesson, which is in `GEMINI_NOTES.md`: a subject that runs off the
canvas has been *cropped by the frame*, and the frame is not a design decision.
Ask what length the thing should be, then extend to it.

**The numbers, measured off the canvas rather than tuned in the browser:** both
layers share one 1222×1331 canvas at rig `x 39, y −44, w 70, h 76`, with
`rodPivot (65, 5)` and `lineOrigin (108, −44)` — 65.0 design px apart at 48.0°,
which is the angle the rod is actually painted at. Verified in Chromium past the
profile picker: the line leaves the rod tip at design **(127.3, 124.0)** against
a predicted (128, 124), the 0.7px being the boat's bob, and reaches the bobber.

**Two data tests had to change**, and both were encoding assumptions from the G1
art rather than real invariants:

- *body paints first* is not a rule — paint order is a property of the art, and
  here the rod is behind. The test now requires a body layer and a rod layer to
  exist, without fixing their order.
- *the grip and the tip are corners of the rod's box* was true when the rod had
  its own tight canvas running corner to corner. Under the same-canvas rule the
  rod's box is the whole pose and the rod crosses it diagonally, so the test is
  now containment plus a direction check (tip up and to the right of the grip),
  which keeps the original intent: an R7 rod swapped in with a different box must
  move these with it, or the line detaches from a rod that is visibly swinging.

**✅ The arm layer landed too, and the anatomy decided where it pivots.** The
plan said "cut the arm at the shoulder". Overlaying a candidate mask showed why
that was wrong: what looked like a shoulder is the **chin and neck**, and the
angler's upper arm and elbow are **hidden behind the drawn-up knee**. The
visible limb is forearm and hand only, emerging from behind it — so there is no
shoulder cut through the torso at all, and no filling the shirt behind one.

It pivots where the forearm vanishes, which is the useful property: the cut end
sits *at* the pivot, so it does not move and stays tucked behind the knee
through the whole swing. The cut is flat there rather than a round cap, which
would bite into the knee. The body keeps the first 35px past the pivot so the
knee stays whole; the arm carries a copy of them, hidden because it paints
behind — the standard joint overlap, and those pixels move a quarter of a design
px across the full swing.

Paint order is therefore **rod → arm → body**: the hand is in front of the pole,
the forearm's stump is behind the knee. `tools/cut-angler.py` checks the
split by recompositing in that order against the delivered painting — mean 0.01,
and the only pixels past a difference of 10 are **128 of 324,574 (0.04%)**, all
of them the rod's synthesis seam rather than the arm's cut.

**How the swing is composed, and why not by nesting the DOM.** The arm and the
rod would naturally be parent and child, but the paint order forbids it — the
rod sits *behind* the arm. So both layers take their transform-origin from the
arm's pivot, the arm is a plain rotation, and the rod is that same rotation with
its own wrist turn nested inside via a translate/rotate/translate. One transform
each, no nesting. `CONFIG.anim.rod.armFollow` (0.35) splits R1's *existing*
tuned angles between arm and wrist rather than adding to them, so nothing about
the cast's feel changed; 0 disables it, and a pose with no `armPivot` falls back
to the old single rotation.

Verified in Chromium by sampling every frame of a full cast: the arm swings
**−5.25° to +6.45°**, exactly 0.35 of R1's −15°/+18.4°, and the gap between the
rod tip *as the browser actually renders it* — the live CSS matrix pushed
through the composed transform — and where the line is drawn peaks at
**0.13px over 92 frames**, which is the boat's bob between samples. That is the
check that matters: if `applySwing()` and `rodTip()` disagreed, the line would
detach from a visibly swinging rod, which is the exact bug R1 exists to fix.

**Worth saying plainly: the effect is subtle.** The forearm is 6.2 design px
from pivot to grip, so 0.35 of the swing moves the grip about 0.6 design px.
What reads at 1x is the hand travelling with the rod rather than the rod
pivoting inside a frozen fist — more correct, and better in motion, but nobody
will point at it. It is one number if it ever wants more.

**Still open for R4:** the **Stream and Ocean costumes**. The done-when asks for
all three levels, and both still wear the Pond kid via the pose fallback. The
Stream is requested below; the Ocean follows once it is cut and judged.

The far arm came back resting by the hip rather than on the knee. That is a
harmless deviation: it stays with the body, and — the part that matters for the
arm cut still to come — it is **not** on the rod, so swinging the arm and the rod
together cannot tear a second hand off.

### ✅ R4 — the Stream angler, standing in waders (landed and wired 2026-09-01)

**Not the Pond prompt with a recolour.** `ART_DIRECTION.md` puts the Stream
angler *standing in the water* rather than seated in a boat, so it is a
different pose and every cut parameter in `tools/cut-angler.py` — rod axis,
arm skeleton, pivots, scale — is measured fresh. Budget it as a new pose, not a
variant.

**The rod changes too, and it is Bamboo Beauty.** An earlier draft of this
request said the gear stays the same and only the costume follows the water.
That was wrong, and the rod ladder is why: `shop.rods[].unlocksLocation` makes
rods the **progression gate**, so no kid reaches the Stream without buying
**Bamboo Beauty** — and that rod's name has been promising split cane, the
classic fly-rod material, since the shop shipped. A cane pole in chest waders
was never right. See the naming rule near the top of this file: a pose's default
rod is that level's gate rod.

**One caution that shapes the prompt: do not ask for it thin.** At sprite scale
the whole rod is ~65 design px long and about **1.8 device px** wide. A literally
slender fly rod goes sub-pixel and vanishes. The **reel and the honey cane** are
what survive an 8× downscale; taper is not. So the prompt asks for a visible
reel and explicitly says *not* hair-thin.

**One thing the Pond prompt did not need: ask for the arm held clear of the
body.** The Pond angler's upper arm and elbow happened to hide behind the
drawn-up knee, which is what made that cut easy. A standing figure has no such
cover, and the sleeve would otherwise sit against the torso in the same colour
with no contour between them — the exact problem that made a shoulder cut look
impossible there. Asking for a visible gap of backdrop along the whole limb
costs nothing artistically (it is a natural casting stance) and turns the arm
cut into an isolated silhouette against magenta.

**No water in the picture.** The game's own water layers and `#surface` cut the
angler at design y=198; anything painted here would double up.

```
ART NEEDED: the Stream angler, standing in waders — one image, cut locally
Prompt:   Soft painterly storybook character illustration in the style of
          Studio Ghibli, warm muted color palette, gentle diffused lighting,
          thin warm brown outlines rather than black, cozy and inviting mood,
          no harsh shadows, no neon or saturated colors. Soft two-tone shading
          with the edges between tones blended, and soft brush texture visible
          inside the larger shapes. NOT pixel art, NOT flat vector art with even
          line weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A school-age child of about eight, seen from the side, facing right,
          STANDING upright and full length with weight on both feet, calm and
          contented. Slim school-age proportions with a visible neck, long limbs
          and slender fingers — NOT a toddler, NOT a baby. Bare head, short
          warm-brown hair, warm tan skin. Stream fishing clothes: warm sand-tan
          chest waders over a cream long-sleeved shirt, and a soft terracotta
          fly-fishing vest with small pockets.
          The child is HOLDING A BAMBOO FLY ROD: a slender split-cane pole in
          warm honey-amber tones with a pale cork grip at its thick end, fine
          dark-red thread wraps where the line guides sit, and a small round
          dark-bronze fly reel mounted just below the grip. Keep the pole
          clearly visible and readable rather than hair-thin. The near arm is
          bent at the elbow with the forearm angled up and forward, and the near
          hand holds the cork grip at about chin height, above the reel. From
          that hand the rod runs diagonally up and to the right, passing well
          clear of the child's head, its tip reaching the upper-right corner of
          the canvas.
          IMPORTANT: the whole near arm must be held CLEAR OF THE BODY, with a
          visible gap of background between the arm and the chest along its
          entire length — the shoulder, upper arm, elbow and forearm all fully
          visible and not overlapping the torso. The far arm hangs down at the
          child's other side.
          The hand must read as genuinely gripping the pole, seen from the side:
          the fingers wrap around the grip and the separate fingers are visible
          crossing in FRONT of the pole, with the thumb behind or alongside
          them. NOT a pinch, NOT fingertips touching, NOT an open or reaching
          hand.
          No fishing line, no hook, no fish, no hat, no water, no riverbank,
          no scenery, no other characters.
          The child's feet are near the bottom edge of the canvas and the child
          stands toward the left, leaving the upper-right clear for the rod.
          Everything that is not the child and the rod must be flat, solid,
          uniform magenta (#FF00FF): a plain backdrop colour, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere on
          the child or the rod.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1024 by 1024 pixels, aspect ratio 1:1. Output as PNG.
Save as:  assets/angler-stream.png   (the source painting — the cut layers are
          angler-stream-body.png, angler-stream-arm.png, rod-bamboo-stream.png)
Size:     1024×1024 (1:1), delivered on flat magenta.
Wired in: not yet — a new CONFIG.rig.poses.stream block. Until it exists the
          Stream wears the Pond kid through the pose fallback, which is the
          wrong shirt rather than no angler.
```

**✅ Landed, cut and wired 2026-09-01, on the second attempt.**

The first came back with three faults, and only one of the three things I first
called out survived testing — worth recording, because two were my own bad eye:
I claimed the style had gone flat vector and that the arm-clear-of-the-body ask
had been ignored. Measured, the tonal variation matched the Pond's (stdev 26.4
vs 27.3) and its outlines were *less* even, and the arm ask had worked
perfectly — 2 separate subject runs per scanline through y=330–490. **The style
and clearance instructions were fine; my reading of them was not.** What was
real: a **baked-in fishing line** (asked for none, got one threaded through the
guides), and a **buzz cut** where the Pond kid has full tousled hair, which
breaks `ART_DIRECTION.md`'s one-protagonist decision.

The reroll fixed all three, and its `CRITICAL: draw NO FISHING LINE anywhere`
worked — a single 14–18px run per scanline in the upper-right quadrant, which is
the rod alone. It also carries the **landing net** and **grey-green waders**
(the first attempt's vest and waders were only 35 RGB apart, so the whole figure
read tan and the terracotta accent could not do its job).

**Scale had to come from the head, not the figure.** The generator draws every
pose to fill its frame, so the *standing* Stream kid came back 897px tall
against the *seated* Pond kid's 878 — 2% taller. Scaling both alike would have
stood the child up no taller than he sits. Matching the two heads instead (the
Pond's is 318 source px wide, 18.1 design px at its scale; the Stream's is 217)
gives 75 design px standing against 50 seated.

The cut is the Pond's method with all-new numbers, and two additions the Pond
did not need: an **off-axis circle for the reel**, which the rod corridor would
otherwise miss entirely, and a **hard left bound** where the corridor reaches
past the rod butt into the waders. The arm pivots where the sleeve vanishes
behind the vest — the same principle as the Pond's forearm behind the knee.
Recomposite rod → arm → body against the delivered painting: **70px differ by
more than 10, of 157,559 (0.044%)**, the same order as the Pond's.

`tools/cut-angler-pond.py` is now `tools/cut-angler.py`, taking the pose as an
argument, with every per-pose number in one `POSES` dict. It still reproduces
the Pond's committed numbers exactly.

Verified in Chromium at the Stream: correct layers, no failed asset requests,
the line leaves the rod tip at design **(146.4, 100.9)** against a predicted
(145, 98), and the arm swings **−5.25° to +6.06°** with the tip-to-line gap
peaking at **0.37px** — the composition holds with a completely different set of
numbers from the Pond's.

**One line borrowed from R5:** `#boat` and `#hull-shadow` are hidden in the
Stream. The angler stands *in* the water there, and a pixel rowboat under a
standing kid was worse than the alternative. R5 still owns vessels properly.

### ✅ R3 — the Pond, repainted as three layers (landed and wired 2026-09-01)

**First art request of the refresh.** R1 and R2 were code-only; this is what
Matt has to generate to move the epic forward. **Pond only, for now** — per
`BUILD_PLAN_REFRESH.md`, it's wired and judged before the Stream and Ocean are
requested, so a palette or framing miss costs one level's three prompts, not
nine.

Three layers, matching `ART_DIRECTION.md`'s parallax split, each the **same
canvas size** so they stack with zero offsets (the same-canvas discipline
above, applied to backgrounds instead of rig pieces). Use the current
`background.png`'s aspect ratio as the target: **1584×672 (2.36:1)**.

**Design constraint that overrides anything else in the prompt:** the
waterline — the line where sky/land ends and water begins — must land at
**55% of the image's height** (design y=198 on the 720×360 canvas `#surface`
and everything else assumes). Get this wrong and every tuned coordinate in the
scene (the boat, the rig, the fish's swim band) moves with it, the way the
Stream's mis-framed art forced a scale-and-offset workaround that R3 exists to
delete. A generated image whose waterline lands anywhere else is a **reroll**,
not something to crop or offset into place.

> **Update 2026-09-01 — layer 1 has landed, and it moved the target for layers
> 2 and 3.** `background-pond-far.png` came back with its waterline at
> **55.95%**, which at game scale puts it at design y=201 against the y=198
> `#surface` (`top: 55%`) assumes. Three pixels. That was accepted rather than
> rerolled: the rule above is aimed at gross misses like the Stream's
> (`scale 1.246` plus a −368px offset), `#surface`'s read comes from a
> 0.30-alpha lip in its first 6px, and a reroll would have been a lottery over
> 3px rather than a fix.
>
> **So layers 2 and 3 are specified at 56%, not 55%** — the three layers
> agreeing with *each other* matters more than agreeing with the nominal
> number, because a mismatch between them is a visible seam while a shared 3px
> offset is not. If exactness is ever wanted, trimming 15px off the top of all
> three identically lands the waterline on y=198 and preserves registration by
> construction.

```
ART NEEDED: Pond background, layer 1 of 3 — far (sky, hills, treeline)
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. A calm forest pond at golden
          hour: a banded sky (pale blue near the top warming to cream and
          amber near the horizon), a soft glowing sun low over gentle tree-
          covered hills, no hard-edged sun disc. Include a simple, complete
          water fill below the horizon in muted teal-green (this layer must
          look complete on its own if the water and foreground layers are
          ever missing). No boat, no lily pads, no reeds — those are separate
          layers. The horizon/waterline must sit at exactly 55% down from the
          top of the canvas.
Save as:  assets/background-pond-far.png
Size:     1584×672 (2.36:1), opaque, no transparency needed
Wired in: not yet — replaces assets/background.png as the base layer; #scene's
          background-image (style.css)
```

```
ART NEEDED: Pond background, layer 2 of 3 — water
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Just the water surface of a
          calm forest pond at golden hour, seen from the side. The water must
          have a clear sense of depth: a lighter muted teal-green where the
          surface catches reflected light nearest the top, deepening through a
          mid teal to a distinctly darker, cooler band toward the bottom of
          the canvas. Do not paint it as one flat tone — the deepening from
          top to bottom is the point of this layer. Soft reflected highlights
          catching the surface near the top edge of the water. No boat, no
          lily pads, no reeds, no shoreline, no sky. The painted water must
          start at exactly 56% down from the top of the canvas and fill
          everything below it. Everything above that line must be filled with
          flat, solid, uniform magenta (#FF00FF) — a plain backdrop color, not
          a checkerboard, not a gradient, not transparency. No magenta
          anywhere in the water itself. Output as PNG.
Save as:  assets/background-pond-water.png
Size:     1584×672. Delivered on flat magenta above the waterline; the alpha
          is cut locally (see GEMINI_NOTES.md — and
          for this layer specifically, the cut is by row at 56%, so the
          magenta is a belt-and-braces check, not the mechanism).
Wired in: not yet — a layer above background-pond-far.png; ART_DIRECTION.md
          calls for this layer to "animate independently" (a slow drift), which
          is a follow-up CSS/JS task once the art lands, not part of this request
```

**✅ Landed 2026-09-01, salvaged by row.** The magenta convention worked on its
first outing: a **2-row** transition band, pink gone entirely by 3 rows below
the cut, and **zero** magenta left after the cut. Far better than the
checkerboard salvage it replaces.

**But Gemini ignored the 56%** and put the waterline at **46.13%** — 65px high.
It did not matter *here*, and the reason is worth keeping: this layer is a
smooth vertical gradient with no drawn features, so its only meaningful edge is
the top one, which is the very thing being set. The salvage discards rows 0–315
and **rescales the remaining 356 rows of clean water down to the 296** that sit
between layer 1's real waterline (y=376) and the bottom. Compressing a
featureless gradient by 17% is invisible; there is nothing to misregister.

**This is not the reroll rule bending.** That rule protects the registration of
*drawn features* — a rig piece, a shoreline, a dock. Water has none. Layer 3
does, so a positional miss there **is** a reroll: do not reuse this trick on it.

The water quality is what the reworked prompt was for, and it delivered: mid
`#4f8077` against a `#4f7d76` target and depth `#34534f` against `#375c58`, with
a surface-to-depth luminance drop of **83** where layer 1's flat water managed
only **12**.

**Layer 2 is now pinned to layer 1's waterline at y=376.** If layer 1 is ever
rerolled or trimmed, re-cut this layer from the original download rather than
editing the PNG in the repo.

Arrived as a **JPEG again**, despite the prompt asking for PNG — confirming the
caveat above that format is a download-UI choice. Harmless here, because the cut
is by row and the fringe was 3 rows.

```
ART NEEDED: Pond background, layer 3 of 3 — foreground detail
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Foreground pond vegetation,
          framing an empty center. Along the very bottom-left corner and the
          very bottom-right corner of the canvas: a few lily pads and tall
          slender reeds, and on one side only, the weathered end of a wooden
          dock or a mossy rock. These details cling to the left and right
          edges like a framing vignette and rise only a little way up from the
          bottom edge — they must never reach the middle of the canvas and
          never reach the upper half. The entire center of the canvas, and the
          whole middle of the bottom edge, must be completely empty backdrop
          with nothing painted in it at all. Everything that is not one of
          those corner details must be filled with flat, solid, uniform
          magenta (#FF00FF) — a plain backdrop color, one single unvarying
          color, not a checkerboard, not a gradient, not transparency. No
          magenta, pink or purple anywhere in the vegetation or the dock.
          Output as PNG.
Save as:  assets/background-pond-fore.png
Size:     1584×672. Delivered on flat magenta; the alpha is cut locally by
          keying the magenta out (recipe in GEMINI_NOTES.md).
Wired in: not yet — the top layer, painted over water and the mid plane
          (rig/fish), same as #surface already does; nothing may land where the
          bottom-center finger-guide panel sits
```

**Why this prompt is worded differently from layers 1 and 2.** Both of those
were given a percentage from the top, and layer 2 came back at 46% when it was
asked for 56%. **Layer 3 cannot absorb that** — it has drawn features, so a
positional miss is a reroll (see layer 2's note above). Two changes to make the
constraint survive:

1. **Position is expressed against the edges, not as a percentage.** "The very
   bottom-left corner", "rise only a little way up from the bottom edge". Corners
   and edges are things a generator can actually see; "70% down" is not.
2. **The keep-out is stated as composition, not geometry.** Asking a model to
   leave a specific rectangle empty is unreliable; asking for vegetation that
   frames an empty center is an ordinary picture, and it happens to leave exactly
   the bottom-center third clear. `#guide-panel` is `position: fixed`, centered,
   pinned to the bottom of the viewport, so the middle of the lower scene is what
   has to stay empty — a framing vignette gives that for free.

**Check on delivery, in this order:** magenta bleed into the vegetation (a
pink-fringed reed is a reroll, not a keying problem) · anything painted in the
center · anything reaching the upper half · then key, flood-filling from the
edges rather than globally.

**✅ Landed 2026-09-01.** The compositional keep-out worked exactly as intended:
**0.0%** of the bottom-center third is painted, and only **0.2%** of the rig's
box (design x20–138, y140–224 — the boat, kid and rod) is clipped by a reed tip.
Both were the point of the rewrite.

**Two things came back wrong, and only one of them mattered.**

1. **The backdrop is `#c642b0`, not `#FF00FF` — and it is the prompt's own fault.**
   The style preamble every asset prompt carries says *"no neon or saturated
   colors"*, and the generator applied that to the backdrop as well as the art.
   It did not matter: uniformity is what keying needs, not a particular hue, and
   the field came back at **stdev <1** across the whole clear area. **Detect the
   backdrop from the border rather than assuming `#FF00FF`** — the existing rule
   for checkerboards, and it holds here too. Worth expecting the softening on
   every future request rather than fighting it.
2. **The reeds reach 32.6%/37.5% down, well into the upper half the prompt
   forbade.** That instruction was simply wrong: the waterline is at 56%, and
   cattails at a pond edge stand *above* the water. Reeds that stopped below it
   would look wrong. The constraint that actually mattered — don't foul the rig
   or the guide panel — was met. **Say "must not reach the upper half" only
   where something is genuinely flat to the water.**

**Keying it took three passes, and the middle one is the reusable part:**
flood fill from the edges (never globally) · an **alpha ramp** between distance
55 and 110 from the key, unpremultiplying the key's contribution out of every
blended edge pixel · then a **targeted despill**. Purple residue went 6.01% →
3.79% → **0.00%**. The despill is safe here because real pond vegetation is
olive and tan — blue *below* green — so any surviving pixel with blue well above
green is keyer residue and never paint. That test is palette-specific; re-derive
it per asset rather than copying the numbers.

**Once these three land:** composite them locally at game scale before wiring
(the established local-check habit — see *the same-canvas rule* above), swap
`#scene`'s background for the three-layer stack, confirm the waterline still
reads at y=198, and only then does `BUILD_PLAN_REFRESH.md` mark R3's Pond half
done and the Stream/Ocean prompts get written.

### ✅ R3 — the Stream, repainted as three layers (landed and wired 2026-09-01)

**Second of the three levels.** The Pond is landed, wired and judged, so the
conventions below are proven rather than guessed. **Read `GEMINI_NOTES.md`
first** — every wording choice here comes from it.

**This is the level with a history, and the prompts are built around it.** The
old `background-stream.png` came back as a forest pool seen **from above**, water
in a low diagonal band instead of a flat waterline. Under `cover` the boat
floated ~100px above the water; the scene is currently held together by
`#scene.loc-stream`'s `scale 1.246` plus an offset, which costs the sky and runs
the art chunkier than the other two biomes. **Deleting that workaround is R3's
done-when criterion**, so the side view is the one thing these prompts cannot
get wrong. The framing sentence below is lifted from the Ocean prompt, which
produced exactly the right composition first time.

**How the three layers register, now that the Pond has proved it:** *layer 1
defines the waterline and layers 2 and 3 are salvaged into agreement with it
locally.* So layer 1's waterline is the only one that has to be close, and a miss
on 2 or 3 is cheap. That is why the water and foreground prompts state the line
loosely and lean on the magenta instead.

```
ART NEEDED: Stream background, layer 1 of 3 — far (sky, forest, far bank)
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape — leaves, moss and rock are modelled with light,
          not filled with flat color. Outlines are fine, delicate and varying in
          weight, the way a brush leaves them; they are never thick, uniform or
          inked. Distant trees soften into atmospheric haze. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          A cozy forest stream, seen straight on from the opposite bank at eye
          level with the water — the way you would see it standing in the
          shallows. This is a flat side view like a stage backdrop. It is NOT
          seen from above, NOT a bird's-eye or three-quarter view, and the
          water's edge is a straight horizontal line running the full width of
          the canvas, not a diagonal band and not a curve. Above that line: a far
          bank of mossy rocks and ferns, dense green forest behind it, and a soft
          banded sky warming to cream in a gap between the treetops. Cooler and
          greener than a golden-hour pond, but still warm and muted. Include a
          simple, complete water fill below the water's edge in muted teal-green,
          so this layer reads correctly on its own. No people, no boat, no
          fishing gear. Keep even the deepest shadows in the trunks a warm dark
          brown — never near-black. The water should fill at least the bottom
          third of the canvas. Aspect ratio 2.36:1. Output as PNG.
Save as:  assets/background-stream-far.png
Size:     1584×672 (2.36:1), opaque, no transparency needed
Wired in: not yet — lands with all three, replacing background-stream.png and
          deleting #scene.loc-stream's scale/offset workaround in style.css
```

```
ART NEEDED: Stream background, layer 2 of 3 — water
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every wash — the water is modelled with light, not filled with
          flat color. Any line work is fine, delicate and varying in weight, the
          way a brush leaves it; never thick, uniform or inked. This must NOT
          look like flat vector art, a cartoon, or a clean digital illustration
          with even line weight. Just the surface of a shallow
          forest stream, seen from the side at eye level. Moving water, not a
          still pond: soft broken riffles and gentle current lines running
          horizontally, a few pale foam streaks, the suggestion of submerged
          stones showing through where it is shallowest. The water must have a
          clear sense of depth — lighter and more broken where it catches the
          light nearest the top, deepening through a mid teal to a darker,
          cooler channel toward the bottom of the canvas. Do not paint it as one
          flat tone; the deepening from top to bottom is the point of this
          layer. No bank, no rocks above the surface, no sky, no people. The
          painted water fills the bottom of the canvas and stops in a straight
          horizontal line. It does not matter exactly where that line falls, so
          long as the water fills at least the bottom third. Everything above
          that line must be filled with flat, solid, uniform magenta (#FF00FF) —
          a plain backdrop color, one single unvarying color, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere in
          the water itself. Aspect ratio 2.36:1. Output as PNG.
Save as:  assets/background-stream-water.png
Size:     1584×672. Delivered on flat magenta above the line; the alpha is a cut
          by row, then rescaled to sit under layer 1's waterline at row 376
Wired in: not yet — the middle plane, #bg-water for .loc-stream
```

**✅ Landed 2026-09-01, first attempt, no reroll.** The per-layer style block
worked: the water came back as the same watercolour as the bank, and the two
planes read as one painting rather than two stacked ones.

- **Depth gradient is the best of any layer so far** — a surface-to-depth
  luminance drop of **112**, against the Pond water layer's 83 and the Pond far
  layer's 12. Mid `#6f9885` against a `#4f7d76` target, depth `#2d5557` against
  `#375c58`. The pale `#c4bca5` at the top is the light-catching riffle band the
  prompt asked for, not a miss.
- **Magenta behaved exactly as on the Pond**: a 4-row transition, pink gone by 3
  rows below the cut, **zero** remaining after it.
- **The waterline landed at 47.77%, and it did not matter** — precisely the
  point of relaxing it. The clean band (343 rows) was rescaled to the 296 rows
  between layer 1's waterline at row 376 and the bottom.

Verified: RGBA 1584×672, fully transparent above row 376, fully opaque below, no
magenta anywhere, composited against layer 1 at game scale before committing.


**Two changes made after layer 1 landed (2026-09-01), both worth carrying to the
Ocean's prompts.**

1. **The painterly style block was added here too.** Layer 1 came back as
   genuine watercolour, and this water is painted *directly against* the far
   bank in the same frame. Without the same medium named, the two planes read as
   two different paintings stacked on each other — a failure mode that does not
   exist for a single-image background and only appears once a level is split
   into layers. **Every layer of a level needs the style block, not just the
   first.**
2. **The waterline instruction was relaxed to "it does not matter exactly where
   that line falls".** For this layer it genuinely does not: the alpha is a cut
   by row and the band is then rescaled to sit under layer 1's line at row 376,
   exactly as the Pond's water layer was after it came back 65px out. Spending
   prompt weight on a position that is salvaged anyway takes weight from the
   style, which is not — see `GEMINI_NOTES.md`, "spend the prompt where it can
   win".


```
ART NEEDED: Stream background, layer 3 of 3 — foreground detail
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape — moss, fern and stone are modelled with light, not
          filled with flat color. Outlines are fine, delicate and varying in
          weight, the way a brush leaves them; never thick, uniform or inked.
          This must NOT look like flat vector art, a cartoon, or a clean digital
          illustration with even line weight. Foreground streamside detail,
          framing an empty center. Along the very bottom-left corner and the
          very bottom-right corner of the canvas: wet mossy river rocks breaking
          the surface, clumps of ferns and long grass, and on one side only, the
          mossy end of a fallen log lying part-submerged. These details cling to
          the left and right edges like a framing vignette and rise only a
          little way up from the bottom edge. The entire center of the canvas,
          and the whole middle of the bottom edge, must be completely empty
          backdrop with nothing painted in it at all. Everything that is not one
          of those corner details must be filled with flat, solid, uniform
          magenta (#FF00FF) — a plain backdrop color, one single unvarying
          color, not a checkerboard, not a gradient, not transparency. No
          magenta, pink or purple anywhere in the rocks, ferns or log. Aspect
          ratio 2.36:1. Output as PNG.
Save as:  assets/background-stream-fore.png
Size:     1584×672. Delivered on flat magenta; alpha keyed locally
Wired in: not yet — the near plane, #bg-fore for .loc-stream. Nothing may land
          where the bottom-center finger-guide panel sits, or over the rig's box
          (design x20–138, y140–224)
```

**✅ Landed 2026-09-01, first attempt.** Backdrop came back at **`#fa05f8`** —
near-pure magenta this time, against the Pond foreground's `#c642b0`, and dead
uniform (stdev ≤1.1). Keyed with the standard three passes; **0.00%** purple
among visible pixels. 20.3% opaque coverage.

Two intrusions, both judged acceptable rather than rerolled:

- **6.5% of the bottom-center third is painted** (the Pond managed 0.0%) — the
  mossy log's right end reaches into it. The guide panel is translucent and sits
  over it, so the log simply reads as continuing behind the UI. Nothing is
  hidden that carries meaning.
- **1.6% of the rig's box** is clipped by the left-hand growth, against the
  Pond's 0.2%. Foreground vegetation partly overlapping the angler is what a
  near plane is *for* — you are standing behind the reeds.

Detail tops out at 35.6% / 41.7% down, well above the waterline, which is
correct: streamside rocks and ferns sit above the water, not flat to it.

**The Stream is wired, and `.loc-stream`'s `scale 1.246` workaround is deleted**
— R3's done-when criterion for this level. The planes now just swap their
images; no per-location framing, no scale, no offset, because the art was
generated and fitted to put its waterline on the Pond's row. Verified in
Chromium: all three planes load and drift, the waterline reads at screen y=396 =
design y=198, `#scene` carries no background image, and the CSS `.reeds` are
hidden here now that real painted ones exist.

```

**✅ Layer 1 landed 2026-09-01, on attempt 4, fitted rather than rerolled again.**

| attempt | wording | waterline | verdict |
|---|---|---|---|
| 1 | hedged position | 66.96% | good painterly texture, framing out |
| 2 | position stated three unhedged ways | **66.96%**, identical to the pixel | proved wording does not move the prior |
| 3 | — | 62.35% | best framing, but flat and graphic |
| 4 | style-weighted, position relaxed to a floor | 72.77% | **the style Matt asked for — kept** |

**The side view was solved in every attempt** and never recurred as a problem.
The trade in attempt 4 worked exactly as designed: relaxing the position to an
easy floor let the prior run further than ever (72.77%, the lowest of the four),
and bought genuine watercolour — soft washes, delicate varied linework,
distant trees dissolving into haze. **The framing was the salvageable half and
the style was not, so that is the right way round.**

**The fit costs nothing, and is better than any crop of the earlier attempts.**
Crop **113px off the top** so the waterline lands on row 376, then **regrow
113px of water at the bottom**. The canvas stays **1584×672**, so its aspect is
identical to the Pond's and `cover` behaves the same — no extra horizontal loss
(attempt 3's crop would have cost 273px of width instead of 129). The regrown
water is free: **layer 2 repaints all of it**, and layer 1's water is only the
standalone fallback. More sky survives than in any earlier crop.

Waterline now sits at **design y=201, identical to the Pond's**.

**One open judgement, flagged rather than fixed:** the Stream reads darker and
punchier than the Pond — mean luminance **143.9 vs 170.8**, contrast **50.2 vs
41.0**. Defensible, since a forest stream *is* shadier than a golden-hour pond
and the prompt asked for cooler and greener, but it is a real difference between
two levels of one game. Judge it wired, next to the Pond, before deciding.
Darks past the `#33291f` floor are also creeping across attempts — 0.58%, 1.37%,
now **1.67%** — with no pure black.

**When these land:** key and register them against layer 1, composite all three
at game scale, point `.loc-stream` at the three `#bg-*` planes, **delete the
`scale 1.246` + offset block and the `.reeds` exemption for the Stream**, then
verify the waterline in a browser. The Ocean's prompts get written after this
level is judged — same one-level-at-a-time discipline that kept the Pond's
misses cheap.

### ✅ R3 — the Ocean, repainted as three layers (landed and wired 2026-09-01)

**Last of the nine, and the first written with the whole lesson set in hand.**
The Pond took three rerolls to learn the conventions; the Stream took four on
one layer and then landed the other two first-attempt. These are written to that
standard. **Read `GEMINI_NOTES.md` before touching them.**

Everything proven is applied: the **style block on all three layers**, not just
the first · the **flat magenta backdrop** on the two that need alpha · the
**keep-out stated as composition** rather than geometry · the waterline stated
exactly on layer 1 and left don't-care on layers 2 and 3, since **layer 1
defines the truth and the others are salvaged into it** · and **explicit pixel
dimensions in the prompt body**, not only in the spec line below it (Matt's ask,
2026-09-01 — the aspect ratio alone has been reliable, this is belt and braces).

**Expect to fit layer 1 rather than reroll it.** The Stream's far layer missed
its waterline on all four attempts and was solved by cropping the top and
regrowing water at the bottom, keeping the canvas at 1584×672 so `cover` behaves
exactly as it does for the other levels. The same fix is available here and
costs nothing, because layer 2 repaints the water anyway.

**What this level replaces:** `assets/background-ocean.png`, which came back at
1.83:1 rather than ~2.4:1, so `cover` crops its top and bottom and
`#scene.loc-ocean` carries a `center 11%` offset to pull the horizon onto y=198.
**That offset is deleted when these land** — the same closing move as the
Stream's `scale 1.246`.

```
ART NEEDED: Ocean background, layer 1 of 3 — far (sky, horizon, open sea)
Prompt:             Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape, modelled with light rather than filled with flat
          color. Outlines are fine, delicate and varying in weight, the way a
          brush leaves them; never thick, uniform or inked. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          The open ocean on a bright calm day, seen straight on at eye level
          from just above the water, as if standing in a boat. This is a flat
          side view like a stage backdrop. It is NOT seen from above and NOT a
          three-quarter view, and the horizon is a straight horizontal line
          running the full width of the canvas. Above it: a soft banded sky,
          pale blue high up warming to cream near the horizon, with a few
          gentle drifting clouds and a soft glow low in the sky — no
          hard-edged sun disc. A faint suggestion of distant land or haze at
          the horizon is welcome but must stay low and pale. Deeper and bluer
          than a forest pond, but still muted and warm-lit, never a saturated
          tropical blue. Include a simple, complete water fill below the
          horizon so this layer reads correctly on its own. No boat, no people,
          no birds, no fishing gear. Keep even the deepest tones a warm dark
          brown-blue, never near-black. The horizon must sit at exactly 55%
          down from the top of the canvas: sky fills the top 55% and water
          fills the bottom 45%. The image is 1584 by 672 pixels, aspect ratio
          2.36:1. Output as PNG.
Save as:  assets/background-ocean-far.png
Size:     1584×672 (2.36:1), opaque, no transparency needed
Wired in: not yet — lands with all three; replaces background-ocean.png and
          deletes #scene.loc-ocean's `center 11%` offset in style.css
```

**✅ Layer 1 landed 2026-09-01, first attempt, fitted.** The best far layer of
the three levels on every measure that matters:

| | Pond far | Stream far | **Ocean far** |
|---|---|---|---|
| darks past the `#33291f` floor | 0.58% | 1.67% | **0.00%** |
| own depth gradient (lum drop) | 12 (flat) | — | **74** |
| mean luminance / contrast | 170.8 / 41.0 | 143.9 / 50.2 | 161.8 / 66.1 |

Palette landed close without argument: sky high `#acd9e2` against `#b7cfd8`, sky
low `#efe8d5` against `#f2ddbe` — notably *better* than the Pond's, whose amber
band ran hot at saturation 0.34. Water `#6595a0` → `#374143`, bluer than the
other two levels by design. No pure black. The high contrast (66.1) is the
strong sky-versus-sea split, which is what an ocean looks like.

**Horizon came in at 52.23% — 25px *high*, the opposite direction from the
Stream's misses.** Fitted the same way, mirrored: regrow 25px of sky at the top
by stretching the smooth upper band, drop 25px of water off the bottom. The
canvas stays **1584×672**, matching the Pond and Stream exactly, and both edits
are free — the top is a smooth gradient, and layer 2 repaints the water anyway.
Horizon now sits on **row 376, design y=201**, the same row as the other two
levels.


```
ART NEEDED: Ocean background, layer 2 of 3 — water
Prompt:             Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape, modelled with light rather than filled with flat
          color. Outlines are fine, delicate and varying in weight, the way a
          brush leaves them; never thick, uniform or inked. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          Just the surface of the open ocean on a bright calm day, seen from
          the side at eye level. Long low swells rolling horizontally, soft
          pale foam catching the light along their crests, and the glitter of
          reflected sky broken across the surface. The water must have a clear
          sense of depth — lighter and more broken where it catches the light
          nearest the top, deepening through a mid blue-teal to a much darker,
          cooler band toward the bottom of the canvas. Do not paint it as one
          flat tone; the deepening from top to bottom is the point of this
          layer. No horizon, no sky, no boat, no people, no land. The painted
          water fills the bottom of the canvas and stops in a straight
          horizontal line. It does not matter exactly where that line falls, so
          long as the water fills at least the bottom third. Everything above
          that line must be filled with flat, solid, uniform magenta (#FF00FF)
          — a plain backdrop color, one single unvarying color, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere
          in the water itself. The image is 1584 by 672 pixels, aspect ratio
          2.36:1. Output as PNG.
Save as:  assets/background-ocean-water.png
Size:     1584×672. Delivered on flat magenta above the line; the alpha is a cut
          by row, then rescaled to sit under layer 1's horizon
Wired in: not yet — the middle plane, #bg-water for .loc-ocean
```

**✅ Landed 2026-09-01, first attempt.** **The strongest depth gradient of any
layer in the epic** — a surface-to-depth luminance drop of **131.8**, against the
Stream water's 112, the Pond water's 83 and the Ocean far layer's 74. Depth
`#2f5966` against a `#375c58` target; surface `#c5d6cd` is the light-catching
crest band the prompt asked for. Only **0.16%** of the water goes past the
`#33291f` floor.

Magenta: 6-row transition, pink gone by 3 rows below the cut, **zero** after it.
The waterline landed at 45.68% and did not matter — the clean 362-row band was
rescaled into the 296 rows below layer 1's horizon at row 376.

Verified: RGBA 1584×672, fully transparent above row 376, fully opaque below, no
magenta anywhere, composited against layer 1 at game scale before committing.


```
ART NEEDED: Ocean background, layer 3 of 3 — foreground detail
Prompt:             Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape, modelled with light rather than filled with flat
          color. Outlines are fine, delicate and varying in weight, the way a
          brush leaves them; never thick, uniform or inked. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          Foreground open-water detail, framing an empty center, on a calm
          day. Along the very bottom-left corner and the very bottom-right
          corner of the canvas: low drifting patches of pale sea foam and
          scattered bubbles lying flat on the water close to the viewer, and on
          one side only, the top of a small weathered wooden channel buoy
          sitting low in the water with a little seaweed and barnacle growth at
          its waterline. Everything here is low, flat and calm. There is NO
          breaking wave, NO curling crest, NO tall spray and NO whitewater —
          this is a quiet sea, not a rough one. These details hug the very
          bottom edge of the canvas and must all stay within the bottom quarter
          of the image, never rising into the middle of it. The entire center of the canvas, and the whole middle of the
          bottom edge, must be completely empty backdrop with nothing painted
          in it at all. Everything that is not one of those corner details must
          be filled with flat, solid, uniform magenta (#FF00FF) — a plain
          backdrop color, one single unvarying color, not a checkerboard, not a
          gradient, not transparency. No magenta, pink or purple anywhere in
          the foam or buoy. The image is 1584 by 672 pixels, aspect ratio
          2.36:1. Output as PNG.
Save as:  assets/background-ocean-fore.png
Size:     1584×672. Delivered on flat magenta; alpha keyed locally
Wired in: not yet — the near plane, #bg-fore for .loc-ocean. Nothing may land
          where the bottom-center finger-guide panel sits, and R5 puts a Boston
          Whaler with a stern fighting chair in this level — a bigger hull than
          the Pond's rowboat, so the empty center matters more here, not less
```

**⚠️ Attempt 1 (2026-09-01) — rerolled, and the prompt above is fixed.** It came
back as big curling Hokusai-style breakers with heavy spray. Two problems, one
of them fatal:

| | Pond fore | Stream fore | Ocean fore, attempt 1 |
|---|---|---|---|
| painted inside the **rig's box** | 0.2% | 1.6% | **42.9%** |
| painted in the bottom-center third | 0.0% | 6.5% | 1.8% ✅ |
| total coverage | 9.5% | 20.3% | 19.0% ✅ |

**42.9% of the rig's box was behind a wave** — and R5 puts a Boston Whaler
there, a bigger hull than the Pond's rowboat, so the real cost is worse than
that. The keep-out and the coverage were both fine; the problem was purely
*height*, with detail reaching 36.5% down where the waterline is at 55.95%.

Tonally it was wrong too: layers 1 and 2 are "a bright calm day" with long low
swells, and these were breakers. Different weather in the same scene, and
`ART_DIRECTION.md`'s mood is cozy, not perilous.

**The cause was the subject, not the adjectives** — see `GEMINI_NOTES.md`, *pick
foreground subjects that are naturally small*. "The near crest of a swell
**breaking**… **close to the viewer**" has no small version; a breaking wave is
big by definition. The Pond and Stream foregrounds worked because lily pads,
reeds, rocks and ferns are *inherently* low objects, so "hug the bottom edge"
agreed with the subject instead of fighting it. The rewrite swaps the breaking
crest for **flat drifting foam patches**, adds an explicit "NO breaking wave, NO
curling crest, NO tall spray", and caps the height at the bottom quarter.


**✅ Layer 3 landed 2026-09-01 on attempt 2 — the cleanest foreground of the
three levels.**

| | Pond fore | Stream fore | **Ocean fore** |
|---|---|---|---|
| painted in the rig's box | 0.2% | 1.6% | **0.0%** |
| painted in the bottom-center third | 0.0% | 6.5% | **0.0%** |
| total coverage | 9.5% | 20.3% | 6.6% |

Detail tops out at 66.7% / 76.2% down — entirely inside the bottom quarter the
rewritten prompt asked for, against attempt 1's 36.5% / 44.6%. Backdrop
`#d148b0` (softened again, as the Pond's was) but uniform at stdev ~1, so it
keyed cleanly: **0.00%** purple among visible pixels.

**Swapping the subject was the whole fix.** Same height instruction, same
framing language — only "the near crest of a swell breaking" became "low
drifting patches of pale sea foam". The buoy survived unchanged and is the nicest
object in any of the three foregrounds.

**R3 is closed.** All nine images are painted, keyed and wired; `.loc-ocean`'s
`center 11%` offset is deleted along with the Stream's `scale 1.246`, so **no
scene carries a framing patch any more** and every level works the same way.
Verified in Chromium across all three: correct images on all nine planes, no
failed asset requests, `#scene` carrying no background image, the CSS `.reeds`
hidden everywhere, and **every waterline landing on screen y=396 = design
y=198**.

### ✅ G1 — the angler, taken apart (landed 2026-08-25)

All three PNGs are in, salvaged and wired: `body-kid.png` (RGBA 560×864),
`hat-straw.png` (1131×617) and `rod-basic.png` (800×800). Offsets in
`CONFIG.rig.layers` were tuned in the browser against the old `kid.png` side by
side, so the composite reads at the same size and sits in the boat the same way.
The rod arrived on a **blue** checkerboard — GEMINI_NOTES.md's legacy recipe
detects the pair per file instead of assuming gray.

The original request, kept for the pattern the next sprite set follows:

### G1 — the angler, taken apart (3 PNGs, they land together)

`assets/kid.png` bakes hat + body + rod into one sprite, which is why hats have
been deferred since the boat shop and why every biome shows the same angler.
G1 splits it into three layers (`BUILD_PLAN_GRAPHICS.md`). The code is already
wired: `CONFIG.rig.layers` stacks a body, a hat and a rod inside `#rig`, and a
missing PNG renders as nothing (a `background-image` 404 is silent), so the
scene looks exactly as it does today until these arrive.

**Drop all three at once.** The body layer currently points at the old
all-in-one `kid.png`; if `hat-straw.png` lands alone the kid wears two hats.
When they're in, tell Claude — the layer offsets in `config.js` get tuned
against the real art (they're first guesses right now).

**Style reference for all three:** open `assets/kid.png`. Same chunky pixel
scale, same palette (straw tan hat with a darker band, teal-green shirt, warm
skin, brown wooden rod), same side-on view facing **right**. The angler renders
about 64x63 px on screen, so keep the detail readable at that size.

```
ART NEEDED: the angler's body, with no hat and no rod (G1)
Prompt:   Pixel art of a young child sitting side-on facing right in a fishing
          pose, cozy retro game asset, chunky clean pixels, warm dawn lake
          palette — teal-green long-sleeved shirt, warm tan skin, short brown
          hair, dark shoes, knees drawn up as if seated in a small boat. BOTH
          HANDS CLOSED IN A GRIP in front of the chest as if holding a fishing
          rod, but NO ROD DRAWN and NO HAT — bare head, hair visible, the hands
          gripping empty air. Single centered subject, transparent background,
          no text, no UI, no watermark, no baked-in shadow.
Save as:  assets/body-kid.png
Size:     ~64x63 proportions (roughly square), transparent, tight crop. The
          head must sit at the TOP of the sprite with a little clearance, so a
          separate hat layer can be placed over it.
Wired in: ✅ CONFIG.rig.layers — change the body layer's `file` from "kid" to
          "body-kid" and it's live.
```

```
ART NEEDED: the straw hat, as its own layer (G1)
Prompt:   Pixel art of a child's straw sun hat, cozy retro game asset, chunky
          clean pixels, side view facing right, wide floppy brim, straw-tan
          weave with a darker brown band around the crown, matching the hat in
          assets/kid.png. Hat alone — no head, no face, nothing under it.
          Single centered subject, transparent background, no text, no UI, no
          watermark, no baked-in shadow.
Save as:  assets/hat-straw.png
Size:     about 40x26 proportions (wider than tall), transparent, tight crop to
          the brim. Scale it to sit on a head roughly 26 px wide at the game's
          64x63 angler size.
Wired in: ✅ CONFIG.rig.layers, the hat layer. First of the swappable shop hats
          (G4).
```

```
ART NEEDED: the fishing rod, as its own layer (G1)
Prompt:   Pixel art of a simple wooden fishing rod, cozy retro game asset,
          chunky clean pixels, a slightly tapered brown branch-like pole with a
          darker grip wrap at the thick end, drawn on a DIAGONAL running from
          the lower-left (the grip) up to the upper-right (the thin tip),
          matching the rod in assets/kid.png. Rod alone — no hands, no line, no
          hook, no fish. Transparent background, no text, no UI, no watermark,
          no baked-in shadow.
Save as:  assets/rod-basic.png
Size:     ~52x52, transparent, tight crop, with the grip end at the very
          bottom-left corner and the tip at the very top-right corner of the
          canvas — the line is aimed at that tip, so a consistent diagonal
          matters more than the exact length.
Wired in: ✅ CONFIG.rig.layers, the rod layer. First of the swappable shop rods
          (G4), which also closes the rod-icon gap noted below.
```

**One instruction for every future body sprite** (G2's waders and fighting-chair
poses, G3's age/sex sets): draw the head at the **same anchor point** within the
canvas for a given pose. If every body in a pose puts its head in the same
place, one hat PNG fits all of them and G4 never needs per-character hat sizes.

### ❌ V2 — the angler and its gear, drawn to register (4 PNGs, Pond pose) — WITHDRAWN 2026-08-31

**Do not generate these.** The pieces were specified in the pixel style and for
a body/hat/rod split; `ART_DIRECTION.md` replaces both, and R4 of the refresh
re-requests the angler as head/torso/arm/rod in one costume per level. **The
method described here survives and is now a standing rule** — see *The
same-canvas rule* near the top of this file. That is why this section is kept.

**This replaces the G1 approach below, which didn't work.** G1 asked for a hat
and a rod as isolated sprites and then tried to line them up with offsets. At 4x
zoom it looked close; at game scale the hat sat on the hair like a sticker and
the fist closed on empty air with the rod crossing it. No offset fixes that.

**The new rule: every piece is generated FROM the body sprite, and comes back on
the same canvas, already in position.** In Gemini, attach the reference image
and ask for the piece for *that* character. Then all four layers share one box,
every offset is zero, and registration is the generator's job rather than mine.

The grip is solved by a sandwich rather than by alignment: the body has an
**open** curled hand, the rod paints over it, and a small **fingers** sprite
paints over the rod's grip. Fingers close over whatever is underneath, so any
rod looks held — which is what makes a rod shop possible at all.

Layer order: **vessel → body → rod → fingers → hat**.

Do these in order; #1 is the reference for the other three.

```
ART NEEDED: the Pond angler's body, open hand (V2 #1 — the reference)
Prompt:   Pixel art of a young child sitting side-on facing right in a fishing
          pose, cozy retro game asset, chunky clean pixels, warm dawn lake
          palette — teal-green long-sleeved shirt, warm tan skin, short brown
          hair, dark shoes, knees drawn up as if seated in a small boat. Bare
          head, no hat, no rod. The near arm reaches forward and the hand is
          held OPEN in a loose C-curl, palm facing the viewer, fingers apart —
          as if about to take hold of a rod, NOT clenched. Single centered
          subject, transparent background, no text, no watermark, no shadow.
Save as:  assets/body-kid-boat.png
Size:     roughly 2:3 portrait, transparent, tight crop. Whatever canvas this
          comes back on IS the canvas — the next three are drawn onto it.
```

```
ART NEEDED: the fingers that close over a rod grip (V2 #2)
Prompt:   [ATTACH assets/body-kid-boat.png AS A REFERENCE IMAGE]
          Using this character as reference: draw ONLY the fingers and thumb of
          this child's near hand, curled closed as if gripping a fishing rod —
          the same skin tone, the same chunky pixel scale, the same lighting.
          Output them on a transparent canvas THE SAME SIZE as the reference
          image, positioned exactly where that hand is, so the fingers overlay
          the reference hand perfectly. Nothing else in the image — no arm, no
          body, no rod, no background.
Save as:  assets/hand-kid-boat.png
Size:     same canvas as body-kid-boat.png, aligned. This is the top half of the
          grip: it paints over the rod so the hand looks closed around it.
```

```
ART NEEDED: the straw hat, drawn onto this character (V2 #3)
Prompt:   [ATTACH assets/body-kid-boat.png AS A REFERENCE IMAGE]
          Using this character as reference: draw a child's straw sun hat sized
          and angled to fit THIS head — wide floppy brim, straw-tan weave, a
          darker brown band around the crown, same chunky pixel scale and
          lighting as the reference. Output the hat alone on a transparent
          canvas THE SAME SIZE as the reference image, positioned exactly where
          it would sit on that head, so it lands correctly when layered over the
          reference. Nothing else in the image — no head, no face, no body.
Save as:  assets/hat-straw.png   (replaces the current one)
Size:     same canvas as body-kid-boat.png, aligned.
```

```
ART NEEDED: the basic rod, drawn into this character's hand (V2 #4)
Prompt:   [ATTACH assets/body-kid-boat.png AS A REFERENCE IMAGE]
          Using this character as reference: draw a simple wooden fishing rod —
          a tapered brown pole with a darker grip wrap at the thick end — angled
          up and to the right the way this child would hold it, with the GRIP END
          sitting inside that open hand and the thin tip extending up past the
          head to the upper right. Same chunky pixel scale and lighting as the
          reference. Output the rod alone on a transparent canvas THE SAME SIZE
          as the reference image, positioned exactly where it would be when held,
          so it lands correctly when layered over the reference. Nothing else in
          the image — no hand, no body, no line, no hook.
Save as:  assets/rod-basic.png   (replaces the current one)
Size:     same canvas as body-kid-boat.png, aligned.
```

**When all four land**, Claude composites them locally before wiring anything and
looks at the stack at game scale. If a piece is out of place that's a **reroll,
not an offset tweak** — nudging offsets is exactly how G1 ended up janky. The
same four prompts then repeat for the Stream (waders, standing) and Ocean
(fighting chair) poses in V3, and each new shop hat or rod is one more
reference-drawn PNG per pose.

### ✅ The social preview card, re-lettered (landed 2026-08-31)

The GitHub link card had **"TYPING FISHING"** painted into the art, so after the
rename it advertised a name that existed nowhere else in the project. It is now
`HOOK, LINE` / `AND SENTENCE` over the same scene.

**This one was not generated — it was re-lettered in Pillow, and that was the
right call.** The scene was fine; only the text was wrong. Asking Gemini to
re-shoot it means asking for 23 characters of exact title plus a 30-character
subtitle, and spelling is the one thing image models reliably get wrong — the
old card got away with 14 characters on one line. Compositing is exact by
construction and re-runnable in seconds if the wording ever changes.

The recipe, should the name or tagline ever move again:

1. **Repaint the text area per row.** The title sits on open water, which is a
   smooth *vertical* gradient — so for each row take the median colour of the
   non-text pixels in `x 250..600` and flood that row across the repair rect.
   The seam is invisible; a single flat fill for the whole block is not.
2. **Know what you must not paint over.** The safe rect is `x 60..600,
   y 412..576`: the boat ends at y≈390, the key-cap panel starts at x≈790, and
   the fishing line only enters that x-range below y≈445. Verify with a
   bright-pixel scan before filling, not by eye.
3. **Set the type in real Silkscreen** — the same face as the game's `<h1>`,
   fetched from the Google Fonts CDN. Render it *small* and upscale
   `Image.NEAREST` (4× for the title, 2× for the subtitle) so the glyphs stay
   chunky instead of anti-aliased.
4. **Mind the comma.** At the first spacing tried, line one's comma in
   "HOOK," landed directly above the E of "SENTENCE" and read as **SÉNTENCE**.
   That is a property of this wording, not of the tool — a Gemini reroll would
   hit it too. A wider line gap (title lines at y=418 and y=492) fixes it.

Title colour `#F2EDE4`, subtitle gold `#F0C060`, both sampled from the original
card. The script is scratchpad-only, like the transparency salvage script above.

**Still needs a human:** GitHub's social preview is *not* served from the repo
tree, so committing the PNG is only half the job — upload it at
**Settings → General → Social preview**.

### ❌ The Stream scene, re-shot — WITHDRAWN 2026-08-31 (folded into R3)

**Do not generate this.** R3 repaints all three levels in the new direction, as
three layers each, so a re-shot pixel-era Stream would be thrown away on
arrival. **The framing lesson below is the part that matters and carries into
every R3 prompt**: a side view with a flat waterline at ~55% (design y=198), and
`.loc-stream`'s scale-1.246x workaround gets deleted when the new art lands
rather than re-tuned.

`assets/background-stream.png` is in and wired, but it came back as a forest
pool seen from **above**, with its water in a low diagonal band, rather than the
side view with a flat waterline at ~55% the prompt asked for. Under `cover` the
boat floated ~100px above the water; dropping the boat to meet the water buried
the whole rig behind the finger-guide panel. The scene is currently held
together by scaling the art up 1.246x and offsetting it (`#scene.loc-stream` in
style.css) so the near bank lands on y=198 — playable and pretty, but it costs
the sky and runs the art chunkier than the other two biomes.

The ocean prompt produced exactly the right composition, so this one borrows its
framing language. When this PNG lands, `.loc-stream` goes back to plain `cover`
and the offset comment comes out.

```
ART NEEDED: the Stream fishing scene, re-shot as a side view
Prompt:   Pixel art SIDE VIEW of a cozy forest stream for a fishing game, seen
          straight on from the opposite bank — eye level at the water, NOT from
          above, the way you'd see a lake from a boat sitting in it. Chunky
          clean pixels, warm dawn palette but cooler and greener than the pond:
          teal-to-emerald water filling the whole bottom half of the frame in
          flat horizontal bands, a far bank of mossy rocks and ferns meeting the
          water in a straight horizontal line across the middle, pines and muted
          purple hills behind it, warm sky with soft gold light above. The water
          must be OPEN and unobstructed from the left edge to the right edge —
          no sandbars, no rocks breaking the surface, no near bank in the
          foreground. No text, no UI, no characters, no boat, no fish, no
          watermark, no baked-in shadow. Landscape scene, fills the frame.
Save as:  assets/background-stream.png  (replaces the current one)
Size:     ~1400x600 (roughly 2.4:1, matching background.png and
          background-ocean.png). THE ONE THING THAT MATTERS: the waterline —
          where the far bank meets the water — must be a flat horizontal line at
          55% of the image height, with open water everywhere below it. That's
          the line the boat, bobber and fish coordinates are all built on.
Wired in: ✅ YES — `#scene.loc-stream` already points at this filename. Tell
          Claude when it lands and the framing workaround comes out with it.
```

Stream **fish need no art** — they reuse the shared per-tier sprites tinted by
each species' `color`.

### ✅ A6/A8 — the Ocean biome + the Muskie hero sprite (landed 2026-08-25)

Both PNGs are in and wired. Two things worth knowing for the next scene and the
next sprite:

**`assets/background-ocean.png`** came back 1408×768 (1.83:1) rather than the
~2.4:1 the spec asked for, so `cover` crops its top and bottom instead of its
sides, and its horizon (51.3% down the source) would have landed at y≈185 in the
720×360 scene. The pond's waterline lands at y≈198, which is what the boat,
bobber and fish coordinates assume. Fixed in the `.loc-ocean` rule with
`background-position: center 11%` rather than a reroll — the shipped stream
background lands at y≈210 and reads fine, so **±13px of waterline drift is
inside tolerance**. Reach for a `background-position` nudge before asking Matt
to regenerate.

**`assets/fish-muskie.png`** arrived as the fake-transparency case (GEMINI_NOTES.md) (RGB,
1264×848, checkerboard baked in as opaque gray) and was salvaged to RGBA
1128×391, tight-cropped, sparkles intact. Two deviations from the prompt, both
kept: it's **lavender** (matching `muskie.color` `#d4c5f0`) rather than the
olive-and-bronze the prompt described, and it **faces left** like every other
fish sprite — the prompt's "facing right" was wrong, since `lineToFish()` aims
at the mouth on the sprite's left edge. It's also long (2.9:1 against the shared
sprites' 1.5:1), so its rule widens `#fish` to 96px or the hero would render
*shorter* than a common fish.


### ✅ Family easter egg — the dino-nugget junk item (landed 2026-08-25)

`assets/junk-nugget.png` is in and wired: `CONFIG.junk.items` gained
`{ id: "nugget", name: "a dinosaur chicken nugget", file: "junk-nugget" }`, so
it rolls alongside the boot/can/weed, and `PUNS.junk` gained a dino-mite line.

Arrived as the fake-transparency case (GEMINI_NOTES.md) in its **black-checkerboard**
variant (RGB 1024×1024, squares at 0 and 145). Salvaged on `chroma<=26` with no
brightness gate — safe here because the nugget is all tan, brown, teal and
ketchup-red, with no neutral pixel of its own. Final: RGBA 696×574, which sits
right next to `junk-boot.png` in the 62×41 `#fish` box.

**Optional / not yet wired — deep-sea + fly rod shop icons.** The advanced plan
lists rod icons, but the shop doesn't render rod art today (rods have no `file`
field the way boats do). If we want them, they'd be small transparent sprites
(`assets/rod-fly.png`, `assets/rod-deepsea.png`, ~64×64) and would need a small
shop-UI change to show them — worth doing as its own step, not blocking A6. Say
the word and I'll spec them properly.
