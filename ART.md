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
  no build step — one PNG per thing. (**`image-rendering: pixelated` is on its
  way out** — it belonged to the pixel era and R2 removes it; painterly art must
  not be nearest-neighbour scaled.)
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
  with a darker depth band; warm slightly-desaturated wood and earth.
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

## Gotcha: Gemini fakes transparency

Gemini often ignores "transparent background" and instead **paints the
transparency checkerboard as opaque pixels** (alpha 255), with the subject
floating in an oversized canvas. Expect it on nearly every sprite. Tells: a corner pixel reads
alpha 255, and the file is far bigger than a tight sprite (`boat.png` is
1152×466; the bad batch came in at 1408×768). Salvage it with Pillow — no
ImageMagick on this Mac.

**Don't hardcode the checkerboard color — detect it.** Every generation picks a
different pair: gray-on-gray (138/204, and 88/203 on the G1 body), black-on-gray
(0/145), gray-on-gray-again (158/223), and the rod came back **blue-on-black**
(0,1,22 / 60,79,243). Brightness bands and "neutral pixels" rules both broke on
that spread. What works:

1. Take the two most common **border** colors — that's the checkerboard pair.
2. A pixel is background if it sits within ~60 RGB of the **line between those
   two colors**. That covers both squares plus the anti-aliasing along every
   square boundary, and nothing else.
3. **Flood-fill from the edges**, never key globally, so a matching color inside
   the subject is safe. Count `alpha==0` as fillable so a re-run still floods.
4. Crop to the alpha bbox, so CSS `contain` seats the sprite like the original.

Why the line rather than a tolerance around each color: it's what protects a
**black outline**. The G1 body sprite is outlined in pure black on a 88/203 gray
checkerboard — a chroma-only or "dark pixels are background" rule eats that
outline and leaks into the sprite, while black sits far off the 88↔203 line and
survives untouched.

The working script lives in the scratchpad, not the repo — it's ~40 lines and
gets rewritten per batch as Gemini finds new ways to fake transparency.

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

> **Nothing is open right now (2026-08-31).** The two requests that were open —
> V2's four reference-drawn angler pieces and the re-shot Stream background —
> were **withdrawn** with the pixel direction; both are marked below. The Art &
> Animation Refresh (`BUILD_PLAN_REFRESH.md`) starts with two code-only
> milestones, R1 and R2, so **Matt has no art to generate until R3**, which opens
> with the Pond's three background layers. Don't generate anything against the
> old prompts in this file; they are kept as a record of what's on screen, not as
> a queue.

### ✅ G1 — the angler, taken apart (landed 2026-08-25)

All three PNGs are in, salvaged and wired: `body-kid.png` (RGBA 560×864),
`hat-straw.png` (1131×617) and `rod-basic.png` (800×800). Offsets in
`CONFIG.rig.layers` were tuned in the browser against the old `kid.png` side by
side, so the composite reads at the same size and sits in the boat the same way.
The rod arrived on a **blue** checkerboard — see the gotcha above, which now
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

**`assets/fish-muskie.png`** arrived as the fake-transparency case above (RGB,
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

Arrived as the fake-transparency case above in its **black-checkerboard**
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
