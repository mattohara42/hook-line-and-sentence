# Hook, Line and Sentence — Art & Animation Refresh (R1–R7)

**Status: active epic, opened 2026-08-31. This is a significant new body of
work — the largest since the Advanced Progression epic — and it replaces the
game's entire visual layer. R1 and R2 shipped 2026-08-31, R3, R4 and R5 on
2026-09-01, and **R6 closed 2026-09-02 at 33 of 33 fish. R7 — gear — is the
last milestone in the epic**, and the shop code already generalises, so it is
mostly content.**

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
| **`CONFIG.rig` + `renderRig()` + `lineOrigin` + the computed aim** | The layer machinery was never the problem — the art strategy was. R1 and R4 both build on it. |
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

### ✅ R2 — Palette and treatment pass (done 2026-08-31, no new art)

**Shipped.** The M7.5 palette lock is lifted and the whole game except the
keyboard is warm and muted. `:root` is a real palette now rather than an
aspiration — the old one defined fourteen tokens of which **six were referenced
at all**, with the actual colours hardcoded as literals all over the file.

- Every translucent panel and shadow routes through `--umber-rgb` /
  `--shadow-rgb` / `--gold-rgb` / `--ink-rgb`, so the next retune is four values.
- **No pure black anywhere** — the five `rgba(0,0,0,x)` shadows are warm brown,
  and `.cfish`'s `color-mix(… black 18%)` mixes umber instead.
- `image-rendering: pixelated` is gone (4 rules). The remaining pixel art is
  now smooth-scaled: very slightly softer at 1x, checked side by side, fine.
- **`data/fish.json`'s 33 species colours were re-passed**, which the milestone
  called for: hue kept (that is what tells them apart), saturation compressed
  into the muted band, lightness clamped to read against teal-green water. Koi
  went from fully saturated `#ffd36e` to `#dac493`. All 33 stay distinct — the
  script asserts it.
- The Grown-ups accuracy heatmap keeps its red→green meaning, muted to match.
- **Rare and legendary cells in the collection now carry the scene's gold.**
  Not in the original plan: muting the palette *removed* a read that used to
  exist by accident, since the legendary fish was special by being the loudest
  colour on screen. The scene glows rare/legendary; now the grid does too.

**The keyboard is provably untouched.** Its colours are frozen as `--kb-*` at
their pre-refresh values and it references nothing else, so a future palette
change cannot reach it. Verified by diffing the computed styles of every key
state (plain, locked, ghost, target, finger, finger-active, panel) before and
after — byte-identical — and a test now fails if anything in that block reaches
for a scene token. A second test fails on any pure black in the stylesheet.
Both were confirmed to fail when deliberately violated.

**Judged with the old art still in place, as planned.** Against the current
saturated pixel sunset the warm chrome reads transitional — the modal scrim in
particular goes muddy-orange where it bleeds through. That is the old
background, not the scrim, and tuning it now would be tuning against art that
R3 replaces.

