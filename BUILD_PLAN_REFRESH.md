# Hook, Line and Sentence — Art & Animation Refresh (R1–R7)

**Status: active epic, opened 2026-08-31. This is a significant new body of
work — the largest since the Advanced Progression epic — and it replaces the
game's entire visual layer. R1 shipped 2026-08-31; R2 is next.**

Two new documents are the source of truth for it:

- **`ART_DIRECTION.md`** — how everything looks: warm painterly storybook,
  Ghibli-anchored palette and light, thin warm-brown outlines, no pure black.
- **`ANIMATION.md`** — how the cast, the line and the reel move, which is a gap
  the game has had since M1: the line currently *appears* rather than travels.

Supersedes `BUILD_PLAN_VISUAL.md` (V2–V5) and `BUILD_PLAN_GRAPHICS.md`
(G2–G6), both of which were plans for art in the *old* style. They stay in the
repo for the trail. **Nothing in the engine is being replaced** — progression,
the word pool, the tier/rank ladder, the shop, the unlockables, Firestore and
the finger keyboard are all keeping their current behaviour. This epic is
backgrounds, boats, characters, fish, palette and motion.

## What is being thrown away, and what survives

| Thrown away | Why |
|---|---|
| The pixel-art look, game-wide except the keyboard | `ART_DIRECTION.md` is painterly. `image-rendering: pixelated` (4 rules in `style.css`) comes off. |
| The locked M7.5 "dusk pond" palette | It is a saturated dusk scheme; the new direction is muted and warm. The lock is lifted deliberately — see R2. |
| Every current scene PNG | Backgrounds, boats, `body-kid`/`hat-straw`/`rod-basic`, all four fish sprites. They are the old style. |
| The angler assigned from age + sex | Replaced by one protagonist in three costumes (`ART_DIRECTION.md`, decision 2). |
| V2's four pending art requests, and the re-shot Stream background | Both were requests in the old style. Withdrawn from `ART.md`; R3/R4 request the new ones. |

