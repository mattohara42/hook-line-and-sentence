# Hook, Line and Sentence — v1 Build Plan

Companion to `SPEC.md`. Each milestone is sized for roughly one Claude Code session and ends in a playable/verifiable state. Build in order — each milestone depends on the previous.

## Repo setup (before first session)

```
hook-line-and-sentence/
├── SPEC.md                  ← the design spec (source of truth)
├── BUILD_PLAN.md            ← this file; check off milestones
├── prototype/
│   └── feel-prototype.html  ← Phase 2 prototype (reference for game feel, not code reuse)
├── index.html
├── app.js
├── style.css
└── data/
    └── words.json           ← generated word pool (M2)
```

Same 3-file vanilla JS pattern as Family Hub, no build step, `python3 -m http.server 8080` locally, Netlify for deploy. Firestore config can follow Family Hub's setup.

**Tech decision to make in M1, not before:** plain DOM/CSS (like the prototype) vs. canvas vs. Phaser 3. Recommendation: start DOM/CSS since the prototype proved it handles this game's needs; escalate only if pixel-art animation demands it.

## Milestones

### ✅ M1 — Core loop, ported and polished (done 2026-07-15)
Port the prototype's cast → wait → reel → catch loop into the real app structure. Word-at-a-time pacing (~450ms pause), error-only tension meter, ghost-hands finger guide. Hardcoded word list is fine here.
**Done when:** the full loop plays in the repo app at parity with the prototype.

### ✅ M2 — Word pool (done 2026-07-15)
**Head start: `generate-words.mjs` and a generated `words.json` (3,014 words) already exist — built and validated during design.** Filters a frequency list against a real dictionary, blocklists junk, supplements home row, tags each word with `letters`/`difficulty`/`theme`. Stage coverage verified: 37 home-row words at stage 1, growing to 167 by stage 2 — so keep stage 1 short (few fish to first unlock). This milestone is now just: wire the game to load `words.json` and filter by an unlocked-letter set (hardcode home row for now).
**Done when:** the game only ever serves words typeable with the configured letter set.

### ✅ M3 — Fish, rarity, coins (done 2026-07-15 — CSS placeholder fish, sprite sourcing deferred)
Define ~8–10 fish across 3 rarity tiers. Rarity maps to word difficulty. Catches award coins. Pixel-art placeholder sprites — source from Kenney.nl (CC0) or itch.io cozy fishing packs; prefer packs sharing one palette. Kid-drawn fish are a legitimate asset pipeline.
**Done when:** rare fish demand harder words and the coin balance persists across a session.

### ✅ M4 — Profiles (Firestore) — M4a done 2026-07-16, M4b done 2026-07-23
Profile picker on launch. Per-kid: unlocked letters, coins, collection, upgrades, accuracy/timing stats (logged silently — feeds v2 adaptive meter). Reuse Family Hub Firestore patterns.
**Done when:** two profiles maintain fully separate state across reloads.
- **M4a (done):** profile picker + emoji avatars, per-kid localStorage save shaped
  per FIRESTORE.md, legacy-save migration, silent per-letter/word/session stats,
  switch-kid. Meets the done-when on localStorage alone.
- **M4b (done 2026-07-23):** Firestore read-on-launch / write-on-catch +
  localStorage mirror, one parent Google sign-in (Firebase signInWithPopup) for
  cross-device sync, ownerUid-scoped docs, firestore.rules. Offline fallback
  verified in-sandbox (Firebase unreachable → game plays on localStorage, no
  errors). **Live-verified 2026-07-23:** the Firebase console setup is done
  (hook-line-and-sentence.netlify.app added to Auth authorized domains, firestore.rules
  merged into the shared ruleset) and the signed-in cross-device path is
  confirmed — **cloud saves work.** See the M4b verification checklist in
  `FIRESTORE.md`.

  **→ v1 is now complete. This also clears the stated prerequisite for the
  Advanced Progression epic (`BUILD_PLAN_ADVANCED.md`), whose first buildable
  milestone is A0 (rank/location foundation).**

### ✅ M5 — Letter unlock progression (done 2026-07-15)
Fish-count milestones unlock new letters in a configured order. Celebration moment on unlock ("new letter!"). Word pool filter updates live.
**Done when:** a fresh profile starts home-row-only and visibly expands its letter set through play.

### ✅ M6 — Collection screen (done 2026-07-15 — M4 pending, single shared save until then)
Grid of all fish; uncaught ones as silhouettes. Per-profile.
**Done when:** catching a new species flips its silhouette.

### ✅ M7 — Shop: rods & bait (done 2026-07-15)
2–3 rods (bite rate / rare odds), 2–3 baits. Simple shop screen, coin spend, effects actually applied.
**Done when:** an upgraded rod measurably changes bite behavior.

### ✅ M7.5 — Juice pass (visual polish) (done 2026-07-15)
One dedicated milestone, done against real gameplay rather than sprinkled through earlier work:
- Locked ~16-color palette (pick from lospec.com) applied to all assets **and** UI
- Layered parallax water (3–4 translucent layers, different drift speeds) + ripples
- Catch/bite juice: splash particles, fish arc on landing, floating "+coins" text, subtle screen shake on bite
- Idle life: boat bobbing, occasional fish shadows, day/night tint cycle (CSS filter)
**Done when:** a stranger watching 10 seconds of idle gameplay says it looks cozy.

### M8 — Ship it
Netlify deploy, kid playtest, tune `CFG` values (words-per-fish, tension penalties, pause length) based on real beginner typing.
**Done when:** a kid lands a fish unassisted and asks to play again.

