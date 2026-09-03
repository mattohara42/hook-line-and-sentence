# BUILD_PLAN_FEEL.md — the Catch Feel epic (F1–F5)

*Opened 2026-09-03, from a play session. Everything in here was seen on screen
before it was written down; the screenshots that prove each one are named in the
milestone.*

The Art & Animation Refresh (`BUILD_PLAN_REFRESH.md`) gave the game paintings.
Playing it revealed that the **moment of the catch** — the thing all that art is
for — is the weakest part of the loop. Four scene elements disagree about where
the fish is, and the payoff for landing one is a two-line pixel-font message in
the corner that is gone in a second and a half.

This epic fixes the moment. **R7's nine rods are paused, not cancelled** — they
are the last of the refresh and they resume when F5 closes.

## The rules this epic inherits

Nothing here changes them, and each one has bitten a milestone below.

- **Nothing may land in the bottom-center finger-guide panel.** It measures
  185,260 → 535,353 in design px on a 2:1 screen and covers the lower third.
- **Cozy first: never punish slow typing, only carelessness.** F4 adds the first
  thing in the Pond that waits on the kid, so read its note.
- **Verify visual and motion claims in a real browser, past the startup modal.**
- **An assertion proves the code ran, not that the picture is right.** Four of
  the five milestones below are only checkable by looking.

## F1 — the water tells the truth

Three separate scene bugs, all of them "an element is not where the fish is".
One milestone because they share one verification pass.

1. **Two ripples on the landing word.** `pullFishOneWord()` fires a burst and a
   ripple at a hardcoded `(mid, 258)` / `(mid, 262)` on *every* word, including
   the one that lands the fish — where `surfaceBreak()` fires its own splash at
   the waterline. So the catch ends with two rings stacked vertically, one in
   open water and one directly above it at the surface. Seen in `base-6-landing`.
2. **The approach silhouette is the wrong fish.** `approach()` sets
   `el.fish.className = "silhouette"` *after* `renderFish(fish)` has set
   `.rigged`, so the class assignment wipes it and
   `#fish:not(.rigged) { background: fish-common.png }` paints the old shared
   placeholder body *behind* the two real species layers. The tease is a fat
   generic blob with a painted tail attached; the bite is the real fish. Seen in
   `base-3b-approach-late` and in `cls=[silhouette approaching] layers=2`.
3. **The line lands at the far bank and then jumps.** `CONFIG.anim.cast.landing`
   is `(394, 196)` — two px below the waterline, which in a scene whose water
   recedes *toward* the viewer is the far shore. The fish bites at design y≈256.
   So the line's far end jumps ~70px down and ~65px right at the bite, from the
   horizon into the water in front of you. Seen in `base-2-waiting` against
   `base-4-bite`: the bobber is still up at the shoreline while the line already
   runs down behind the guide panel.

**Done when** one ripple leaves the water on a landing, the shape that rises out
of the depths is the shape that takes the hook, and the line's far end does not
move at the bite beyond the fish's own swim. Each proved by a screenshot, not by
an assertion.

**✅ Shipped 2026-09-03.** The wake is skipped on the landing word and its
numbers are in `CONFIG.fish.wake`; the silhouette keeps `.rigged`; the lure
lands at `(458, 224)` and the far end now moves 43px at the bite instead of 80,
all of it the fish's mouth sitting below the bait. `tools/play-check.mjs` came
out of this milestone and every later one should use it.

## F2 — a face that matches the paintings

Answers **open question 1 of `BUILD_PLAN_REFRESH.md`**, which R2 left parked:
Silkscreen is the last pixel-era thing in the game. Every pun, chip, banner and
shop label is set in a 10–13px pixel face against warm painterly backgrounds,
and the post-catch message is the place it hurts most — it is the longest string
the game ever shows and the least readable.

**Decision (Matt, 2026-09-03): swap it game-wide.** One warm rounded storybook
face replaces `--display` everywhere.

**The keyboard is not affected and must not be.** `.key` has never carried a
`font-family` at all — it inherits `--mono` from `body` — so the frozen keyboard
comes through this untouched. Confirm that in a screenshot rather than trusting
this paragraph.

