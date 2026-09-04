# GEMINI_NOTES.md — how the image generator actually behaves

**Read this before writing any art prompt.** It is the accumulated memory of how
Gemini responds to this project's requests: what it obeys, what it silently
ignores, and how to salvage what comes back. It exists so no future session
re-derives these the expensive way — every rule below was paid for with a real
generation.

Scope note, so the docs don't drift into each other:

| doc | owns |
|---|---|
| `ART_DIRECTION.md` | what the art should **look like** — palette, light, outlines |
| `ART.md` | the **pipeline and the open requests** — filenames, sizes, what's landed |
| **this file** | how the **generator behaves**, and how to prompt and salvage it |

---

## The short version

1. **Position by edges and corners, never by percentage.** Percentages are the
   least reliable thing you can ask for.
2. **Name a flat backdrop colour** instead of asking for transparency — but
   **detect the colour you actually got**, because it will not be the one you
   asked for.
3. **State keep-outs as composition**, not as geometry.
4. **Output format is not prompt-controllable.** Ask anyway; get PNG from the
   download UI.
5. **A miss in featureless content is salvageable. A miss in drawn content is a
   reroll.**
6. **Check for backdrop colour bled *into* the subject first** — that one is
   never fixable downstream.
7. **Ask for an edit when there is already a painting to edit.** Attach it, name
   the one thing that changes, and registration comes free (R7).

---

## What it reliably gets right

- **Aspect ratio, when stated as a ratio.** Adding `Aspect ratio 2.36:1` to the
  end of a prompt produced exactly 1584×672 on **six** consecutive requests
  across two levels, and R6's eight fish sheets landed within 0.006 of their
  asked ratio every time but one. Still the most dependable instruction in the
  set. **State the pixel dimensions in the prompt body too** — "The image is 1584
  by 672 pixels, aspect ratio 2.36:1"; the pixel count is routinely ignored (R6
  asked 1600×1200 and got 1200×896 repeatedly) but the ratio holds, and it makes
  the prompt self-contained if it is ever pasted without its spec line.

  **The one miss is a useful alarm.** The Ocean's field-guide sheet came back at
  1.833 against a 4:3 ask — and it also ignored the backdrop, added captions and
  changed medium. When the most reliable instruction in the set misses, suspect
  that the whole frame has been rewritten by a stronger idiom rather than that
  this one instruction failed.
- **Palette, when described in words rather than hex.** The R3 far layer came
  back with sky `#b7cfd0` against a `#b7cfd8` target and glow `#f9e9b7` against
  `#f7e6bd` — effectively exact, from prose alone. Hex values in the prompt are
  not needed and are not obviously honoured; the descriptive palette language in
  `ART_DIRECTION.md`'s preamble is doing the work.
- **Mood, treatment and outline weight.** The Ghibli-anchored preamble delivers
  consistently across separate generations. Keep prefixing it to everything.
- **Subject exclusion — of separate objects.** "No boat, no lily pads, no reeds"
  was obeyed every time. Listing what must *not* be in frame works well **as long
  as the thing is separable from the subject**. It is not reliable for something
  the subject *implies*: R4's Stream angler was asked for "no fishing line" and
  came back with line threaded through the guides, because a rod has a line. What
  fixed it was a whole paragraph, flagged and exhaustive — *"CRITICAL: draw NO
  FISHING LINE anywhere. No thread, string or filament of any kind — not on the
  reel, not threaded through the guides, not trailing from the rod tip. The rod
  must be completely bare."* When you are excluding part of an object's own idiom,
  spend a paragraph and name every form it could take.

  **And it still fails sometimes, so plan for the cut to absorb it.**
  `rod-bamboo-ocean` (R7, 2026-09-03) carried that exact paragraph, verbatim and
  unweakened, and came back with line threaded through the guides and running off
  past the tip. The four rod deliveries before it obeyed it. So the paragraph
  raises the odds rather than settling the matter, and a request whose downstream
  step *tolerates* line is worth more than one that relies on the instruction:
  `cut-angler.py` takes the rod geometrically, so line outside the shaft corridor
  is discarded and the violation cost nothing. `cut-gear.py`'s difference cut
  would have swallowed every stroke of it.

## Several subjects on one sheet: it works, and it is cheaper (R6)

**R6's final tally: eight sheets in nine generations, across four layouts** — a
2×2 of four, a row of three, a 3×2 of six, and one subject alone. Seven landed
first attempt; the one reroll was a prompt fault rather than a sheet fault (see
*Describing fish by field marks* below), and even that sheet's six subjects were
correctly differentiated. This is the strongest result this project has had from
any prompt shape: 33 species where the opening estimate was ~99 generated
pieces.

