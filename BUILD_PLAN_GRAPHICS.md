# Typing Fishing — Graphics & Character Rig Build Plan

Companion to `SPEC.md`, `BUILD_PLAN.md` (v1, M1–M10) and
`BUILD_PLAN_ADVANCED.md` (Advanced Progression, A0–A8). This breaks the
**Graphics & Character Rig** epic — brainstormed August 2026 and parked in
`BACKLOG.md` until the Ocean shipped — into sized, ordered, verifiable
milestones. Same rules as before: **one milestone at a time, each ends
playable.**

**Status:** not started. The park condition is met — A0–A8 all shipped, so
Advanced Progression is complete. **The long pole is art**: every milestone
below except G6 needs PNGs from Matt, and G2 additionally waits on the re-shot
Stream background already requested in `ART.md`.

## What this epic is for

`assets/kid.png` bakes hat + body + rod into a single PNG. That's why cosmetic
hats have been deferred since the boat-skin shop, and it's why the game shows
the same kid in the same rowboat in all three biomes. Every feature below —
different anglers, waders at the Stream, a real hat shop — is blocked on the
same split, so it's worth doing once rather than working around three more
times.

**What Matt asked for (August 2026):** a little boat in the Pond, a
fisherperson in **waders** in the Stream, and a **Boston Whaler** in the Ocean.
Different fisherpeople, with hats and rods.

## Guardrails (inherited, non-negotiable)

1. **No canvas, no build step, no framework.** DOM/CSS layers, vanilla JS, the
   existing `index.html` / `app.js` / `logic.js` / `style.css` / `config.js` +
   `data/*.json` shape.
2. **All tuning in `config.js`.** Layer offsets, rig placement and tint targets
   are tuning values, not magic numbers in game logic.
3. **New pure logic goes in `logic.js` with tests** (mirrors the existing
   `logic.js` + `tests/` split).
4. **Art count stays fixed as options grow.** Colors are runtime tints, never a
   PNG per combination (see AD1).
5. **The 720×360 design-space canvas is untouched.** Everything positions in
   design px; `#scene-frame` keeps scaling it to the viewport.
6. **Nothing may land in the bottom-center finger-guide panel.** That panel
   covers roughly the bottom third of the scene — the constraint that killed
   the first attempt at fixing the Stream's boat placement (PR #38).

## Locked decisions (Matt, August 2026)

| # | Decision | Why |
|---|----------|-----|
| **AD1** | **Layered + tinted rig, not a sprite per variant.** Separate transparent PNGs — `body-<character>.png`, `hat-<style>.png`, `rod-<style>.png`, vessel — composited as independently positioned layers, the way `#boat`/`#kid` already work. A kid's favorite color is a runtime tint on one neutral accent region per item (hat band, boat trim, rod wrap), reusing the `--fish-color` / `color-mix()` / `hue-rotate()` trick already in `style.css` | Keeps the art count fixed no matter how many colors or characters get added |
| **AD2** | **Character picker = a few specific family avatars**, 2–4 base bodies styled after Matt's actual kids (Kate included), chosen once at profile setup alongside a favorite color; lives on the existing per-kid profile | Not a generic roster, not switchable mid-session — it's *your* angler |
| **AD3** | **Vessel is per location, not per rank.** Pond = small rowboat, Stream = **waders, no boat**, Ocean = **Boston Whaler** | A kid dropping back to the Pond for a cozy session gets the Pond's boat, not a trophy yacht |
| **AD4** | **Rig placement moves into `config.js`,** one block per location (vessel, rig x/y, rod-tip origin) | G2 needs the Stream angler standing somewhere different from where the Pond boat floats; today those are magic numbers in `style.css`/`app.js` |

## Milestones

### G1 — Split the angler into layers
The unblocker. No new behavior, no new options — just the same kid, drawn from
parts.
- `ART.md`: `body-kid.png` (bare-headed, no rod), `hat-straw.png`,
  `rod-basic.png` — the existing `kid.png` look, taken apart.
- `style.css`: `#kid` becomes `#body` + `#hat` + `#rod` layers inside `#rig`.
- `config.js`: `CONFIG.rig.layers` — per-layer offset + size in design px.
- `logic.js`: `resolveRigLayers(save, CONFIG)` → the ordered list of
  `{layer, file, tint}` to render, + tests.
- **Done when:** the Pond looks materially the same as it does today, but the
  hat is its own PNG and swapping it is a one-value config change.

