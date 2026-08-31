# Hook, Line and Sentence 🎣

A cozy fishing game that teaches kids to type. Casting, reeling,
and catching all happen through the keyboard — practice that never feels
like practice.

**Status:** built and playable. The core game (M1–M10) and the Advanced
Progression epic (A0–A8) are both done — four ranks, three fishing spots, words
→ phrases → punctuated sentences. Current work is the **Art & Animation
Refresh** (`BUILD_PLAN_REFRESH.md`): the whole visual layer is being restarted
in a warm painterly style (`ART_DIRECTION.md`), and the cast, line and reel are
getting real motion (`ANIMATION.md`). The engine underneath — progression, the
ghost-hands keyboard, the unlockables — isn't changing. Hosted on Netlify —
pushes to `main` are promoted to production manually.

> **Renamed 2026-08-31.** This project was *Typing Fishing*, in a repo called
> `WordsPerM...`, and lived at `fishtyping.netlify.app`. Everything moved to
> **Hook, Line and Sentence** — a better fit now that the game grades up from
> words to phrases to full punctuated sentences. Saved games are unaffected.

## Start here

| File | What it is |
|------|-----------|
| `HANDOFF.md` | Session-to-session notes — read this first when resuming work |
| `SPEC.md` | Design source of truth — all decisions and v1 scope |
| `BUILD_PLAN.md` | v1 milestone order (M1–M10, all done) with done-criteria |
| `BUILD_PLAN_ADVANCED.md` | Post-v1 Advanced Progression epic — tiers (Minnow→Muskie), phrases/sentences, WPM-as-goal; phased A0–A8 (done) |
| `BUILD_PLAN_REFRESH.md` | **Current epic** — the Art & Animation Refresh, R1–R7: motion, palette, painted backgrounds, one rigged angler, vessels, a rig per fish, gear |
| `ART_DIRECTION.md` | How the game looks — warm painterly storybook; governs every visual choice, generated or CSS-drawn |
| `ANIMATION.md` | How the cast, line and reel move — the R1 spec |
| `BUILD_PLAN_VISUAL.md` | Superseded by the refresh (V1 shipped and survives); kept for the reasoning trail |
| `BUILD_PLAN_GRAPHICS.md` | Superseded twice over; kept for the reasoning trail |
| `CLAUDE.md` | Instructions for Claude Code sessions |
| `FIRESTORE.md` | Profile/save data schema + cloud-saves setup (self-hosting) |
| `BACKLOG.md` | Ideas parked to protect milestone scope, plus shipped post-v1 features |
| `ART.md` | Art pipeline — Claude writes Gemini prompts, Matt generates the PNGs |
| `config.js` | Every tuning knob, one file |
| `data/words.json` | 2,851 words tagged by letters/difficulty (generated, minus `data/blocklist.json`) |
| `data/phrases.json` | Stream content — multi-word phrases (hand-curated) |
| `data/sentences.json` | Ocean content — punctuated sentences (hand-curated) |
| `data/fish.json` | The roster — say hi to Muskie Quixote |
| `prototype/` | Playable design artifacts: feel test + visual mockup |
| `tools/generate-words.mjs` | Regenerates `data/words.json` |

## How it plays

Type the word on screen to cast. A fish bites, and reeling it in is
word-at-a-time typing with a beat between words. **Tension only reacts to
mistakes, never to speed** — a slow, careful typist always lands the fish. A
ghost-hands keyboard under the scene shows which finger to use, and new letters
unlock as catches add up, starting from the home row.

Four ranks open three spots: the Pond (single words, lowercase only), the
Stream (multi-word phrases, spacebar and capitals), and the Ocean (full
sentences with punctuation). Catch the legendary and you're a Muskie.

## Quick Cast — the speed test

A timed typing test lives in the tackle box (⏱️ **Quick cast**), and it is
**always available** — every profile, from the first minute, whatever they have
unlocked. Type as many words as you can in 30 seconds; you get words-per-minute,
accuracy, and a personal best to beat.

It sits deliberately outside the game:

- **No progression gate**, and by default it draws from the *whole* word pool
  rather than a kid's unlocked letters, so a score means the same thing in week
  one as in month six. `CONFIG.speedTest.useUnlockedLettersOnly` flips that.
- **It cannot touch the fishing save** — no coins, no catches, no badges, and
  none of the per-key stats behind the Grown-ups view. "Hooked on Typing" counts
  words reeled from real fish, and typing under a clock is not the same evidence
  about which keys a kid finds hard. Its only stored state is `speedBest`.
- The finger guide follows along, same as it does while fishing.

## Play the prototypes

Open `prototype/visual-mockup.html` in a browser. No server needed.

## Dev

```
python3 -m http.server 8000
```

Then open http://localhost:8000. No build step. That's the whole point.

## Deploy

No build step, so deploy the repo's static files to any static host — Netlify,
GitHub Pages, Cloudflare Pages, Firebase Hosting, etc. The reference install is
on Netlify; pushes to `main` are promoted to production manually.

## Cloud saves (optional)

The game plays **fully offline on localStorage** — no account, no server, no
setup. Every profile, catch, and stat is saved on that device/browser.

To sync a kid's progress **across devices** behind one parent Google sign-in,
wire up Firebase Firestore. It works with either a brand-new Firebase project or
one you already use for something else — step-by-step for both paths (plus what
to put in `config.js`, the security rules, and a verification checklist) is in
**`FIRESTORE.md` → Cloud saves setup**. With no Firebase config the feature is
simply off and the game still works.

## Tests

```
node --test
```

Zero dependencies — Node's built-in runner.

- `tests/data.test.mjs` validates the hand-edited content and tuning knobs
  (`data/*.json` and `config.js`): word invariants, fish roster, tier-odds sums,
  unlock ordering, shop/junk config. Catches the bug class where a bad merge or
  manual edit silently corrupts the data.
- `tests/logic.test.mjs` covers the pure game math in `logic.js` — tier rolls,
  weight/lunker classification, stage gating, and the reel-pool fallback — with
  RNG injected so the tests are deterministic.

`logic.js` holds the pure, DOM-free math; `app.js` keeps thin wrappers that feed
it the live `CONFIG`, equipped rod, and word pool. Everything else in `app.js`
is DOM/state-bound and verified by hand in the browser.
