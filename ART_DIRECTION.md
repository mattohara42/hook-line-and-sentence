# Hook, Line and Sentence — Art Direction

> **Adopted 2026-08-31.** This is the source of truth for how the game looks
> from here on. It replaces the pixel-art direction that `SPEC.md` shipped v1
> with, and it retires the art strategy in `BUILD_PLAN_GRAPHICS.md` and
> `BUILD_PLAN_VISUAL.md` (V2–V5). The work it implies is scoped in
> `BUILD_PLAN_REFRESH.md`; the prompt mechanics live in `ART.md`.
> Three decisions were taken when it was adopted — see
> **Decisions taken on adoption** at the bottom.

## Style anchor

Warm, painterly, storybook mood inspired by Studio Ghibli's landscape and lighting work. Not a literal recreation, an anchor for palette, light, and edge treatment. Approved reference mockup: muted warm palette, soft banded sky instead of a hard gradient, a glowing light source rather than a flat sun disc, thin warm-toned outlines instead of bold black cartoon linework, gentle rounded proportions.

This replaces two earlier directions that were tried and rejected: a 90s Nickelodeon cartoon look (too flat, wrong mood) and an 80s Sunbow/GI Joe cel-shaded look (palette read as too loud and high-contrast for a cozy kids' game).

## Palette

Muted and warm, not saturated or neon. Skies build from layered horizontal bands (pale blue at the top, warming toward cream or amber near the horizon) rather than a single flat color or a hard gradient. Light sources get a soft glow built from two or three concentric, decreasing-opacity shapes rather than a hard-edged disc. Water uses muted teal-green tones with a darker band for depth, not a flat single blue. Wood and earth tones stay warm and slightly desaturated. Avoid pure black anywhere, outlines and shadow tones use warm dark browns instead.

## Outline and shading treatment

Thin outlines (roughly 1–1.5px equivalent at sprite scale), warm brown or muted tone rather than black. Shading is soft two-tone blocking with a touch of opacity blending at the edges rather than hard flat cel blocks. No heavy black linework anywhere.

## Production approach

Backgrounds are static painted illustrations, one per level, generated via AI image tools and treated as finished art rather than reusable pieces. Character and fish are simpler, rig-based sprites (separate body parts for animation) that pick up the same palette and soft edge treatment as the backgrounds, without attempting full painterly texture on moving parts. This keeps the expensive, hard-to-repeat painterly work limited to backgrounds, while keeping character and fish cheap to animate and reuse across costume and species variants.

## Character

One protagonist across all three levels, costume changes per environment rather than a redesigned character:
- Pond: simple, cozy fishing clothes, seated or standing in a rowboat
- Stream: waders, fly fishing vest
- Ocean: fishing boat gear, life vest

**The costumes are tied together by a warm terracotta accent garment** (R4): the shirt in the Pond, the fly vest in the Stream, the life vest in the Ocean. It is the one hue in the palette that holds a silhouette against teal-green water and green banks in all three levels, and it is the region the favorite-color accent tint filters — which is what keeps that tint a one-line filter instead of a per-costume tuning job.

Rig as separate parts (head, torso, arm, rod) so casting and reeling can be animated by moving parts rather than swapping frames. (R4 settled how many parts and where they come from — see the open assumption below; a rig is three generations plus local cuts, not one generation per part.)

## Fish roster

Follows the existing tier structure from the Cast & Type spec: pond panfish, stream trout, ocean sport fish, roughly 10 fish across 4 tiers total. Each fish is a shared rig (body, fin, tail as separate pieces) varied by silhouette, color, and pattern, keeping the same soft warm palette and thin outline treatment as the character.

## Background layers per level

Each level background is built in three layers for parallax depth:
1. Far background (sky, distant hills or treeline)
2. Water layer (animates independently)
3. Foreground detail (reeds, rocks, dock edge)

## Generation prompt template

Base template to prefix every asset prompt, keeping palette and mood consistent across separate generations:

> Soft painterly illustration in the style of Studio Ghibli background art, warm muted color palette, gentle diffused lighting, thin warm brown outlines rather than black, cozy and inviting mood, no harsh shadows, no neon or saturated colors.

Example asset-specific prompts to build from:

- Pond background: "[base template] A calm forest pond at golden hour, a small wooden rowboat near the shore, lily pads, soft reflected light on the water, gentle hills in the background."
- Stream background: "[base template] A shallow forest stream with smooth stones, dappled sunlight through overhanging trees, moss-covered banks."
- Ocean background: "[base template] A fishing boat on a calm open sea at soft morning light, distant coastline, gentle clouds."
- Character base pose: "[base template] A friendly cartoon child character in simple fishing clothes, three-quarter view, standing pose, rigged-ready with separate arm, rod, and body, soft rounded proportions."
- Fish example (pond tier): "[base template] A round, friendly cartoon sunfish, soft orange and gold pattern, big gentle eyes, simple fin shapes."

Full prompt set to be generated per costume, per fish, and per background following this same template, the same way the cat board game's 20 character prompts were produced.

## Open assumptions (flag for review)

- Assuming three background paintings (one per level) is sufficient, rather than separate paintings per time-of-day or weather variant.
- ~~Assuming the character rig needs four pieces (head, torso, arm, rod) as a starting point, subject to revision once casting animation is prototyped.~~ **Answered in R4 (2026-09-01), and it was not an art question.** Any subdivision with no independent existence — a head off a torso, an arm off a shoulder — is a *local cut of one delivered painting*: it registers perfectly because it is the same pixels, and it costs no generation and no reroll risk. Only the rod (the shop swaps it) and the fingers that close over it must be generated apart from the body. So a pose is **three generations**, and how many layers the rig has is a code decision, free to revise later. The rule is in `ART.md`'s same-canvas section.

## Decisions taken on adoption (2026-08-31)

Three things in this doc needed a call against what the game already shipped.
Matt made all three; they are settled, not open questions.

1. **How far the restyle reaches: everything except the keyboard grid.** The
   scene, the HUD, the tackle box, the shop, the badges *and* the collection
   screen's CSS-drawn fish icons all move to this palette and edge treatment.
   The **ghost-hands finger keyboard is untouched** — it is the best part of the
   game and `CLAUDE.md` puts it off limits. Consequence: the game is no longer
   "pixel-art"; `image-rendering: pixelated` comes off every painterly asset,
   and `SPEC.md`'s vision line was rewritten rather than left contradicted.
2. **One protagonist, costumes — the age + sex assignment is retired.** The
   earlier decision (angler assigned from a kid's age and sex at profile setup,
   recorded in `BUILD_PLAN_VISUAL.md`) is dropped in favour of this doc's single
   character with three costumes: three rigs total instead of three per variant.
   The **favorite-color accent tint survives** — it is a CSS filter on one
   region of a drawn sprite, so it costs no extra art and keeps the
   personalization that the assignment was there for.
3. **Fish: one rig per species, not shape families.** This doc assumes ~10 fish;
   the live roster in `data/fish.json` is **33 species** across the four ranks,
   currently served by four PNGs plus a hue-rotate. Matt's call is a rig per
   species — every fish in the collection gets its own art. That is the single
   most expensive item in the refresh (~33 rigs, body/fin/tail each), so
   `BUILD_PLAN_REFRESH.md` R6 delivers it in **waves by biome**, with the
   existing tinted placeholder standing in for any species whose art has not
   landed yet. No milestone blocks on the full set.
