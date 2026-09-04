# Hook, Line and Sentence: Tackle & Junk (T1–T4)

**Status: active epic, opened 2026-09-04.** The first work after the Art &
Animation Refresh closed. It is small and mostly code: the refresh painted the
world and the gear, and this finishes the two things on the end of the line,
the *terminal tackle* a kid actually watches, and the *junk* they pull up by
mistake, which is the last pixel-era art in the game.

Matt's two scoping calls, made before any of it was built:

- **Tackle is CSS, not paintings.** A bobber is ~20px on screen and a fly is
  smaller; two generations buy very little there, and the boat hulls had just
  settled the same question the same way. So the bobber is redrawn in CSS
  against `ART_DIRECTION.md` rather than generated.
- **Junk gets badges *and* a shelf.** Not badges alone: a junk pull is recorded
  per item and the journal shows what you have dredged up. That costs a save
  field and a Firestore field, which is why it was asked rather than assumed.

## T1: the line gets thin ✅ (2026-09-04)

**Done when:** the cast line reads as line rather than cord, at all three spots.

`CONFIG.anim.line.widthPx` 1.6 → **0.5**, paired with `#line-path`'s stroke
alpha 0.72 → **0.9**. One decision, not two: at 1.6 the line was heavier and
brighter than the rod tip it comes off, and thinning it alone made it vanish
against the Ocean's pale sky, which is the worst of the three backgrounds for
it. Measured by shooting the waiting beat at every spot at five widths,
**0.5 at 0.9 reads more clearly on the Ocean than 0.6 at 0.72 did**, while being
3.2x thinner than what shipped.

It also fixed a verification tool that was lying: see the commit.

## T2: terminal tackle, per spot ✅ (2026-09-04)

**Done when:** the Pond floats a bobber, the Stream drifts a fly, the Ocean
shows neither, and each survives a whole catch (cast, wait, twitch, bite,
plunge) without the others' behaviour leaking in. **All three play a full catch
clean.**

`CONFIG.tackle` keyed by spot; `null` is the Ocean's bare line. Four config
traps, each watched failing. The bobber went from a flat 50/50 circle to a cork
float with a warm dark outline and the colour break below the middle; the fly
took two attempts, because the first read as *a pebble with a stone on it* on
screen and only a pointed pale wing fixed it: at 20x13 screen px the wing is
the entire read.

**Two things it turned up, both fixed here:**

- **F4's mechanic survives a spot with no float, and did not need helping.**
  `twitchBait()` already rang the surface and pulled the rod as well as moving
  the tackle, so at the Ocean the ring and the rod ARE the response to typing.
  The idle ripple still runs there too, which makes the rings the only marker
  for where the bait is. That was checked before writing anything to replace it.
- **`play-check.mjs` waited on `#bobber.on`** to know the cast had landed, which
  is the old "every spot floats something" assumption. It hung for 30s at the
  Ocean and died. It now waits for the LINE's end to stop moving, which does not
  care what is tied to it.

`#bobber` was one CSS circle used everywhere. It is now a per-spot choice driven
from `config.js` the way every other "what exists here" question in this game is
answered: a registry, not a filename convention or a class name assembled in JS
(`CONFIG.fish.species`, `CONFIG.rig.poses`, `CONFIG.rig.gearArt` are the same
idea three times). The Ocean showing nothing is an entry with no tackle, the same
shape as the free hat carrying no `file` and the free hull carrying no `tint`.

The twitch and plunge are F4's and were **not** retuned. Only the idle differs
per kind: a cork bobs on the swell, a dry fly rides the film and drifts
sideways, which is also what tells a kid this spot fishes differently.

## T3: junk trophies ✅ (2026-09-04)

**Done when:** pulling a boot is recorded, badges exist for it, and the journal
shows which junk you have found. **All three, verified in the browser at two
save states.**

`save.junk` is junkId → count, the same shape as `save.collection` and on the
same write path: an increment on one key folded into the write the catch was
making anyway (`FIRESTORE.md`). Migration is `save.junk ??= {}`, and every read
is optional-chained, so a pre-T3 save renders the shelf without it.

**`jokesEndured` is left exactly alone and is deliberately NOT the sum of
`junk`.** It is the lifetime groan total and it is in live cloud saves; pulls
from before T3 were counted without recording which kind, so on an old save the
two legitimately disagree. The badges count `junk`, never `jokesEndured`,
otherwise a save with three old pulls and no breakdown would be most of the way
to "Litter Picker" for junk it can no longer name.

Three badges, and they are the only ones in the game you earn by catching
NOTHING: **Not a Fish** (one pull), **Litter Picker** (`CONFIG.badges.junkPulls`,
10), **Junk Collector** (all four kinds). Junk rolls at `CONFIG.junk.chance` and
cannot be fished for on purpose, which is the joke. Two traps guard the ways
that stops being true: a `junk.chance` of 0 makes all three unearnable, and
they were watched failing.

The shelf uses the same card language as the badge grid it sits under, because
that is what it sits under. A piece never pulled stays **locked** rather than
showing a dimmed sprite: the collection teases fish with a silhouette because
the shape is the reward, and a boot's shape is not: the surprise is.

## T4: junk art (specified 2026-09-04; waiting on one generation)

**Done when:** the four junk sprites are painted in the new direction and the
game draws them.

**The prompt is written out whole in `ART.md` → *Open art requests* → *T4*.** It
is the only part of this epic that needs a generation, and it is **one** sheet
rather than four singles. Registration is not the reason (four junk items never
have to line up with each other); *consistency of treatment* is, because T3 put
all four side by side in the journal shelf, which is exactly where four
separately-generated styles would read as four different games.

**T4 needs no config change at all.** `CONFIG.junk.items` already names
`junk-boot`, `junk-can`, `junk-weed` and `junk-nugget`, and the cut overwrites
those files in place. Art only.

The cutter does **not** exist yet, deliberately: `cut-fish.py`'s four detectors
were each written against a real sheet, and a junk cut is simpler than a fish
cut (four components keyed off flat magenta, each saved as its own square crop,
no peduncle and no tail split). Write it when the sheet lands.

`tools/palette-check.py` is the gate, and these are the first deliveries that
gate exists for. The check that actually decides the milestone is cruder than
any of it: **shrink each one to 34px and see whether you can still tell what it
is**, because that is the size the journal shelf shows them at.

## Which doc owns what

Unchanged: `ART_DIRECTION.md` for how it looks, `ART.md` for the pipeline and
the prompts, `GEMINI_NOTES.md` for the generator, `BACKLOG.md` for what is
deliberately not being done, `HANDOFF.md` for state.