**Six subjects on one canvas works as well as four.** The upper bound has not
been found; a 3×2 of six was used three times without the layout itself failing
once.

**Put the two subjects hardest to tell apart on the SAME sheet.** R6's Stream
wave was written to keep a rainbow trout and a steelhead on separate sheets,
since they are the same species and the prompt could only describe the contrast
in words. Delivered as one sheet of six instead, the generator drew them against
each other and separated them properly first time — colourful-and-spotted beside
chrome-and-clean. A sheet is not merely a saving: **it is the only way to ask for
a difference rather than describe one.**

**When a sheet can't hold both halves, invert the pattern instead of forbidding
it.** R6's last fish was the exception that proves the rule. A muskellunge and a
northern pike are the same family, the same silhouette and the same duck-bill
snout, but the pike had been generated three waves earlier and lives in another
biome, so no sheet could put them together. The clause that worked stated the
muskie's marks **positively and as an inversion** — "DARK vertical bars and dark
spots on a PALE flank" — and only then added the negation as backup ("this is
the opposite of a northern pike, which has PALE spots on a DARK flank"). It came
back right first attempt, and at their real 96 and 78px they read as different
fish.

The ordering is the lesson, and it is the general rule one level down: **a
negation needs something positive to attach to.** "Do not draw pale spots on a
dark body" alone leaves the generator holding only a thing to avoid, which is
the same failure the backdrop convention exists to prevent — name the place, not
the absence. A single subject on its own canvas is otherwise unremarkable: it
keyed and cut like any sheet, one component, recomposite 0 px.

**Tested first on R6's sheet A, and it passed every check on the first
attempt.** Four different fish asked for in one 4:3 canvas, one per quadrant,
each named separately in a `[THE FOUR FISH]` block. What came back:

- **Four clean connected components**, none touching, no enclosed key-coloured
  pockets. So a sheet comes apart by flood-filling the backdrop and labelling —
  no per-fish framing, no registration to get right.
- **Consistent treatment across the four**, which is the real prize: tonal stdev
  26–36 and saturation 0.11–0.49 across the set, sitting inside the range of the
  separately-generated anglers and hull (29–48, 0.43–0.52). Four separate
  generations are four chances to drift; one sheet cannot.
- **Species read at game size.** The two hardest to tell apart (a bluegill and a
  pumpkinseed — the same deep sunfish silhouette) were still distinct at 54px,
  by colour and by bars-versus-freckles.

**Why this is not in tension with the compositional prior.** A single small
subject on a flat field is the case where the prior has nothing to push against
— there is no scene to compose, so "one fish per quarter" is a layout it has no
opinion about. Expect a sheet to work for *subjects*, and keep expecting the
prior to win on *scenes*.

**What to ask for, and what to check.** Name the quadrant for each subject
(edges and corners again), demand "a wide band of empty background" between
them, and forbid panel dividers and grid lines explicitly — a "sheet" invites
them. Then count components before anything else: three where you asked for four
means two subjects are touching, and that is a reroll rather than a cut problem.

**Canvas size was ignored as usual**, and it did not matter: asked 1600×1200,
got 1200×896, ratio 1.339 against 1.333. Each fish still arrived ~525px wide for
something that renders at 54.

## Editing a delivered painting works, and it is a different tool (R7)

**Asked to return an attached painting with one thing added, it does exactly
that.** R7's first gear prompt attached the Pond angler and asked for a straw
hat on his head with everything else identical. What came back was an edit: the
figure in the same place at the same size, the same clothes, the same hands, the
same rod on the same axis, and a hat.

| check | result |
|---|---|
| silhouette IoU against the reference, after fitting | **0.898**, and all of the difference is hat |
| the figure below the neck | median colour distance **8.1** of 255, which is JPEG noise |
| what the reference has and the return does not | **1080 px**, the hair the brim pushed in |
| backdrop | flat magenta, stdev 2-4, as asked |

This is worth more than the generation it cost. Registration stops being
something to get right and becomes something you *have*: the pixels that did not
change are the reference's own. It also means a piece can be found by
difference rather than keyed out of a fresh canvas.

**Nine for nine.** The whole R7 hat grid is in: four hat styles across three
poses, six of them generated and three landed by transplant. **Every generation
came back a faithful edit** — no redraw, no reframe, no pose change, not once.
This is now the most reliable thing in this file after aspect-as-a-ratio.