| Survives, do not redo | Why |
|---|---|
| **V1's three planes** (`#surface` painted in front of the mid plane) | It is the one visual thing that worked, and `ART_DIRECTION.md`'s layered backgrounds are the same idea extended. Its palette gets retuned in R2; its structure doesn't move. |
| **`CONFIG.rig.layers` + `renderRig()` + `lineOrigin` + the computed aim** | The layer machinery was never the problem — the art strategy was. R1 and R4 both build on it. |
| **Same-canvas, reference-drawn generation** (V2's rule) | The single most valuable thing the old epic learned: every piece is drawn *from* the body sprite, returned on the *same canvas*, so offsets are zero and registration is the generator's job. Carried into `ART.md` as a standing rule. |
| **The ghost-hands finger keyboard** | Off limits (`CLAUDE.md`). Not restyled, not moved, not touched. If anything the rest of the UI borrows its clarity. |
| The 720×360 design canvas, no build step, all tuning in `config.js` | Architecture rules, unchanged. |
| Every rule about the finger-guide panel | Nothing may land in the bottom-center third. Still true, and it constrains every new background. |

## Milestone order, and why

R1 first because **it needs no art at all** — the animation spec is pure code,
and Claude must never block on a generation. R2 next because it is also
code-only and it sets the palette that every subsequent prompt has to match.
Art-dependent milestones come after, cheapest-per-visible-gain first, and the
fish (R6) are last because they are the biggest generation job in the epic.

---

### ✅ R1 — The line and the cast actually move (done 2026-08-31, no new art)

**Shipped.** `#line`'s rotated `<div>` is gone; the line is an SVG quadratic
Bezier redrawn every frame between two ends that both move. The cast has
anticipation, an arc and a splash where the lure actually lands; the idle line
sags; the reel curve tightens with tension; every correct keystroke tugs the rod.

Verified in a real browser (Chromium, not just unit tests): a full catch and a
full escape at 1x, and both again under `prefers-reduced-motion`. Measured
rather than eyeballed — at 84% tension the sag came back 7.3px against a
hand-computed 7.3, and the rod's tug peaks at 4.8° and settles to exactly 0.

Four things worth knowing, three of them decisions:

- **`LINE_ORIGIN` was the trap, and it was real.** The rod tip is now read from
  `#rig`'s live transform matrix every frame — through the boat's bob *and* the
  rod's own rotation — rather than resolved once at load.
- **`CONFIG.anim.cast.landing` is now the single source of the landing point.**
  It used to be hardcoded in three places that had drifted apart (the bobber's
  CSS at 388,190; the splash at 400,195; the ripple at 394,196). The bobber is
  positioned from it, so the lure and the bobber cannot separate again.
- **The tug is a damped spring, not a tween** (`logic.stepTug`). Fast typing
  stacks impulses into an irregular judder; a tween would restart and read
  mechanical. A data test pins the rod's pivot to the rod layer's grip corner,
  because a gear-shop rod (R7) with a different box would otherwise detach the
  line from a rod that is visibly swinging.
- **Reduced motion completes rather than skips.** No animation loop runs at all;
  the cast lands instantly with the line drawn in its final position, and the
  handful of things that change the line's shape between fish movements ask for
  their own single redraw.

**Still open for Matt:** `ANIMATION.md`'s own assumption — Bezier-with-a-
tension-driven-control-point rather than a physics rope — is what
`prototype/line-animation.html` exists to let you judge. If it fails the eye
test the shape lives in `logic.js` and the numbers in `CONFIG.anim`, so the
swap is contained.

<details>
<summary>The original plan for R1, as written</summary>

### R1 — The line and the cast actually move (no new art)

Implements `ANIMATION.md`. Read its **"Where the current build stands"**
section first — it maps each requirement onto the code that exists.

- **Prototype first, in `prototype/`**, per that doc's open assumption: a
  Bezier line with a tension-driven control point, reviewed once at 1x before it
  is treated as final. This is the repo's established pattern
  (`feel-prototype.html`, `visual-mockup.html`) and it is how the ~450ms reel
  pause got settled.
- `#line` becomes an inline **SVG `<path>`** in the scene — one element, no
  library. (This is not the no-canvas rule bending: it is still DOM, still CSS,
  still no build step. A rotated `<div>` cannot be curved, which is the whole
  problem.)
- **Cast:** rod-tip anticipation (~150–200ms, ease-in), then a lure tweened
  along an arc to its landing point (~400–600ms, ease-out), then splash +
  sound at the point where it actually lands. The bobber takes over from the
  lure there instead of fading in at a hardcoded 388,190.
- **Idle:** quadratic Bezier, control point offset downward, so the line sags.
- **Reel:** control point interpolates with `tension` — taut when high, slack
  when low. Per correct keystroke, a small irregular tug on the rod layer.
- All curve/timing constants into `config.js` under a new `anim` block. No
  magic numbers in `app.js`.
- `prefers-reduced-motion`: every tween still *completes*, instantly, with the
  line drawn in its final position. Never a scene that gets stuck mid-cast.
- **Watch for:** `LINE_ORIGIN` is computed once at load. Once the rod tip moves,
  it has to be read from the rod layer's live position or the line detaches
  from the rod exactly when it is most visible.
- **Done when:** casting reads as a cast at 1x, the idle line sags, the curve
  visibly tightens when a kid makes mistakes and loosens when they recover, and
  reduced-motion still lands every fish. Matt reviews the prototype before the
  wiring lands.

</details>

### R2 — Palette and treatment pass (no new art)

The M7.5 palette lock is lifted here, on purpose and in one place, so that
every prompt from R3 onward has a matching set of tokens to point at.

- `:root` in `style.css`: the dusk-pond tokens are replaced by the muted warm
  palette — banded sky, glow-not-disc light, muted teal-green water with a
  darker depth band, warm desaturated wood and earth. **No pure black
  anywhere**; outlines and shadows become warm dark browns.
- `image-rendering: pixelated` comes off everything painterly.
- Re-skin, in the new palette: HUD, tackle box, shop, badges, banners, and
  **the collection screen's CSS-drawn fish icons** (they are kept in sync by
  hand with the sprites — `style.css` says so — so they move together).
- **The keyboard grid is not touched.**
- **Consequence to handle, not discover later:** `data/fish.json` carries a
  per-species `color` (33 distinct hex values) chosen against the *old* locked
  palette, and a data test enforces `#rrggbb`. They need a re-pass into the new
  range in the same milestone, or every fish tint fights the new water.
- **Done when:** the whole game except the keyboard reads warm and muted at 1x,
  nothing renders pure black, and the collection screen matches the scene.
  Judged with the *old* art still in place — it will look transitional, and
  that is expected.

### R3 — Three painted backgrounds, layered for parallax

First art milestone. Per `ART_DIRECTION.md`: far background (sky, hills,
treeline) / water / foreground detail (reeds, rocks, dock edge), one set per
level.

- Nine images (3 levels × 3 layers), requested in `ART.md` one level at a time
  — **Pond first, wired and judged before the other two are generated**, so a
  palette or framing miss costs one level's prompts and not nine.
- The waterline must land at design **y=198** in every level, the way the
  current art does, or `#surface` and every tuned coordinate move with it.
- Layers get slow independent drift for parallax; the water layer animates.
- Nothing of consequence in the bottom-center third.
- **Done when:** all three levels are painted, the waterline registers, the
  parallax reads at 1x without drawing attention to itself, and `.loc-stream`'s
  framing workaround (`scale 1.246`, offset to y=198) is deleted rather than
  re-tuned.

