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
  end of a prompt produced exactly 1584×672 on three consecutive requests. This
  is the single most dependable instruction in the whole set.
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

- **Percentages of canvas height.** This is the big one.

  | asked | got |
  |---|---|
  | waterline at 55% | 55.95% — fine |
  | waterline at 56% | **46.13%** — 65px out |
  | "nothing above roughly 70% down" | detail reached 32.6% |

  Do not rely on a percentage for anything that has to register with something
  else. Say **"the very bottom-left corner"**, **"rise only a little way up from
  the bottom edge"**, **"along the bottom edge"** — corners and edges are things
  the generator can see.

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
