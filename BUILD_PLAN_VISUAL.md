# Hook, Line and Sentence — Visual Rework Plan

Supersedes `BUILD_PLAN_GRAPHICS.md` (G1–G6). Written 2026-08-25 after Matt
played the G1 build and called it: the hat looks janky, the rod isn't in the
kid's hand, the boat floats instead of bobbing, and the fish doesn't look
underwater until it comes out.

**Off limits: the finger keyboard.** It's the best part of the game and nothing
here touches it. If anything, the rest of the UI should borrow its visual
language — crisp panel, high-contrast keys, an unmistakable focus state.

## What's actually wrong

One root cause, three symptoms. The scene is a stack of opaque sprites painted
onto a backdrop **in a single flat plane**. Nothing is ever painted *in front
of* anything else, and the sprites are generated independently, so they can't
register with each other.

| Symptom | Cause |
|---|---|
| Hat janky, rod not in the hand | Independently generated PNGs have no shared anchor. Offsets can put a hat *near* a head, but no amount of tuning makes a drawn fist close around a rod that was drawn somewhere else. Structural, not a tuning miss. |
| Boat floats instead of bobbing | Nothing is painted in front of the hull, there's no contact shadow or wake, and the "bob" translates the whole rig rigidly over a static water plane. |
| Fish isn't underwater | The fish is painted *over* the water at full saturation. There is no water between the viewer and the fish. |

**G1 got this backwards.** Splitting the angler into body/hat/rod bought
flexibility nobody is using yet, and paid for it with a picture that doesn't
read. The layer machinery itself is fine — it's the art strategy that was wrong.

## The principle: three planes, not one

```
back    sky, hills, far water            (background art)
mid     the fish, the angler, the rig    (sprites)
front   the water surface, near cover    (painted OVER the mid plane)
```

Everything below the waterline gets the front plane drawn over it. That single
change buys all three fixes at once: the hull is cut by the surface so the boat
sits *in* the water, the fish sits *under* it, and the landing finally has a
moment — the fish breaking the surface.

**Prototyped in the browser 2026-08-25, CSS only, no new art**: a translucent
surface layer above `#rig`/`#fish` with a soft bright lip at the waterline, a
contact shadow under the hull, and a desaturate/dim/soft-blur pass on the fish.
The boat immediately reads as floating in water rather than on it. That's V1.

## Milestones

### ✅ V1 — Depth and contact (done 2026-08-25, no new art)
- `style.css`: a `#surface` layer from the waterline down, painted in front of
  the mid plane, with a subtle bright lip on the line itself.
- Contact shadow and a small wake under the hull.
- The fish gets an underwater treatment while it's below the line —
  desaturated, dimmed, slightly soft — clearing as it crosses on landing.
- The bob becomes a **rock**: a small rotation with a little heave, so the boat
  pivots in the water instead of sliding over it.
- **Done when:** at the Pond and the Ocean, the boat reads as sitting in the
  water and the fish reads as under it — with zero new PNGs. *(Done. Verified
  at 1x and at 5x zoom in all three biomes, plus a full catch through the
  landing.)*

**What shipped, and one thing learned:** an even wash of blue over the lower
half just fogs the scene — the depth read comes from the first 30px below the
line. The gradient is a bright lip, a darker band right under it, then it opens
back up before deepening with distance. The fish also needed an explicit
`.submerged` treatment (desaturate/dim/soften); the overlay alone left it too
crisp to read as underwater, since at the swim band the tint is only ~20%
opaque. Ripples, splashes and coin floats were lifted in front of the surface —
they happen *on* the water, not under it.

### V2 — Layers that register by construction (Matt: keep the gear)

Gear stays swappable (Matt, 2026-08-25), so the angler can't simply be baked.
What changes instead is **how the pieces are generated**. G1's mistake wasn't
layering — it was drawing each piece in isolation and then trying to tune the
offsets until they fit. They never will.

Three rules, and the jank goes away:

1. **Every piece is drawn from the body sprite as an image reference.** Matt
   gives Gemini `body-<pose>.png` and asks for the hat (or rod) *for that
   character*, at that scale and angle.
2. **Every piece comes back on the same canvas, in place.** Not a tight-cropped
   hat — a transparent canvas the same size as the body, with the hat already
   sitting where it goes. Then all layers share one box and the offsets are
   literally zero. Registration becomes the generator's job, not a tuning
   session at 4x zoom.