### R4 — The angler: one kid, three costumes, rigged

One protagonist (`ART_DIRECTION.md`, decision 2): pond clothes seated in the
rowboat, waders and vest standing in the stream, boat gear and life vest in the
fighting chair.

- Rig pieces per `ART_DIRECTION.md`: **head, torso, arm, rod** — a revision of
  the current body/hat/rod split, and the doc flags the four-piece assumption as
  reviewable once R1's casting animation exists. **Sequence matters: R1 lands
  first precisely so the rig is cut for motion that already works**, rather than
  guessing which joints need to move.
- **Every piece drawn from the torso as a reference image and returned on the
  same canvas.** All layers share one box; offsets are zero. A piece that
  doesn't fit is a reroll, never an offset tweak.
- The grip stays a sandwich: open curled hand on the body, rod over it, a
  fingers-only overlay over the rod. It is what makes a swappable rod look held.
- The favorite-color accent tint stays — a filter on one region, no extra art.
- `CONFIG.rig` grows a per-pose block; `lineOrigin` is set per pose.
- **Done when:** at 1x, in all three levels, the rod looks held and the costume
  suits the water; casting (R1) moves the arm and rod, not the whole kid.

### R5 — Vessels, with the kid inside them

- Rowboat (Pond), waders (Stream — no vessel, the kid stands in the water),
  Boston Whaler with the stern fighting chair (Ocean).
- Each vessel gets a **near-side layer painted in front of the angler**, the
  same front-plane trick as V1 applied to the hull, so the kid sits down *in* it.
- Placement (x/y, rod tip, pose) moves into the per-location config block.
- **Done when:** switching spots swaps vessel, costume and pose together; the
  hull overlaps the angler correctly; the line still leaves the rod tip in all
  three.

### R6 — Fish: a rig per species (the big one)

**Matt's call: one rig per species, not shape families** (`ART_DIRECTION.md`,
decision 3). The roster is **33 species**, currently served by four PNGs and a
hue-rotate. At body/fin/tail per fish that is ~99 generated pieces — by a wide
margin the most expensive item in this epic, and the reason it is last.

- **Delivered in waves by biome**: Pond → Stream → Ocean, and within a wave by
  rank. Each wave is independently shippable.
- The existing tinted placeholder stays for any species whose art hasn't landed,
  so **no milestone ever blocks on the full set** and a half-finished roster is
  a playable state, not a broken one.
- Same-canvas rule again: fin and tail drawn from the body, returned in place,
  so the swim wobble is a transform on a piece rather than a frame swap.
- Also here: the underwater silhouette before the reel, and the surface-break
  splash on landing — the payoff V1's three planes were built for.
- **Done when:** every species in `data/fish.json` has its own art, the
  collection screen reads as 33 different fish, and the landing has a visible
  moment. Wave by wave; the milestone closes when the last wave lands.

### R7 — Gear in the new style

Hats and rods re-cut for the shop, in the new direction, drawn against each
pose. Was V5; the shop code (`renderShopList`) already generalizes, so this is
mostly content.

- One PNG per gear item **per pose** — a hat drawn for the seated pose won't sit
  on the standing one. Start each item at the Pond pose; add the other two once
  it is proven.
- `config.js`: `shop.hats`, and `file` on `shop.rods` the way boats already have.
- **Done when:** buying and equipping a hat changes the angler everywhere and
  persists, and the rod you bought is the rod in your hand.

---

## Art dependency

| Milestone | Art needed |
|---|---|
| R1 | **none** — code and CSS |
| R2 | **none** — code and CSS |
| R3 | 9 background layers (3 per level), Pond first |
| R4 | per pose: head, torso, arm, rod + a fingers overlay — all on one canvas, drawn from the torso |
| R5 | rowboat, Whaler + fighting chair, and a near-side layer for each |
| R6 | ~33 species × body/fin/tail, in waves by biome |
| R7 | one PNG per gear item per pose |

## Open questions

1. **Is the Silkscreen pixel display font still right?** It is the last pixel-era
   thing left after R2, and it is used for the title, HUD and banners. A warm
   rounded storybook face would match the new direction — but the keyboard is
   staying pixel-crisp, so keeping Silkscreen is defensible as the thing that
   ties the untouched keyboard to the rest. Not blocking; decide during R2.
2. **One surface treatment or three?** Carried over unanswered from V1. The
   three levels could share one `#surface` palette or each get its own. Shared is
   cheaper and probably reads fine; R3 is when it becomes visible either way.
3. **Time-of-day or weather variants** — `ART_DIRECTION.md` assumes one painting
   per level. If they are ever wanted, R3's layer split makes a sky swap the
   cheap version of it. Parked, not scoped.
