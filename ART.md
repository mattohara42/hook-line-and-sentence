# Art Pipeline

How art gets made for Typing Fishing. It's a family project — a kid-drawn
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

- Almost everything is a CSS `background: url("assets/…png")` with
  **`image-rendering: pixelated`** (see `style.css`). No sprite atlas, no build
  step — one PNG per thing.
- **Fish share one sprite per tier**, not per species: `fish-common.png`,
  `fish-rare.png`, `fish-legendary.png`. Each species in `data/fish.json` has a
  `color`, and the code tints the shared shape via the `--fish-color` CSS var.
  So a *new fish species usually needs no new art* — just a `color`. Only make a
  distinct sprite when a fish should look genuinely different (e.g. legendary).

## Style guardrails (put these in every prompt)

- **Cozy pixel art**, chunky pixels, clean readable silhouette (it renders small).
- **Palette:** warm dawn/dusk lake — teal water, muted purple hills, warm sky,
  gold accents. Match the existing sprites' mood, not a neon/high-contrast look.
- **Framing:** single subject, centered, **transparent background** for anything
  that isn't a full scene (sprites, hats, boats, fish, junk items).
- **No text, no UI, no watermark, no drop shadow baked in.**
- Square-ish canvas sized to how it's used (small sprites ~64×64; scenes wider).

## Gotcha: Gemini fakes transparency

Gemini often ignores "transparent background" and instead **paints the
transparency checkerboard as opaque pixels** (alpha 255, neutral gray/white),
with the subject floating in an oversized canvas. Tells: a corner pixel reads
alpha 255, and the file is far bigger than a tight sprite (`boat.png` is
1152×466; the bad batch came in at 1408×768). Salvage it with Pillow — no
ImageMagick on this Mac — by border **flood-fill** on `chroma<=26 and
min(rgb)>=120` → alpha 0, then crop to the alpha bbox so CSS `contain` seats it
like the original. Count `alpha==0` as fillable too, so a re-run on a
half-salvaged file still floods.

**The brightness gate is per-batch, so read the corner pixels first.** Gemini
draws the checkerboard light *or* dark: the muskie batch was gray-on-gray
(138/204, dark squares drifting 130–140, so a `>=132` floor left stray pixels
pinned to the borders that silently blocked the crop), while the nugget batch
was black-on-gray (0/145) with mid-gray anti-aliasing at every square boundary.
Chasing that with brightness bands is a losing game — **when the subject has no
neutral colors of its own, drop the brightness test entirely and fill on
`chroma<=26` alone.** The border flood-fill is what protects the art. The one
case that needs the brightness gate back is a sprite with a *pure black or gray
outline*: with no hue at its edge, a chroma-only fill eats the outline and leaks
inside. Check the subject's edge color before choosing. Flood-fill (not a global color key) protects gray *inside* a
subject. Re-exporting cleanly from Gemini is better when you can get it.

## Prompt template Claude should reuse

> Pixel art <subject>, cozy retro game asset, chunky clean pixels, warm dawn
> lake palette (teal water, muted purple hills, warm sky, gold accents), single
> centered subject, transparent background, no text, no shadow. <extra detail>.

## Open art requests

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

### ⚠️ The Stream scene, re-shot — the one open request

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
