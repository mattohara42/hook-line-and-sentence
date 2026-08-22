# Typing Fishing 🎣

A cozy pixel-art fishing game that teaches kids to type. Casting, reeling,
and catching all happen through the keyboard — practice that never feels
like practice.

**Status:** built and playable. The core game (milestones M1–M10) is done;
now shipping post-v1 features (see `BACKLOG.md`). Hosted on Netlify — pushes to
`main` are promoted to production manually.

## Start here

| File | What it is |
|------|-----------|
| `SPEC.md` | Design source of truth — all decisions and v1 scope |
| `BUILD_PLAN.md` | v1 milestone order (M1–M10, all done) with done-criteria |
| `BUILD_PLAN_ADVANCED.md` | Post-v1 Advanced Progression epic — tiers (Minnow→Muskie), phrases/sentences, WPM-as-goal; phased A0–A8 |
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