| delivery | agreement below the neck | silhouette IoU | ref px the return lacks |
|---|---|---|---|
| straw · pond | 0.982 | 0.898 | 3194 |
| straw · stream | 0.974 | — | 591 |
| straw · ocean | 0.975 | 0.896 | 1092 |
| bucket · pond | 0.966 | 0.925 | 6726 |
| beanie · pond | **0.991** | **0.939** | 1463 |
| souwester · pond | 0.974 | 0.902 | 2066 |
| bucket · ocean | 0.985 | 0.931 | **553** |
| beanie · ocean | 0.986 | **0.939** | 2829 |
| souwester · ocean | 0.945 | 0.901 | 5882 |

**The tilt instruction lands, three for three.** The Ocean is the one pose whose
head is not upright, and every hat generated against it tilted the brim back to
follow. A specific geometric instruction attached to a specific feature is *not*
averaged away, which is worth contrasting with the hedged-position failures
below: the difference is that this one describes the subject rather than a
position on the canvas.

**The aspect drift is repeatable per reference, not random per generation.**
This matters because it is what makes the per-axis fit safe.

| pose | asked | returned |
|---|---|---|
| pond | 0.966 | 0.955, 0.955, 0.955 (and one 0.967) |
| ocean | 0.903 | 0.897, 0.897, 0.897 |

Same attachment, same drift. So the fit is correcting a stable property of the
round-trip rather than chasing noise, and there is **no trend to read into a
single tighter or looser return.** One delivery came back at 0.967 against a
0.966 ask and briefly looked like the generator was improving; the next three
were 0.955 and 0.897. Do not tune a prompt on one aspect reading.

**Backdrop flatness varies per generation, and says nothing about anything
else.** Border stdev across the nine ranged from 2/4/3 to **16/32/15**, on the
same prompt and the same attachment. One noisy return was written up as an
artefact of how the file reached the machine (a chat upload rather than a direct
download, so a second JPEG pass); the next delivery arrived by the identical
route, within 300 bytes of the same file size, **8x cleaner**. The explanation
did not survive, and the honest reading is that it simply varies. The unmix
absorbs the whole range — 4 to 67 rim px despilled, no violet anywhere — so
**a noisy backdrop is not the reroll condition. Backdrop bled into the *subject*
still is.**

**A faithful edit agrees with the reference on the untouched linework closely,
but never to the pixel.** The generator repaints the whole canvas rather than
compositing onto yours, so an eyebrow, an eye, a nose and a mouth it was told
not to change come back within a few px of where they were, in the same ink —
visually identical, and a 1-3px trace of "changed" in any difference-based cut.
That is a property of the round-trip, not a defect, and **anything reading the
diff has to expect it.** It cost R7 a real bug: the morphological close that
bridges a hood to its own brim happily bridged that trace into a ring around the
face, and the hole-fill then painted the ring's inside solid — thousands of px
of "hat" that composited invisibly because the redrawn linework matched what it
covered. Full mechanism in `tools/cut-gear.py`'s docstring.

