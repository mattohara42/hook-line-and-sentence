# GEMINI_NOTES.md — how the image generator actually behaves

**Read this before writing any art prompt.** It is the accumulated memory of how
Gemini responds to this project's requests: what it obeys, what it silently
ignores, and how to salvage what comes back. It exists so no future session
re-derives these the expensive way — every rule below was paid for with a real
generation.

Scope note, so the docs don't drift into each other:

| doc | owns |
|---|---|
| `ART_DIRECTION.md` | what the art should **look like** — palette, light, outlines |
| `ART.md` | the **pipeline and the open requests** — filenames, sizes, what's landed |
| **this file** | how the **generator behaves**, and how to prompt and salvage it |

---

## The short version

1. **Position by edges and corners, never by percentage.** Percentages are the
   least reliable thing you can ask for.
2. **Name a flat backdrop colour** instead of asking for transparency — but
   **detect the colour you actually got**, because it will not be the one you
   asked for.
3. **State keep-outs as composition**, not as geometry.
4. **Output format is not prompt-controllable.** Ask anyway; get PNG from the
   download UI.
5. **A miss in featureless content is salvageable. A miss in drawn content is a
   reroll.**
6. **Check for backdrop colour bled *into* the subject first** — that one is
   never fixable downstream.

---

## What it reliably gets right

- **Aspect ratio, when stated as a ratio.** Adding `Aspect ratio 2.36:1` to the
  end of a prompt produced exactly 1584×672 on **six** consecutive requests
  across two levels. This is the single most dependable instruction in the whole
  set. **State the pixel dimensions in the prompt body too** — "The image is 1584
  by 672 pixels, aspect ratio 2.36:1". The ratio alone has never missed, so this
  is belt and braces rather than a fix, but it costs nothing and it makes the
  prompt self-contained if it is ever pasted somewhere without its spec line.
- **Palette, when described in words rather than hex.** The R3 far layer came
  back with sky `#b7cfd0` against a `#b7cfd8` target and glow `#f9e9b7` against
  `#f7e6bd` — effectively exact, from prose alone. Hex values in the prompt are
  not needed and are not obviously honoured; the descriptive palette language in
  `ART_DIRECTION.md`'s preamble is doing the work.
- **Mood, treatment and outline weight.** The Ghibli-anchored preamble delivers
  consistently across separate generations. Keep prefixing it to everything.
- **Subject exclusion.** "No boat, no lily pads, no reeds" was obeyed every time.
  Listing what must *not* be in frame works well.

## What it reliably ignores

- **Hedged positions.** This is the big one, and the evidence is sharper than it
  first looked.

  | asked | got | |
  |---|---|---|
  | "must sit at **exactly 55%** down" (Pond far) | 55.95% | ✅ |
  | "must start at **exactly 56%** down" (Pond water) | **46.13%** | ❌ |
  | "nothing above **roughly** 70% down" (Pond fore) | 32.6% | ❌ |
  | "**just below** the middle… **a little more** above… **roughly** 55%" (Stream far) | **66.96%** | ❌ |

  **⚠️ The "hedging is the failure" reading was tested and is wrong.** The Stream
  far layer was rerolled with the hedges removed and the line stated three
  non-negotiable ways — the exact percentage, the complement (top 55% / bottom
  45%), and a floor ("do not place it any lower"). It came back at **66.96%**:
  identical to the hedged attempt, to the pixel. A third attempt moved it only to
  **62.35%**.

  **The real rule is that the generator has a strong compositional prior per
  subject, and prompt wording barely moves it.** A "forest stream seen from the
  far bank" wants roughly two thirds forest; three rerolls bought five
  percentage points. Wording is worth getting right, but do not expect it to win
  an argument with the prior — **budget one reroll, then fix the rest in
  salvage.**

  What actually works:

  1. **State it exactly and unhedged** — "must sit at exactly 55% down". Worth
     doing, but on its own it is not sufficient: see the warning above.
  2. **State the complement too** — "the forest fills the top 55%, the water
     fills the bottom 45%". Two numbers that have to add up are harder to fudge
     than one.
  3. **State a bound** — "do not place it any lower than 55%".
  4. **Anchor to edges and corners where you can** — "the very bottom-left
     corner", "along the bottom edge". These are things the generator can see,
     and they are what made the Pond's foreground keep-out work.

  The one exact-percentage failure (Pond water, 56% → 46%) is the layer with
  **no natural horizon in it** — water only, nothing to anchor the line to.
  Expect abstract boundaries to drift, and rely on the salvage instead (see
  "let layer 1 define the truth").

