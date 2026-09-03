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

**Where it lands (F1, 2026-09-03).** `CONFIG.anim.cast.landing` was `(394, 196)`
— two px below `fish.surface.y`, the waterline the background art is painted to.
In a scene whose water recedes *toward* the viewer, that line is the far bank: the
lure sat on the horizon, and the line's far end then jumped ~80px down and ~65px
right the instant a fish took it at y≈256. It is now `(458, 224)` and the jump is
43px, all of it the fish's mouth sitting below the bait — which is what a bobber
and a fish look like. The point is matched to `fish.path.fromX/fromY` plus
`fish.approach.spawn`; move those and this moves with them. It cannot simply BE
the bite point, which is inside the guide-panel band: **the panel is a fixed
page-size element over a scaled design canvas, so the smaller the window the more
design space it eats.** 224 is as low as it can go and still clear on 2:1, 16:9,
16:10, 4:3 and 900x600, which is the binding shape at 13px.

**The wiggle twitch (F4).** On a wiggle cast every word the kid types twitches
the bait: a 340ms `bobberTwitch` (a sharp dip-and-flick, not a wobble), a ripple
at the landing point, and `tug.wordImpulse` on the rod. Those are the same three
motions a reeled word already makes, aimed at the bait instead of at a fish — the
mechanic only works if a kid can see their typing move something in the water.

## Line while idle/waiting

The line should sag slightly between rod tip and lure, a gentle curve rather than a straight rigid line. A quadratic Bezier from rod tip to lure position, with the control point offset downward, is enough to sell weight without a full rope simulation.

## Line during a bite/reel-in

When a fish is hooked, the line curve should visibly react to tension: the control point of the curve shifts based on the current tension value (already tracked by the tension-meter mechanic), so the line looks taut when tension is high and slack when it drops. This ties the existing tension mechanic to something visible instead of leaving it purely numeric.

## Reeling motion

Rod tip animates with small, irregular bounce/pull movements timed to key input events, distance between rod tip and fish position shortens progressively as the player types correctly. Each correct keystroke can trigger a small forward tug rather than a smooth continuous animation, since that better matches the typing-driven mechanic.

### How the fish travels, and why it is a tween (2026-09-02)

The fish moves between two things: `setFishTarget()` puts a *mark* on the reel
path, and `startPull(ms)` sends the fish there over a real duration, eased in
and out (`logic.easeInOut`). Timings are `CONFIG.fish.pull` — one per kind of
move, because a word being reeled in, a hooked fish coming up out of the depths
and a fish making a run are not the same gesture.

It replaced a per-frame exponential chase, `fishX += (fishTX - fishX) * 0.08`,
which had two faults in one line. The 0.08 was **per frame**, so the whole reel
ran at whatever rate the monitor refreshed at. And an exponential's velocity is
highest on its **first** frame: from a standstill the fish covered a third of a
word's travel in ~100ms and then crept invisibly for the rest of the beat. A
velocity that steps from zero to maximum between two frames is seen as a jump,
which is what it was reported as. High speed is not the problem and slowing it
down is not the fix — an ease that leaves and arrives at rest is.

Two consequences worth knowing before retuning it. A pull re-anchors on the
fish's *current* position, so one arriving mid-flight (the Stream reels a word
on every typed space, without waiting for a pause) redirects rather than snaps.
And `wordMs` should stay under `CONFIG.reel.wordPauseMs`, so the fish has
settled before the next word is asked for.

## Holding the species back

A hooked fish is not a fish you can name. The approach silhouette used to end
at the bite, which meant the moment a fish took the hook it was fully painted,
fully coloured and glowing its tier — at the far end of the scene, where "what
is it?" is the whole of the tension, and a legendary gave itself away before a
single word was typed.

`--reveal` is now written onto `#fish` every frame from how far the fish has
been reeled, and the stylesheet's submerged filters interpolate on it: at 0 it
is *exactly* the approach silhouette's own filter, so the shape that rose out of
the depths carries straight through the hook; at 1 it is the through-water look
a fish near the boat has always had. The tier glow rides the same ramp.
`CONFIG.fish.reveal` sets where it starts and where it finishes.

`fullAt` is deliberately below 1. The fish is never *drawn* at progress 1:
`land()` fires in the same tick the last word sets that target, so the furthest
it ever reaches is `(wordsToLand - 1) / wordsToLand` — 0.75 for a common, which
is the binding case. A reveal that finished at 1 would never finish at all,
which is how the first attempt landed a common fish 36% revealed.

The one that gets away runs the ramp backwards: an escape is a CSS transition
(`.fleeing`) with the reveal driven to 0, so the fish accelerates into deep
water and goes back to being a shape. It used to be `el.fish.style.left =
"760px"` with the swim loop already stopped, which was not an escape so much as
a disappearance.

## The catch card (F3, 2026-09-03)

The one piece of motion that is not in the water. The post-catch card **rises**
into place under the catch (420ms, a slight overshoot) and is **yanked** off the
top when the kid starts the next word (260ms, ease-in). The yank is deliberate
and is not a fade: a fade reads as the card giving up, a yank reads as the kid
clearing it to get on with fishing. Durations are `CONFIG.card.inMs` /
`yankMs`, written onto the element as custom properties so the CSS and the JS
timeout cannot drift apart.

Under `prefers-reduced-motion` the card still appears and still waits for a
keystroke — it just does not travel to get there. Losing the card entirely would
lose the whole payoff of a catch.

## Scope note

None of this requires a physics engine. A tuned Bezier curve for the line and simple tween timings for the rod are enough to fix the "line just appears" problem. A full rope/verlet simulation is not needed at this stage and would be over-engineering for what the game needs.

## Open assumption (flag for review)

Assuming Bezier-curve line rendering with tension-driven control point movement is sufficient fidelity, rather than a physics-based rope. This should be prototyped once and reviewed before being treated as final.

> **Prototyped 2026-08-31 (R1): `prototype/line-animation.html`.** It imports
> the real `logic.js` maths and the real `CONFIG.anim` numbers, at game scale
> with the game's own sprites, so what gets reviewed is what ships — cast it,
> then drag the tension slider while it reels. **Still awaiting Matt's eye
> test.** If the Bezier is judged not enough, the curve lives in
> `logic.lineControlPoint`/`lineSagPx` and every number in `CONFIG.anim`, so
> replacing it doesn't reach into the game loop.

## Where the build stood before R1 (2026-08-31, historical)

*Written as the implementation map for R1, and kept because it explains why the
code is shaped the way it is. **Every item below has since been done** — the
line is an SVG path, the cast travels, the rod tip is read live. Read it for the
reasoning, not as a to-do list.*

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
  own offset gave `LINE_ORIGIN` in scene coordinates, and the rod is its own
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
