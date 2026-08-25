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
like the original. The `>=120` floor matters: the checkerboard's dark squares
aren't one flat value (the muskie batch ran 130–140), and a tighter floor leaves
stray gray pixels pinned to the borders that silently block the crop. Count
`alpha==0` as fillable too, so a re-run on a half-salvaged file still floods. Flood-fill (not a global color key) protects gray *inside* a
subject. Re-exporting cleanly from Gemini is better when you can get it.

## Prompt template Claude should reuse

> Pixel art <subject>, cozy retro game asset, chunky clean pixels, warm dawn
> lake palette (teal water, muted purple hills, warm sky, gold accents), single
> centered subject, transparent background, no text, no shadow. <extra detail>.

## Open art requests

### ✅ A3 — the Stream biome (landed)

`assets/background-stream.png` exists and is wired (`#scene.loc-stream` layers
it over the pond scene). Nothing outstanding. Stream **fish need no art** — they
reuse the shared per-tier sprites tinted by each species' `color`.

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


### Family easter egg — a dino-nugget junk item

Not tied to any milestone — just a fun extra for the junk-catch pool
(`CONFIG.junk.items`, `app.js:679`), which already has `an old boot` /
`a rusty can` / `a clump of pond weed`. A dinosaur-shaped chicken nugget
(one of Frankie's favorite things) fits the same "so, not a fish" joke.

```
ART NEEDED: a junk-catch item — dinosaur chicken nugget
Prompt:   Pixel art of a single dinosaur-shaped chicken nugget (like a kids'
          frozen dino nugget, T-rex silhouette), cozy retro game asset,
          chunky clean pixels, warm dawn lake palette (teal water accents,
          gold highlights), lightly golden-breaded texture, maybe a tiny
          drip of ketchup for scale/humor. Single centered subject,
          transparent background, no text, no UI, no watermark, no baked-in
          shadow.
Save as:  assets/junk-nugget.png
Size:     ~64×64, transparent background, tight crop, matching
          junk-boot.png / junk-can.png / junk-weed.png in scale and style.
Wired in: not yet — deliberately so, same reasoning as the Muskie sprite
          above. `el.fish.style.backgroundImage` (app.js:714) *replaces*
          the fish sprite for whichever junk item gets rolled, so adding
          this to `CONFIG.junk.items` before the PNG exists would show a
          broken image on that roll. Once the file lands, it's a one-line
          config.js addition: `{ id: "nugget", name: "a dinosaur chicken
          nugget", file: "junk-nugget" }`. Tell Claude when it's in and
          it's wired immediately.
```

**Optional / not yet wired — deep-sea + fly rod shop icons.** The advanced plan
lists rod icons, but the shop doesn't render rod art today (rods have no `file`
field the way boats do). If we want them, they'd be small transparent sprites
(`assets/rod-fly.png`, `assets/rod-deepsea.png`, ~64×64) and would need a small
shop-UI change to show them — worth doing as its own step, not blocking A6. Say
the word and I'll spec them properly.