**Done when** `--display` names the new face, the game reads warm at 11px, and
the guide keyboard is pixel-for-pixel what it was.

## F3 — the catch card

The payoff, and the biggest piece of work in the epic. Today a catch produces
`setStatus("NEW! " + pun + " — Pun-kinseed (0.3 lb, a little one)")` in the top
-left corner at 12px, held for `reel.recastDelayMs` (1500ms) and then overwritten
by the cast prompt. By the time it appears the fish has already arced off the
screen, so there is nothing to look at and no time to read.

**Decision (Matt, 2026-09-03): one card that escalates.** Every catch raises the
same surface; a new species or a personal best turns that card into the trophy
plaque, rather than queueing a second thing behind it.

- **The card** carries the fish's own art at a readable size, its name, weight
  and size class, the pun, and the coins earned.
- **The plaque** is the same card with a frame, a ribbon and a **NEW SPECIES** or
  **NEW RECORD** flag. `firstCatch`, `newBest` and `newWpmBest` are already
  computed in `land()`; nothing new has to be tracked.
- **It holds until the kid is ready.** No timer. It goes when the first
  keystroke of the next cast word arrives, and that keystroke still counts.
- Junk catches and escapes raise the same card without the plaque frame — they
  have exactly the same unreadability problem and it is one surface, not three.
- **The existing celebrations keep working around it.** The badge toast and the
  letter-unlock banner both fire on the same catch; the banner is centred at
  `top: 40%` and has to move while a card is up.

**Done when** a catch puts a card on screen that a six-year-old can read, it is
still there a minute later if nobody touches the keyboard, the first letter of
the next cast clears it, and a new species and a new personal best each raise the
plaque.

## F4 — the wait is something you do

Two changes to the pre-bite beat, which today is 1.2–3.2s of locked input and
nothing to do.

1. **Longer bite delay.** `CONFIG.bite.delayMsRange`, tuned in the browser.
2. **Wiggle casts.** Some casts land the bait and the fish only loiters: the kid
   types a few short words to twitch it, and the bite comes when they finish.

**Decision (Matt, 2026-09-03): no wiggle, no bite.** The cast waits for the
wiggle words rather than biting anyway on a timer.

**This is the first thing in the Pond that waits on the kid, so be careful with
it.** It does not break the cozy guardrail — the words can be typed as slowly as
you like, there is no tension, no timer and nothing to lose — but it *is* a
state a distracted kid can park the game in. Keep the ask small (a couple of
short words), make the prompt say plainly what to do, and make the bait visibly
respond to every word so the cause and effect is obvious.

**Done when** a wiggle cast asks for its words, each word visibly twitches the
bait, the fish comes after the last one, and an ordinary cast is unchanged apart
from being a little longer.

## F5 — eye test, docs, and back to the rods

Play it. Fold what each milestone decided into the doc that owns it
(`SPEC.md` for the wiggle, `ANIMATION.md` for the card's motion,
`ART_DIRECTION.md` for the face), rewrite `HANDOFF.md`, and hand R7 back its
nine rods.

## Open questions

1. **Does the per-word wake belong on a fixed row or on the fish?** F1 suppresses
   the duplicate and lifts the hardcoded 258/262 into config, but leaves the ring
   on a fixed row. Tracking the fish's own y is more truthful and would put the
   first two rings behind the guide panel, where the fish starts. Left alone
   deliberately; revisit if the fixed row reads wrong once F1's landing point
   moves.
2. **Should the fish emerge higher?** `CONFIG.fish.approach.spawn.dy` was cut
   56 → 24 in #103 so the bite would clear the guide panel on a 2:1 screen. On
   16:9 it still emerges half behind it (`base-3b-approach-late`). Not F1's job —
   F1 moves the *line* to meet the fish — but it is the other half of the same
   complaint.
3. **Should the escape get its own card treatment?** F3 gives it the plain card.
   The parked "the one that got away" backlog item would make it a quest, which
   is a different and larger thing.
