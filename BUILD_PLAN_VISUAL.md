# Typing Fishing — Visual Rework Plan

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

### V1 — Depth and contact (no new art)
- `style.css`: a `#surface` layer from the waterline down, painted in front of
  the mid plane, with a subtle bright lip on the line itself.
- Contact shadow and a small wake under the hull.
- The fish gets an underwater treatment while it's below the line —
  desaturated, dimmed, slightly soft — clearing as it crosses on landing.
- The bob becomes a **rock**: a small rotation with a little heave, so the boat
  pivots in the water instead of sliding over it.
- **Done when:** at the Pond and the Ocean, the boat reads as sitting in the
  water and the fish reads as under it — with zero new PNGs.

### V2 — One drawn angler per pose (reverses G1's split)
- `ART.md`: the angler drawn **complete** — body, hands, rod and hat in one
  sprite — one per pose. The rod is in the hand because it was drawn there.
- `config.js`: `CONFIG.rig.layers` collapses to the angler plus the vessel.
  `CONFIG.rig.lineOrigin` **stays** — a config-driven line origin is the part of
  G1 that earned its keep, and V3 needs it per pose.
- **Done when:** the angler reads correctly at game scale with no per-piece
  offset tuning, in a screenshot taken at 1x rather than 4x.

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

### V5 — Customization, priced by what V2 costs
Baking the angler makes hats and rods expensive: they multiply against poses and
characters. Three ways to go, to be picked before any art is ordered:

- **(a) Drop cosmetic hats/rods.** They've been deferred since the boat shop and
  boats already give coins somewhere to go. Art = characters × poses.
- **(b) Reference-drawn hats.** Keep hats swappable, but generate each one *from
  the body sprite as an image reference* — hand Gemini the angler PNG and ask
  for a hat drawn to fit that head at that scale. Registration becomes the
  generator's problem instead of a tuning problem. **Recommended.**
- **(c) A sprite per combination.** Correct, and it explodes. Only viable if the
  roster stays tiny.

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
| V2 | one complete angler per pose (3 for the current character) |
| V3 | rowboat, Whaler + chair, and a near-side layer for each vessel; re-shot Stream background (already requested in `ART.md`) |
| V4 | 2–3 fish shape families |
| V5 | depends on the option chosen |

## Open questions

1. **Is a hat/rod shop still a goal**, or was it mainly a way to spend coins?
   Boats already cover that. The answer picks V5's option and decides whether
   V2's sprites bake the hat in.
2. **Keep the current angler's look** (teal shirt, straw hat, brown hair) as the
   reference for the redrawn poses, or restyle now while nothing is baked?
3. **One surface treatment or three?** The Pond, Stream and Ocean could share a
   single surface layer, or each get its own palette. Shared is cheaper and
   probably reads fine; worth a look during V1.
