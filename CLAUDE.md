# CLAUDE.md — Hook, Line and Sentence

Cozy fishing game that teaches kids to type, in a warm painterly storybook
style. Read `SPEC.md` first — it is the source of truth for all design
decisions. `BUILD_PLAN.md` defines milestone order for the v1 core (M1–M10, all
done); `BUILD_PLAN_ADVANCED.md` was the plan for the post-v1 **Advanced
Progression epic** (tiers, phrases, sentences, WPM-as-goal) — **A0–A8 all
shipped 2026-08-22, epic complete.**

The current epic is the **Art & Animation Refresh** —
`BUILD_PLAN_REFRESH.md` (R1–R7, opened 2026-08-31; **R1 shipped, R2 next**). It is a
significant piece of work: the whole visual layer is being restarted under two
new source-of-truth docs, **`ART_DIRECTION.md`** (warm painterly, Ghibli-
anchored, no pure black) and **`ANIMATION.md`** (the cast/line/reel motion the
game has never had). It supersedes `BUILD_PLAN_VISUAL.md` (V2–V5) and
`BUILD_PLAN_GRAPHICS.md`, both of which planned art in the old pixel style;
V1's three-plane scene survives and is only retuned. **The engine is not being
touched** — progression, the keyboard and the unlockables all stay as they are.
`ART.md`'s open art requests were withdrawn with the old direction; R3 opens
the new ones. A real kid playtest of the A7 fight beats is still outstanding
(see `BACKLOG.md`).

Work on exactly one milestone at a time. `ART.md` is the art pipeline: Claude
writes Gemini prompts + filenames, Matt generates the PNGs.

**GitHub repo:** owner `mattohara42`, repo name `hook-line-and-sentence`.
Renamed from `WordsPerM...` on 2026-08-31, along with the game itself (it was
"Typing Fishing") and the Netlify site. GitHub redirects the old URL, so an
old clone's remote keeps working, but use the new name in new work.

**Two old names survive on purpose, and are not to be "fixed":** the
localStorage keys `tf:*` (`app.js`) and the Firestore collection
`typingFishing` (`config.js`). Both address saved games on real devices and in
the live Firebase project — renaming either orphans real kids' progress. They
are storage paths, not display names. `LEGACY_KEY = "typing-fishing-save"` is
older still and is load-bearing for the pre-profiles migration.

## Architecture rules

- **Vanilla JS, no build step.** Three files: `index.html`, `app.js`,
  `style.css`, plus `config.js` and `data/*.json`. If a change seems to need
  a bundler or framework, stop and discuss instead.
- **All tuning values live in `config.js`.** No magic numbers in game logic.
- **Firestore per `FIRESTORE.md`** — one read per launch, one write per
  catch, localStorage mirror. Do not add subcollections or per-keystroke
  writes.
- Rendering is DOM/CSS (validated by `prototype/visual-mockup.html`). Do not
  introduce canvas or Phaser without discussing first. **Inline SVG is allowed**
  for shapes CSS can't express — R1's curved fishing line is one `<path>` in the
  scene. That is still DOM, still no build step; it is not the canvas door
  opening.
- **The scene has three planes** (V1, and it survives the art refresh):
  background art, the mid plane (rig, fish), and `#surface` — the water painted
  *in front* of the mid plane. New scene elements have to pick a side of the
  surface. Nothing may land in the bottom-center finger-guide panel; it covers
  the lower third.
- **`ART_DIRECTION.md` governs every visual choice** — palette, light, outline
  weight — including CSS-drawn UI, not just generated PNGs. No pure black
  anywhere; warm dark browns instead. The ghost-hands keyboard is the one
  deliberate exception and stays exactly as it is.

## Design decisions already made (don't relitigate)

- Word-at-a-time reeling with ~450ms pause (prototype-tested)
- Tension reacts to errors only, never speed — slow typing is always safe
- Lowercase only; no visible timers/WPM for kids; stats logged silently
- Game voice is dad jokes/puns from per-moment pools; cast prompts always
  keep the literal instruction
- Stage 1 (home row) is short by design — 37 words available, first unlock
  at 3 catches
- **Quick Cast is the one mode outside the progression** and is meant to stay
  that way: always in the tackle box, drawing from the whole word pool by
  default, and sealed off from the fishing save (no coins/catches/badges, and
  none of `save.stats`). Don't "fix" it to respect unlocked letters or to feed
  the Grown-ups heatmap — both are deliberate, and the second would let a timed
  run farm the "Hooked on Typing" badge. Its only state is `save.speedBest`.
  The no-timers rule in `SPEC.md` is about the *fishing loop*; see its Non-Goals
  note.

## Workflow

- Read `HANDOFF.md` first — it's the short-lived "where we left off" note
  from the last session (open threads, what's waiting on Matt). Update it at
  the end of every session; it's not a design doc, so don't let it drift
  into duplicating `SPEC.md`/`BUILD_PLAN*.md`/`BACKLOG.md`.
- Start each session by stating which milestone from `BUILD_PLAN.md` is
  active and its "done when" criterion.
- Mid-build ideas go to `BACKLOG.md`, never into the current milestone.
- **`git fetch` before branching.** The local clone runs many commits behind
  `origin/main`; branch from `origin/main`, not local `main`.
- **Art that doesn't fit is a reroll, not an offset tweak.** Sprite pieces are
  generated from a reference image and returned on the same canvas so they
  register by construction (see `ART.md`).
- Local dev: `python3 -m http.server 8080`. Firestore/OAuth work (M4+) needs
  HTTPS — deploy previews on Netlify or ngrok.
- Surface code smells as separate issues; don't refactor unrelated code.
- If a requirement is ambiguous: for structural/architectural questions, ask;
  for small reversible details, pick the most reasonable option and record
  the assumption in the PR/commit message.
- **Open PRs ready for review, not as drafts** (Matt's preference, July 2026).
- **After creating a PR, squash-merge it right away** — don't wait-and-watch
  for CI/review (Matt's preference, July 2026). Netlify deploy checks here are
  previews, not merge-blocking.

## The user

Prefers simplest-solution-first, explicit uncertainty flagging, and being
offered better long-term alternatives when they exist. This is a family
project — a kid-drawn fish sprite outranks a professional one.