3. **The grip is a sandwich, not an alignment problem.** The body is drawn with
   an *open* curled hand; the rod paints over it; a small `hand-<pose>.png` of
   just the fingers and thumb paints over the rod's grip. Any rod then looks
   held, because fingers close over whatever is underneath. This is the piece
   that makes swappable rods possible at all.

Layer order becomes: **vessel → body → rod → fingers → hat**.

- `ART.md`: for the Pond pose — `body-kid-boat.png` (open hand, bare head),
  `hand-kid-boat.png` (fingers only), plus `hat-straw.png` and `rod-basic.png`
  regenerated against that body. Same canvas, every one.
- `config.js`: `CONFIG.rig.layers` keeps its shape but every layer shares one
  box; `lineOrigin` stays, and V3 sets it per pose.
- A **local composite check before wiring**: stack the PNGs with Pillow and look
  at the result at game scale. If a piece is off, that's a reroll, not an offset
  tweak — offsets are how G1 got into trouble.
- **Done when:** the rod looks held and the hat looks worn at **1x**, with all
  layers at the same offsets, and swapping in a second hat needs no new numbers.

### V3 — Vessels, with the kid actually inside them
- Rowboat (Pond), waders (Stream), Boston Whaler with the stern fighting chair
  (Ocean), per the decisions carried over below.
- Each vessel gets a **near-side layer painted in front of the angler**, so the
  kid sits down *in* the hull rather than on top of it — the same front-plane
  trick as V1, applied to the boat.
- Rig placement (x/y, rod tip, which pose) moves into a per-location config
  block; nothing may land behind the finger-guide panel.
- **Done when:** switching spots swaps vessel and pose, the hull overlaps the
  angler correctly, and the line still leaves the rod tip in all three.

### V4 — Fish that read as fish
- Shape families beyond the current three silhouettes, so species read by shape
  and not only by tint.
- An underwater silhouette pass (the shape at depth, before the reel).
- A splash at the surface break when the fish is landed — the payoff V1 sets up.
- **Done when:** a bluegill and a pike read differently at a glance, and landing
  one has a visible moment.

### V5 — The gear shop
**Decided (Matt, 2026-08-25): the gear stays**, generated the reference-drawn
way V2 sets up. HATS and RODS sections in the shop, mirroring BOATS — the
`renderShopList` code already generalizes, so this is mostly content.

Art cost, now that pieces register by construction: **one PNG per gear item per
pose**, since a hat drawn for the seated pose won't sit right on the standing
one. Three poses means a hat is three files. Start each new item at the Pond
pose and add the other two when it's proven.

- `config.js`: `shop.hats`, and `file` on `shop.rods` the way boats already have.
- `app.js`: the two new shop sections; equipping re-runs `renderRig()`, which is
  exactly what G1's layer machinery was built for.
- **Done when:** buying and equipping a hat changes the angler everywhere and
  persists, and the rod you bought is the rod in your hand.

## Carried over from the graphics plan (still good)

- **Vessel is per location, not per rank** — Pond rowboat, Stream waders, Ocean
  Whaler with a fighting chair.
- **Three poses**, one per location: seated, standing, seated-in-chair.
- **The angler is assigned from age + sex** at profile setup, not browsed.
- **Favorite color as a runtime tint** on one accent region — this survives
  baking, since it's a filter on a drawn sprite, not a separate PNG.
- **The 720×360 design canvas, no build step, tuning in `config.js`.**

## Art dependency

| Milestone | PNGs |
|---|---|
| V1 | **none** — CSS |
| V2 | per pose: body (open hand), fingers overlay, plus hat + rod regenerated against that body — all on the body's canvas |
| V3 | rowboat, Whaler + chair, and a near-side layer for each vessel; re-shot Stream background (already requested in `ART.md`) |
| V4 | 2–3 fish shape families |
| V5 | depends on the option chosen |

## Open questions

1. ~~Is a hat/rod shop still a goal?~~ **Answered 2026-08-25: yes, keep the
   gear** — generated the reference-drawn, same-canvas way described in V2.
2. **Keep the current angler's look** (teal shirt, straw hat, brown hair) as the
   reference for the redrawn poses, or restyle now while nothing is baked?
3. **One surface treatment or three?** The Pond, Stream and Ocean could share a
   single surface layer, or each get its own palette. Shared is cheaper and
   probably reads fine; worth a look during V1.
