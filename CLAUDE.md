# CLAUDE.md — Hook, Line and Sentence

Cozy fishing game that teaches kids to type, in a warm painterly storybook
style. Read `SPEC.md` first — it is the source of truth for all design
decisions. `BUILD_PLAN.md` defines milestone order for the v1 core (M1–M10, all
done); `BUILD_PLAN_ADVANCED.md` was the plan for the post-v1 **Advanced
Progression epic** (tiers, phrases, sentences, WPM-as-goal) — **A0–A8 all
shipped 2026-08-22, epic complete.**

The **Catch Feel** epic — `BUILD_PLAN_FEEL.md` (F1–F5) — **shipped whole on
2026-09-03**. It fixed the moment of the catch: three scene elements that
disagreed about where the fish is, a payoff that was a two-line pixel-font
message in the corner, and a wait with nothing to do in it. Everything in it was
seen on screen first, with `tools/play-check.mjs`. It also answered the refresh's
open question 1 — Silkscreen is gone, game-wide, replaced by self-hosted Baloo 2.
**One thing is outstanding and it is Matt's: play it.** The wiggle's word count
is the number most likely to be wrong.

The **Art & Animation Refresh** — `BUILD_PLAN_REFRESH.md` (R1–R7, opened
2026-08-31) — **closed 2026-09-04 and the epic is complete.** It replaced the
game's entire visual layer: all three anglers painted, cut and rigged, both
vessels cut and wired under them, all 33 fish with their own art, and **all 21
gear pieces — 12 hats and 9 rods — so a bought hat or rod is what you see at
every spot.** It ran under two source-of-truth docs, **`ART_DIRECTION.md`**
(warm painterly, Ghibli-anchored, no pure black) and **`ANIMATION.md`** (the
cast/line/reel motion the game has never had). It superseded
`BUILD_PLAN_VISUAL.md` (V2–V5) and `BUILD_PLAN_GRAPHICS.md`, both of which
planned art in the old pixel style; V1's three-plane scene survives and was only
retuned. **The engine was not touched** — progression, the keyboard and the
unlockables are as they were. `ART.md` carries the palette's real hex values and
what each milestone cost: R6's 33 species in eight sheets and nine generations
with one reroll; R7's 21 pieces in 16 generations with one reroll, the hats at
12 from six paintings because a hat painted at the Pond transplants onto the
Stream's head for free (`tools/hat-transplant.py`). **There is no active epic —
the next milestone is Matt's call.** What is outstanding is in `HANDOFF.md` and
is all his: the play-tests, including a real kid playtest of the A7 fight beats.
R5's last debt was paid on 2026-09-04 — the four shop hulls work, as CSS tints
of the Pond rowboat rather than four repaints (`ART.md` → *R5 debt*); the
repaints stay an option in `BACKLOG.md`.

Work on exactly one milestone at a time. `ART.md` is the art pipeline: Claude
writes Gemini prompts + filenames, Matt generates the PNGs. **`GEMINI_NOTES.md`
is required reading before writing any art prompt** — it is the accumulated
memory of how the generator actually behaves (what it obeys, what it silently
ignores, the flat-magenta backdrop convention, the alpha-salvage recipes and the
delivery checklist). Two rules from it shape every prompt: **position by edges
and corners, never by percentage**, and **name a flat backdrop colour rather
than asking for transparency — then detect the colour you actually got.**
**`tools/README.md` indexes the twelve pipeline tools** — what each cuts, why the
cutting family exists at all ("don't generate a piece you could cut"), and the
dependencies a fresh container does not have. Read it before writing a twelfth.

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
  anywhere; warm dark browns instead. **Two tests enforce this** (`no pure
  black…`, `the ghost-hands keyboard stays exempt…` in `tests/data.test.mjs`).
- **The keyboard's colours are frozen as `--kb-*` in `style.css` and it uses
  nothing else.** It is the deliberate exception to the art direction and stays
  exactly as it is — never point it at a scene token, even one that looks
  equivalent.

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

- Read `HANDOFF.md` first. It is a **state snapshot and a set of pointers** —
  active milestone and its done-when, the next action, and what is blocked on a
  human. Update it at the end of every session, and keep it cheap:
  **rewrite it, never append** · **a resolved thread becomes one line, or
  disappears** — point at the PR · **never restate another doc**, link it · and
  **no session narrative**, which is what `git log` is for. Reasoning belongs in
  the commit and PR that did the work, not here; the file hit 199 lines once by
  accreting finished investigations and had to be cut in half.
- Start each session by stating which milestone from `BUILD_PLAN.md` is
  active and its "done when" criterion.
- Mid-build ideas go to `BACKLOG.md`, never into the current milestone.
- **`git fetch` before branching.** The local clone runs many commits behind
  `origin/main`; branch from `origin/main`, not local `main`. **Re-branch from
  it after every squash-merge too** — reusing a branch across merges makes its
  history diverge from `main` a little more each time, and the next PR conflicts
  against work that is already in.
- **Verify visual and motion claims in a real browser, and screenshot past the
  startup modal.** `#profiles` covers the whole viewport until an angler is
  created, so a screenshot taken on load is a picture of a scrim, not the game.
  Every R3 background preview was shot that way and read half as bright as the
  game really is.
- **An assertion proves the code ran, not that the picture is right — so draw
  the thing you measured.** R6 shipped four bugs past green assertions, and
  every one was obvious the moment something was rendered: a CSS eye dot
  painting over real sprites, every fish in the journal drawn without its tail,
  a fishing line attached to a catfish's forehead, and another attached to
  nothing at all beside a unicornfish's horn. Two were caught by screenshotting
  the actual screen; two by painting the measured coordinate onto the sprite in
  red. When a number describes a position, colour or shape, render it before
  believing it.
- **Art that doesn't fit is a reroll, not an offset tweak.** Sprite pieces are
  generated from a reference image and returned on the same canvas so they
  register by construction (see `ART.md`).
- **In a pipeline tool, the destructive mode is the flag.** `cut-angler.py` had
  it backwards: its frequent, safe cut needed `--rod`, while the rare cut that
  overwrites four committed paintings was what you got by forgetting it. The
  same accident happened three times. Twice it was patched by asking what the
  source file *was*, and that could never catch the third, because a rod
  delivery and an angler delivery are the same kind of file (an opaque painting
  on flat magenta) and only the caller's intent separates them. So make the path
  that destroys work the one you have to ask for, and let the tool refuse when
  nobody asked (#157).
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
