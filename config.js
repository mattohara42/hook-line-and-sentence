// config.js — every tuning knob in one place. No magic numbers elsewhere.
// Values marked [PROTO] were validated in the feel prototype; others are
// starting guesses to be tuned at M8 against real kid typing.

export const CONFIG = {
  reel: {
    errorTension: 12,       // [PROTO] tension added per wrong key
    correctRelief: 3,       // [PROTO] tension removed per correct key (any speed)
    escapeAt: 100,
    wordPauseMs: 450,       // [PROTO] the reel-crank beat between words
    // bigger fish take more words to land
    wordsToLandByTier: { common: 4, uncommon: 5, rare: 6, legendary: 8 },
    // reel words match the fish's difficulty; if the unlocked pool has fewer
    // candidates than this, easier difficulties are mixed in until it doesn't
    minReelPoolSize: 8,
    minPhrasePoolSize: 4,   // same, for the Stream's phrase pool (a curated, thinner set — A1)
    recastDelayMs: 1500,    // pause on the catch/escape message before recasting
  },

  // Quick Cast — the timed typing-speed test. Deliberately OUTSIDE the
  // progression: the tackle box always offers it, whatever a kid has unlocked,
  // and it neither reads nor writes fishing stats (see app.js). Its only
  // persisted state is save.speedBest.
  speedTest: {
    durationSec: 30,               // one run, wall-clock
    countdownSec: 3,               // "ready?" beats before the clock starts
    useUnlockedLettersOnly: false, // false = the whole word pool, so scores stay comparable
    upcoming: 2,                   // queued words shown after the current one
  },

  bite: {
    delayMsRange: [1200, 3200],
    // odds a bite comes from each tier, by rod level (must sum to 1)
    tierOddsByRod: {
      1: { common: 0.80, uncommon: 0.17, rare: 0.03,  legendary: 0.00  },
      2: { common: 0.62, uncommon: 0.28, rare: 0.09,  legendary: 0.01  },
      3: { common: 0.45, uncommon: 0.35, rare: 0.17,  legendary: 0.03  },
      4: { common: 0.34, uncommon: 0.36, rare: 0.24,  legendary: 0.06  },
    },
  },

  // Letter unlock: cumulative total catches required to reach each stage.
  // Stage 1 is deliberately short — only 37 home-row words exist (see BUILD_PLAN M2).
  unlock: {
    stages: [
      { letters: "asdfghjkl", catchesRequired: 0  },  // stage 1: home row
      { letters: "ei",        catchesRequired: 3  },  // quick first unlock
      { letters: "ru",        catchesRequired: 8  },
      { letters: "to",        catchesRequired: 15 },
      { letters: "nc",        catchesRequired: 25 },
      { letters: "wmy",       catchesRequired: 40 },
      { letters: "pvb",       catchesRequired: 60 },
      { letters: "qxz",       catchesRequired: 85 },  // legendary letters — Muskie Quixote territory
    ],
    celebrateMs: 2600,      // how long the "new letters!" banner holds the stage
  },

  // Advanced Progression tiers (BUILD_PLAN_ADVANCED A0). Ordered easiest→hardest.
  // A profile's rank derives from the furthest location it has unlocked (rods
  // unlock locations — see shop.rods[].unlocksLocation); `location` is where the
  // kid is currently fishing. Pond/Minnow is always open and never changes (no
  // timers, no speed pressure). Muskie is a prestige rank awarded on the
  // legendary catch (A8), not a location — so it isn't in this table.
  tiers: [
    { rank: "minnow",   location: "pond",   locationName: "the Pond",   label: "Minnow Wrangler", badge: "🐟" },
    { rank: "mackerel", location: "stream", locationName: "the Stream", label: "Mackerel Master", badge: "🎣" },
    { rank: "marlin",   location: "ocean",  locationName: "the Ocean",  label: "Marlin Hunter",   badge: "🗡️" },
  ],

  // A8: the prestige capstone. Muskie is the one rank you don't buy your way
  // into — it's earned by landing the Ocean's legendary, so it has no location
  // and isn't in the tiers table above. Held by *having caught* the fish rather
  // than a stored flag, so it can never desync from the collection and old saves
  // that already landed it are credited the moment they load.
  prestige: {
    rank: "muskie",
    fishId: "muskie",          // must match an id in data/fish.json (a data test checks)
    label: "Muskie Master",
    badge: "🏆",
    celebrateMs: 4200,         // held longer than a rank-up — this is the finish line
  },

  // Capitals (Shift) enter at the Stream (A2 / AD6): only phrases at graduated
  // spots carry capital letters — the Pond stays lowercase-only (a v1 promise,
  // and Shift is harmless there). The data test enforces that no capital appears
  // in content tagged for any other location.
  capitals: { fromLocations: ["stream", "ocean"] },

  // Punctuation (A5 / AD6): a new earned unlock track, one tier later than
  // capitals — sentences (and their `. , ! ?`) start at the Ocean, while the
  // Stream's phrases stay punctuation-free. Like a space, a punctuation mark
  // is a real key the kid must press to advance, but it's forgiving — a
  // mismatch never touches tension (see handlePunct in app.js). The data test
  // enforces that no punctuation mark appears in content tagged for any other
  // location.
  punctuation: { chars: ".,!?", fromLocations: ["ocean"] },

  // Fly-cast rhythm + WPM (A4), a Stream+ layer. Both are cozy and self-paced:
  // an even casting cadence earns a "nice cast" line (never a penalty), and a
  // per-species personal-best WPM shows on the Stream catch card only. minKeys =
  // gaps needed before we'll judge cadence; maxCadenceCv = the evenness bar
  // (stddev/mean); higher = more forgiving.
  flyCast: { minKeys: 2, maxCadenceCv: 0.5 },

  // A7: the sport-fish "fight" — the Ocean's landing rhythm. A catch is reeled
  // in *segments* (one sentence each), and the fish "runs" between them, and
  // again at each mid-sentence clause break. A run is pure theatre: it darts
  // the fish back on screen and beats for a moment, but **no progress is ever
  // lost and tension is never touched** — slow + careful still always lands.
  // Bigger fish take more segments, which is what makes a marlin feel like a
  // fight and a sardine feel like a snack. Set the *RunMs values to 0 to keep
  // the drama but drop the pause entirely.
  fight: {
    fromLocations: ["ocean"],
    segmentsByTier: { common: 1, uncommon: 1, rare: 2, legendary: 3 },
    clauseRunMs: 550,    // beat at a comma — close to the established word beat
    segmentRunMs: 900,   // longer beat between whole sentences
    runSurgePx: 90,      // how far the fish darts back (design-space px, visual only)
  },

  // G1: the angler is drawn as stacked layers inside #rig, not one baked sprite
  // — which is what unblocks swappable hats/rods (R7). R4 makes it one stack
  // *per location*: one kid, three costumes (ART_DIRECTION.md decision 2), so
  // applyScene() re-renders the rig whenever the kid changes water.
  //
  // Within a pose, array order is paint order (body first, rod on top); x/y are
  // design px relative to #rig, and `file` is assets/<file>.png. A missing PNG
  // paints nothing (the console logs a harmless 404, same as the biome
  // backgrounds did before they landed), so a stack degrades quietly to
  // whatever art exists.
  //
  // `rodPivot` is the grip the rod swings about and `lineOrigin` is the tip the
  // line leaves from. Both belong to the *pose*, not to CONFIG.anim, because
  // both are only meaningful against that pose's rod box — a standing angler
  // holds the rod somewhere else. A data test keeps them on the box.
  rig: {
    // R5: a pose also owns its VESSEL and where the whole rig sits.
    //   anchor  — #rig's position and the point it rocks about, in design px.
    //             It was fixed in style.css until R5; a kid standing in a river
    //             does not sit where a kid in a rowboat does.
    //   bob     — whether #rig rocks like a hull. True in a boat, false in
    //             waders: the Stream angler is standing on a riverbed.
    //   vessel  — `far` paints behind the angler and `near` in FRONT of them,
    //             which is V1's front-plane trick applied to the hull so the kid
    //             sits down *in* it rather than on it. `near` may be null until
    //             that art lands; a missing PNG paints nothing. `skinnable`
    //             marks the vessel that shop.boats reskins, and `shadow` is the
    //             smudge of dark water under the hull — a box rather than a
    //             flag, because it has to move and stretch when the hull does.
    //             null = no vessel, which is the Stream.
    //
    // A location with no pose of its own wears this one. That is every level
    // today: R4's art is requested in ART.md and has not landed, so the Stream
    // and the Ocean are still the Pond kid in pond clothes. Giving them their
    // own entries now, pointing at files that do not exist, would render an
    // invisible angler in two of the three levels — worse than the wrong shirt.
    defaultPose: "pond",
    poses: {
      // R4's painted angler. Both layers are cuts of ONE delivered painting
      // (assets/angler-pond.png), so they share one canvas and one box and the
      // offsets are zero by construction — change the box and both move
      // together, which is the whole point of the same-canvas rule.
      //
      // The rod paints BEHIND the body because that is how the art is drawn:
      // the hand is painted in front of the pole, and the butt tucks behind the
      // knee. That is also what makes a swapped shop rod (R7) look held without
      // a separate fingers overlay.
      //
      // No hat layer: the angler is bare-headed on purpose so R7 can draw hats
      // against this pose. The old pixel hat-straw would not match it.
      pond: {
        anchor: { x: 20, y: 168, pivot: { x: 59, y: 30 } },
        bob: true,
        // R5's painted rowboat, cut from one painting along the near gunwale's
        // sheer: `near` is the rail and topsides, and it paints over the kid's
        // shins so he sits down IN the boat. Geometry places the sheer at design
        // y≈190 (his thigh) and the hull straddling the y=198 waterline.
        //
        // NOT skinnable for now, and that is a visible regression worth knowing
        // about: shop.boats' four alternate hulls are still single pixel-era
        // PNGs with no far/near split, so equipping one would either paste a
        // pixel rowboat over this or, if matched by suffix, 404 into an
        // invisible boat. They each need the same cut — see ART.md.
        vessel: { far: "boat-pond-far", near: "boat-pond-near",
                  x: -16, y: 2, w: 156, h: 42, skinnable: false,
                  shadow: { x: 24, y: 212, w: 116 } },
        // rod → arm → body. The hand is painted in front of the pole, and the
        // forearm's cut end tucks behind the knee, which the body carries — so
        // the arm sits between them.
        //
        // Rod files are named rod-<shop id>-<pose>, because a pose's default rod
        // is that level's GATE rod (shop.rods[].unlocksLocation), not one
        // generic pole: the Pond's is the free `stick`, and you cannot reach the
        // Stream without buying `bamboo` or the Ocean without `deepsea`. R7 then
        // fills in the rest of the grid, one PNG per owned rod per pose.
        layers: [
          { id: "rod",  file: "rod-stick-pond",   x: 39, y: -44, w: 70, h: 76 },
          { id: "arm",  file: "angler-pond-arm",  x: 39, y: -44, w: 70, h: 76 },
          { id: "body", file: "angler-pond-body", x: 39, y: -44, w: 70, h: 76 },
        ],
        // Measured off the canvas, not tuned in the browser: the grip is where
        // the hand closes on the pole and the tip is the rod's point, both
        // carried through the same crop-and-scale as the art. They are no
        // longer box corners — the rod shares the body's canvas, so its box is
        // the whole pose and the rod crosses it diagonally at 48.0 deg.
        //
        // The delivered painting ran the rod off the canvas corner, so the
        // frame decided its length and it came out at 51% of the old rig's.
        // tools/cut-angler-pond.py now extends the shaft along its own axis to
        // a length set in design px, which is why this is 65 — the same 130%
        // of the kid's height the old browser-tuned rig had.
        rodPivot:   { x: 65, y:    5 },
        lineOrigin: { x: 108, y: -44 },
        // The angler's upper arm and elbow are hidden behind the drawn-up knee,
        // so the layer is forearm + hand and it pivots where they vanish — the
        // cut end barely moves and stays tucked. 6.2 design px from here to the
        // grip, so the arm carries the rod as well as swinging itself.
        armPivot:   { x: 60, y:  8.5 },
      },
      // R4's Stream angler: the same kid standing in the water in waders and a
      // fly vest, holding Bamboo Beauty — the rod that unlocks this spot.
      // A different POSE, not a recolour, so every number here was measured off
      // its own painting. It is taller than the Pond's because scale comes from
      // matching the two HEADS: the generator drew both figures to fill their
      // frames, so the standing kid came back only 2% taller than the seated
      // one, and scaling them alike would have stood him up no taller than he
      // sits. 75 design px standing against 50 seated.
      stream: {
        anchor: { x: 20, y: 168, pivot: { x: 59, y: 30 } },
        // No hull, so no rocking: he is standing on a riverbed. This replaces
        // the one-line `.loc-stream #boat { display: none }` R4 borrowed from
        // R5 — the pose says it now, rather than a CSS special case.
        bob: false,
        vessel: null,
        layers: [
          { id: "rod",  file: "rod-bamboo-stream",   x: 38, y: -70, w: 88, h: 123 },
          { id: "arm",  file: "angler-stream-arm",   x: 38, y: -70, w: 88, h: 123 },
          { id: "body", file: "angler-stream-body",  x: 38, y: -70, w: 88, h: 123 },
        ],
        rodPivot:   { x: 65, y:   4 },
        lineOrigin: { x: 125, y: -70 },
        // the sleeve vanishes behind the vest rather than the knee here, but
        // the principle is the Pond's: pivot where the limb disappears, so the
        // cut end never moves and the body layer covers it.
        armPivot:   { x: 56, y:   7 },
      },
      // R4's Ocean angler: the same kid braced back as if in the fighting
      // chair, in a life vest, holding The Deep Endeavor — the rod that unlocks
      // this spot. The chair itself is deliberately NOT drawn: it is a vessel,
      // and R5 paints vessels as a near-side layer in FRONT of the angler, so
      // baking it into the body here would stop R5 seating the kid in it.
      //
      // Seated like the Pond, and it measures like it too — 51 design px
      // against 50, by the same head match. It is the first pose whose arm
      // bends visibly enough to need two segments in the cut tool; the other
      // two hide their upper arm behind a knee or a vest.
      ocean: {
        // The whole rig rides 24px higher than the other two poses, and that is
        // the Whaler's doing rather than the kid's: a fighting chair is a raised
        // seat, so putting his hips on it and then floating the hull at its own
        // painted waterline lifts everything. The pivot is the hull's centre at
        // that waterline, which is what the Pond's (59, 30) is too.
        anchor: { x: 20, y: 144, pivot: { x: 98, y: 54 } },
        bob: true,
        // R5's Boston Whaler, cut from one painting along the near gunwale like
        // the rowboat. NOT skinnable, and this one never will be: shop.boats
        // sells paint for a rowboat.
        //
        // x/y seat the kid rather than centre the boat — they put the chair's
        // seat pan under his hips, measured off the painting (its pan is 326,122
        // into a 1510x465 crop). The waterline the painting itself carries (the
        // cool grey below the cream topsides, 85% down) then lands on the
        // scene's own y=198, which is what anchor.y is solving for.
        vessel: { far: "boat-ocean-far", near: "boat-ocean-near",
                  x: 13, y: 10, w: 170, h: 52, skinnable: false,
                  shadow: { x: 48, y: 206, w: 140 } },
        layers: [
          { id: "rod",  file: "rod-deepsea-ocean",   x: 38, y: -48, w: 71, h: 82 },
          { id: "arm",  file: "angler-ocean-arm",    x: 38, y: -48, w: 71, h: 82 },
          { id: "body", file: "angler-ocean-body",   x: 38, y: -48, w: 71, h: 82 },
        ],
        rodPivot:   { x: 68, y:   3 },
        lineOrigin: { x: 109, y: -48 },
        armPivot:   { x: 50, y:   3 },
      },
    },
  },

  // R6: per-species fish art. The same shape as CONFIG.rig.poses, and for the
  // same reason — the config is the registry, so a species listed here renders
  // its own art and a species absent from it renders the tier placeholder. That
  // is the only switch between them, which is what makes a half-finished roster
  // a playable state rather than a broken one.
  //
  // An entry is written by tools/cut-fish.py off the delivered painting and
  // never tuned in the browser: `w`/`h` are the box in design px, `mouth` is
  // where the line attaches (the leftmost opaque column at its own vertical
  // centre), and `tail` is the pivot the tail layer sweeps about — the midpoint
  // of the caudal peduncle, which is where the cut was made. Both cuts share one
  // canvas, so their offsets are zero by construction and `layers` is only paint
  // order.
  fish: {
    // What a species with no art renders as: the tier sprite, in the box #fish
    // has always had, with the mouth drawFish() used to hardcode as left+6/+20.
    // The Ocean muskie's A8 hero sprite is 96px wide by a CSS special case and
    // still uses this mouth — as it does today — until its own wave lands.
    placeholder: { w: 62, h: 41, mouth: { x: 6, y: 20 } },
    // A species' length comes from its RANK, not from its painting. The
    // generator draws every subject to fill its frame, so a minnow and a pike
    // come back the same size — the same trap GEMINI_NOTES.md records for the
    // standing and seated anglers. The cut tool scales each painting to this and
    // a data test holds landed art to it, which is what stops 33 separate
    // generations drifting into 33 separate scales.
    lengthByTier: { common: 54, uncommon: 64, rare: 78, legendary: 96 },
    // the tail sweep: how far it swings each way, and how long a full there-and-
    // back cycle takes. Small on purpose — a fish at 60px reads as swimming from
    // a few degrees, and more looks like a fish in trouble.
    swim: { tailDeg: 7, tailPeriodMs: 1100 },
    // R6: the fish is SEEN before it bites. It drifts up out of the depths as a
    // dark silhouette behind #surface, which is the front plane V1 built for
    // exactly this, and the bite is then the moment it becomes a real fish
    // rather than the moment one appears from nowhere. `lead` is how long before
    // the bite it shows itself (clamped to the bite delay, so a fast bait still
    // gets a tease, just a shorter one), `from` is where it enters, and `spawn`
    // is the offset from the reel's first target that both the drift ends at and
    // the hooked fish starts at — one number, so the tease and the hook cannot
    // be two fish in slightly different places.
    // `rise` is measured FROM the spawn rather than from the canvas, because the
    // only reliably visible water is relative to where the fish already appears:
    // #scene-frame covers the viewport, so design x past 480 is cropped on a 4:3
    // screen, and #guide-panel measures 185,260→535,353 in design px on a 2:1
    // one. Above y≈256 is clear of the panel on every shape measured (2:1,
    // 16:10, 16:9, 4:3); below it, a silhouette would be teasing the back of the
    // keyboard. So the fish rises from behind the panel band INTO clear water,
    // which is also what "out of the depths" should look like.
    //
    // `spawn` moved up with it (dy 56 → 24, unchanged dx). It is the same offset
    // the hooked fish has always used, and at 56 the bite itself emerged fully
    // behind the panel on a 2:1 screen and swam out of it — the fish now appears
    // where it can be seen. The reel is untouched: it still eases to the same
    // targets from wherever the fish starts.
    approach: { leadMs: 1100, rise: { dx: 12, dy: 44 }, spawn: { dx: 30, dy: 24 } },
    // and the other end of it: the fish breaks the surface on the way to the
    // boat. y is the waterline every biome's art is painted to and #surface
    // starts at (55% of the 360px canvas) — a splash under the water is what
    // this used to be, and it read as nothing at all.
    surface: { y: 198, splashParticles: 18 },
    // Filled a wave at a time, Pond first — see ART.md. Empty is the correct
    // state until art lands, not a missing config.
    species: {},
  },

  // R1 (ANIMATION.md): the cast, the line and the reel now move. Every number
  // the motion uses lives here — app.js owns no timings. Design-space px on the
  // 720x360 canvas, ms for durations, degrees for the rod.
  anim: {
    rod: {
      // The rod rotates about the grip so the tip swings while the hand stays
      // put. *Where* the grip is belongs to the pose (CONFIG.rig.poses.<loc>
      // .rodPivot) — it moves with the costume; only the angles live here.
      backswingDeg: -15,   // anticipation: tip lifts back over the angler
      forwardDeg: 20,      // the swing that releases the lure (tip toward the water)
      // R4: how much of the rod's swing the ARM contributes rather than the
      // wrist. The two split the same total, so R1's tuned angles are unchanged
      // — but the arm rotating about its own pivot carries the grip with it,
      // which is what "moves the arm and rod, not the whole kid" asks for.
      // 0 disables it, and a pose with no armPivot falls back to that.
      armFollow: 0.35,
    },
    cast: {
      // where the lure lands and the bobber then sits. The old build hardcoded
      // this three times (bobber CSS, the splash at 400,195, the ripple at
      // 394,196); now it is one point and those all derive from it.
      landing: { x: 394, y: 196 },
      apexPx: 46,          // how high above the straight chord the lure arcs
      backswingMs: 190,    // anticipation (ease-in)
      flightMs: 520,       // release → splash (ease-out)
      recoverMs: 420,      // rod easing from the forward swing back to rest
      splashParticles: 5,
    },
    line: {
      // sag of the quadratic's control point: the visible dip is half this.
      idleSagPx: 26,       // waiting on a bite — a lazy hanging line
      slackSagPx: 30,      // reeling at zero tension
      tautSagPx: 3,        // reeling at max tension — nearly straight
      castSagPx: 12,       // in flight, while the lure is still travelling
      widthPx: 1.6,
    },
    tug: {
      // damped spring (logic.stepTug). Impulses stack, so fast typing reads as
      // an irregular judder rather than a restarted animation.
      stiffness: 190,
      damping: 16,
      keyImpulse: -36,     // one correct letter: a small backward flick
      wordImpulse: -84,    // a whole word reeled in: a proper pull
      jitter: 0.45,        // ±45% randomised, so no two tugs are identical
    },
  },

  shop: {
    // `unlocksLocation` graduates the profile to a new fishing spot on purchase
    // (A0): bamboo opens the Stream, deep-sea opens the Ocean (A6). Carbon sits
    // between them as a pure luck upgrade — the deep-sea rod is both the Ocean
    // gate and the best odds in the game. Every rodLevel here needs a matching
    // bite.tierOddsByRod entry (a data test enforces it).
    rods: [
      { id: "stick",   name: "Trusty Stick",       cost: 0,   rodLevel: 1 },
      { id: "bamboo",  name: "Bamboo Beauty",      cost: 25,  rodLevel: 2, unlocksLocation: "stream" },
      { id: "carbon",  name: "The Carp Whisperer", cost: 80,  rodLevel: 3 },
      { id: "deepsea", name: "The Deep Endeavor",  cost: 150, rodLevel: 4, unlocksLocation: "ocean" },
    ],
    baits: [
      { id: "worm",    name: "Garden Worm",   cost: 0,  biteSpeedMult: 1.0 },
      { id: "cricket", name: "Lucky Cricket", cost: 15, biteSpeedMult: 0.75 },
      { id: "glow",    name: "Glow Grub",     cost: 50, biteSpeedMult: 0.55 },
    ],
    // Cosmetic only — `file` is the assets/<file>.png swapped onto #boat. The
    // free default `classic` points at the existing boat.png.
    boats: [
      { id: "classic", name: "Ol' Faithful", cost: 0,  file: "boat"        },
      { id: "red",     name: "Red Rover",    cost: 20, file: "boat-red"    },
      { id: "blue",    name: "Blue Bayou",   cost: 20, file: "boat-blue"   },
      { id: "leaf",    name: "Lily Pad",     cost: 40, file: "boat-leaf"   },
      { id: "purple",  name: "Purple Reign", cost: 60, file: "boat-purple" },
    ],
  },

  // Junk catches — comedy fake catches (boot/can/weed/nugget) that roll in place of a
  // fish on a small fraction of bites. No coins, no collection entry, just a
  // groan pun. `file` is assets/<file>.png; `{it}` in PUNS.junk gets `name`.
  junk: {
    chance: 0.08,
    items: [
      { id: "boot", name: "an old boot",   file: "junk-boot" },
      { id: "can",  name: "a rusty can",   file: "junk-can"  },
      { id: "weed", name: "a clump of pond weed", file: "junk-weed" },
      { id: "nugget", name: "a dinosaur chicken nugget", file: "junk-nugget" },
    ],
  },

  economy: {
    // coin values live in fish.json per fish; keep any global multipliers here
    firstCatchBonus: 2,     // extra coins the first time a species is caught
    rodNudgeAt: 25,         // total catches that triggers the one-time "buy a rod" nudge
  },

  // Journal badge thresholds. The rest (home row, legendary, lunker, all-rods,
  // all-letters) derive from other config, so only the raw numbers live here.
  badges: {
    wordsTyped: 100,      // "Hooked on Typing"
    catches: 25,          // "Reel Regular"
    accuracyPct: 95,      // "Sharp Shooter" — accuracy threshold…
    accuracyMinKeys: 200, // …over at least this many keystrokes
  },

  // Every catch rolls a weight (lb) in its tier's range — pure flavor + a
  // personal-best-per-species chase. No effect on coins or difficulty.
  size: {
    weightRangeByTier: {
      common:    [0.2, 1.5],
      uncommon:  [1,   4],
      rare:      [4,   12],
      legendary: [15,  45],
    },
    lunkerFrac: 0.85,   // top 15% of the range lands as a "LUNKER"
    littleFrac: 0.15,   // bottom 15% lands as "a little one"
  },

  // Procedural audio (Web Audio synth, no external asset files — see M10 in
  // BUILD_PLAN.md). Note pitches/melodies are sound-design content and live
  // next to PUNS in app.js; these are the tunable levels/knobs.
  audio: {
    masterVolume: 0.6,
    musicVolume: 0.32,
    sfxVolume: 0.7,
    duckedVolumeMs: 400,        // fade time when tab hides/shows
  },

  // Firebase / Firestore sync (M4b). These values are public by design — a
  // Firebase web config is an identifier, not a secret; access is controlled
  // by the Firestore security rules (see firestore.rules). Reuses the Family
  // Hub project. Sync is optional: with no sign-in the game runs on
  // localStorage alone.
  // Self-hosting? Replace this block with your own project's config —
  // see FIRESTORE.md → "Cloud saves setup (self-hosting)".
  firebase: {
    sdkVersion: "10.14.1",        // gstatic CDN version; bump here if an import 404s
    // Predates the rename to Hook, Line and Sentence; kept verbatim because it
    // addresses live cloud saves. Renaming it would orphan them and needs a
    // data migration, not an edit here.
    collection: "typingFishing",  // one doc per kid lives directly in this top-level collection
    config: {
      apiKey: "AIzaSyCq_WtqHd5WmJldlNptE8zchu2RmuAX_yE",
      authDomain: "familyhub-5fc43.firebaseapp.com",
      projectId: "familyhub-5fc43",
      storageBucket: "familyhub-5fc43.firebasestorage.app",
      messagingSenderId: "941604403053",
      appId: "1:941604403053:web:4d4a0e0d870f41459b8c64",
    },
    // The Google OAuth web client backing sign-in (kept for reference; Firebase
    // Auth's signInWithPopup uses the project's default client automatically).
    oauthClientId: "1023822683234-e0pslac1cag5ju2o26gl5c9kq36udr7q.apps.googleusercontent.com",
  },

  // Dev/test affordances for the BUILD + PLAYTEST phase — not for real players.
  // When `testShortcuts` is on, the tackle box shows a clearly-labelled 🧪 button
  // that grants every rod (unlocking every fishing spot) and jumps to the
  // furthest one, so a playtest reaches the advanced tiers without grinding.
  //
  // This is *derived from where the game is running*, not a flag anyone has to
  // remember to flip — the button was live on the production site for a while
  // precisely because a flag is easy to forget. Local dev and Netlify deploy
  // previews get it; the real site never does, and it fails closed anywhere
  // unfamiliar. To play with shortcuts on production for a moment, use DevTools
  // rather than shipping a `true`.
  dev: { testShortcuts: isDevHost(currentHostname()), testCoins: 200 },
};

// Split in two so the decision is a pure, testable function of the hostname and
// only the lookup touches globals (there is no `location` in Node, where the
// data tests import this file — an unknown host is treated as production).
export function currentHostname() {
  return typeof location === "undefined" ? "" : (location.hostname || "");
}
export function isDevHost(hostname) {
  return hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "[::1]"
      || hostname.endsWith(".local")            // a machine on the LAN, e.g. matts-mac.local
      || /^deploy-preview-\d+--/.test(hostname); // Netlify PR previews, never production
}