> **✅ Settled 2026-09-01, once R3's art landed.** `.overlay` went **0.75 → 0.45**
> (Matt's call). The deciding fact: `.overlay-panel` is fully opaque
> (`background: var(--umber)`), so every word in every modal already sits on
> solid umber and **the scrim buys focus, not legibility** — at 0.75 it was
> halving a scene that is now worth looking at, and the profile picker is the
> first thing a kid sees. Scene mean luminance behind the picker: 65.7 → 92.2.
> One class, so all seven overlays (collection, profiles, shop, journal,
> progress, speedtest, rod-nudge) moved together.

<details>
<summary>The original plan for R2, as written</summary>

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

</details>

### ✅ R3 — Three painted backgrounds, layered for parallax (done 2026-09-01)

**The Pond half is done and wired.** All three planes are painted, keyed and
live: `background-pond-{far,water,fore}.png`, rendered as three `#bg-*` elements
inside `#scene` rather than stacked background-images, because each drifts on
its own timer and `ART_DIRECTION.md` specifies the water layer as animating
*independently* — one element can only carry one animation.

Verified in Chromium, not just asserted: all three load, the waterline reads at
**screen y=396 = design y=198** where `#surface` and every tuned coordinate
assume it, the drift moves (water's `background-position` crept 0.24px over 4s),
and `prefers-reduced-motion` reports `animation-name: none` on all three.

- The drift is ±3px far / ±7px water / ∓5px foreground on periods of 121s / 47s
  / 73s — mutually prime-ish so the planes never visibly resynchronise. At cover
  scale the art is 849px wide in a 720px canvas, so ~64px of slack each side
  means no drift can ever expose an edge.
- `#bg-fore` shares `#surface`'s z-index 3 and follows it in the DOM: it paints
  over the water wash and the rig, but stays under the z-index 4 splashes and
  floating text, which must never hide behind a reed.
- **V1's CSS-drawn `.reeds` are now hidden in the Pond** — the painted
  foreground put real reeds in the same two corners and they doubled up. They
  are kept for the Stream and Ocean, which have no painted foreground yet, and
  go for good when those are repainted.
- `#scene` no longer carries a background image at all. The Stream and Ocean
  name `background.png` explicitly in their own `.loc-*` rules, so dropping it
  saves the Pond a 926KB load it would only ever paint over.

**The Stream is done too (2026-09-01), and its workaround is gone.**
`.loc-stream`'s `scale 1.246` + `-520px,-368px` offset — the framing patch that
had been holding that level together since A3 — **is deleted**, which was this
milestone's done-when criterion for the Stream. The planes there now just swap
their images: no per-location framing, because the art was generated and fitted
to put its waterline on the Pond's row. V1's CSS `.reeds` are hidden in the
Stream now as well; only the Ocean still uses them.

Four attempts on the Stream's far layer taught the epic more than any other
asset — the waterline went 66.96% → 66.96% → 62.35% → 72.77% and **prompt
wording never moved it**. What worked was giving up on wording and fixing the
framing in salvage, then spending the prompt on style instead, which cannot be
salvaged. Both rules are in `GEMINI_NOTES.md`. Layers 2 and 3 then landed
first-attempt.

**✅ The Ocean landed the same day, and R3 is closed.** All nine images are
painted, keyed and wired. `.loc-ocean`'s `center 11%` offset is deleted along
with the Stream's `scale 1.246`, so **no scene carries a framing patch any
more** — every level is three `#bg-*` planes that simply swap their images, and
V1's CSS `.reeds` are unused everywhere.

Verified in Chromium across all three levels: correct images on all nine planes,
no failed asset requests, `#scene` carrying no background image of its own, and
**every waterline landing on screen y=396 = design y=198**, which is what the
milestone meant by "the waterline registers".

**Done-when, checked off:** all three levels painted ✅ · the waterline registers
✅ · the parallax reads at 1x without drawing attention to itself ✅ (±3/±7/∓5px
on 121s/47s/73s) · `.loc-stream`'s framing workaround deleted rather than
re-tuned ✅.

**What it cost, for the next epic's planning:** nine images took **thirteen
generations**. The Pond needed three rerolls learning the conventions, the
Stream's far layer alone took four, and after that **five of the last six landed
first attempt**. The lessons are all in `GEMINI_NOTES.md`; the single most
valuable one is that the generator's compositional prior does not move for
prompt wording, so framing is fixed in salvage and prompt weight is spent on
style, which cannot be.

<details>
<summary>The original plan for R3, as written</summary>

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

</details>

### ✅ R4 — The angler: one kid, three costumes, rigged (done 2026-09-01)

**Shipped 2026-09-01.** All three anglers are painted, cut into rod/arm/body,
wired and verified frame by frame in a browser. **R5 is next.**

What landed ahead of the art, so the drop is a measurement and not a refactor:
`CONFIG.rig` is one **pose per location** (`rig.poses`, keyed by fishing spot),
each carrying its own layer stack, its own `rodPivot` and its own `lineOrigin` —
because a kid standing in waders holds the rod somewhere a seated one doesn't,
and `CONFIG.anim.rod.pivot` had been asserting otherwise. `applyScene()` now
re-renders the rig, so the costume follows the water. A location with no pose of
its own **falls back to the default**, which is every level today: pointing the
Stream and Ocean at filenames that don't exist yet would render an invisible
angler in two levels out of three, and the wrong shirt beats no kid.

Two decisions were taken writing the prompts, both recorded in `ART.md`:

- **`ART_DIRECTION.md`'s four-piece assumption is answered, and it turned out
  not to be an art question at all.** Any subdivision with no independent
  existence — a head off a torso, an arm off a shoulder — is a **local cut of
  one delivered painting**, which registers perfectly because it is the same
  pixels and costs no generation and no reroll risk. Only the rod (the shop
  swaps it) and the fingers that close over it have to be generated apart from
  the body. So the pose is **three generations**, not four or five, and how many
  layers the rig has became a code decision.
- **Characters do not get the background style block.** `ART_DIRECTION.md` says
  sprites take the backgrounds' palette and edge treatment *without* their
  painterly texture, so the gouache/visible-brushwork language `GEMINI_NOTES.md`
  recommends for a background is wrong here — it is invisible at 66×100 screen
  px and reads as noise. Soft two-tone shading with blended edges instead, and
  character-specific failure modes named in its place.

Also settled: the protagonist is identified across all three costumes by a
**warm terracotta accent garment** — shirt, fly vest, life vest. It is the one
hue in the palette guaranteed to hold a silhouette against teal-green water and
green banks in all three levels, and it is the region the favorite-color tint
filters, which keeps that a one-line filter rather than a per-costume tuning job.

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
- ~~`CONFIG.rig` grows a per-pose block; `lineOrigin` is set per pose.~~ ✅ done.
- ~~Composite at game scale before touching `config.js`; measure the pose's
  box/grip/tip off the real canvas.~~ ✅ done — the numbers and the checks are
  in `ART.md`.
- ~~Cut the arm and make it swing with the rod.~~ ✅ done — and it pivots at the
  *elbow*, not the shoulder, because the angler's upper arm is hidden behind the
  drawn-up knee. Details and the frame-by-frame verification are in `ART.md`.
- ~~The Stream pose.~~ ✅ landed 2026-09-01 — standing in waders and a fly vest,
  holding Bamboo Beauty, with a landing net. `#boat` is hidden there (one line
  borrowed from R5; the angler stands *in* the water).
- ~~The Ocean pose.~~ ✅ landed 2026-09-01, **first attempt** — the only one of
  the three that did, because everything the first two cost was priced into its
  prompt. Braced back in a life vest holding The Deep Endeavor, with no chair
  drawn (R5 paints that in front of him).

**✅ Done-when met 2026-09-01.** At 1x, in all three levels, the rod looks held
and the costume suits the water; casting moves the arm and the rod, not the whole
kid. Verified in Chromium per level, frame by frame — the tip-to-line gap peaks
at 0.13 / 0.37 / 0.19px across the Pond, Stream and Ocean, which is the boat's
bob between samples.

**What it cost:** four generations for three poses (the Pond took three, the
Stream two, the Ocean one), plus a cut tool that turns each delivered painting
into three registered layers. The trend is the point — the prompt got better
faster than the poses got harder.
- **The rod changes with the level, not just the clothes** (settled 2026-09-01).
  Rods are the progression gate (`shop.rods[].unlocksLocation`), so a pose's
  default rod is that level's gate rod: Pond → Trusty Stick, Stream → **Bamboo
  Beauty** (split cane — a fly rod, as its name always implied), Ocean → **The
  Deep Endeavor**. Files are `rod-<shop id>-<pose>.png`, which starts R7's
  per-item-per-pose grid with the three that matter already filled in instead of
  drawing one generic pole three times and redoing it.
- **Done when:** at 1x, in all three levels, the rod looks held and the costume
  suits the water; casting (R1) moves the arm and rod, not the whole kid.

### ✅ R5 — Vessels, with the kid inside them (done 2026-09-01)

**The code half landed ahead of the art**, the way R1 and R4's did, and both
vessels then landed **first attempt on 2026-09-01** — the rowboat, then the
Boston Whaler. Each is **one painting cut locally into a far and a near half**
rather than two images that have to register, and both proved the argument:
recompositing the halves against the delivered painting leaves **0 px** of
490,319 and 496,473 respectively different. Not "sub-pixel" — identical.

**Two things the Whaler taught, both written up where they belong.** Its
windscreen is glass and the generator painted the backdrop *through* it, which
the alpha ramp reads as an opaque violet; `cut-vessel.py` grew a second alpha
model that takes alpha from how much key a pixel carries, and the recipe is in
`GEMINI_NOTES.md`. And seating the kid in the fighting chair was the worked
example of the wiring-not-rerolling rule: the chair landed where it landed, and
`vessel.x/y` plus `anchor.y` met it. The whole Ocean rig rides 24px higher than
the other two poses because a fighting chair is a raised seat.

**Carried debt, and it is now visible everywhere:** both painted vessels are
`skinnable: false`, so equipping one of `shop.boats`' four alternate hulls does
nothing at any spot. They are still pixel-era PNGs with no far/near split. The
fix is not four fresh prompts — it is four repaints generated *from* the
delivered rowboat so they register by construction, then the same cut. Request
and the cheaper CSS-tint fallback are both in `ART.md`.

- Rowboat (Pond), waders (Stream — no vessel, the kid stands in the water),
  Boston Whaler with the stern fighting chair (Ocean).
- Each vessel gets a **near-side layer painted in front of the angler**, the
  same front-plane trick as V1 applied to the hull, so the kid sits down *in* it.
- ~~Placement (x/y, rod tip, pose) moves into the per-location config block.~~
  ✅ done 2026-09-01, ahead of the art. A pose now owns its **`anchor`** (where
  `#rig` sits and the point it rocks about), its **`bob`** (a hull rocks, a kid
  standing on a riverbed does not), and its **`vessel`** — `far` behind the
  angler, `near` in front, `skinnable` for the one `shop.boats` reskins, or
  `null` for the Stream. `renderRig()` builds all of it, `#boat` is gone from
  `index.html`, and the CSS special case R4 borrowed is deleted because the pose
  says it instead. Verified across all three spots, and the boat shop still
  reskins the hull (buying auto-equips; `boat-red.png` follows you between
  spots).
- ~~Two things R4 left here~~ — both folded in with the placement work: the
  Stream's CSS special case is deleted (its pose declares `vessel: null`), and
  the bob is a per-pose `bob` flag, off in the Stream.
- **The Ocean's fighting chair is a vessel, and R4 deliberately did not draw it.**
  Its angler is generated with no chair, posed as if braced, so R5 can paint the
  chair with a near-side layer in front of the kid the way the hull does.
- **Done when:** ✅ switching spots swaps vessel, costume and pose together; the
  hull overlaps the angler correctly; the line still leaves the rod tip in all
  three. Verified in the browser past the profile modal at all three spots, with
  a cast and a fight at the Ocean.

### ✅ R6 — Fish: a rig per species (done 2026-09-02, the big one)

**Matt's call: one rig per species, not shape families** (`ART_DIRECTION.md`,
decision 3). The roster is **33 species**, currently served by four PNGs and a
hue-rotate. It is by a wide margin the most expensive item in this epic, and the
reason it is last.

**Scoped 2026-09-01, and the scoping halved it twice.** The number that has been
carried since the direction was adopted — ~99 generated pieces, body/fin/tail per
fish — was never a real cost. R4 already settled that a subdivision with no
independent existence is a **local cut of one delivered painting** (`ART.md`, the
same-canvas rule, point 4), and a tail is exactly that: nothing swaps it, nothing
else wears it. So a species is **one generation**, not three, and the second
halving is the sheet — the four Pond commons are asked for on one canvas, which
is a test as much as a saving (see `ART.md`). Best case the whole roster is
**~11 generations**; worst case it is 33, and nothing about the wiring changes
either way.

**Two pieces per fish, and how many there are is a code decision** (R4's rule
again, so it stays cheap to revise). **Body** and **tail**, cut apart at the
caudal peduncle — the narrowest section of any fish, which is why the cut can be
*found* rather than traced, the way `cut-vessel.py` finds a sheer. The tail is
the only piece whose motion reads at this size: a pectoral fin is ~5 design px
and its sweep would be invisible. The same painting still contains a fin if that
ever proves wrong.

- **Delivered in waves by biome**: Pond → Stream → Ocean, and within a wave by
  rank. Each wave is independently shippable.
- The existing tinted placeholder stays for any species whose art hasn't landed,
  so **no milestone ever blocks on the full set** and a half-finished roster is
  a playable state, not a broken one. `CONFIG.fish.species` is the registry:
  a species listed there renders its art, a species absent from it renders the
  placeholder, and that is the only switch.
- **Size starts saying something.** Every fish today renders in the same 62×41
  box (the muskie's 96 is a CSS special case). A species' box is now its own:
  length by rank — 54 / 64 / 78 / 96 design px, common → legendary — and height
  from the painting's own aspect, both printed by the cut tool rather than tuned.
  A pike is long, a bluegill is deep, and a legendary is worth looking at.
- Also here, and both are **code, no art**: the underwater silhouette before the
  reel, and the surface-break splash on landing — the payoff V1's three planes
  were built for.
- **The muskie's A8 hero sprite is retired by its own wave.** `fish-muskie.png`
  and `#scene.loc-ocean #fish.tier-legendary`'s 96px override in `style.css` both
  go when the Ocean wave lands; until then they stay exactly as they are.
- **Done when:** every species in `data/fish.json` has its own art, the
  collection screen reads as 33 different fish, and the landing has a visible
  moment. Wave by wave; the milestone closes when the last wave lands.

**Wave 1, sheet A is in (2026-09-02): the Pond's four commons are painted, cut
and wired**, and the sheet experiment paid off first attempt — four fish on one
canvas, four clean components, consistent treatment across the set. So the
roster is **~11 generations rather than 33**, and `GEMINI_NOTES.md` now carries
the rule. `tools/cut-fish.py` was written against that sheet and owns the method;
its recomposite check is 0 px on all four. Sheets B and C followed the same day, both
first attempt and in the other layout (a row of three), so **the Pond is complete
— 10 of 33 species have their own art** and the collection's first two rows read
as ten different fish, sized by rank from a 54px bluegill to a 96px koi. Three
sheets, three first attempts. **The Stream followed the same day and is complete
too — 20 of 33 — in two sheets rather than three**, because its six trout were
delivered on one canvas, which is what finally separated the rainbow from the
steelhead. Five sheets, five first attempts. The Ocean's thirteen are all that
remain.

**What it cost, for the next epic's planning.** 33 species in **eight sheets and
nine generations** — one reroll, on the Ocean's first sheet. The estimate this
milestone opened with was ~99 generated pieces; the estimate after scoping was
~11 generations; the actual was nine. Two decisions did all of that work: *don't
generate a piece you could cut* (R4's rule, which made a species one generation
instead of three) and *put several subjects on one canvas* (which made a wave
one generation instead of four, and turned out to be the only way to ask for a
difference rather than describe one).

**`tools/cut-fish.py` is the artefact worth keeping.** Every number in
`CONFIG.fish.species` is printed by it and none was tuned in a browser, and it
now carries four detectors that were each paid for by a real delivery: the
**peduncle** (the narrowest column in the rear third, found not traced), the
**seam overlap** (derived per fish from that peduncle's depth and the sweep
angle — the koi needed 7px where the pike needed 4), the **component selection**
(the N largest, with the separation proved — a captioned sheet made a flat size
threshold call seventeen word fragments fish), and the **mouth** (alpha-weighted
over the leading 15%, measured in design px and walked along its row onto the
silhouette — a catfish's barbel and a unicornfish's horn each broke a simpler
rule). A future wave adds a `SHEETS` entry and runs one command.

**Closed 2026-09-02 with the muskie, at 33 of 33.** Sheet C was the ninth
delivery and the eighth first attempt, and the collision it was drawn for is
settled: at their real 96 and 78px the muskie reads dark bars on a pale flank
against the pike's pale spots on a dark one. All three done-when clauses are
met — every species in `data/fish.json` has its own art, the collection screen
reads as 33 different fish across three biome sections, and the landing beat
shipped with the code half in #103. The A8 hero sprite `fish-muskie.png` and its
96px CSS override went with the wave that replaced them.

**Landed so far, and the rest of it is code (2026-09-01):** the scoping and the
wave-1 request (#101) · the fish rig itself, with the tier placeholder as the
fallback and three data tests set as traps for the first entry (#102) · both
beats, the silhouette before the bite and the surface break on landing (#103).
That leaves art, wave by wave, and the cut tool that gets written against the
first delivered sheet. **The done-when's third clause — "the landing has a
visible moment" — is met**; the other two are the roster.

**Order of work, so nothing blocks on a generation:** the wave-1 request goes out
first (it is the only part with a human round trip in it), the code half lands
against the placeholder while the art is being made, and the cut tool is written
against the first delivered painting rather than guessed at — which is how
`cut-angler.py` and `cut-vessel.py` were both built, and why their detectors work.

### R7 — Gear in the new style (code half done 2026-09-02; the prompts followed the same day)

Hats and rods re-cut for the shop, in the new direction, drawn against each
pose. Was V5; the shop code (`renderShopList`) already generalizes, so this is
mostly content.

**The code half is in, against no new art at all.** The shop sells four rods and
five hats, equipping either rebuilds the rig, and both persist. What is left is
the grid of paintings.

**The 21 prompts are written (`ART.md`, the R7 request) and the epic is now
waiting on generations only.** Two things about the shape of the ask are worth
carrying past this milestone. Gear is the first art in the project asked for as
an **edit of a delivered painting** rather than a new one: the pose's own
painting is attached and comes back with one thing changed, so registration
costs nothing and a swapped rod stays on the axis `cut-angler.py` already has
measured for that pose. And it is the first request that **cannot** use R6's
sheet, since four hats on one canvas mean either four redrawn children or four
hats floating free to be positioned by hand, so it falls back to the muskie's
rule instead and states each item as an inversion of the one already painted.
Whether that holds is the probe's job.

**Hats before rods**, because the fallbacks are not equally good: an
unregistered rod shows the pose's own painted rod and nobody can tell, while an
unregistered hat shows nothing and is a purchase that does not work.

**The straw hat landed at all three poses on 2026-09-02, each first attempt**,
which meets the first done-when clause: buying and equipping a hat now changes
the angler at every spot and persists. The shape is proven rather than assumed —
the generator returns an edit, not a redraw, and `tools/cut-gear.py` owns the cut.

**18 paintings left, and the transplant takes three of them off the list.** A hat
painted once at the Pond lands on the Stream's head indistinguishably at game
size (head IoU 0.904), and does *not* land on the Ocean's (0.837: it sits perched,
visibly, because that head tilts back and the transform carries no rotation).
`tools/hat-transplant.py` refused the Ocean on its own threshold before anything
was rendered. So the nine remaining hats are six generations, and the nine rods
are unaffected.

Three things carry it, and the third is the one worth remembering:

- **`shop.hats` exists**, five items, and its free default `none` ("Just Hair")
  carries no `file` — it resolves to nothing, which is the bare head R4 painted
  on purpose. That is also how you take a hat off.
- **`shop.rods` carry a `file` stem** the way boats do, and a pose layer can
  name a `gear` slot instead of fixed art. `renderRig` resolves
  `<stem>-<pose>`, so one convention covers both kinds.
- **`rig.gearArt` is the registry, and it is the same switch as
  `CONFIG.fish.species` and `CONFIG.rig.poses`** — the third time this epic has
  reached for it. A stem listed there is drawn; a stem absent from it falls back
  to the layer's own `file`. So equipping Bamboo Beauty and then fishing the
  Pond hands the kid the Pond's painted stick rather than 404ing into an
  invisible rod mid-cast. **The whole grid is sellable before any of it is
  painted**, and each delivery is one line in `gearArt`.

The resolution itself is `logic.gearFile`, pure and unit-tested, with `app.js`
holding the thin wrapper that supplies the live CONFIG and save — the shape
`logic.js`'s own header asks for. Five data tests cover the config's new shape,
and each was checked by breaking the invariant it guards.

**Verified in a browser**, not just by assertion: a deliberately pre-R7 save
(no `upgrades.hat` at all) migrates on load, the shop shows a HATS section,
equipping Bamboo Beauty at the Pond keeps the painted stick while the same rod
at the Stream becomes `rod-bamboo-stream`, a hat layer paints in front of the
body, and all of it survives a reload with no 404s anywhere in the run.

- One PNG per gear item **per pose** — a hat drawn for the seated pose won't sit
  on the standing one. Start each item at the Pond pose; add the other two once
  it is proven. **R4 already delivers the diagonal of that grid**: each pose is
  drawn holding its own gate rod, so `stick`/Pond, `bamboo`/Stream and
  `deepsea`/Ocean exist before R7 starts.
- ~~`shop.rods` needs a `file` naming convention of `rod-<id>-<pose>`~~ ✅
- ~~`config.js`: `shop.hats`, and `file` on `shop.rods`~~ ✅
- **Every gear painting is a cut of the pose it is drawn against**, on that
  pose's own canvas — the same-canvas rule R4 set and R6 leaned on for 33 fish.
  A hat is not positioned by numbers in `config.js`; it registers by
  construction, and its layer box is the pose's box.
- **R6's other lesson applies here too:** a sheet is the only way to *ask for* a
  difference rather than describe one. Four hats on one canvas come back as four
  different hats; four separate generations come back as one hat four times.
- **Done when:** buying and equipping a hat changes the angler everywhere and
  persists, and the rod you bought is the rod in your hand. **The second clause
  is met** (`rod-bamboo-stream` is in a kid's hand the moment they buy it); the
  first needs one hat painted.

---

## Art dependency

| Milestone | Art needed |
|---|---|
| R1 | **none** — code and CSS |
| R2 | **none** — code and CSS |
| R3 | 9 background layers (3 per level), Pond first |
| R4 | per pose: head, torso, arm, rod + a fingers overlay — all on one canvas, drawn from the torso |
| R5 | ~~rowboat, Whaler + fighting chair, and a near-side layer for each~~ ✅ — four shop hull repaints outstanding |
| R6 | ~~33 species × body/tail, in waves by biome~~ ✅ — 33 of 33, in eight sheets and nine generations |
| R7 | 21 paintings, one per gear item per pose, each an **edit of that pose's own painting** (`ART.md` has the prompts). **1 landed, 20 to go**; each delivery is one `tools/cut-gear.py` run and one `rig.gearArt` line. Hats first |

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
