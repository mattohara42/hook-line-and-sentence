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

A piece that doesn't fit is a **reroll, not an offset tweak**. Tuning offsets at
4x zoom is exactly how G1 shipped something that looked wrong at 1x.

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

### 🟡 R3 — the Stream, repainted as three layers (open, ready to generate)

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
          shadows, no neon or saturated colors. Just the surface of a shallow
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
          horizontal line a little above the vertical middle. Everything above
          that line must be filled with flat, solid, uniform magenta (#FF00FF) —
          a plain backdrop color, one single unvarying color, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere in
          the water itself. Aspect ratio 2.36:1. Output as PNG.
Save as:  assets/background-stream-water.png
Size:     1584×672. Delivered on flat magenta above the line; the alpha is a cut
          by row, registered to layer 1 (GEMINI_NOTES.md)
Wired in: not yet — the middle plane, #bg-water for .loc-stream
```

```
ART NEEDED: Stream background, layer 3 of 3 — foreground detail
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Foreground streamside detail,
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
