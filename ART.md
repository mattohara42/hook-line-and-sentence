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
min(rgb)>=132` → alpha 0, then crop to the alpha bbox so CSS `contain` seats it
like the original. Flood-fill (not a global color key) protects gray *inside* a
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

### A6 — the Ocean biome (Marlin tier) — *code landed 2026-08-22, art pending*

Phase 2's serial art dependency. Two real requests here — the **scene** and the
**one legendary that gets its own sprite (Muskie Quixote)**. Everything else the
Ocean adds reuses existing art: the 10 ocean sport fish (Marlin Brando, Tuna
Turner, Red Herring…) share the per-tier sprites tinted by `color`, exactly like
the Stream, so they need **no new art**. Same for **Koi Story**, the new Pond
legendary A6 added when Muskie Quixote moved out to the Ocean — it tints the
shared `fish-legendary.png` gold (`#ffd36e`) against Muskie's lavender.

```
ART NEEDED: the Ocean fishing scene (Marlin tier background)
Prompt:   Pixel art side-view of a cozy open-ocean horizon for a fishing game,
          chunky clean pixels, same warm dawn/dusk mood as the pond and stream
          but deeper and bluer — teal shallows fading to deep indigo-blue open
          water, gentle rolling swells, a low far shoreline of muted purple
          hills, a couple of tiny distant sailboat silhouettes on the horizon,
          warm sky with soft gold light and a few soft clouds. Calm water in the
          middle where a boat/kid sits at the waterline (waterline ~55% down,
          matching the pond scene). No text, no UI, no characters, no boat in the
          foreground, no fish, no watermark, no baked-in shadow. Landscape scene,
          fills the frame.
Save as:  assets/background-ocean.png
Size:     match assets/background.png's aspect (~1152×466 / roughly 2.47:1),
          waterline at ~55% height so the existing boat/bobber/fish positions sit
          right; pixelated-friendly, opaque full-bleed (a scene, not a sprite).
Wired in: ✅ YES — `#scene.loc-ocean` in style.css layers this over the pond
          background, exactly like `.loc-stream`. The rule is already live, so
          **the moment this PNG lands in assets/ the Ocean scene appears with no
          code change.** Until then the Ocean shows the pond art (and the server
          logs a harmless 404 for this filename — that's the expected fallback,
          not a bug).
```

```
ART NEEDED: Muskie Quixote — the Ocean legendary hero fish (A6/A8)
Prompt:   Pixel art of a single legendary muskie (muskellunge) fish for a cozy
          fishing game, chunky clean pixels, warm dawn lake palette (teal water
          accents, gold highlights) — a long, sleek, slightly comic predator fish
          with a big toothy grin, mottled olive-green and bronze body with dark
          vertical tiger-stripe bars, large flowing fins and tail, one bright
          determined eye. A touch of quixotic grandeur — noble, adventurous,
          lovable-underdog energy — but still a clean readable silhouette that
          reads at small size. Side profile facing right, single centered
          subject, transparent background, no text, no UI, no watermark, no baked
          -in shadow. Landscape framing.
Save as:  assets/fish-muskie.png
Size:     ~128×86 (landscape ~3:2, matching the other fish sprites' proportions
          but higher-res since it's the hero), transparent background, tight crop
          to the sprite. Pixelated-friendly.
Wired in: not yet — and deliberately so, unlike the background above. The scene
          rule can ship early because it *layers* (a missing PNG just shows the
          pond art underneath). A fish sprite **replaces** `background-image`, so
          wiring it before the file exists would render the Ocean's legendary
          invisible. So this one waits for the PNG, then gets a one-line rule:
          `#scene.loc-ocean #fish.tier-legendary { background-image: url(...) }`
          — note the selector hangs off `#scene`, which carries the `loc-*` class
          (`#fish` itself never does). Tell Claude when it lands and it's a
          one-liner. It's the one Ocean fish worth distinct art; the rest tint
          the shared sprite.
```

**Optional / not yet wired — deep-sea + fly rod shop icons.** The advanced plan
lists rod icons, but the shop doesn't render rod art today (rods have no `file`
field the way boats do). If we want them, they'd be small transparent sprites
(`assets/rod-fly.png`, `assets/rod-deepsea.png`, ~64×64) and would need a small
shop-UI change to show them — worth doing as its own step, not blocking A6. Say
the word and I'll spec them properly.