- **Output format.** "Output as PNG" was in the prompt for all three R3 layers.
  All three arrived as JPEG. Format is chosen by the app and the download
  control. Keep the line (it is free) but get PNG from the download UI, and
  never plan around the prompt winning.

- **Saturated colours, when the style preamble forbids them.** Asked for a
  `#FF00FF` backdrop; got `#c642b0`, because the same prompt's preamble says
  *"no neon or saturated colors"* and that applied to the backdrop too. **This is
  a prompt conflict, not a generator failure** — and it does not matter, as long
  as nothing downstream assumes the exact value.

## Things it does when you do not ask

- **It fakes transparency.** Asked for a transparent background, it paints the
  editor's transparency **checkerboard as opaque pixels**, subject floating in an
  oversized canvas. Tells: a corner pixel reads alpha 255, and the file is far
  bigger than a tight sprite. Every generation picks a different pair —
  gray-on-gray (138/204, 88/203), black-on-gray (0/145), 158/223, and once
  **blue-on-black** (0,1,22 / 60,79,243).
- **It flattens gradients you did not insist on.** The R3 far layer's water came
  back essentially one tone (luminance drop of 12 top to bottom). The water layer
  prompt was rewritten to say the deepening **"is the point of this layer"** and
  *"do not paint it as one flat tone"* — and the drop went to **83**. Emphatic,
  named-as-the-goal phrasing works where plain description does not.

---

## Characters: what moves for wording, and what doesn't (R4)

Unlike composition, **subject description does move.** R4's first angler missed
on two counts and both were fixed in one reroll — which is the opposite of the
Stream far layer, where three rerolls bought five percentage points. Know which
kind of problem you have before deciding what a reroll is worth.

- **A hand gesture needs a physical referent, not an anatomical description.**
  *"held OPEN in a loose C-curl, palm toward the viewer, fingers apart"* produced
  a flat splayed reach — a wave, not a grip. **"the shape of a hand about to
  close around a bicycle handlebar"**, plus the negatives *"NOT a flat open palm,
  NOT fingers spread apart, NOT a waving or reaching gesture"*, produced the grip
  first try. Name the object the hand would be holding, then rule out the
  gestures it could be confused with.