### G2 — One rig per location: rowboat, waders, Boston Whaler
The milestone Matt actually asked for. **Waits on the re-shot Stream
background** (`ART.md`) — a standing angler needs a bank to stand on, and the
current top-down art has none.
- `ART.md`: `boat-rowboat.png` (a re-crop of today's `boat.png`),
  `body-waders.png` (standing pose), `boat-whaler.png` (center console, high
  freeboard, rod holders).
- `config.js`: `CONFIG.rig.byLocation` — vessel file (or `null` at the Stream),
  rig x/y, rod-tip origin, which body pose to use.
- `app.js`: `applyScene()` applies the location's rig block; the cast line
  derives its length and angle from the rod tip and bobber instead of the
  hardcoded `275px` / `9.8deg`.
- **Done when:** switching spots swaps the vessel and the pose, the kid stands
  in the Stream instead of floating in a boat, the cast line lands on the
  bobber in all three biomes, and no rig sits behind the finger-guide panel.

### G3 — Family characters + favorite color
- `ART.md`: 2–4 `body-<name>.png` per pose (see the open question below).
- `app.js`: character + favorite-colour picker in the existing profile-setup
  flow; `save.character` / `save.color` ride the per-kid doc (no new
  Firestore shape — see `FIRESTORE.md`).
- `style.css`: accent regions tint from a `--kid-color` custom property.
- **Done when:** two profiles show visibly different anglers, and changing a
  favorite color re-tints with no new art.

### G4 — Hats & rods as real shop items
Closes the "Cosmetic hats" item deferred since the boat shop, and the rod-icon
gap `ART.md` flagged (rods have no `file` today the way boats do).
- `ART.md`: 3–4 hats, 2–3 rod styles.
- `config.js`: `shop.hats` / `shop.rods[].file`, same shape as `shop.boats`.
- `app.js`: HATS and RODS sections in the shop, mirroring BOATS exactly
  (`renderShopList` already generalizes).
- **Done when:** buying and equipping a hat changes the angler everywhere it
  appears, and it persists across a reload.

### G5 — Fish shape families
Today three silhouettes cover four tiers, tinted per species. Species read as
colors, not fish.
- `ART.md`: 2–3 more shapes (round panfish / slender predator / flat-bodied).
- `data/fish.json`: a `shape` tag per species; Muskie Quixote keeps its bespoke
  sprite.
- `style.css`: `.cfish` (the collection silhouette) gets matching shapes so
  uncaught fish still read right.
- **Done when:** a bluegill and a pike read as different fish at a glance, in
  the scene and in the collection grid.

### G6 — Foreground depth per location
The only milestone with no art dependency.
- `style.css`: extend the CSS-shape pattern that already draws the Pond's
  `.reeds` — stream grasses, an ocean swell — rather than commissioning
  full-width foreground PNGs that would drift over the boat and fish on resize.
- **Done when:** each biome has a foreground element, and none of them collide
  with the rig, the fish path or the line.

## Art dependency (the long pole — start early, see `ART.md`)

| Milestone | PNGs |
|---|---|
| *prereq for G2* | re-shot `background-stream.png` (already requested) |
| G1 | `body-kid.png`, `hat-straw.png`, `rod-basic.png` |
| G2 | `boat-rowboat.png`, `body-waders.png`, `boat-whaler.png` |
| G3 | 2–4 character bodies × pose |
| G4 | 3–4 hats, 2–3 rods |
| G5 | 2–3 fish silhouettes |
| G6 | none (CSS shapes) |

Claude writes the prompts and filenames when each milestone starts; Matt
generates. Expect the transparency-checkerboard salvage on most sprites —
`ART.md` documents both the light and dark variants.

## Open questions for Matt

1. **Two poses per character, or one?** The Stream needs a standing angler and
   the boats need a seated one. Cleanest is two body PNGs per character
   (sitting + standing), so 3 characters = 6 bodies. The alternative — one pose
   plus a waders overlay — halves the art but means compositing boots and chest
   waders over a seated body, which will look off. **Recommendation: two poses.**
2. **Who's in the roster?** AD2 says 2–4 family avatars including Kate; the
   prompts need names and a one-line look for each.
3. **How does the kid ride in the Whaler** — standing at the console, or seated
   like the rowboat? Changes the sprite and the rod-tip origin in G2's rig
   block.

None of these block G1, which is the same kid taken apart.
