# Hook, Line and Sentence: v1 Design Spec

*Working title: TBD (Cast & Keys? Reel Words?, naming parked for later)*

## Vision

A cozy fishing game that teaches kids to type. The vibe is Cast n Chill: calm water, gentle music, no fail-pressure. Typing *is* the fishing, casting, reeling, and catching all happen through the keyboard, so practice never feels like practice.

**Visual direction (changed 2026-08-31):** v1 shipped as pixel art; the game is now warm, painterly and storybook: see `ART_DIRECTION.md`, which supersedes the pixel-art wording that used to be in this line and in "Assets" below. The change reaches everything **except the ghost-hands finger keyboard**, which stays exactly as it is. Motion (casting, the line, reeling) is specified separately in `ANIMATION.md`. Both are being delivered by the Art & Animation Refresh epic, `BUILD_PLAN_REFRESH.md`.

**Primary players:** Matt's kids, learning to type from scratch.
**Design principle:** Cozy first. Nothing in the game should punish slow typing: only carelessness (repeated wrong letters) has consequences, and even those are gentle.

## Core Loop

1. **Cast**: A short word/phrase appears. Type it accurately to cast the line. Accuracy matters, speed doesn't.
2. **Wait**: Cozy idle moment. Water ripples, ambient sounds. A fish bites after a short random delay. **Some casts land on an uninterested pond and ask for a *wiggle* first** (F4, decided Sept 2026): a couple of short words that twitch the bait, each one moving the bobber, ringing the surface and pulling the rod. **No wiggle, no bite**, the cast waits rather than biting anyway on a timer. This is the only place in the game that waits on the kid, and it stays inside the forgiveness stance below: wiggle words carry no tension, no clock and nothing to lose, so slow is still safe. Nothing is taken away; the game just waits.
3. **Reel**: Words stream in one at a time. Each correctly typed word reels the fish closer. A tension meter reacts to *errors*, not speed: wrong letters raise tension; typing correctly (at any speed) lowers it. The fish escapes only if tension maxes out from sustained mistakes.
4. **Catch**: Fish added to collection. Earn coins based on fish rarity. **The payoff is a card** (F3, Sept 2026) carrying the fish's own art, its name, weight and size class, the pun and the coins, raised to a trophy plaque when a species is new or a personal best falls. It has **no display timer**: it is dismissed by the kid typing the first letter of the next cast word, and that letter still counts.
5. **Spend**: Coins buy rods and bait (upgrades) that unlock better fishing.

**Game voice (decided):** All status/flavor text is fishing puns and dad jokes ("Oh my cod: reel it in!"), pulled at random from per-moment pools. Exception: cast prompts always retain the literal instruction so beginners aren't confused. Pun pools live in one data structure, easy for the family to add to.

**v1 forgiveness stance (decided):** Fixed, very forgiving tension meter. A slow-but-careful typist can *always* land the fish. Adaptive meter speed is deferred to v2.

**Reel pacing (decided via prototype, July 2026):** Word-at-a-time with a short pause (~450ms) between words. The pause functions as the reel-crank beat and preserves the cozy rhythm. Continuous stream rejected as too relentless for beginners.

## The Word Pool (one system, four features)

Every word in the game lives in a single pool, tagged with:

- **letters**, which keys it uses
- **difficulty**: length/complexity score
- **theme**: pack it belongs to (v2)

This one structure powers everything:

- **Letter unlock progression:** kids start with home row; the game only serves words composed of their unlocked letters. New letters unlock as milestones are hit (X fish caught, or accuracy threshold).
- **Fish rarity = word difficulty:** harder words hook rarer fish. Rare fish naturally require more unlocked letters.
- **Word packs & custom lists (v2):** just more tagged entries in the same pool, no new system needed.

## v1 Scope (Must-Have)

| # | Feature | Acceptance criteria (abridged) |
|---|---------|-------------------------------|
| 1 | Core loop: cast → wait → reel → catch | One pond, ~8–10 fish types across 3 rarity tiers. Full loop playable with keyboard only. |
| 2 | Upgrades: rods & bait | Coins from catches. 2–3 rods (affect bite rate / rare-fish odds), 2–3 baits. Simple shop screen. |
| 3 | Fish collection screen | Grid of caught fish; uncaught fish shown as silhouettes ("catch 'em all" pull). Per-kid. |
| 4 | Letter unlock progression | Home row start; unlock order defined in config; word pool filters by unlocked letters. Visible "new letter unlocked!" moment. |
| 5 | Per-kid profiles (Firestore) | Profile picker on launch. Each profile stores: unlocked letters, collection, coins, upgrades, accuracy stats. |
| 6 | Ghost-hands finger guide | On-screen mini keyboard with translucent hand outlines on home row. Correct finger animates from home to target key for each letter. Toggleable; on by default. Validated in prototype. |

## v2 / Parking Lot (explicitly not v1)

- **Adaptive tension meter**: scales challenge to each kid's measured WPM/accuracy. *Design note for v1: log per-word accuracy and timing stats in profiles now, so v2 adaptation has data on day one.*
- Themed word packs (animals, etc.)
- Custom word lists (school spelling words): parent-editable
- More ponds/locations, day-night cycle, weather
- Sound design beyond basic ambient loop
- Multiplayer / sibling leaderboard (maybe never: could break the cozy vibe)

## Non-Goals

- No timers, countdowns, or WPM displays **in the fishing loop**: stats are
  tracked silently there. This was written as a flat v1 non-goal and still holds
  where it matters: casting and reeling are accuracy-first, and a kid who types
  slowly and carefully can always land the fish. Two post-v1 additions sit
  outside it deliberately: A4's per-species WPM personal-best on a landed
  Stream/Ocean catch, and **Quick Cast**, an opt-in timed speed test in the
  tackle box. The point of the non-goal is that nobody is ever *raced while
  fishing*; a kid who goes looking for a stopwatch may have one.
- No monetization, accounts beyond family, or public release considerations.
- No mobile/touch support: this is a keyboard game by definition. Desktop browser only.

## Tech Direction (Phase 3: to be finalized after prototype)

- **Likely stack:** vanilla JS + Firestore, matching Family Hub patterns (no build step, known deployment path via Netlify). Phaser 3 remains an option if pixel-art animation needs outgrow canvas/DOM: decide after prototyping game feel.
- **Assets:** ~~pixel art: source from open packs (e.g., itch.io fishing/water tilesets) for v1~~, **superseded.** The game stuck, so it has custom art: AI-generated painterly backgrounds and rigged sprites, per `ART_DIRECTION.md` and the pipeline in `ART.md`.

## Open Questions → Working Defaults

All remaining questions were non-blocking; defaults below are adopted for v1 unless overridden.

1. ~~Reel pacing~~: **Resolved via prototype:** word-at-a-time (see Core Loop).
2. **Letter unlock trigger**: *Default:* fish-count milestones (simple, visible). Accuracy-gated unlocks revisit in v2 alongside adaptive meter.
3. **Word list source**: *Default:* script-generated from a word-frequency list, filtered by letter set and tagged by difficulty. Hand-curation only as cleanup pass.
4. **Capitalization**: *Default:* lowercase-only in v1. Shift is a future "letter unlock."
5. **Finger guide look-ahead (known limitation)**: Guide shows the current letter only; fast typists will outrun the animation. Acceptable for beginner audience; revisit only if kids notice.

## Success Criteria (family-scale, not corporate)

- Kids ask to play it unprompted within the first week.
- Measurable accuracy improvement in profile stats over a month.
- A kid lands a rare fish and shows somebody.