- **"A young child" defaults to a toddler.** The first attempt came back as
  roughly a two-year-old: big round head, no neck, stubby fingers. What fixed it
  was all three of an age in years (*"a school-age child of about eight"*), the
  proportions spelled out (*"slim school-age proportions with a visible neck,
  long limbs and slender fingers"*), and the negative (*"NOT a toddler, NOT a
  baby, NOT a chubby big-headed infant"*).
- **Don't spend a reroll on placement inside the canvas.** For a rig, every piece
  shares one canvas, so they can only be wrong together and a shared offset is
  absorbed once when the pose's box is measured. Spend the weight on the pose and
  the character instead — those are what a reroll actually exists for.

## The backdrop convention (use this instead of asking for transparency)

**Ask for a flat magenta `#FF00FF` backdrop, not a transparent one, and not a
checkerboard.** A flat fill beats a specified checkerboard on three counts:

- one colour to detect, not two;
- a checkerboard is high-frequency detail, which is exactly what JPEG smears and
  what diffusion blurs into the subject — a large flat field survives both;
- it removes the reason the checkerboard appears at all. The generator paints one
  because it was asked for "transparent" and renders what transparency *looks
  like*. Give it a colour and there is nothing to imitate.

**Why magenta:** absent from `ART_DIRECTION.md`'s palette of warm creams, ambers,
teal-greens and browns. The nearest things in the whole game are ember `#d4886a`
and the muskie's lavender `#d4c5f0` — both far off in hue and saturation. Green
would be the worst possible choice against foliage, moss `#93ac78` and teal
water; blue sits too close to the pale sky `#b7cfd8`.

**Always detect the backdrop from the border rather than assuming your value.**
You will not get `#FF00FF` (see above). What matters is *uniformity*, not hue —
the R3 foreground's backdrop came back at **stdev <1** across the whole clear
area, which is all keying needs.

**Where geometry answers the question, do not key at all.** The Pond's water
layer is transparent above a straight horizontal line, so its alpha is a **cut by
row** — no tolerance, no flood fill, nothing to get wrong. Ask for the magenta
anyway, as a check on where the generator actually put the line.

---

## Salvage recipes

### Flat backdrop → alpha (current)

Three passes, in order. On the R3 foreground this took surviving backdrop-colour
residue from **6.01% → 3.79% → 0.00%**.

1. **Flood fill from the edges**, never a global key — a matching colour inside
   the subject must stay. Count `alpha==0` as fillable so a re-run still floods.
   **Then seed the enclosed pockets too.** A silhouette with a real hole in it —
   the gap between an arm, a shirt hem and a leg — leaves key-coloured pixels the
   border flood can never reach, and they must come out or the sprite renders
   with a magenta window. Tell them from contamination by **depth**: residue
   hugs edges (0–8px on R4's angler), a genuine pocket sits 180px+ deep and is
   uniformly the key colour. Measure before calling it bleed — the reroll rule
   only bites on the shallow kind.
2. **Alpha ramp across the fringe.** Between distance `LO` and `HI` from the key
   (55 and 110 worked), set `alpha = (d-LO)/(HI-LO)` and **unpremultiply**:
   `fg = (c - (1-t)*KEY) / t`. This is what stops a coloured halo on every
   anti-aliased edge.
3. **Targeted despill** on what survives. Derive the test from the subject's own
   palette: pond vegetation is olive and tan — blue *below* green — so any
   remaining pixel with blue well above green is residue and never paint.
   **This test is palette-specific. Re-derive it per asset; do not copy the
   numbers.**
4. Crop to the alpha bbox for sprites, so CSS `contain` seats them like the
   original. (Not for full-canvas layers, which must keep their canvas.)

### Checkerboard → alpha (legacy, for anything generated before the convention)

1. Take the two most common **border** colours — that is the checkerboard pair.
2. A pixel is background if it sits within ~60 RGB of the **line between those
   two colours**. That covers both squares plus the anti-aliasing along every
   square boundary, and nothing else.
3. Flood-fill from the edges, as above.
4. Crop to the alpha bbox.

Why the line rather than a tolerance around each colour: it protects a **dark
outline**. The G1 body sprite was outlined in near-black on an 88/203 grey
checkerboard — a chroma-only or "dark pixels are background" rule eats that
outline, while it sits far off the 88↔203 line and survives untouched. With the
flat-magenta convention this problem disappears, since warm-brown outlines are
nowhere near the key.

---

## What a miss costs, and when to reroll

**The dividing line is whether the content has drawn features.**

- **Fitting beats cropping: trade rows between the two edges.** A crop alone
  changes the canvas and so changes what `cover` discards. Instead move the
  horizon by taking rows off one edge and regrowing them at the other, which
  holds the canvas — and therefore the framing — exactly where the other levels
  have it. It has now worked in both directions: the Stream's far layer was 74px
  **low**, so 113px came off the top and 113px of water was regrown at the
  bottom; the Ocean's was 25px **high**, so 25px of sky was regrown at the top
  and 25px of water dropped off the bottom. Both edits are free in practice —
  sky and water are smooth gradients at the outer edges, and **layer 2 repaints
  the water regardless**, so the regrown half is never seen.
- **Cropping is not rescaling, and it is available to drawn content.** A crop
  reframes without distorting, so it can move a horizon into registration where
  a rescale would smear the trees. The cost is canvas: cropping the Stream's far
  layer by 98px landed its waterline within 0.03% of the Pond's, but took the
  canvas to a 2.76 aspect, so `cover` then throws away 273px of width instead of
  129. Check what leaves the frame before accepting it — and apply the identical
  crop to all three of that level's layers.
- **Featureless content is salvageable.** The Pond's water layer missed its
  waterline by 65px and was still kept: it is a smooth vertical gradient, so its
  only meaningful edge is the top one — the very thing being set. Discard the
  bad rows, rescale the rest into the target band. Compressing a featureless
  gradient by 17% is invisible.
- **Drawn content is a reroll.** Reeds, a dock edge, a rig piece, a shoreline —
  anything with recognisable form cannot be stretched into place without
  showing. **This is the standing "a piece that doesn't fit is a reroll, not an
  offset tweak" rule**, and it is what the water-layer exception must never be
  read as precedent against.
- **Backdrop colour bled into the subject is always a reroll.** A pink-fringed
  reed cannot be keyed out. Check for it first, before any other check.

### Spend the prompt where it can win

Corollary of the prior being immovable: **constraints compete.** Once a
constraint can be fixed in salvage, stop spending prompt weight on it and give
that weight to something that cannot be fixed downstream.

The Stream's layer 1 is the worked example. Its waterline is fixable by cropping
in either direction — from the top to lower the percentage, from the bottom to
raise it (and the water lost that way is repainted by layer 2 anyway). So the
prompt drops from three insistent statements of an exact percentage to a single
easy floor ("water should fill at least the bottom third"), and the reclaimed
weight goes to the painterly treatment, which **cannot** be salvaged afterwards.

**Pick foreground subjects that are naturally small.** A near plane has to hug
the bottom edge and leave the middle of the frame clear, and the reliable way to
get that is to name objects that are *inherently* low — lily pads, reeds, mossy
rocks, ferns, a fallen log. Then "hug the bottom edge" agrees with the subject
instead of fighting it, and it worked first time on both the Pond and the
Stream. Name a subject with no small version and the adjectives lose: the
Ocean's foreground asked for "the near crest of a swell **breaking**… close to
the viewer" and got exactly that — a breaking wave is big by definition, and it
covered **42.9%** of the box where the angler renders, against 0.2% and 1.6% for
the other two levels. **The subject carries more weight than any qualifier
attached to it**, which is the same lesson as the compositional prior, one level
down: choose what you are asking for, not just how you describe it.

**Style is the thing to spend on**, because a style miss is always a reroll.
Naming the medium ("painted by hand in soft gouache and watercolor, visible
brushwork, tonal variation inside every shape") and explicitly naming the
failure mode to avoid ("NOT flat vector art, a cartoon, or clean digital
illustration with even line weight") is the phrasing that got written after a
generation drifted flat and graphic.

---

## Multi-layer sets: let layer 1 define the truth

Proven on the Pond, and it changes how the other levels get asked for.

**Only the first layer's registration has to be close.** Layers 2 and 3 are
salvaged into agreement with it locally — the water layer by a cut-and-rescale
by row, the foreground by keying and placing. So a positional miss on layers 2
or 3 is cheap, and the prompts for them can state the line loosely and lean on
the backdrop colour instead.

**Every layer of a level needs the style block, not just the first.** The
layers of one level are painted against each other in the same frame, so if the
medium is only named on layer 1, the others come back as a different painting
stacked on it. This failure mode does not exist for a single-image background —
it appears the moment a level is split — and it is invisible until the layers
are composited, which is another reason to composite locally before wiring.

**The layers agreeing with each other matters more than any of them agreeing
with the nominal number.** A mismatch between planes is a visible seam; a small
shared offset from the spec is not. The Pond's three layers all sit 3px low
together and nothing in the scene shows it.

Corollary worth stating because it is easy to get backwards: **if layer 1 is
ever rerolled, re-cut layers 2 and 3 from their original downloads** rather than
editing the committed PNGs, which have already been baked to the old layer 1.

---

## Delivery checklist

Run these in order — the early ones are the ones that force a reroll, so
checking them first saves the work of the later ones.

1. **Backdrop colour bled into the subject?** → reroll. Not fixable.
2. **Canvas size and aspect** as specified.
3. **Anything in a keep-out zone** (for this game: the bottom-centre third, where
   the finger-guide panel sits, and the rig's box at design x20–138, y140–224).
4. **Registration** against whatever it has to line up with — and remember the
   layers must agree with *each other* before they agree with any nominal number.
5. **Palette** against `ART_DIRECTION.md`'s table: no pure black, darks no deeper
   than `#33291f`, sky no more saturated than `#b7cfd8`/`#f2ddbe`.
6. **Then** key it, and **composite locally at game scale before wiring
   anything.** This is the standing habit and it is how G1's misregistration got
   caught late instead of early.
