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
- **Subject exclusion — of separate objects.** "No boat, no lily pads, no reeds"
  was obeyed every time. Listing what must *not* be in frame works well **as long
  as the thing is separable from the subject**. It is not reliable for something
  the subject *implies*: R4's Stream angler was asked for "no fishing line" and
  came back with line threaded through the guides, because a rod has a line. What
  fixed it was a whole paragraph, flagged and exhaustive — *"CRITICAL: draw NO
  FISHING LINE anywhere. No thread, string or filament of any kind — not on the
  reel, not threaded through the guides, not trailing from the rod tip. The rod
  must be completely bare."* When you are excluding part of an object's own idiom,
  spend a paragraph and name every form it could take.

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

- **A hand gripping nothing will not come back gripping.** This one cost two
  rerolls, and the fix was to stop describing the hand. *"Held OPEN in a loose
  C-curl, palm toward the viewer, fingers apart"* produced a flat splayed reach.
  Naming a referent and the gestures to avoid — *"the shape of a hand about to
  close around a bicycle handlebar… NOT a flat open palm, NOT fingers spread
  apart"* — produced a **pincer in the wrong plane**: the fingers curled within
  the picture plane, so the tube they formed pointed at the viewer rather than up
  the rod. What worked was **drawing the object in the hand** — "the child is
  HOLDING A FISHING ROD… the separate fingers visible crossing in FRONT of the
  pole" — and then cutting the pieces apart locally. This is *the subject carries
  more weight than any qualifier* one level down: a hand holding nothing is a
  hand holding nothing, however precisely the grip is specified. **Give it the
  object, then cut.**
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
- **A held object that runs off the canvas has been cropped by the frame — so
  extend it, do not taper it in.** The accepted angler's rod exits the top-right
  corner, and the first salvage read that as a defect and tapered the tip inward.
  That was backwards: the rod came out at **51% of the length the old rig had**,
  and of the 32 design px missing, the taper cost 4 and the frame cost 28. The
  frame is not a design decision. Decide what length the thing should be, then
  walk it out along its own axis, resampling the real cross-section so the
  outline tapers with it — a straight shaft is featureless content and the
  synthesis is invisible, even at 42% of the visible length. **Seed the taper
  from the object's measured width at the seam, never from a nominal constant.**
  All three R4 rods were first extended from the pose's nominal half-width, which
  is measured lower down where the shaft is fatter — 16/15/22 px against real
  seam widths of 11.5/6.0/15.5. That steps the shaft outward exactly where the
  synthesis starts and then runs a needle down from it: the Ocean's rod read as a
  spear. Measure the alpha at the seam and taper from *that*, back-loaded (`k**1.6`)
  so the shaft stays full through the middle and thins near the tip like a rod. Neither version
  needed a reroll, and a reroll would have gambled a grip that took three
  attempts.
- **Scale comes from a body part, never from the figure.** The generator draws
  every pose to fill its frame, so figure height carries no world scale between
  poses: R4's *standing* Stream angler arrived 897px tall against the *seated*
  Pond angler's 878 — 2% taller. Scaling both alike would have stood the child up
  no taller than he sits. Match the **head** instead (the Pond's is 318 source px
  wide, 18.1 design px at its scale; the Stream's 217px head matches at 0.083),
  which gave 75 design px standing against 50 seated.
- **Measure a complaint before you spend a reroll on it.** On R4's first Stream
  attempt I called three faults; **two did not survive testing.** "The style has
  gone flat vector" — tonal variation measured stdev 26.4 against the accepted
  Pond angler's 27.3, and the outlines were *less* even, not more. "The
  arm-clear-of-the-body instruction was ignored" — there were 2 separate subject
  runs per scanline through the whole limb; it had worked perfectly. Only the
  baked-in line and the wrong haircut were real. A generation costs Matt a round
  trip, and eyes are worse than a five-line script at judging flatness, evenness
  and clearance. **Reroll on what you measured, not on what you felt.**
- **Don't assume the backdrop came back flat — measure it.** The first two
  angler generations keyed at a blue stdev under 2.5; the accepted one arrived at
  `(248,88,242)` with a stdev of **14.6**, a faint gradient across the magenta.
  Still floods fine at tolerance 70, but the convention is not a guarantee.

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

### When the subject is see-through, the ramp is the wrong tool (R5)

The Whaler came back with a **glass windscreen, and the generator painted the
backdrop through it** — a violet panel that is magenta seen through pale glass.
That is the generator being *right*, and it is a third thing the depth test in
step 1 does not cover: not residue, not a hole in the silhouette, but paint that
genuinely carries some key.

Distance-to-key cannot read it. The violet sits 112 from the key, past `HI`, so
the ramp calls it opaque and hands you a purple blob on a cream boat.

Read alpha from **how much key the pixel carries** instead:

    gap   = min(R, B) - G                       # magenta's signature
    alpha = 1 - gap / (min(KEY_R, KEY_B) - KEY_G)
    fg    = (c - (1-alpha)*KEY) / alpha         # the same unpremultiply

Magenta is the one colour in this palette whose green falls below *both* red and
blue, so on any warm or neutral paint `gap` is negative and alpha clips to 1 —
cream, teak, warm brown outlines and cool grey shadows all survive untouched.
The windscreen came out pale grey at 70% opacity and shows the sky through it in
the game, which is what glass should do. **It also replaces step 3**: unmixing
removes the key's contribution by construction, so there is no spill left to
despill — and a despill rule tuned for warm timber would have flattened the
glass right back to grey anyway.

Use it when the subject contains glass, water, smoke or a thin edge; the ramp is
still right for something wholly opaque, which is most things. `cut-vessel.py`
carries both, one named per painting.

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
