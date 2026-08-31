# Hook, Line and Sentence — Casting, Line, and Reeling Animation Spec

> **Adopted 2026-08-31.** Companion to `ART_DIRECTION.md`; both are the source
> of truth for the Art & Animation Refresh scoped in `BUILD_PLAN_REFRESH.md`
> (this spec is milestone **R1**, and it is the one part of the refresh that
> needs no new art). What the current build actually does, and what has to
> change to satisfy this, is written up under **Where the current build stands**
> at the bottom.

This exists because the current build's line "just appears" with no motion. This is a missing animation spec, not a missing asset, so it needs to be defined before Claude Code implements it.

## Casting

1. Rod tip pulls back slightly (anticipation), short duration (~150–200ms), ease-in.
2. Rod swings forward, line and lure travel outward along an arc, not a straight line. Use a simple projectile-style curve (parabolic or a tuned Bezier), duration roughly 400–600ms, ease-out on landing.
3. Lure lands with a small splash effect (a few expanding, fading circles is enough, no particle system needed at this stage) and a soft sound cue.

## Line while idle/waiting

The line should sag slightly between rod tip and lure, a gentle curve rather than a straight rigid line. A quadratic Bezier from rod tip to lure position, with the control point offset downward, is enough to sell weight without a full rope simulation.

## Line during a bite/reel-in

When a fish is hooked, the line curve should visibly react to tension: the control point of the curve shifts based on the current tension value (already tracked by the tension-meter mechanic), so the line looks taut when tension is high and slack when it drops. This ties the existing tension mechanic to something visible instead of leaving it purely numeric.

## Reeling motion

Rod tip animates with small, irregular bounce/pull movements timed to key input events, distance between rod tip and fish position shortens progressively as the player types correctly. Each correct keystroke can trigger a small forward tug rather than a smooth continuous animation, since that better matches the typing-driven mechanic.

## Scope note

None of this requires a physics engine. A tuned Bezier curve for the line and simple tween timings for the rod are enough to fix the "line just appears" problem. A full rope/verlet simulation is not needed at this stage and would be over-engineering for what the game needs.

## Open assumption (flag for review)

Assuming Bezier-curve line rendering with tension-driven control point movement is sufficient fidelity, rather than a physics-based rope. This should be prototyped once and reviewed before being treated as final.

## Where the current build stands (2026-08-31)

Read this before implementing — it is what the code does today, so the diff is
smaller than the spec above makes it sound.

- **The line is one rotated `<div>`.** `#line` in `style.css` is a 2px-tall box
  with `transform-origin: left center`; `aimLine(x, y)` in `app.js` sets its
  width to `Math.hypot(dx, dy)` and rotates it. It is straight by construction —
  a rigid rod between two points. **A Bezier needs a real curve primitive**, so
  R1 replaces `#line` with an inline SVG `<path>` in the scene (one element, no
  library, no canvas — this is not the "no Phaser/canvas" rule being bent).
- **The cast has no travel.** `startCast()` sets the line's width to `0`, and
  `startWait()` calls `lineToBobber()` once — the CSS `width` transition is the
  entire animation, which is why it reads as "appearing". The bobber is a
  fixed-position dot at `left: 388px; top: 190px` that fades in. **The lure has
  to become a moving thing** with a start (rod tip) and an end (its landing
  point), tweened along the arc, with the bobber taking over where it lands.
- **The rod tip is already addressable.** `CONFIG.rig.lineOrigin` plus `#rig`'s
  own offset gives `LINE_ORIGIN` in scene coordinates, and the rod is its own
  layer in `CONFIG.rig.layers`. So the anticipation pull-back and the per-key
  tug are a transform on that one layer, with `lineOrigin` recomputed from its
  live position rather than read once at load — that last part is the change
  most likely to be missed.
- **Tension is already a number on every keystroke** (`tension`, 0–100,
  `renderTension()`), so wiring it to the control point is a read, not new
  plumbing. Tension rises on errors only — never on slow typing — so the taut
  line must read as *"you're making mistakes"*, never as *"you're too slow"*.
- **The splash already exists.** `burst(400, 195, 5)` and `ripple()` draw
  expanding fading circles in front of `#surface`; the landing splash the spec
  asks for is those, fired at the lure's real landing point instead of a
  hardcoded 400,195.
- **Reduced motion is honoured throughout** — `REDUCE_MOTION` short-circuits the
  swim RAF, and `style.css` has a `prefers-reduced-motion` block that disables
  `#line`'s transition among others. Every new tween here needs the same
  treatment: the cast still has to *complete*, instantly, with the line drawn in
  its final position.
- **All coordinates are design-space px on the 720×360 canvas**, and every
  timing/curve constant belongs in `config.js`, not inline in `app.js`.
