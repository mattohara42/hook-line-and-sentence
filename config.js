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
    minPhrasePoolSize: 3,   // Stream phrase pool floor (A1 — the curated set is small)
    recastDelayMs: 1500,    // pause on the catch/escape message before recasting
  },

  bite: {
    delayMsRange: [1200, 3200],
    // odds a bite comes from each tier, by rod level (must sum to 1)
    tierOddsByRod: {
      1: { common: 0.80, uncommon: 0.17, rare: 0.03,  legendary: 0.00  },
      2: { common: 0.62, uncommon: 0.28, rare: 0.09,  legendary: 0.01  },
      3: { common: 0.45, uncommon: 0.35, rare: 0.17,  legendary: 0.03  },
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
  // `content` selects what the reel serves at each spot: "words" (Pond),
  // "phrases" (Stream, A1 — multi-word with a typed spacebar), "sentences"
  // (Ocean, A5 — falls back to phrases until then).
  tiers: [
    { rank: "minnow",   location: "pond",   locationName: "the Pond",   label: "Minnow Wrangler", badge: "🐟", content: "words"     },
    { rank: "mackerel", location: "stream", locationName: "the Stream", label: "Mackerel Master", badge: "🎣", content: "phrases"   },
    { rank: "marlin",   location: "ocean",  locationName: "the Ocean",  label: "Marlin Hunter",   badge: "🗡️", content: "sentences" },
  ],

  shop: {
    // `unlocksLocation` graduates the profile to a new fishing spot on purchase
    // (A0). Ocean's dedicated deep-sea rod arrives in A6; carbon stays a pure
    // luck upgrade until then. ponytail: only the Stream gate exists for A0.
    rods: [
      { id: "stick",  name: "Trusty Stick",     cost: 0,  rodLevel: 1 },
      { id: "bamboo", name: "Bamboo Beauty",    cost: 25, rodLevel: 2, unlocksLocation: "stream" },
      { id: "carbon", name: "The Carp Whisperer", cost: 80, rodLevel: 3 },
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

  // Junk catches — comedy fake catches (boot/can/weed) that roll in place of a
  // fish on a small fraction of bites. No coins, no collection entry, just a
  // groan pun. `file` is assets/<file>.png; `{it}` in PUNS.junk gets `name`.
  junk: {
    chance: 0.08,
    items: [
      { id: "boot", name: "an old boot",   file: "junk-boot" },
      { id: "can",  name: "a rusty can",   file: "junk-can"  },
      { id: "weed", name: "a clump of pond weed", file: "junk-weed" },
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
};
