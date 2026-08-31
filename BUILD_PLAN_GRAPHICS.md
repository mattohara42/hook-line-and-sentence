# Hook, Line and Sentence — Graphics & Character Rig Build Plan

> **⚠️ Superseded 2026-08-25 by `BUILD_PLAN_VISUAL.md`.** Matt played the G1
> build and the layered angler didn't hold up — a separately generated hat and
> rod can't register against a separately generated body, and the flat sprite
> plane left the boat floating and the fish sitting on top of the water rather
> than under it. The visual rework plan replaces G1–G6; the decisions below
> (per-location vessels, three poses, angler assigned from age + sex, favorite
> color as a runtime tint) all carry over and are restated there. Kept for the
> reasoning trail.


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
| **AD2** | **The angler is assigned, not browsed** (Matt, 2026-08-25, supersedes the earlier "family avatars" call). At profile setup the kid enters their **age and sex**; the game hands them the matching sprite set, plus a favorite color. Both ride the existing per-kid profile | A six-year-old shouldn't have to shop for a body. Two short answers about themselves, and the angler on screen looks like them |
| **AD3** | **Vessel is per location, not per rank.** Pond = small rowboat, Stream = **waders, no boat**, Ocean = **Boston Whaler with a fighting chair in the stern** | A kid dropping back to the Pond for a cozy session gets the Pond's boat, not a trophy yacht |
| **AD4** | **Rig placement moves into `config.js`,** one block per location (vessel, rig x/y, rod-tip origin) | G2 needs the Stream angler standing somewhere different from where the Pond boat floats; today those are magic numbers in `style.css`/`app.js` |
| **AD5** | **Three poses, one per location** (Matt, 2026-08-25): seated in the rowboat, standing in waders, seated in the Whaler's fighting chair. Each character therefore costs three body PNGs | Two poses can't cover the Ocean — a Whaler is fished from a chair in the stern, not perched on a thwart like a rowboat |

## Milestones

### ✅ G1 — Split the angler into layers (done 2026-08-25)
The unblocker. No new behavior, no new options — just the same kid, drawn from
parts.

**Where it stands:** done. `CONFIG.rig.layers` stacks body/hat/rod inside
`#rig`, `renderRig()` builds them, and all three PNGs landed and were tuned in
the browser against the old `kid.png`. `assets/kid.png` is now unreferenced —
kept as the reference the next poses are drawn to match.

The line moved with the rod: `#line`'s hand-solved `275px` at `9.8deg` (which
only ever worked for one rod in one boat) is gone. `CONFIG.rig.lineOrigin` puts
the line at the rod layer's tip, and length/angle are computed per cast, so G2
can move the rod anywhere without re-solving trigonometry.

**Deviation from this plan, deliberate:** it listed a `resolveRigLayers(save,
CONFIG)` helper in `logic.js`. Skipped — with no hats or rods to own yet it
would resolve nothing but defaults. It arrives in G4 with the shop that needs
it; a data test guards the layer stack's shape in the meantime.
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
  freeboard, rod holders, **fighting chair in the stern**) and
  `body-chair.png` (seated in that chair, rod up).
- `config.js`: `CONFIG.rig.byLocation` — vessel file (or `null` at the Stream),
  rig x/y, rod-tip origin, which body pose to use.
- `app.js`: `applyScene()` applies the location's rig block; the cast line
  derives its length and angle from the rod tip and bobber instead of the
  hardcoded `275px` / `9.8deg`.
- **Done when:** switching spots swaps the vessel and the pose, the kid stands
  in the Stream instead of floating in a boat, the cast line lands on the
  bobber in all three biomes, and no rig sits behind the finger-guide panel.

### G3 — The angler looks like the kid (age + sex) + favorite color
Two short questions at profile setup pick the sprite set — no character
browser (AD2).
- `app.js`: age + sex fields in the existing profile-setup flow;
  `save.age` / `save.sex` / `save.color` ride the per-kid doc (no new Firestore
  shape — see `FIRESTORE.md`).
- `logic.js`: `spriteSetFor(age, sex, CONFIG.characters)` → which body-sprite
  family to use, + tests. A pure lookup, so the age buckets are a config table
  and a skipped answer or an out-of-range age falls back to a neutral set.
- `ART.md`: `body-<set>-<pose>.png` — **the art matrix is the cost here.** Every
  set needs all three poses (AD5), so roster size multiplies by three:
  2 age buckets × 2 = 4 sets = **12 PNGs**; 3 buckets × 2 = 6 sets = **18**.
  Start at the small end; a bucket is easy to add once real kids see it.
- `style.css`: accent regions tint from a `--kid-color` custom property.
- **Done when:** two profiles with different ages/sexes show visibly different
  anglers in all three biomes, and changing a favorite color re-tints with no
  new art.

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
| G3 | sprite sets × 3 poses — 12 PNGs at 2 age buckets, 18 at 3 |
| G4 | 3–4 hats, 2–3 rods |
| G5 | 2–3 fish silhouettes |
| G6 | none (CSS shapes) |

Claude writes the prompts and filenames when each milestone starts; Matt
generates. Expect the transparency-checkerboard salvage on most sprites —
`ART.md` documents both the light and dark variants.

## Open questions for Matt

The three from 2026-08-25 are answered and folded in above — three poses
(AD5), the angler assigned from age + sex (AD2), and the kid seated in the
Whaler's fighting chair (AD3). What's left is G3 detail; none of it blocks G1
or G2.

1. **How many age buckets, and where do they split?** This is the art-volume
   question — each bucket costs 3 PNGs per sex. Suggested start: two buckets,
   roughly 5–8 and 9–13, for 12 body PNGs. The buckets are a config table, so a
   third is cheap to add later.
2. **What are the answers to the sex question?** A third neutral option costs
   one more sprite set per bucket and doubles as the fallback when a kid skips
   the question or types an age outside the buckets. Suggested wording:
   *boy / girl / just an angler*.
3. **Do hats and rods (G4) need per-bucket sizing?** A straw hat drawn for the
   5–8 body sits wrong on the 9–13 one if their head anchors differ. Cheapest
   answer is to draw every body with the **same head anchor per pose**, so one
   hat PNG fits every set — worth stating outright in the G1 and G3 prompts.
