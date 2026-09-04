# Hook, Line and Sentence — Tackle & Junk (T1–T4)

**Status: active epic, opened 2026-09-04.** The first work after the Art &
Animation Refresh closed. It is small and mostly code: the refresh painted the
world and the gear, and this finishes the two things on the end of the line —
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

## T1 — the line gets thin ✅ (2026-09-04)

**Done when:** the cast line reads as line rather than cord, at all three spots.

`CONFIG.anim.line.widthPx` 1.6 → **0.5**, paired with `#line-path`'s stroke
alpha 0.72 → **0.9**. One decision, not two: at 1.6 the line was heavier and
brighter than the rod tip it comes off, and thinning it alone made it vanish
against the Ocean's pale sky, which is the worst of the three backgrounds for
it. Measured by shooting the waiting beat at every spot at five widths —
**0.5 at 0.9 reads more clearly on the Ocean than 0.6 at 0.72 did**, while being
3.2x thinner than what shipped.

It also fixed a verification tool that was lying: see the commit.

## T2 — terminal tackle, per spot

**Done when:** the Pond floats a bobber, the Stream drifts a fly, the Ocean
shows neither, and each survives a whole catch (cast, wait, twitch, bite,
plunge) without the others' behaviour leaking in.

Today `#bobber` is one CSS circle used everywhere. It becomes a per-location
choice driven from `config.js` the way every other "what exists here" question
in this game is answered — a registry, not a filename convention or a class
name assembled in JS (`CONFIG.fish.species`, `CONFIG.rig.poses`,
`CONFIG.rig.gearArt` are the same idea three times).

The Ocean showing nothing is not a special case to code around: it is an entry
with no tackle, the same way the free hat carries no `file` and the free hull
carries no `tint`.

The twitch, bob and plunge animations are F4's and are **not** being retuned —
they are what makes a kid see their typing move something in the water. A fly
needs its own idle (a drift, not a bob) but the twitch stays.

## T3 — junk trophies

**Done when:** pulling a boot is recorded, badges exist for it, and the journal
shows which junk you have found.

`save.jokesEndured` counts junk pulls today and nothing reads it. Junk becomes
per-item counts, badges hang off those counts, and the journal grows a shelf
beside the badge grid. The save migration has to be idempotent and has to leave
`jokesEndured` alone — it is in live cloud saves.

## T4 — junk art

**Done when:** the four junk sprites are painted in the new direction and the
game draws them.

`CONFIG.card.junkPx`'s comment already calls these out: *"the four junk sprites
are the last pixel-era art in the game — the refresh never [reached them]"*.
Four prompts, Matt generates, and they are the only part of this epic that needs
a generation. `tools/palette-check.py` is the gate they have to pass, and they
are the first deliveries it will judge.

## Which doc owns what

Unchanged: `ART_DIRECTION.md` for how it looks, `ART.md` for the pipeline and
the prompts, `GEMINI_NOTES.md` for the generator, `BACKLOG.md` for what is
deliberately not being done, `HANDOFF.md` for state.
