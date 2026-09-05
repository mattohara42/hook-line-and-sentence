# Hook, Line and Sentence: Living Water (L1–L3)

**Status: active epic, opened 2026-09-05.** The first work after the Tackle &
Junk epic, and the top item on `BACKLOG.md`'s shortlist. S1 gave every spot a
voice, and nothing on screen agrees with any of them: a frog croaks at the Pond
and the Pond does not move. This epic gives the voices bodies.

Matt's two scoping calls, made before any of it was built:

- **CSS and DOM, not paintings.** In the 720x360 design space a dragonfly is
  ~15px and a gull ~16px, where silhouette and motion are the whole read. The
  same call T2 made for the bobber and R5 made for the four hulls, and no
  generation means no wait on a delivery.
- **Only the actors that already have a voice.** The Pond's frog and dragonfly
  and the Ocean's gull. Each one is a sound that exists today with nothing to
  look at. The Stream's leaves, the Pond's heron and the Ocean's sail have no
  voice, so they need a schedule this epic does not have to invent yet.

## L1: the voices get bodies ✅ (2026-09-05)

**Done when:** the frog you hear at the Pond surfaces, the dragonfly you hear
crosses the water, the gull you hear crosses the Ocean's sky, each one is the
*same event* as its sound rather than a second schedule, and **all three still
happen with the sound off.**

### One event, not two schedules

`rippleHeard()` already settled this rule for the Pond's idle rings: "the
picture and the sound are one event rather than two schedules that drift
apart". An actor is that rule applied to the whole cast, so a body comes off the
same tick as its voice.

Which turned up the reason it could not simply be bolted on. **S1 built the
voice schedule inside `startAmbient()`, so the schedule only existed once the
`AudioContext` did**, and `audioGesture()` returns early when the sound is off,
so `ensureAudio()` never runs. Hanging actors off those timers would have given
a kid playing silently a dead pond: no frog, no dragonfly, no gull, ever. So the
schedule moved out of the audio system and now belongs to the **spot**, next to
the costume and the tackle, which is where "what lives here" already lives.
`startAmbient()` keeps the bed and nothing else. `playVoice()` is still the only
thing that checks `soundOn`, so the sound is what the sound switch turns off.

### Where they are allowed to be, which is measured rather than chosen

The scene is a 720x360 canvas scaled to **cover** the viewport and anchored
bottom-left, so how much of it a kid can see varies enormously, and the
keyboard eats the bottom from below. Both were measured at the twelve
`ui-check.mjs` shapes before anything was placed:

| | |
|---|---|
| visible design width | **166px** on a portrait phone, 270 on a portrait tablet, 480 on a landscape tablet, 576 on a laptop, 720 only on an ultrawide |
| guide panel's top edge | **y=240** at 900x600 (the binding shape), y=266 on a landscape tablet, y≈290+ on phones |
| top bar's lower edge | y=55 on a laptop, y=138 on a 320px phone |

So the band that is reliably on screen and not behind a panel is roughly
**x 150–470, y 100–240**, and that is where all three actors live. It is the
same band, and the same binding shape, that put the bobber at y=224.

**The frog does not sit on a lily pad, and that is a measurement rather than a
preference.** `BACKLOG.md` asked for "a frog on a lily pad that puffs when it
croaks", but every pad the Pond is painted with sits below **y=285**: the
bottom-left cluster, the bottom-right cluster and the dock. All of them are
behind the keyboard at every shape except an ultrawide. So the frog surfaces in
the open water instead, eyes and snout breaking the film with a ring around it,
which is what a frog in a pond actually looks like most of the time. It reuses
`ripple()` for the ring rather than drawing a second kind of one. **One line in
`CONFIG.life` puts it anywhere else** if Matt wants the pad version and is
willing to lose it on small screens.

**The word box moved the frog once more, and only a screenshot said so.** Its
first box was x 186–330, which the numbers said was clear. On screen a frog
surfaced squarely behind `#word` and vanished: a croak with nothing to see. The
word box is centred in the free band and reaches as far left as x=198 on a
landscape tablet, so the frog's box is now **x 150–195**, hemmed between the
boat (which ends at x=140) and the word. That band is also the only part of the
Pond a portrait phone can see, so the frog is the one actor that reads there.

**What each shape actually gets** is not guessed at here, because
`tools/life-check.mjs --sweep` prints it live: it spawns the actors at all
twelve `ui-check.mjs` viewports and reports how much of each one is ever
unobscured. As it stands, tablet and up see all three cleanly. **A phone held
upright gets the frog and little else**: the dragonfly fades out at x≈208 while
the crop starts at x≈203, so it goes dark within a few pixels of arriving (it
scrapes in on a 320 and a 360, and is gone on a 390), and the gull finishes
under the top bar. Landscape phones get none of them, because the keyboard
covers everything below y=165 there, which is the shape `ui-check.mjs` lists as
known and accepted.

Moving the gull down and left to rescue it on a phone was considered and
dropped: to clear both the top bar and the crop it would have to finish on top
of the angler. That is the scene's geometry arguing with itself, and the honest
version of the problem is much larger than an actor: **a phone held upright
cannot see where the lure lands either.** That was closed on 2026-09-05 as a
decision rather than a layout (`BACKLOG.md`): the game is typing, a phone has
nothing to type on, and one is now told so on arrival. So no actor is owed a
phone, and the sweep's numbers are about the shapes somebody can play on.

### The registry

`CONFIG.life` is keyed by spot and then **by the voice id**, because the key is
the join: a body cannot be scheduled without a sound to come off, and the id is
also the CSS modifier (`.actor-frog`), so the config, the sound and the drawing
cannot disagree about what a frog is. The fourth time this shape has been
reached for (`CONFIG.fish.species`, `CONFIG.rig.poses`, `CONFIG.rig.gearArt`).
A spot with no entry has no actors, the same way the Ocean names no tackle.

Five config traps, each watched failing: an actor naming a voice its spot does
not have, an actor with no CSS to draw it (it would cross the scene as an
invisible 0x0 div), an actor with no life at all, an actor outliving the gap
between its own voice's firings (which is what would let a Stream bubble spawn
four dragonflies a second if one were ever given a body), and an actor placed
outside the band above. The placement trap failed on its first run for a sixth
reason, which was the test being wrong rather than the config: it demanded that
a crosser START inside the band, and entering from off-crop is the whole point
of a crossing. y is a hard bound on both ends (the scene's full height is always
on screen); x is only bounded where the actor comes to rest.

### Reduced motion

An actor is spawned, moves, and is removed on a timer rather than on
`animationend`, so `prefers-reduced-motion` cannot strand a dragonfly frozen in
the sky forever. Under that setting none of the three spawn at all: a gull
gliding the width of the screen is exactly the motion the setting is asking to
be spared.

## L2: the silent actors (not started)

The Stream's drifting leaves, the Pond's heron, the Ocean's sail. All three need
a schedule that is not the voice list, and the heron wants to react to the cast,
which is a hook into the cast path that L1 deliberately does not have.

## L3: what the water does between catches (not started)

Unspecified. Hold it until L1 and L2 have been played.

## Which doc owns what

Unchanged: `ART_DIRECTION.md` for how it looks, `ANIMATION.md` for how it moves,
`BACKLOG.md` for what is deliberately not being done, `HANDOFF.md` for state.