### ✅ M9 — Visual overhaul (done 2026-07-16)
UI-only pass, no new game logic:
- **Layout:** `#scene` keeps its original 720×360 design-space coordinate system (every bobber/line/fish pixel position tuned earlier assumes it) — a new `#scene-frame` wrapper scales+centers that fixed canvas to cover the viewport (`Math.max(innerWidth/720, innerHeight/360)`, recomputed on resize), and `#scene-viewport` (`position: fixed; inset: 0`) crops the overflow at the real screen edges. Anchored **bottom-left**, not centered — the design's 2:1 aspect is wider/shorter than typical 16:9 windows, so horizontal cropping is the norm; centering was cropping the boat (left edge) off-screen entirely. Bottom-left anchoring means cropping only ever eats into the decorative far-right reeds or the sky, never the boat or the tension meter (bottom edge).
- Boat waterline fix (done ahead of this milestone — `#rig` was floating in the sky layer at `top: 88px`, moved to `top: 178px` to sit at `#water`'s start).
- **Ghost-hands overlay:** `#guide` moved into a new `#guide-panel` wrapper — `position: fixed`, pinned bottom-center, `rgba` translucent background + blur — while `#guide` itself keeps its original relative coordinate system untouched (its children's pixel math didn't need to change).
- `#hud`/`#controls` are now small `position: fixed` corner overlays (top-right) instead of flowing below the scene.
- **Sprite pass:** tried to source a CC0 pack (Kenney.nl Fish Pack / Pirate Pack, OpenGameArt, itch.io) but this environment's egress policy blocks all three hosts outright at the proxy level (confirmed via the proxy's failure log — genuine policy denials, not retried per the no-workaround rule). A GitHub mirror of an older bundled Kenney pack was reachable but didn't contain fish/pirate assets. Went with the user's choice: improved CSS/SVG shapes instead of real sprites — layered gradient-shaded oval fish body with a real clip-path tail + dorsal fin (so they inherit the swim-wobble/landing-arc animation for free) and a two-tone eye, a proper hull silhouette for the boat via clip-path, and a head+hat on the kid. All still code-generated, zero new asset files. Real sprites (CC0-sourced or kid-drawn) remain a future option if a way to reach an asset host opens up, or a kid supplies art directly.
- **Bugfix found during verification:** the fish's far-spawn x (600, chosen when the full 720px-wide scene was always visible) fell into the newly-cropped zone on common 16:10 laptop aspect ratios, so the fish could spawn off-screen at the bite moment. Retuned to a 470→140 range that stays visible down to roughly a 1.4:1 aspect.
**Done when:** the game reads as full-screen with no fixed-size scene box (✅), the finger guide overlays the bottom of the viewport without displacing gameplay (✅), and placeholder shapes read as noticeably more detailed/characterful (✅ — CSS-shape upgrade, not external sprites; see above).

**Explicitly out of scope for M9:** multiple background scenes / levels — that's the existing "more ponds/locations" v2 item (see BACKLOG.md → World), a bigger scope decision (new backgrounds only, vs. new fish/mechanics per level) to be scoped on its own once M9 ships.

### ✅ M10 — Audio (done 2026-07-16)
Pulled forward from the SPEC.md v2 parking lot ("sound design beyond basic ambient loop") at the user's request, ahead of M9. Procedural Web Audio synth — no external asset files, so no licensing/sourcing needed and no new build step:
- Water-drone ambient bed (two low sines + slow LFO detune through a lowpass filter), starts on the profile-pick click (the user gesture that unlocks AudioContext autoplay).
- SFX: cast splash, bite chime, per-word tick while reeling, wrong-key buzz, catch/rare-catch fanfare, escape descent, letter-unlock fanfare.
- `Sound: ON/OFF` toggle next to the finger-guide toggle; preference persisted in localStorage (global, not per-profile — not game state, so not synced to Firestore).
- Ambient bed ducks to silent on tab-hidden, restores on return.
- Volume levels + ambient base pitches live in `CONFIG.audio`; note/melody content lives in app.js next to `PUNS`, matching the existing tuning-vs-content split.
**Done when:** sound plays after the first profile-pick click, the mute toggle silences everything, and no console errors surface across cast → wait → reel → catch/escape → unlock.

## Post-v1 features (shipped after the M1–M10 core)

Not milestones — incremental additions from `BACKLOG.md`, each cozy/no-speed-pressure and each its own small commit on `main`.

### ✅ 2026-07-22 — fun batch
- **Larger keyboard / finger guide** — removed the two ghost "palm" ovals; whole guide scales off one `GUIDE_SCALE` knob (app.js), sizes/positions derived instead of hand-tuned.
- **25-fish rod nudge** — one-time "REEL TALK" modal at `config.economy.rodNudgeAt` catches, pointing at the shop; skipped if already upgraded off the starter rod. Persists per profile.
- **Fish size variants** — per-catch weight roll (`config.size`), "little/LUNKER" flavor, personal-best-per-species in `save.records`, shown in the collection screen.
- **Parent GROWN-UPS view** — per-key accuracy heatmap + trouble-key summary from `save.stats.letters`. Read-only.
- **Fishing journal + badges** — nine punny milestone badges (`config.badges`, `save.badges`); gold toast on earn, retroactive backfill on open.

Still queued (waiting on Gemini art, see `ART.md`): junk catches, cosmetic boat shop.

## Session tips (learned from Family Hub)

- Start each Claude Code session by pointing it at `SPEC.md` and the current milestone.
- Keep a `BACKLOG.md` for ideas that come up mid-build — don't let them expand the current milestone.
- Test locally via ngrok only when OAuth/HTTPS matters (M4 onward); plain http.server before that.
- Tuning values stay in one `CFG` object, same as the prototype.

## Explicitly deferred (see SPEC.md v2 list)

Adaptive tension meter · themed word packs · custom word lists · more ponds · sound design beyond ambient loop