**The inversion clause works on shape, and does not police colour.** Each hat's
prompt named the hats already delivered for that pose and stated the difference
as an opposite (`[NOT THE OTHER ONE]`, the muskie's rule). It delivered: four
genuinely different silhouettes, and the two most alike are still measurably
apart — the sou'wester reaches 2.44x further behind the head than in front
against the straw hat's 2.01, and sits 152px lower at the back against 103.

**But measurably distinct is not the same as distinct at a glance, and that cost
a wrongly-rejected delivery.** Both hats came back wide-brimmed in the same
amber-tan family, because nothing in the prompt separated their *colour* — the
straw hat asked for "honey-oat straw", the sou'wester for "muted amber oilskin",
which are the same instruction to a painter. The review took one look and called
the sou'wester a duplicate straw hat. It was not, and one command comparing the
two silhouettes proved it. **So when two items in a set share a palette, give
the inversion clause a colour to work with as well as a shape**, and check a
suspected duplicate by measuring before spending a reroll on it. Rejecting a
good generation costs exactly as much as accepting a bad one and is much harder
to notice afterwards.

**A shared frame can contradict the item it is wrapping.** The hat prompts all
carried "the brim must not cover the eye, the eyebrow or any part of the face".
For a beanie, whose own block says "it has NO brim of any kind — if it has a
brim it is wrong", that sentence quietly reads as permission to draw one. It was
changed to "no part of the hat may cover…" for the two beanie prompts only, and
both came back the **only two deliveries of the nine to touch the face box at
all — zero px.** When a template is filled per item, re-read the boilerplate
against each item rather than only the block that changed.

**Two cautions, both from the first delivery:**

- **The canvas comes back its own size, and the ASPECT drifts too.** Asked
  1344x1391, got 1008x1056: 0.955 against 0.966. Size being ignored is the old
  rule, but the aspect moving means a single scale cannot register the return.
  Fit per-axis, and fit on a part of the figure the edit cannot touch (the lower
  45%, for a hat or a rod). One scale would have left the head a pixel or two
  out.
- **An added piece can arrive as two components.** A pale hatband over pale hair
  leaves a seam of genuinely unchanged pixels across the crown, so the changed
  region is a crown and a brim rather than a hat. Close and fill the enclosed
  holes *before* taking the largest component, or you keep the crown and lose
  the brim.

**Use the unmix alpha model on the result, never the distance ramp.** The ramp
reads a half-magenta edge pixel as 0.9 opaque and leaves a pink rim, because a
JPEG's ringing around a saturated key is not a linear mix. `gap = min(R,B) - G`
is, and it clips to opaque on every warm or neutral colour in this palette.
Residual key after unmixing measured 0.000%. This is the third asset kind to
land on unmix rather than the ramp, after the Whaler's glass and R6's fins.

**Do not force alpha to 1 where the new piece covers the old subject**, however
safe it looks. A brim pushes the hair silhouette *in*, so along that seam the
return is backdrop where the reference was paint, and forcing opacity paints the
backdrop over the head. Unmix everywhere instead.

## What it reliably ignores

- **Hedged positions.** This is the big one, and the evidence is sharper than it
  first looked.

  | asked | got | |
  |---|---|---|
  | "must sit at **exactly 55%** down" (Pond far) | 55.95% | ✅ |
  | "must start at **exactly 56%** down" (Pond water) | **46.13%** | ❌ |
  | "nothing above **roughly** 70% down" (Pond fore) | 32.6% | ❌ |
  | "**just below** the middle… **a little more** above… **roughly** 55%" (Stream far) | **66.96%** | ❌ |

  **⚠️ The "hedging is the failure" reading was tested and is wrong.** The Stream
  far layer was rerolled with the hedges removed and the line stated three
  non-negotiable ways — the exact percentage, the complement (top 55% / bottom
  45%), and a floor ("do not place it any lower"). It came back at **66.96%**:
  identical to the hedged attempt, to the pixel. A third attempt moved it only to
  **62.35%**.

  **The real rule is that the generator has a strong compositional prior per
  subject, and prompt wording barely moves it.** A "forest stream seen from the
  far bank" wants roughly two thirds forest; three rerolls bought five
  percentage points. Wording is worth getting right, but do not expect it to win
  an argument with the prior — **budget one reroll, then fix the rest in
  salvage.**

  What actually works:

  1. **State it exactly and unhedged** — "must sit at exactly 55% down". Worth
     doing, but on its own it is not sufficient: see the warning above.
  2. **State the complement too** — "the forest fills the top 55%, the water
     fills the bottom 45%". Two numbers that have to add up are harder to fudge
     than one.
  3. **State a bound** — "do not place it any lower than 55%".
  4. **Anchor to edges and corners where you can** — "the very bottom-left
     corner", "along the bottom edge". These are things the generator can see,
     and they are what made the Pond's foreground keep-out work.

  The one exact-percentage failure (Pond water, 56% → 46%) is the layer with
  **no natural horizon in it** — water only, nothing to anchor the line to.
  Expect abstract boundaries to drift, and rely on the salvage instead (see
  "let layer 1 define the truth").

- **Output format.** "Output as PNG" was in the prompt for all three R3 layers.
  All three arrived as JPEG. Format is chosen by the app and the download
  control. Keep the line (it is free) but get PNG from the download UI, and
  never plan around the prompt winning.

- **Saturated colours, when the style preamble forbids them.** Asked for a
  `#FF00FF` backdrop; got `#c642b0`, because the same prompt's preamble says
  *"no neon or saturated colors"* and that applied to the backdrop too. **This is
  a prompt conflict, not a generator failure** — and it does not matter, as long
  as nothing downstream assumes the exact value.

## Things it does when you do not ask

- **It fakes transparency.** Asked for a transparent background, it paints the
  editor's transparency **checkerboard as opaque pixels**, subject floating in an
  oversized canvas. Tells: a corner pixel reads alpha 255, and the file is far
  bigger than a tight sprite. Every generation picks a different pair —
  gray-on-gray (138/204, 88/203), black-on-gray (0/145), 158/223, and once
  **blue-on-black** (0,1,22 / 60,79,243).
- **It flattens gradients you did not insist on.** The R3 far layer's water came
  back essentially one tone (luminance drop of 12 top to bottom). The water layer
  prompt was rewritten to say the deepening **"is the point of this layer"** and
  *"do not paint it as one flat tone"* — and the drop went to **83**. Emphatic,
  named-as-the-goal phrasing works where plain description does not.

---

## Characters: what moves for wording, and what doesn't (R4)

Unlike composition, **subject description does move.** R4's first angler missed
on two counts and both were fixed in one reroll — which is the opposite of the
Stream far layer, where three rerolls bought five percentage points. Know which
kind of problem you have before deciding what a reroll is worth.

- **A hand gripping nothing will not come back gripping.** This one cost two
  rerolls, and the fix was to stop describing the hand. *"Held OPEN in a loose
  C-curl, palm toward the viewer, fingers apart"* produced a flat splayed reach.
  Naming a referent and the gestures to avoid — *"the shape of a hand about to
  close around a bicycle handlebar… NOT a flat open palm, NOT fingers spread
  apart"* — produced a **pincer in the wrong plane**: the fingers curled within
  the picture plane, so the tube they formed pointed at the viewer rather than up
  the rod. What worked was **drawing the object in the hand** — "the child is
  HOLDING A FISHING ROD… the separate fingers visible crossing in FRONT of the
  pole" — and then cutting the pieces apart locally. This is *the subject carries
  more weight than any qualifier* one level down: a hand holding nothing is a
  hand holding nothing, however precisely the grip is specified. **Give it the
  object, then cut.**
- **"A young child" defaults to a toddler.** The first attempt came back as
  roughly a two-year-old: big round head, no neck, stubby fingers. What fixed it
  was all three of an age in years (*"a school-age child of about eight"*), the
  proportions spelled out (*"slim school-age proportions with a visible neck,
  long limbs and slender fingers"*), and the negative (*"NOT a toddler, NOT a
  baby, NOT a chubby big-headed infant"*).
- **Don't spend a reroll on placement inside the canvas.** For a rig, every piece
  shares one canvas, so they can only be wrong together and a shared offset is
  absorbed once when the pose's box is measured. Spend the weight on the pose and
  the character instead — those are what a reroll actually exists for.
- **A held object that runs off the canvas has been cropped by the frame — so
  extend it, do not taper it in.** The accepted angler's rod exits the top-right
  corner, and the first salvage read that as a defect and tapered the tip inward.
  That was backwards: the rod came out at **51% of the length the old rig had**,
  and of the 32 design px missing, the taper cost 4 and the frame cost 28. The
  frame is not a design decision. Decide what length the thing should be, then
  walk it out along its own axis, resampling the real cross-section so the
  outline tapers with it — a straight shaft is featureless content and the
  synthesis is invisible, even at 42% of the visible length. **Seed the taper
  from the object's measured width at the seam, never from a nominal constant.**
  All three R4 rods were first extended from the pose's nominal half-width, which
  is measured lower down where the shaft is fatter — 16/15/22 px against real
  seam widths of 11.5/6.0/15.5. That steps the shaft outward exactly where the
  synthesis starts and then runs a needle down from it: the Ocean's rod read as a
  spear. Measure the alpha at the seam and taper from *that*, back-loaded (`k**1.6`)
  so the shaft stays full through the middle and thins near the tip like a rod. Neither version
  needed a reroll, and a reroll would have gambled a grip that took three
  attempts.
- **Scale comes from a body part, never from the figure.** The generator draws
  every pose to fill its frame, so figure height carries no world scale between
  poses: R4's *standing* Stream angler arrived 897px tall against the *seated*
  Pond angler's 878 — 2% taller. Scaling both alike would have stood the child up
  no taller than he sits. Match the **head** instead (the Pond's is 318 source px
  wide, 18.1 design px at its scale; the Stream's 217px head matches at 0.083),
  which gave 75 design px standing against 50 seated.
- **Measure a complaint before you spend a reroll on it.** On R4's first Stream
  attempt I called three faults; **two did not survive testing.** "The style has
  gone flat vector" — tonal variation measured stdev 26.4 against the accepted
  Pond angler's 27.3, and the outlines were *less* even, not more. "The
  arm-clear-of-the-body instruction was ignored" — there were 2 separate subject
  runs per scanline through the whole limb; it had worked perfectly. Only the
  baked-in line and the wrong haircut were real. A generation costs Matt a round
  trip, and eyes are worse than a five-line script at judging flatness, evenness
  and clearance. **Reroll on what you measured, not on what you felt.**
- **Don't assume the backdrop came back flat — measure it.** The first two
  angler generations keyed at a blue stdev under 2.5; the accepted one arrived at
  `(248,88,242)` with a stdev of **14.6**, a faint gradient across the magenta.
  Still floods fine at tolerance 70, but the convention is not a guarantee.

## Describing fish by field marks makes it draw a field guide (R6)

**The one sheet in R6 that had to be rerolled, and the prompt caused it.** The
Ocean's first sheet asked for six species described by their distinguishing
marks — "a row of dark round spots along the upper flank", "three separate dorsal
fins", "a whisker-like barbel" — with the species named. That is the register of
a **scientific field-guide plate**, and the generator drew one: six specimens on
**aged cream paper**, each with a **caption and its Latin binomial**, in fine
naturalist linework.

Everything about the frame was wrong at once, which is how you know it was the
idiom and not the wording:

| asked | got |
|---|---|
| flat magenta `#FF00FF` backdrop | cream parchment `(249,237,210)`, and **0.00%** of the canvas carried any magenta at all |
| aspect ratio 4:3 | **1.833** — the first aspect miss in the project, after it had been exact on every previous sheet |
| "no text, no labels, no names" | a caption and a Latin binomial under all six |
| storybook painterly | naturalist plate, on textured paper with a vignette |

**It is not salvageable, and the numbers say why the magenta convention exists.**
The paper sits at luminance 241 and the palest fish tones at 211 — **30 apart**,
against a backdrop whose own stdev reaches 10 from the paper grain. Every sheet
that worked keyed at stdev 1–2 with the subject 100+ away in colour space. A
silver herring's belly on cream paper cannot be told from the paper.

**What the species clauses got right, keep.** The differentiation itself worked
perfectly first time — the plain herring, the barred mackerel, the big-mouthed
anchovy, the spotted sardine — so the reroll changes only the frame.

**The reroll fixed half of it, and the half it missed did not matter.** Naming
the backdrop as a place — "the fish float on a solid magenta screen, the way a
subject stands in front of a photographer's backdrop" — worked: flat magenta,
stdev 2–3. **The captions came back anyway**, which is worth knowing before
spending a third generation on them: text on a flat backdrop is *separable*. The
six fish were 35,115–67,750 px against a largest caption fragment of 983 — a
**35.7× separation** — so a cut that takes the N largest components drops every
word without touching a sprite. Forbid the text, but do not reroll for it alone.

**The fix is to forbid the idiom by name, the way R4's rod had to forbid a
fishing line.** A field guide is what a list of field marks *is*, so excluding it
needs its own paragraph naming every form it takes: no plate, no specimen chart,
no captions, no species names, no Latin names, no paper, no parchment, no paper
texture, no vignette. And state the backdrop as a *place* rather than a colour —
"the fish float on a solid magenta screen, like a photographer's backdrop" — so
it has something to draw instead of something to avoid.

## The backdrop convention (use this instead of asking for transparency)

**Ask for a flat magenta `#FF00FF` backdrop, not a transparent one, and not a
checkerboard.** A flat fill beats a specified checkerboard on three counts:

- one colour to detect, not two;
- a checkerboard is high-frequency detail, which is exactly what JPEG smears and
  what diffusion blurs into the subject — a large flat field survives both;
- it removes the reason the checkerboard appears at all. The generator paints one
  because it was asked for "transparent" and renders what transparency *looks
  like*. Give it a colour and there is nothing to imitate.

**Why magenta:** absent from `ART_DIRECTION.md`'s palette of warm creams, ambers,
teal-greens and browns. The nearest things in the whole game are ember `#d4886a`
and the muskie's lavender `#d4c5f0` — both far off in hue and saturation. Green
would be the worst possible choice against foliage, moss `#93ac78` and teal
water; blue sits too close to the pale sky `#b7cfd8`.

**Always detect the backdrop from the border rather than assuming your value.**
You will not get `#FF00FF` (see above). What matters is *uniformity*, not hue —
the R3 foreground's backdrop came back at **stdev <1** across the whole clear
area, which is all keying needs.

**Where geometry answers the question, do not key at all.** The Pond's water
layer is transparent above a straight horizontal line, so its alpha is a **cut by
row** — no tolerance, no flood fill, nothing to get wrong. Ask for the magenta
anyway, as a check on where the generator actually put the line.

---

## Salvage recipes

### Flat backdrop → alpha (current)

Three passes, in order. On the R3 foreground this took surviving backdrop-colour
residue from **6.01% → 3.79% → 0.00%**.

1. **Flood fill from the edges**, never a global key — a matching colour inside
   the subject must stay. Count `alpha==0` as fillable so a re-run still floods.
   **Then seed the enclosed pockets too.** A silhouette with a real hole in it —
   the gap between an arm, a shirt hem and a leg — leaves key-coloured pixels the
   border flood can never reach, and they must come out or the sprite renders
   with a magenta window. Tell them from contamination by **depth**: residue
   hugs edges (0–8px on R4's angler), a genuine pocket sits 180px+ deep and is
   uniformly the key colour. Measure before calling it bleed — the reroll rule
   only bites on the shallow kind.
2. **Alpha ramp across the fringe.** Between distance `LO` and `HI` from the key
   (55 and 110 worked), set `alpha = (d-LO)/(HI-LO)` and **unpremultiply**:
   `fg = (c - (1-t)*KEY) / t`. This is what stops a coloured halo on every
   anti-aliased edge.
3. **Targeted despill** on what survives. Derive the test from the subject's own
   palette: pond vegetation is olive and tan — blue *below* green — so any
   remaining pixel with blue well above green is residue and never paint.
   **This test is palette-specific. Re-derive it per asset; do not copy the
   numbers.**
4. Crop to the alpha bbox for sprites, so CSS `contain` seats them like the
   original. (Not for full-canvas layers, which must keep their canvas.)

### When the subject is see-through, the ramp is the wrong tool (R5)

The Whaler came back with a **glass windscreen, and the generator painted the
backdrop through it** — a violet panel that is magenta seen through pale glass.
That is the generator being *right*, and it is a third thing the depth test in
step 1 does not cover: not residue, not a hole in the silhouette, but paint that
genuinely carries some key.

Distance-to-key cannot read it. The violet sits 112 from the key, past `HI`, so
the ramp calls it opaque and hands you a purple blob on a cream boat.

Read alpha from **how much key the pixel carries** instead:

    gap   = min(R, B) - G                       # magenta's signature
    alpha = 1 - gap / (min(KEY_R, KEY_B) - KEY_G)
    fg    = (c - (1-alpha)*KEY) / alpha         # the same unpremultiply

Magenta is the one colour in this palette whose green falls below *both* red and
blue, so on any warm or neutral paint `gap` is negative and alpha clips to 1 —
cream, teak, warm brown outlines and cool grey shadows all survive untouched.
The windscreen came out pale grey at 70% opacity and shows the sky through it in
the game, which is what glass should do. **It also replaces step 3**: unmixing
removes the key's contribution by construction, so there is no spill left to
despill — and a despill rule tuned for warm timber would have flattened the
glass right back to grey anyway.

Use it when the subject contains glass, water, smoke or a thin edge; the ramp is
still right for something wholly opaque, which is most things. `cut-vessel.py`
carries both, one named per painting.

### Checkerboard → alpha (legacy, for anything generated before the convention)

1. Take the two most common **border** colours — that is the checkerboard pair.
2. A pixel is background if it sits within ~60 RGB of the **line between those
   two colours**. That covers both squares plus the anti-aliasing along every
   square boundary, and nothing else.
3. Flood-fill from the edges, as above.
4. Crop to the alpha bbox.

Why the line rather than a tolerance around each colour: it protects a **dark
outline**. The G1 body sprite was outlined in near-black on an 88/203 grey
checkerboard — a chroma-only or "dark pixels are background" rule eats that
outline, while it sits far off the 88↔203 line and survives untouched. With the
flat-magenta convention this problem disappears, since warm-brown outlines are
nowhere near the key.

---

## What a miss costs, and when to reroll

**The dividing line is whether the content has drawn features.**

- **Fitting beats cropping: trade rows between the two edges.** A crop alone
  changes the canvas and so changes what `cover` discards. Instead move the
  horizon by taking rows off one edge and regrowing them at the other, which
  holds the canvas — and therefore the framing — exactly where the other levels
  have it. It has now worked in both directions: the Stream's far layer was 74px
  **low**, so 113px came off the top and 113px of water was regrown at the
  bottom; the Ocean's was 25px **high**, so 25px of sky was regrown at the top
  and 25px of water dropped off the bottom. Both edits are free in practice —
  sky and water are smooth gradients at the outer edges, and **layer 2 repaints
  the water regardless**, so the regrown half is never seen.
- **Cropping is not rescaling, and it is available to drawn content.** A crop
  reframes without distorting, so it can move a horizon into registration where
  a rescale would smear the trees. The cost is canvas: cropping the Stream's far
  layer by 98px landed its waterline within 0.03% of the Pond's, but took the
  canvas to a 2.76 aspect, so `cover` then throws away 273px of width instead of
  129. Check what leaves the frame before accepting it — and apply the identical
  crop to all three of that level's layers.
- **Featureless content is salvageable.** The Pond's water layer missed its
  waterline by 65px and was still kept: it is a smooth vertical gradient, so its
  only meaningful edge is the top one — the very thing being set. Discard the
  bad rows, rescale the rest into the target band. Compressing a featureless
  gradient by 17% is invisible.
- **Drawn content is a reroll.** Reeds, a dock edge, a rig piece, a shoreline —
  anything with recognisable form cannot be stretched into place without
  showing. **This is the standing "a piece that doesn't fit is a reroll, not an
  offset tweak" rule**, and it is what the water-layer exception must never be
  read as precedent against.
- **Backdrop colour bled into the subject is always a reroll.** A pink-fringed
  reed cannot be keyed out. Check for it first, before any other check.

### Spend the prompt where it can win

Corollary of the prior being immovable: **constraints compete.** Once a
constraint can be fixed in salvage, stop spending prompt weight on it and give
that weight to something that cannot be fixed downstream.

The Stream's layer 1 is the worked example. Its waterline is fixable by cropping
in either direction — from the top to lower the percentage, from the bottom to
raise it (and the water lost that way is repainted by layer 2 anyway). So the
prompt drops from three insistent statements of an exact percentage to a single
easy floor ("water should fill at least the bottom third"), and the reclaimed
weight goes to the painterly treatment, which **cannot** be salvaged afterwards.

**Pick foreground subjects that are naturally small.** A near plane has to hug
the bottom edge and leave the middle of the frame clear, and the reliable way to
get that is to name objects that are *inherently* low — lily pads, reeds, mossy
rocks, ferns, a fallen log. Then "hug the bottom edge" agrees with the subject
instead of fighting it, and it worked first time on both the Pond and the
Stream. Name a subject with no small version and the adjectives lose: the
Ocean's foreground asked for "the near crest of a swell **breaking**… close to
the viewer" and got exactly that — a breaking wave is big by definition, and it
covered **42.9%** of the box where the angler renders, against 0.2% and 1.6% for
the other two levels. **The subject carries more weight than any qualifier
attached to it**, which is the same lesson as the compositional prior, one level
down: choose what you are asking for, not just how you describe it.

**Style is the thing to spend on**, because a style miss is always a reroll.
Naming the medium ("painted by hand in soft gouache and watercolor, visible
brushwork, tonal variation inside every shape") and explicitly naming the
failure mode to avoid ("NOT flat vector art, a cartoon, or clean digital
illustration with even line weight") is the phrasing that got written after a
generation drifted flat and graphic.

---

## Multi-layer sets: let layer 1 define the truth

Proven on the Pond, and it changes how the other levels get asked for.

**Only the first layer's registration has to be close.** Layers 2 and 3 are
salvaged into agreement with it locally — the water layer by a cut-and-rescale
by row, the foreground by keying and placing. So a positional miss on layers 2
or 3 is cheap, and the prompts for them can state the line loosely and lean on
the backdrop colour instead.

**Every layer of a level needs the style block, not just the first.** The
layers of one level are painted against each other in the same frame, so if the
medium is only named on layer 1, the others come back as a different painting
stacked on it. This failure mode does not exist for a single-image background —
it appears the moment a level is split — and it is invisible until the layers
are composited, which is another reason to composite locally before wiring.

**The layers agreeing with each other matters more than any of them agreeing
with the nominal number.** A mismatch between planes is a visible seam; a small
shared offset from the spec is not. The Pond's three layers all sit 3px low
together and nothing in the scene shows it.

Corollary worth stating because it is easy to get backwards: **if layer 1 is
ever rerolled, re-cut layers 2 and 3 from their original downloads** rather than
editing the committed PNGs, which have already been baked to the old layer 1.

---

## Delivery checklist

Run these in order — the early ones are the ones that force a reroll, so
checking them first saves the work of the later ones.

1. **Backdrop colour bled into the subject?** → reroll. Not fixable.
2. **Canvas size and aspect** as specified.
3. **Anything in a keep-out zone** (for this game: the bottom-centre third, where
   the finger-guide panel sits, and the rig's box at design x20–138, y140–224).
4. **Registration** against whatever it has to line up with — and remember the
   layers must agree with *each other* before they agree with any nominal number.
5. **Palette** against `ART_DIRECTION.md`'s table, and *not* as the binary rule
   this list used to give. Sky no more saturated than `#b7cfd8`/`#f2ddbe` still
   holds; "no pure black" and "darks no deeper than `#33291f`" do not, and would
   reject 23% and 70% of the art the game ships. Run
   `python3 tools/palette-check.py <file>`: the gate is pure black that survives
   a 3px erosion, because a black region does and an anti-aliased outline does
   not. Its docstring carries the corpus the threshold came from.
6. **Then** key it, and **composite locally at game scale before wiring
   anything.** This is the standing habit and it is how G1's misregistration got
   caught late instead of early.
7. **Register it.** Cutting and committing a PNG does not switch it on. The game
   decides what to draw from a registry in `config.js` — `fish.species` for a
   fish, `rig.gearArt` for a rod or a hat, `rig.poses` for an angler — and
   anything absent from one falls back silently. That fallback is deliberate (it
   is what keeps a half-finished set playable) and it is exactly what makes the
   omission hard to see: **art that is on disk but unregistered looks identical
   to art that never arrived.** Data tests catch a misspelt pose or species, not
   a forgotten line.
