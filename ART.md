# Art Pipeline

How art gets made for Hook, Line and Sentence. It's a family project — a kid-drawn
sprite outranks a professional one (see `CLAUDE.md`). This doc is the workflow
for the *generated* art that fills the gaps.

## Who does what

- **Claude** decides when a feature needs new art, writes the **Gemini prompt**,
  and specifies the exact **filename + path** and any size/format constraints.
- **Matt** runs the prompt in **Gemini**, then drops the resulting PNG at the
  path Claude named. Matt is the only one who generates images.

Claude cannot generate images and must not block a feature on art — build the
feature so it works with a placeholder (e.g. a solid `--fish-color` shape),
then hand Matt the art request separately.

## The handoff format (Claude → Matt)

When art is needed, Claude gives all of this in one block:

```
ART NEEDED: <what it's for>
Prompt:   <the full Gemini prompt>
Save as:  assets/<filename>.png
Size:     <e.g. 64×64, transparent background>
Wired in: <where the code expects it — CSS selector / file:line, or "not yet">
```

Matt generates it, saves it, and the feature lights up (or Claude wires it in
once the file exists).

## Naming & placement

- All art lives flat in **`assets/`** (no subfolders currently).
- **Final** assets use lowercase, semantic, hyphenated names that match how the
  code references them: `background.png`, `boat.png`, `kid.png`,
  `fish-common.png`, `fish-rare.png`, `fish-legendary.png`. New art follows the
  same style: `hat-straw.png`, `boat-canoe.png`, `junk-boot.png`.
- **Raw** Gemini generations may be kept as `Gemini_*.png` for reference/reroll,
  but the code never points at those — only at the clean final name.

## How art is wired into the game

- Almost everything is a CSS `background: url("assets/…png")`. No sprite atlas,
  no build step — one PNG per thing. (**`image-rendering: pixelated` is gone**
  as of R2 — it belonged to the pixel era, and painterly art must not be
  nearest-neighbour scaled. The old pixel assets still on screen are smooth-
  scaled until R3 replaces them, which is very slightly softer and fine.)
- **Fish currently share one sprite per tier**, not per species:
  `fish-common.png`, `fish-rare.png`, `fish-legendary.png`, tinted per species
  from `data/fish.json`'s `color` via the `--fish-color` CSS var. **The refresh
  changes this** — R6 gives all 33 species their own rig. Until a species' art
  lands, the tinted placeholder is what it renders as, on purpose.

## Style guardrails (put these in every prompt)

> **Changed 2026-08-31.** `ART_DIRECTION.md` is now the authority on style, and
> it replaces the pixel-art guardrails that were here. The old ones are kept
> below, struck through, because every asset currently in `assets/` was made
> under them — so they still explain what's on screen today.

- **Warm painterly storybook**, Ghibli-anchored: soft diffused light, banded
  skies, glowing light sources rather than flat discs, gentle rounded
  proportions, clean readable silhouette (it renders small).
- **Palette:** muted and warm, never saturated or neon. Muted teal-green water
  with a darker depth band; warm slightly-desaturated wood and earth. **R2 put
  real numbers behind this** — `:root` in `style.css` is the reference, and new
  art should land inside it:

  | | | |
  |---|---|---|
  | sky, high | `#b7cfd8` | pale blue at the top of the band stack |
  | sky, low | `#f2ddbe` | cream/amber warming toward the horizon |
  | light source | `#f7e6bd` | the glow's core — never a hard-edged disc |
  | water | `#7aa89b` → `#4f7d76` → `#375c58` | surface, mid, depth band |
  | foam | `#e6eee4` | |
  | wood / earth | `#7a6350`, `#4b3d33` | warm, desaturated |
  | outlines & shadow | `#33291f` (umber) | the darkest tone in the game — **not black** |
  | accents | `#dcab63` gold, `#d4886a` ember, `#93ac78` moss | |

  A generated background whose sky is more saturated than `#b7cfd8`/`#f2ddbe`,
  or whose darks go past `#33291f`, is a reroll — it will fight every UI panel
  painted over it.
- **Outlines:** thin (~1–1.5px at sprite scale) and **warm brown — never
  black.** No pure black anywhere, in linework or shadow.
- **Framing:** single subject, **transparent background** for anything that
  isn't a full scene. For any piece belonging to a rig, see the same-canvas rule
  below — it beats "centered".
- **No text, no UI, no watermark, no drop shadow baked in.**
- Canvas sized to how it's used; rig pieces share the body's canvas exactly.

~~Old pixel-era guardrails (what the current assets were made under): cozy pixel
art, chunky pixels; warm dawn/dusk lake palette — teal water, muted purple
hills, warm sky, gold accents; single centered subject; square-ish canvas
~64×64 for small sprites.~~

## The same-canvas rule (any piece that belongs to a rig)

Learned the hard way in G1 and carried forward through V2 into the refresh —
this is the rule that makes layered characters and fish work at all:

1. **Every piece is drawn from the body sprite as an attached reference image**,
   not from a text description of it.
2. **Every piece comes back on the same canvas, in place** — a transparent
   canvas the same size as the body, with the hat (or fin, or rod) already
   sitting where it goes. Then all layers share one box and the offsets are
   literally zero. Registration is the generator's job, not a tuning session.
3. **The grip is a sandwich, not an alignment problem.** Body drawn with an
   *open* curled hand → rod paints over it → a fingers-only overlay paints over
   the rod. Any rod then looks held.

4. **Do not generate a piece you could cut.** (R4.) Any subdivision of a
   painted character that has no independent existence — a head off a torso, an
   arm off a shoulder — is a **local cut of one delivered image**. It registers
   perfectly because it is the same pixels, and it costs no generation and no
   reroll risk. Generate separately only what must exist apart from the body:
   the rod (the shop swaps it) and the fingers that close over it. The
   consequence is that **how many pieces a rig has is a code decision, not an
   art decision** — which is how `ART_DIRECTION.md`'s four-piece assumption got
   answered without costing a prompt.

A piece that doesn't fit is a **reroll, not an offset tweak**. Tuning offsets at
4x zoom is exactly how G1 shipped something that looked wrong at 1x.

**Rod files are named `rod-<shop id>-<pose>.png`, and a pose's default rod is
that level's *gate* rod.** Rods are not cosmetics — `shop.rods[].unlocksLocation`
makes them the progression gate, so you cannot reach the Stream without buying
**Bamboo Beauty** or the Ocean without **The Deep Endeavor**. The rod a kid is
holding in a given level is therefore that gate rod or better (a kid can
re-equip a cheaper one they own, but it costs them luck, so it is the exception).
Drawing one generic pole for every pose would mean drawing the wrong rod twice
and redoing it in R7; drawing each pose's gate rod starts R7's per-item-per-pose
grid with the three that matter already filled in. Pond → `stick`, Stream →
`bamboo`, Ocean → `deepsea`.

**Characters do not get the background style block.** `ART_DIRECTION.md` says
sprites take the palette and edge treatment of the backgrounds *"without
attempting full painterly texture on moving parts"*, so the gouache /
visible-brushwork language that `GEMINI_NOTES.md` records as the thing worth
spending prompt weight on for a background is wrong on a character — it is
invisible at 66×100 screen px and reads as noise. Keep the palette, the diffused
light and the thin warm-brown outline; swap brushwork for **soft two-tone
shading with blended edges**, and name the character failure modes instead: NOT
pixel art, NOT flat vector art with even line weight, NOT thick black cartoon
linework, NOT a glossy 3D render.

## How the generator behaves → `GEMINI_NOTES.md`

Everything about **how Gemini responds** — what it obeys, what it silently
ignores, the flat-magenta backdrop convention that replaced asking for
transparency, both alpha-salvage recipes, and the delivery checklist — lives in
**`GEMINI_NOTES.md`** so it is in one place and does not get re-derived each
session. **Read it before writing any prompt below.**

The two headline rules, because they change how every request here is worded:
**position by edges and corners, never by percentage**, and **name a flat
backdrop colour rather than asking for transparency — then detect the colour you
actually got.**

## Prompt template Claude should reuse

The base template from `ART_DIRECTION.md`, prefixed to **every** asset prompt so
separately generated pieces still agree on palette and mood:

> Soft painterly illustration in the style of Studio Ghibli background art, warm
> muted color palette, gentle diffused lighting, thin warm brown outlines rather
> than black, cozy and inviting mood, no harsh shadows, no neon or saturated
> colors.

Then the asset-specific part, then the framing constraints (transparent
background / same canvas as the reference / no text, no baked shadow).

~~Old template: "Pixel art <subject>, cozy retro game asset, chunky clean
pixels, warm dawn lake palette…"~~ — retired 2026-08-31 with the pixel
direction.

## Open art requests

### ✅ R4 — the Ocean angler, in the fighting chair (landed and wired 2026-09-01)

Third and last pose. The Pond and Stream are cut and wired; when this lands and
is cut, **R4's done-when is met** and the epic moves to R5.

**Seated again, like the Pond — but nothing carries over.** Each pose's cut
parameters are measured off its own painting (`tools/cut-angler.py`, `POSES`),
and the two seated poses are not the same seat: the Pond kid sits low with knees
drawn up in a rowboat, this one sits *back* in a fighting chair with feet braced.

**The rod is The Deep Endeavor** — the gate rod for this spot, per the naming
rule near the top of this file. A heavy boat rod: thicker, shorter in proportion,
with a big reel. Not a cane pole and not the Stream's split cane.

**Two asks carried forward, because both were paid for:**

- **The arm held clear of the body.** This is what made the Stream's arm cut
  clean, and a seated-back figure has no drawn-up knee to hide the upper arm the
  way the Pond's did.
- **A flagged, exhaustive no-line paragraph.** A plain "no fishing line" was
  ignored on the Stream's first attempt because a rod implies a line; the
  `CRITICAL:` paragraph naming every form it could take is what worked.

```
ART NEEDED: the Ocean angler, in the fighting chair — one image, cut locally
Prompt:   Soft painterly storybook character illustration in the style of
          Studio Ghibli, warm muted color palette, gentle diffused lighting,
          thin warm brown outlines rather than black, cozy and inviting mood,
          no harsh shadows, no neon or saturated colors. Soft two-tone shading
          with the edges between tones blended, and soft brush texture visible
          inside the larger shapes. NOT pixel art, NOT flat vector art with even
          line weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A school-age child of about eight, seen from the side, facing right,
          SEATED and leaning back as if braced in a boat's fighting chair: hips
          low, back reclined, both feet planted forward and braced, knees bent
          and apart — a bracing posture, NOT curled up. Slim school-age
          proportions with a visible neck, long limbs and slender fingers — NOT
          a toddler, NOT a baby. Bare head with short but full, softly tousled
          warm-brown hair that covers the ears and falls in a soft fringe — NOT
          a buzz cut. Warm tan skin, soft rounded cheeks. Deep-sea fishing
          clothes: a cream long-sleeved shirt, navy-grey shorts, simple deck
          shoes, and a soft terracotta buoyancy vest with broad straps over the
          chest.
          The child is HOLDING A HEAVY BOAT ROD IN THE NEAR HAND ONLY: a thick
          tapered pole in deep warm brown with a broad pale cork grip and a
          large round dark-bronze reel mounted on top just above the grip. It is
          a stout deep-sea rod, noticeably thicker than a garden cane. The near
          arm is bent at the elbow with the forearm angled up and forward, and
          the near hand holds the cork grip at about chin height, below the reel.
          From that hand the rod runs diagonally up and to the right, passing
          well clear of the child's head, its tip reaching the upper-right corner
          of the canvas.
          CRITICAL: draw NO FISHING LINE anywhere. No thread, string or filament
          of any kind — not on the reel, not threaded through the guides, not
          trailing from the rod tip. The rod must be completely bare.
          IMPORTANT: the whole near arm must be held CLEAR OF THE BODY, with a
          visible gap of background between the arm and the chest along its
          entire length — the shoulder, upper arm, elbow and forearm all fully
          visible and not overlapping the torso.
          The FAR arm rests along the child's far thigh, out of the way of the
          rod.
          The hand on the rod must read as genuinely gripping it, seen from the
          side: the fingers wrap around the cork and the separate fingers are
          visible crossing in FRONT of the grip, with the thumb behind or
          alongside them. NOT a pinch, NOT fingertips touching, NOT an open or
          reaching hand.
          No hook, no fish, no hat, no chair, no boat, no water, no scenery, no
          other characters — the child alone, as if seated on nothing.
          The child sits in the lower-left of the canvas with the shoes near the
          bottom edge, leaving the upper-right clear for the rod.
          Everything that is not the child and the rod must be flat, solid,
          uniform magenta (#FF00FF): a plain backdrop colour, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere on
          the child or the rod.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1024 by 1024 pixels, aspect ratio 1:1. Output as PNG.
Save as:  assets/angler-ocean.png   (the source painting — the cut layers are
          angler-ocean-body.png, angler-ocean-arm.png, rod-deepsea-ocean.png)
Wired in: not yet — a new CONFIG.rig.poses.ocean block. Until it exists the
          Ocean wears the Pond kid through the pose fallback.
```

**Note the "no chair".** The fighting chair is a *vessel* part and belongs to
R5, which draws each vessel with a near-side layer painted in front of the
angler. Asking for it here would bake it into the body layer and R5 could not
put the kid down into it. The pose has to read as braced without the chair being
drawn — hence the posture described at length.

**✅ Landed first attempt — the only pose that did.** Everything the first two
cost was already priced into the prompt: the arm came back clear of the body,
the rod came back bare, the hair matched, and the posture read as braced without
a chair to sit in.

Two measurements worth keeping. The **rod axis fitted with a maximum residual of
0.9px over 47 samples** — the cleanest of the three, because a stout boat rod
gives the fit more to work with than a fly rod does. And the **4,123px enclosed
magenta pocket** between the forearm and the thigh is not contamination but the
arm-clear-of-the-body instruction working exactly as asked; the flood seeds it
like any other silhouette hole.

**It is the first pose whose arm bends visibly enough to need two segments.** The
Pond hides its upper arm behind the drawn-up knee and the Stream hides its behind
the vest, so a single capsule sufficed for both; here the shoulder, elbow and
forearm are all in view. `tools/cut-angler.py`'s arm block now takes an optional
`elbow`.

**The head match held up as a method.** Measured consistently — the widest row in
the top 20% of the figure — the three heads come to 318 / 217 / 315 source px,
giving 50 / 75 / 51 design px. Two seated poses landing within a design pixel of
each other is the check that the method is measuring the child rather than the
frame.

Recomposite rod → arm → body against the delivered painting: **293px differ by
more than 10, of 302,351 (0.097%)** — twice the other two poses' rate, all of it
along the reel's edge and the rod's synthesis seam, and sub-pixel at sprite
scale.

Verified in Chromium at the Ocean: correct layers, no failed asset requests, the
line leaves the rod tip at design **(130.2, 122.8)** against a predicted
(129, 120), and the arm swings **−5.25° to +6.31°** with the tip-to-line gap
peaking at **0.19px**.

**The rod needed one fix after wiring, and it was the tool's fault, not the
generation's.** The shaft showed a visible step where the synthesised extension
began, then a long needle taper — it read as a spear. The extension was seeded
from the pose's *nominal* `half`, which is measured lower down where the shaft is
fatter, so it started wider than the shaft it was continuing. All three rods had
it: nominal 16/15/22 px against real seam widths of **11.5/6.0/15.5**, the
Stream's being the worst. `tools/cut-angler.py` now measures the alpha at the
seam and tapers from that, back-loaded (`k**1.6`) so the shaft stays full through
the middle and thins near the tip. All three rods were re-cut.

**Known and deliberately not tuned:** the angler reads as sitting *on* the pixel
rowboat's gunwale rather than down in it. A reclined, legs-forward pose does not
fit a rowboat — it fits the Boston Whaler's fighting chair that R5 draws. Tuning
placement against art that is about to be replaced would be wasted.

### ✅ R4 — the Pond angler, one generation (landed and wired 2026-09-01)

**First character request of the refresh.** It replaces `body-kid.png` /
`hat-straw.png` / `rod-basic.png`, which are pixel-era and were cut for a
body/hat/rod split the direction has since revised.

**Pond only, deliberately.** R3's one-level-at-a-time discipline is what kept a
framing miss down to three prompts instead of nine. The Stream and Ocean
costumes are this same prompt with the clothes swapped, so nothing is lost by
waiting until the Pond pose is cut, wired and judged at 1x.

#### It took three attempts, and the third changed the method

The plan started as three generations — the child with an empty open hand as a
reference, then a rod and a fingers overlay drawn onto it. **That plan was
wrong, and two rerolls proved it.**

| attempt | what came back |
|---|---|
| 1 | a well-keyed **toddler** reaching with a flat splayed palm |
| 2 | the right child, but the hand was a **pincer in the wrong plane** — the fingers curled within the picture plane, so the tube they formed pointed at the viewer, not up the rod |
| 3 ✅ | the child **holding an actual rod**, gripped properly |

The lesson is `GEMINI_NOTES.md`'s own rule one level down: **the subject carries
more weight than any qualifier attached to it.** A hand gripping *nothing* is a
hand gripping nothing, however carefully the grip is described — two rerolls of
increasingly precise anatomical language produced two different wrong gestures.
Give the generator the object and it draws the grip correctly first time.

So **the pose is one generation, not three.** That is the local-cut rule
(*"don't generate a piece you could cut"*, above) pushed to its conclusion: the
rod and the arm are both cut out of the delivered painting, and registration is
exact because it is the same pixels.

#### What the delivered image made unnecessary

**There is no fingers layer.** The grip sandwich exists so a swapped shop rod
looks held, and it assumed the fingers had to be a separate top layer. They
don't: in the delivered art the whole visible hand is painted **in front of**
the rod, so painting the arm over the rod does the same job. A swapped rod (R7)
still slides underneath it.

That is lucky as well as simpler, because the fingers could not have been keyed
out: finger skin is `(210,167,132)` and the rod's lit side is `(206,155,102)`,
**33 RGB apart**, so a fingers layer would have meant tracing four contours by
hand.

Paint order for the pose is therefore **body → rod → arm (hand included) → hat**,
and there are two cuts, not three.

```
ART NEEDED: the Pond angler, holding the rod — one image, cut locally into three
Prompt:   Soft painterly storybook character illustration in the style of
          Studio Ghibli, warm muted color palette, gentle diffused lighting,
          thin warm brown outlines rather than black, cozy and inviting mood,
          no harsh shadows, no neon or saturated colors. Soft two-tone shading
          with the edges between tones blended, and soft brush texture visible
          inside the larger shapes. NOT pixel art, NOT flat vector art with even
          line weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A school-age child of about eight, seen from the side, facing right,
          seated low as if in a small rowboat: knees drawn up, back gently
          rounded, a calm contented expression. Slim school-age proportions with
          a visible neck, long limbs and slender fingers — NOT a toddler, NOT a
          baby. Bare head, short warm-brown hair, warm tan skin. Cozy pond
          fishing clothes — a soft terracotta long-sleeved shirt, warm
          oat-coloured shorts, simple brown shoes.
          The child is HOLDING A FISHING ROD: a slender tapered pole of warm
          brown wood with a darker wrapped grip at its thick end. The far arm
          rests on the knee. The near arm is bent at the elbow with the forearm
          angled up and forward, and the near hand holds the rod's grip at about
          chin height. From that hand the pole runs diagonally up and to the
          right, passing well clear of the child's head, its thin tip reaching
          the upper-right corner of the canvas.
          The hand must read as genuinely gripping the pole, seen from the side:
          the fingers wrap around the grip and the separate fingers are visible
          crossing in FRONT of the pole, with the thumb behind or alongside
          them. NOT a pinch, NOT fingertips touching, NOT an open or reaching
          hand, NOT a hand held near the rod without closing on it.
          No fishing line, no hook, no reel, no fish, no hat, no boat, no water,
          no scenery, no other characters.
          The child's back is near the left edge and the shoes are near the
          bottom edge.
          Everything that is not the child and the rod must be flat, solid,
          uniform magenta (#FF00FF): a plain backdrop colour, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere on
          the child or the rod.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1024 by 1024 pixels, aspect ratio 1:1. Output as PNG.
Save as:  assets/angler-pond.png   (the source painting — the cut layers are
          angler-pond-body.png, angler-pond-arm.png and rod-stick-pond.png)
Size:     1024×1024 (1:1), delivered on flat magenta.
Wired in: not yet — CONFIG.rig.poses.pond.layers
```

**✅ Delivered, cut and wired 2026-09-01, third attempt.** Cut from the JPEG the
chat carried rather than waiting for a PNG, because the codec turned out not to
be the limiting factor: a deliberately brutal q30 re-encode of the delivered
file differs from it by a mean of **1.72 / 255** at sprite scale, where the art
renders at about an eighth of its canvas. The delivered file is around q88.

Measured on delivery: canvas exactly 1024×1024 at 1:1; backdrop residue in the
subject is **rim only** (7,088px at 0–2 from the edge, 3 at 6–8, none past 8,
and no enclosed pocket); darks sit above the umber floor at the 1st percentile.
One oddity worth recording: the backdrop arrived at key `(248,87,243)` with a
blue stdev of **14.6**, where the two earlier generations were under 2.5 — the
first time the magenta has not been dead flat. It floods fine at tolerance 90.

**The cut is scripted: `tools/cut-angler.py`.** Re-run it against any
better source and the layers regenerate. It is an art-pipeline tool, not a build
step — nothing loads it at runtime.

**What came out, and the two things the art decided for us:**

- **The rod paints BEHIND the body.** The hand is drawn in front of the pole and
  the butt tucks behind the knee, so `layers` is `[rod, body]`. Compositing them
  in that order reproduces the delivered painting **pixel for pixel** (mean diff
  0.00, max 0), which is the check that the split is lossless.
- **There is no hat layer.** The angler is bare-headed on purpose so R7 can draw
  hats against this pose; the old pixel `hat-straw` would not match it.

The rod's occluded stretch — where the hand covers it — is synthesised from the
cross-section just above the hand. It is never seen, because the rod paints
behind.

**The rod is also EXTENDED, and the first attempt at this got it backwards.**
The delivered painting ran the shaft off the top-right corner, so the *canvas*
decided the rod's length rather than the drawing. Reading that as a defect and
tapering the tip inward made a rod that was already too short shorter still: it
came out at **33.3 design px, 51% of the old browser-tuned rig's 65.1**, and it
read stubby on screen. Of the 32px missing, the taper cost 4.2 and the canvas
clipping cost 27.5 — so the fix was never un-tapering, it was extension.

`tools/cut-angler.py` now pads the canvas and walks the shaft out along its
own axis to a length **set in design px** (`ROD_LEN = 65.0`, the same 130% of the
kid's height the old rig had), resampling the real cross-section so the outline
tapers with it. 42% of the visible rod is synthesised, and it is invisible for
the same reason the occluded stretch is: a straight shaft is featureless content
with no recognisable form to violate. **Retuning the rod is now one number in
that script**, not a reroll and not a hand edit.

The general lesson, which is in `GEMINI_NOTES.md`: a subject that runs off the
canvas has been *cropped by the frame*, and the frame is not a design decision.
Ask what length the thing should be, then extend to it.

**The numbers, measured off the canvas rather than tuned in the browser:** both
layers share one 1222×1331 canvas at rig `x 39, y −44, w 70, h 76`, with
`rodPivot (65, 5)` and `lineOrigin (108, −44)` — 65.0 design px apart at 48.0°,
which is the angle the rod is actually painted at. Verified in Chromium past the
profile picker: the line leaves the rod tip at design **(127.3, 124.0)** against
a predicted (128, 124), the 0.7px being the boat's bob, and reaches the bobber.

**Two data tests had to change**, and both were encoding assumptions from the G1
art rather than real invariants:

- *body paints first* is not a rule — paint order is a property of the art, and
  here the rod is behind. The test now requires a body layer and a rod layer to
  exist, without fixing their order.
- *the grip and the tip are corners of the rod's box* was true when the rod had
  its own tight canvas running corner to corner. Under the same-canvas rule the
  rod's box is the whole pose and the rod crosses it diagonally, so the test is
  now containment plus a direction check (tip up and to the right of the grip),
  which keeps the original intent: an R7 rod swapped in with a different box must
  move these with it, or the line detaches from a rod that is visibly swinging.

**✅ The arm layer landed too, and the anatomy decided where it pivots.** The
plan said "cut the arm at the shoulder". Overlaying a candidate mask showed why
that was wrong: what looked like a shoulder is the **chin and neck**, and the
angler's upper arm and elbow are **hidden behind the drawn-up knee**. The
visible limb is forearm and hand only, emerging from behind it — so there is no
shoulder cut through the torso at all, and no filling the shirt behind one.

It pivots where the forearm vanishes, which is the useful property: the cut end
sits *at* the pivot, so it does not move and stays tucked behind the knee
through the whole swing. The cut is flat there rather than a round cap, which
would bite into the knee. The body keeps the first 35px past the pivot so the
knee stays whole; the arm carries a copy of them, hidden because it paints
behind — the standard joint overlap, and those pixels move a quarter of a design
px across the full swing.

Paint order is therefore **rod → arm → body**: the hand is in front of the pole,
the forearm's stump is behind the knee. `tools/cut-angler.py` checks the
split by recompositing in that order against the delivered painting — mean 0.01,
and the only pixels past a difference of 10 are **128 of 324,574 (0.04%)**, all
of them the rod's synthesis seam rather than the arm's cut.

**How the swing is composed, and why not by nesting the DOM.** The arm and the
rod would naturally be parent and child, but the paint order forbids it — the
rod sits *behind* the arm. So both layers take their transform-origin from the
arm's pivot, the arm is a plain rotation, and the rod is that same rotation with
its own wrist turn nested inside via a translate/rotate/translate. One transform
each, no nesting. `CONFIG.anim.rod.armFollow` (0.35) splits R1's *existing*
tuned angles between arm and wrist rather than adding to them, so nothing about
the cast's feel changed; 0 disables it, and a pose with no `armPivot` falls back
to the old single rotation.

Verified in Chromium by sampling every frame of a full cast: the arm swings
**−5.25° to +6.45°**, exactly 0.35 of R1's −15°/+18.4°, and the gap between the
rod tip *as the browser actually renders it* — the live CSS matrix pushed
through the composed transform — and where the line is drawn peaks at
**0.13px over 92 frames**, which is the boat's bob between samples. That is the
check that matters: if `applySwing()` and `rodTip()` disagreed, the line would
detach from a visibly swinging rod, which is the exact bug R1 exists to fix.

**Worth saying plainly: the effect is subtle.** The forearm is 6.2 design px
from pivot to grip, so 0.35 of the swing moves the grip about 0.6 design px.
What reads at 1x is the hand travelling with the rod rather than the rod
pivoting inside a frozen fist — more correct, and better in motion, but nobody
will point at it. It is one number if it ever wants more.

**Still open for R4:** the **Stream and Ocean costumes**. The done-when asks for
all three levels, and both still wear the Pond kid via the pose fallback. The
Stream is requested below; the Ocean follows once it is cut and judged.

The far arm came back resting by the hip rather than on the knee. That is a
harmless deviation: it stays with the body, and — the part that matters for the
arm cut still to come — it is **not** on the rod, so swinging the arm and the rod
together cannot tear a second hand off.

### ✅ R4 — the Stream angler, standing in waders (landed and wired 2026-09-01)

**Not the Pond prompt with a recolour.** `ART_DIRECTION.md` puts the Stream
angler *standing in the water* rather than seated in a boat, so it is a
different pose and every cut parameter in `tools/cut-angler.py` — rod axis,
arm skeleton, pivots, scale — is measured fresh. Budget it as a new pose, not a
variant.

**The rod changes too, and it is Bamboo Beauty.** An earlier draft of this
request said the gear stays the same and only the costume follows the water.
That was wrong, and the rod ladder is why: `shop.rods[].unlocksLocation` makes
rods the **progression gate**, so no kid reaches the Stream without buying
**Bamboo Beauty** — and that rod's name has been promising split cane, the
classic fly-rod material, since the shop shipped. A cane pole in chest waders
was never right. See the naming rule near the top of this file: a pose's default
rod is that level's gate rod.

**One caution that shapes the prompt: do not ask for it thin.** At sprite scale
the whole rod is ~65 design px long and about **1.8 device px** wide. A literally
slender fly rod goes sub-pixel and vanishes. The **reel and the honey cane** are
what survive an 8× downscale; taper is not. So the prompt asks for a visible
reel and explicitly says *not* hair-thin.

**One thing the Pond prompt did not need: ask for the arm held clear of the
body.** The Pond angler's upper arm and elbow happened to hide behind the
drawn-up knee, which is what made that cut easy. A standing figure has no such
cover, and the sleeve would otherwise sit against the torso in the same colour
with no contour between them — the exact problem that made a shoulder cut look
impossible there. Asking for a visible gap of backdrop along the whole limb
costs nothing artistically (it is a natural casting stance) and turns the arm
cut into an isolated silhouette against magenta.

**No water in the picture.** The game's own water layers and `#surface` cut the
angler at design y=198; anything painted here would double up.

```
ART NEEDED: the Stream angler, standing in waders — one image, cut locally
Prompt:   Soft painterly storybook character illustration in the style of
          Studio Ghibli, warm muted color palette, gentle diffused lighting,
          thin warm brown outlines rather than black, cozy and inviting mood,
          no harsh shadows, no neon or saturated colors. Soft two-tone shading
          with the edges between tones blended, and soft brush texture visible
          inside the larger shapes. NOT pixel art, NOT flat vector art with even
          line weight, NOT thick black cartoon linework, NOT a glossy 3D render.
          A school-age child of about eight, seen from the side, facing right,
          STANDING upright and full length with weight on both feet, calm and
          contented. Slim school-age proportions with a visible neck, long limbs
          and slender fingers — NOT a toddler, NOT a baby. Bare head, short
          warm-brown hair, warm tan skin. Stream fishing clothes: warm sand-tan
          chest waders over a cream long-sleeved shirt, and a soft terracotta
          fly-fishing vest with small pockets.
          The child is HOLDING A BAMBOO FLY ROD: a slender split-cane pole in
          warm honey-amber tones with a pale cork grip at its thick end, fine
          dark-red thread wraps where the line guides sit, and a small round
          dark-bronze fly reel mounted just below the grip. Keep the pole
          clearly visible and readable rather than hair-thin. The near arm is
          bent at the elbow with the forearm angled up and forward, and the near
          hand holds the cork grip at about chin height, above the reel. From
          that hand the rod runs diagonally up and to the right, passing well
          clear of the child's head, its tip reaching the upper-right corner of
          the canvas.
          IMPORTANT: the whole near arm must be held CLEAR OF THE BODY, with a
          visible gap of background between the arm and the chest along its
          entire length — the shoulder, upper arm, elbow and forearm all fully
          visible and not overlapping the torso. The far arm hangs down at the
          child's other side.
          The hand must read as genuinely gripping the pole, seen from the side:
          the fingers wrap around the grip and the separate fingers are visible
          crossing in FRONT of the pole, with the thumb behind or alongside
          them. NOT a pinch, NOT fingertips touching, NOT an open or reaching
          hand.
          No fishing line, no hook, no fish, no hat, no water, no riverbank,
          no scenery, no other characters.
          The child's feet are near the bottom edge of the canvas and the child
          stands toward the left, leaving the upper-right clear for the rod.
          Everything that is not the child and the rod must be flat, solid,
          uniform magenta (#FF00FF): a plain backdrop colour, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere on
          the child or the rod.
          No text, no UI, no watermark, no baked-in drop shadow.
          The image is 1024 by 1024 pixels, aspect ratio 1:1. Output as PNG.
Save as:  assets/angler-stream.png   (the source painting — the cut layers are
          angler-stream-body.png, angler-stream-arm.png, rod-bamboo-stream.png)
Size:     1024×1024 (1:1), delivered on flat magenta.
Wired in: not yet — a new CONFIG.rig.poses.stream block. Until it exists the
          Stream wears the Pond kid through the pose fallback, which is the
          wrong shirt rather than no angler.
```

**✅ Landed, cut and wired 2026-09-01, on the second attempt.**

The first came back with three faults, and only one of the three things I first
called out survived testing — worth recording, because two were my own bad eye:
I claimed the style had gone flat vector and that the arm-clear-of-the-body ask
had been ignored. Measured, the tonal variation matched the Pond's (stdev 26.4
vs 27.3) and its outlines were *less* even, and the arm ask had worked
perfectly — 2 separate subject runs per scanline through y=330–490. **The style
and clearance instructions were fine; my reading of them was not.** What was
real: a **baked-in fishing line** (asked for none, got one threaded through the
guides), and a **buzz cut** where the Pond kid has full tousled hair, which
breaks `ART_DIRECTION.md`'s one-protagonist decision.

The reroll fixed all three, and its `CRITICAL: draw NO FISHING LINE anywhere`
worked — a single 14–18px run per scanline in the upper-right quadrant, which is
the rod alone. It also carries the **landing net** and **grey-green waders**
(the first attempt's vest and waders were only 35 RGB apart, so the whole figure
read tan and the terracotta accent could not do its job).

**Scale had to come from the head, not the figure.** The generator draws every
pose to fill its frame, so the *standing* Stream kid came back 897px tall
against the *seated* Pond kid's 878 — 2% taller. Scaling both alike would have
stood the child up no taller than he sits. Matching the two heads instead (the
Pond's is 318 source px wide, 18.1 design px at its scale; the Stream's is 217)
gives 75 design px standing against 50 seated.

The cut is the Pond's method with all-new numbers, and two additions the Pond
did not need: an **off-axis circle for the reel**, which the rod corridor would
otherwise miss entirely, and a **hard left bound** where the corridor reaches
past the rod butt into the waders. The arm pivots where the sleeve vanishes
behind the vest — the same principle as the Pond's forearm behind the knee.
Recomposite rod → arm → body against the delivered painting: **70px differ by
more than 10, of 157,559 (0.044%)**, the same order as the Pond's.

`tools/cut-angler-pond.py` is now `tools/cut-angler.py`, taking the pose as an
argument, with every per-pose number in one `POSES` dict. It still reproduces
the Pond's committed numbers exactly.

Verified in Chromium at the Stream: correct layers, no failed asset requests,
the line leaves the rod tip at design **(146.4, 100.9)** against a predicted
(145, 98), and the arm swings **−5.25° to +6.06°** with the tip-to-line gap
peaking at **0.37px** — the composition holds with a completely different set of
numbers from the Pond's.

**One line borrowed from R5:** `#boat` and `#hull-shadow` are hidden in the
Stream. The angler stands *in* the water there, and a pixel rowboat under a
standing kid was worse than the alternative. R5 still owns vessels properly.

### ✅ R3 — the Pond, repainted as three layers (landed and wired 2026-09-01)

**First art request of the refresh.** R1 and R2 were code-only; this is what
Matt has to generate to move the epic forward. **Pond only, for now** — per
`BUILD_PLAN_REFRESH.md`, it's wired and judged before the Stream and Ocean are
requested, so a palette or framing miss costs one level's three prompts, not
nine.

Three layers, matching `ART_DIRECTION.md`'s parallax split, each the **same
canvas size** so they stack with zero offsets (the same-canvas discipline
above, applied to backgrounds instead of rig pieces). Use the current
`background.png`'s aspect ratio as the target: **1584×672 (2.36:1)**.

**Design constraint that overrides anything else in the prompt:** the
waterline — the line where sky/land ends and water begins — must land at
**55% of the image's height** (design y=198 on the 720×360 canvas `#surface`
and everything else assumes). Get this wrong and every tuned coordinate in the
scene (the boat, the rig, the fish's swim band) moves with it, the way the
Stream's mis-framed art forced a scale-and-offset workaround that R3 exists to
delete. A generated image whose waterline lands anywhere else is a **reroll**,
not something to crop or offset into place.

> **Update 2026-09-01 — layer 1 has landed, and it moved the target for layers
> 2 and 3.** `background-pond-far.png` came back with its waterline at
> **55.95%**, which at game scale puts it at design y=201 against the y=198
> `#surface` (`top: 55%`) assumes. Three pixels. That was accepted rather than
> rerolled: the rule above is aimed at gross misses like the Stream's
> (`scale 1.246` plus a −368px offset), `#surface`'s read comes from a
> 0.30-alpha lip in its first 6px, and a reroll would have been a lottery over
> 3px rather than a fix.
>
> **So layers 2 and 3 are specified at 56%, not 55%** — the three layers
> agreeing with *each other* matters more than agreeing with the nominal
> number, because a mismatch between them is a visible seam while a shared 3px
> offset is not. If exactness is ever wanted, trimming 15px off the top of all
> three identically lands the waterline on y=198 and preserves registration by
> construction.

```
ART NEEDED: Pond background, layer 1 of 3 — far (sky, hills, treeline)
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. A calm forest pond at golden
          hour: a banded sky (pale blue near the top warming to cream and
          amber near the horizon), a soft glowing sun low over gentle tree-
          covered hills, no hard-edged sun disc. Include a simple, complete
          water fill below the horizon in muted teal-green (this layer must
          look complete on its own if the water and foreground layers are
          ever missing). No boat, no lily pads, no reeds — those are separate
          layers. The horizon/waterline must sit at exactly 55% down from the
          top of the canvas.
Save as:  assets/background-pond-far.png
Size:     1584×672 (2.36:1), opaque, no transparency needed
Wired in: not yet — replaces assets/background.png as the base layer; #scene's
          background-image (style.css)
```

```
ART NEEDED: Pond background, layer 2 of 3 — water
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Just the water surface of a
          calm forest pond at golden hour, seen from the side. The water must
          have a clear sense of depth: a lighter muted teal-green where the
          surface catches reflected light nearest the top, deepening through a
          mid teal to a distinctly darker, cooler band toward the bottom of
          the canvas. Do not paint it as one flat tone — the deepening from
          top to bottom is the point of this layer. Soft reflected highlights
          catching the surface near the top edge of the water. No boat, no
          lily pads, no reeds, no shoreline, no sky. The painted water must
          start at exactly 56% down from the top of the canvas and fill
          everything below it. Everything above that line must be filled with
          flat, solid, uniform magenta (#FF00FF) — a plain backdrop color, not
          a checkerboard, not a gradient, not transparency. No magenta
          anywhere in the water itself. Output as PNG.
Save as:  assets/background-pond-water.png
Size:     1584×672. Delivered on flat magenta above the waterline; the alpha
          is cut locally (see GEMINI_NOTES.md — and
          for this layer specifically, the cut is by row at 56%, so the
          magenta is a belt-and-braces check, not the mechanism).
Wired in: not yet — a layer above background-pond-far.png; ART_DIRECTION.md
          calls for this layer to "animate independently" (a slow drift), which
          is a follow-up CSS/JS task once the art lands, not part of this request
```

**✅ Landed 2026-09-01, salvaged by row.** The magenta convention worked on its
first outing: a **2-row** transition band, pink gone entirely by 3 rows below
the cut, and **zero** magenta left after the cut. Far better than the
checkerboard salvage it replaces.

**But Gemini ignored the 56%** and put the waterline at **46.13%** — 65px high.
It did not matter *here*, and the reason is worth keeping: this layer is a
smooth vertical gradient with no drawn features, so its only meaningful edge is
the top one, which is the very thing being set. The salvage discards rows 0–315
and **rescales the remaining 356 rows of clean water down to the 296** that sit
between layer 1's real waterline (y=376) and the bottom. Compressing a
featureless gradient by 17% is invisible; there is nothing to misregister.

**This is not the reroll rule bending.** That rule protects the registration of
*drawn features* — a rig piece, a shoreline, a dock. Water has none. Layer 3
does, so a positional miss there **is** a reroll: do not reuse this trick on it.

The water quality is what the reworked prompt was for, and it delivered: mid
`#4f8077` against a `#4f7d76` target and depth `#34534f` against `#375c58`, with
a surface-to-depth luminance drop of **83** where layer 1's flat water managed
only **12**.

**Layer 2 is now pinned to layer 1's waterline at y=376.** If layer 1 is ever
rerolled or trimmed, re-cut this layer from the original download rather than
editing the PNG in the repo.

Arrived as a **JPEG again**, despite the prompt asking for PNG — confirming the
caveat above that format is a download-UI choice. Harmless here, because the cut
is by row and the fringe was 3 rows.

```
ART NEEDED: Pond background, layer 3 of 3 — foreground detail
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Foreground pond vegetation,
          framing an empty center. Along the very bottom-left corner and the
          very bottom-right corner of the canvas: a few lily pads and tall
          slender reeds, and on one side only, the weathered end of a wooden
          dock or a mossy rock. These details cling to the left and right
          edges like a framing vignette and rise only a little way up from the
          bottom edge — they must never reach the middle of the canvas and
          never reach the upper half. The entire center of the canvas, and the
          whole middle of the bottom edge, must be completely empty backdrop
          with nothing painted in it at all. Everything that is not one of
          those corner details must be filled with flat, solid, uniform
          magenta (#FF00FF) — a plain backdrop color, one single unvarying
          color, not a checkerboard, not a gradient, not transparency. No
          magenta, pink or purple anywhere in the vegetation or the dock.
          Output as PNG.
Save as:  assets/background-pond-fore.png
Size:     1584×672. Delivered on flat magenta; the alpha is cut locally by
          keying the magenta out (recipe in GEMINI_NOTES.md).
Wired in: not yet — the top layer, painted over water and the mid plane
          (rig/fish), same as #surface already does; nothing may land where the
          bottom-center finger-guide panel sits
```

**Why this prompt is worded differently from layers 1 and 2.** Both of those
were given a percentage from the top, and layer 2 came back at 46% when it was
asked for 56%. **Layer 3 cannot absorb that** — it has drawn features, so a
positional miss is a reroll (see layer 2's note above). Two changes to make the
constraint survive:

1. **Position is expressed against the edges, not as a percentage.** "The very
   bottom-left corner", "rise only a little way up from the bottom edge". Corners
   and edges are things a generator can actually see; "70% down" is not.
2. **The keep-out is stated as composition, not geometry.** Asking a model to
   leave a specific rectangle empty is unreliable; asking for vegetation that
   frames an empty center is an ordinary picture, and it happens to leave exactly
   the bottom-center third clear. `#guide-panel` is `position: fixed`, centered,
   pinned to the bottom of the viewport, so the middle of the lower scene is what
   has to stay empty — a framing vignette gives that for free.

**Check on delivery, in this order:** magenta bleed into the vegetation (a
pink-fringed reed is a reroll, not a keying problem) · anything painted in the
center · anything reaching the upper half · then key, flood-filling from the
edges rather than globally.

**✅ Landed 2026-09-01.** The compositional keep-out worked exactly as intended:
**0.0%** of the bottom-center third is painted, and only **0.2%** of the rig's
box (design x20–138, y140–224 — the boat, kid and rod) is clipped by a reed tip.
Both were the point of the rewrite.

**Two things came back wrong, and only one of them mattered.**

1. **The backdrop is `#c642b0`, not `#FF00FF` — and it is the prompt's own fault.**
   The style preamble every asset prompt carries says *"no neon or saturated
   colors"*, and the generator applied that to the backdrop as well as the art.
   It did not matter: uniformity is what keying needs, not a particular hue, and
   the field came back at **stdev <1** across the whole clear area. **Detect the
   backdrop from the border rather than assuming `#FF00FF`** — the existing rule
   for checkerboards, and it holds here too. Worth expecting the softening on
   every future request rather than fighting it.
2. **The reeds reach 32.6%/37.5% down, well into the upper half the prompt
   forbade.** That instruction was simply wrong: the waterline is at 56%, and
   cattails at a pond edge stand *above* the water. Reeds that stopped below it
   would look wrong. The constraint that actually mattered — don't foul the rig
   or the guide panel — was met. **Say "must not reach the upper half" only
   where something is genuinely flat to the water.**

**Keying it took three passes, and the middle one is the reusable part:**
flood fill from the edges (never globally) · an **alpha ramp** between distance
55 and 110 from the key, unpremultiplying the key's contribution out of every
blended edge pixel · then a **targeted despill**. Purple residue went 6.01% →
3.79% → **0.00%**. The despill is safe here because real pond vegetation is
olive and tan — blue *below* green — so any surviving pixel with blue well above
green is keyer residue and never paint. That test is palette-specific; re-derive
it per asset rather than copying the numbers.

**Once these three land:** composite them locally at game scale before wiring
(the established local-check habit — see *the same-canvas rule* above), swap
`#scene`'s background for the three-layer stack, confirm the waterline still
reads at y=198, and only then does `BUILD_PLAN_REFRESH.md` mark R3's Pond half
done and the Stream/Ocean prompts get written.

### ✅ R3 — the Stream, repainted as three layers (landed and wired 2026-09-01)

**Second of the three levels.** The Pond is landed, wired and judged, so the
conventions below are proven rather than guessed. **Read `GEMINI_NOTES.md`
first** — every wording choice here comes from it.

**This is the level with a history, and the prompts are built around it.** The
old `background-stream.png` came back as a forest pool seen **from above**, water
in a low diagonal band instead of a flat waterline. Under `cover` the boat
floated ~100px above the water; the scene is currently held together by
`#scene.loc-stream`'s `scale 1.246` plus an offset, which costs the sky and runs
the art chunkier than the other two biomes. **Deleting that workaround is R3's
done-when criterion**, so the side view is the one thing these prompts cannot
get wrong. The framing sentence below is lifted from the Ocean prompt, which
produced exactly the right composition first time.

**How the three layers register, now that the Pond has proved it:** *layer 1
defines the waterline and layers 2 and 3 are salvaged into agreement with it
locally.* So layer 1's waterline is the only one that has to be close, and a miss
on 2 or 3 is cheap. That is why the water and foreground prompts state the line
loosely and lean on the magenta instead.

```
ART NEEDED: Stream background, layer 1 of 3 — far (sky, forest, far bank)
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape — leaves, moss and rock are modelled with light,
          not filled with flat color. Outlines are fine, delicate and varying in
          weight, the way a brush leaves them; they are never thick, uniform or
          inked. Distant trees soften into atmospheric haze. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          A cozy forest stream, seen straight on from the opposite bank at eye
          level with the water — the way you would see it standing in the
          shallows. This is a flat side view like a stage backdrop. It is NOT
          seen from above, NOT a bird's-eye or three-quarter view, and the
          water's edge is a straight horizontal line running the full width of
          the canvas, not a diagonal band and not a curve. Above that line: a far
          bank of mossy rocks and ferns, dense green forest behind it, and a soft
          banded sky warming to cream in a gap between the treetops. Cooler and
          greener than a golden-hour pond, but still warm and muted. Include a
          simple, complete water fill below the water's edge in muted teal-green,
          so this layer reads correctly on its own. No people, no boat, no
          fishing gear. Keep even the deepest shadows in the trunks a warm dark
          brown — never near-black. The water should fill at least the bottom
          third of the canvas. Aspect ratio 2.36:1. Output as PNG.
Save as:  assets/background-stream-far.png
Size:     1584×672 (2.36:1), opaque, no transparency needed
Wired in: not yet — lands with all three, replacing background-stream.png and
          deleting #scene.loc-stream's scale/offset workaround in style.css
```

```
ART NEEDED: Stream background, layer 2 of 3 — water
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every wash — the water is modelled with light, not filled with
          flat color. Any line work is fine, delicate and varying in weight, the
          way a brush leaves it; never thick, uniform or inked. This must NOT
          look like flat vector art, a cartoon, or a clean digital illustration
          with even line weight. Just the surface of a shallow
          forest stream, seen from the side at eye level. Moving water, not a
          still pond: soft broken riffles and gentle current lines running
          horizontally, a few pale foam streaks, the suggestion of submerged
          stones showing through where it is shallowest. The water must have a
          clear sense of depth — lighter and more broken where it catches the
          light nearest the top, deepening through a mid teal to a darker,
          cooler channel toward the bottom of the canvas. Do not paint it as one
          flat tone; the deepening from top to bottom is the point of this
          layer. No bank, no rocks above the surface, no sky, no people. The
          painted water fills the bottom of the canvas and stops in a straight
          horizontal line. It does not matter exactly where that line falls, so
          long as the water fills at least the bottom third. Everything above
          that line must be filled with flat, solid, uniform magenta (#FF00FF) —
          a plain backdrop color, one single unvarying color, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere in
          the water itself. Aspect ratio 2.36:1. Output as PNG.
Save as:  assets/background-stream-water.png
Size:     1584×672. Delivered on flat magenta above the line; the alpha is a cut
          by row, then rescaled to sit under layer 1's waterline at row 376
Wired in: not yet — the middle plane, #bg-water for .loc-stream
```

**✅ Landed 2026-09-01, first attempt, no reroll.** The per-layer style block
worked: the water came back as the same watercolour as the bank, and the two
planes read as one painting rather than two stacked ones.

- **Depth gradient is the best of any layer so far** — a surface-to-depth
  luminance drop of **112**, against the Pond water layer's 83 and the Pond far
  layer's 12. Mid `#6f9885` against a `#4f7d76` target, depth `#2d5557` against
  `#375c58`. The pale `#c4bca5` at the top is the light-catching riffle band the
  prompt asked for, not a miss.
- **Magenta behaved exactly as on the Pond**: a 4-row transition, pink gone by 3
  rows below the cut, **zero** remaining after it.
- **The waterline landed at 47.77%, and it did not matter** — precisely the
  point of relaxing it. The clean band (343 rows) was rescaled to the 296 rows
  between layer 1's waterline at row 376 and the bottom.

Verified: RGBA 1584×672, fully transparent above row 376, fully opaque below, no
magenta anywhere, composited against layer 1 at game scale before committing.


**Two changes made after layer 1 landed (2026-09-01), both worth carrying to the
Ocean's prompts.**

1. **The painterly style block was added here too.** Layer 1 came back as
   genuine watercolour, and this water is painted *directly against* the far
   bank in the same frame. Without the same medium named, the two planes read as
   two different paintings stacked on each other — a failure mode that does not
   exist for a single-image background and only appears once a level is split
   into layers. **Every layer of a level needs the style block, not just the
   first.**
2. **The waterline instruction was relaxed to "it does not matter exactly where
   that line falls".** For this layer it genuinely does not: the alpha is a cut
   by row and the band is then rescaled to sit under layer 1's line at row 376,
   exactly as the Pond's water layer was after it came back 65px out. Spending
   prompt weight on a position that is salvaged anyway takes weight from the
   style, which is not — see `GEMINI_NOTES.md`, "spend the prompt where it can
   win".


```
ART NEEDED: Stream background, layer 3 of 3 — foreground detail
Prompt:   Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape — moss, fern and stone are modelled with light, not
          filled with flat color. Outlines are fine, delicate and varying in
          weight, the way a brush leaves them; never thick, uniform or inked.
          This must NOT look like flat vector art, a cartoon, or a clean digital
          illustration with even line weight. Foreground streamside detail,
          framing an empty center. Along the very bottom-left corner and the
          very bottom-right corner of the canvas: wet mossy river rocks breaking
          the surface, clumps of ferns and long grass, and on one side only, the
          mossy end of a fallen log lying part-submerged. These details cling to
          the left and right edges like a framing vignette and rise only a
          little way up from the bottom edge. The entire center of the canvas,
          and the whole middle of the bottom edge, must be completely empty
          backdrop with nothing painted in it at all. Everything that is not one
          of those corner details must be filled with flat, solid, uniform
          magenta (#FF00FF) — a plain backdrop color, one single unvarying
          color, not a checkerboard, not a gradient, not transparency. No
          magenta, pink or purple anywhere in the rocks, ferns or log. Aspect
          ratio 2.36:1. Output as PNG.
Save as:  assets/background-stream-fore.png
Size:     1584×672. Delivered on flat magenta; alpha keyed locally
Wired in: not yet — the near plane, #bg-fore for .loc-stream. Nothing may land
          where the bottom-center finger-guide panel sits, or over the rig's box
          (design x20–138, y140–224)
```

**✅ Landed 2026-09-01, first attempt.** Backdrop came back at **`#fa05f8`** —
near-pure magenta this time, against the Pond foreground's `#c642b0`, and dead
uniform (stdev ≤1.1). Keyed with the standard three passes; **0.00%** purple
among visible pixels. 20.3% opaque coverage.

Two intrusions, both judged acceptable rather than rerolled:

- **6.5% of the bottom-center third is painted** (the Pond managed 0.0%) — the
  mossy log's right end reaches into it. The guide panel is translucent and sits
  over it, so the log simply reads as continuing behind the UI. Nothing is
  hidden that carries meaning.
- **1.6% of the rig's box** is clipped by the left-hand growth, against the
  Pond's 0.2%. Foreground vegetation partly overlapping the angler is what a
  near plane is *for* — you are standing behind the reeds.

Detail tops out at 35.6% / 41.7% down, well above the waterline, which is
correct: streamside rocks and ferns sit above the water, not flat to it.

**The Stream is wired, and `.loc-stream`'s `scale 1.246` workaround is deleted**
— R3's done-when criterion for this level. The planes now just swap their
images; no per-location framing, no scale, no offset, because the art was
generated and fitted to put its waterline on the Pond's row. Verified in
Chromium: all three planes load and drift, the waterline reads at screen y=396 =
design y=198, `#scene` carries no background image, and the CSS `.reeds` are
hidden here now that real painted ones exist.

```

**✅ Layer 1 landed 2026-09-01, on attempt 4, fitted rather than rerolled again.**

| attempt | wording | waterline | verdict |
|---|---|---|---|
| 1 | hedged position | 66.96% | good painterly texture, framing out |
| 2 | position stated three unhedged ways | **66.96%**, identical to the pixel | proved wording does not move the prior |
| 3 | — | 62.35% | best framing, but flat and graphic |
| 4 | style-weighted, position relaxed to a floor | 72.77% | **the style Matt asked for — kept** |

**The side view was solved in every attempt** and never recurred as a problem.
The trade in attempt 4 worked exactly as designed: relaxing the position to an
easy floor let the prior run further than ever (72.77%, the lowest of the four),
and bought genuine watercolour — soft washes, delicate varied linework,
distant trees dissolving into haze. **The framing was the salvageable half and
the style was not, so that is the right way round.**

**The fit costs nothing, and is better than any crop of the earlier attempts.**
Crop **113px off the top** so the waterline lands on row 376, then **regrow
113px of water at the bottom**. The canvas stays **1584×672**, so its aspect is
identical to the Pond's and `cover` behaves the same — no extra horizontal loss
(attempt 3's crop would have cost 273px of width instead of 129). The regrown
water is free: **layer 2 repaints all of it**, and layer 1's water is only the
standalone fallback. More sky survives than in any earlier crop.

Waterline now sits at **design y=201, identical to the Pond's**.

**One open judgement, flagged rather than fixed:** the Stream reads darker and
punchier than the Pond — mean luminance **143.9 vs 170.8**, contrast **50.2 vs
41.0**. Defensible, since a forest stream *is* shadier than a golden-hour pond
and the prompt asked for cooler and greener, but it is a real difference between
two levels of one game. Judge it wired, next to the Pond, before deciding.
Darks past the `#33291f` floor are also creeping across attempts — 0.58%, 1.37%,
now **1.67%** — with no pure black.

**When these land:** key and register them against layer 1, composite all three
at game scale, point `.loc-stream` at the three `#bg-*` planes, **delete the
`scale 1.246` + offset block and the `.reeds` exemption for the Stream**, then
verify the waterline in a browser. The Ocean's prompts get written after this
level is judged — same one-level-at-a-time discipline that kept the Pond's
misses cheap.

### ✅ R3 — the Ocean, repainted as three layers (landed and wired 2026-09-01)

**Last of the nine, and the first written with the whole lesson set in hand.**
The Pond took three rerolls to learn the conventions; the Stream took four on
one layer and then landed the other two first-attempt. These are written to that
standard. **Read `GEMINI_NOTES.md` before touching them.**

Everything proven is applied: the **style block on all three layers**, not just
the first · the **flat magenta backdrop** on the two that need alpha · the
**keep-out stated as composition** rather than geometry · the waterline stated
exactly on layer 1 and left don't-care on layers 2 and 3, since **layer 1
defines the truth and the others are salvaged into it** · and **explicit pixel
dimensions in the prompt body**, not only in the spec line below it (Matt's ask,
2026-09-01 — the aspect ratio alone has been reliable, this is belt and braces).

**Expect to fit layer 1 rather than reroll it.** The Stream's far layer missed
its waterline on all four attempts and was solved by cropping the top and
regrowing water at the bottom, keeping the canvas at 1584×672 so `cover` behaves
exactly as it does for the other levels. The same fix is available here and
costs nothing, because layer 2 repaints the water anyway.

**What this level replaces:** `assets/background-ocean.png`, which came back at
1.83:1 rather than ~2.4:1, so `cover` crops its top and bottom and
`#scene.loc-ocean` carries a `center 11%` offset to pull the horizon onto y=198.
**That offset is deleted when these land** — the same closing move as the
Stream's `scale 1.246`.

```
ART NEEDED: Ocean background, layer 1 of 3 — far (sky, horizon, open sea)
Prompt:             Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape, modelled with light rather than filled with flat
          color. Outlines are fine, delicate and varying in weight, the way a
          brush leaves them; never thick, uniform or inked. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          The open ocean on a bright calm day, seen straight on at eye level
          from just above the water, as if standing in a boat. This is a flat
          side view like a stage backdrop. It is NOT seen from above and NOT a
          three-quarter view, and the horizon is a straight horizontal line
          running the full width of the canvas. Above it: a soft banded sky,
          pale blue high up warming to cream near the horizon, with a few
          gentle drifting clouds and a soft glow low in the sky — no
          hard-edged sun disc. A faint suggestion of distant land or haze at
          the horizon is welcome but must stay low and pale. Deeper and bluer
          than a forest pond, but still muted and warm-lit, never a saturated
          tropical blue. Include a simple, complete water fill below the
          horizon so this layer reads correctly on its own. No boat, no people,
          no birds, no fishing gear. Keep even the deepest tones a warm dark
          brown-blue, never near-black. The horizon must sit at exactly 55%
          down from the top of the canvas: sky fills the top 55% and water
          fills the bottom 45%. The image is 1584 by 672 pixels, aspect ratio
          2.36:1. Output as PNG.
Save as:  assets/background-ocean-far.png
Size:     1584×672 (2.36:1), opaque, no transparency needed
Wired in: not yet — lands with all three; replaces background-ocean.png and
          deletes #scene.loc-ocean's `center 11%` offset in style.css
```

**✅ Layer 1 landed 2026-09-01, first attempt, fitted.** The best far layer of
the three levels on every measure that matters:

| | Pond far | Stream far | **Ocean far** |
|---|---|---|---|
| darks past the `#33291f` floor | 0.58% | 1.67% | **0.00%** |
| own depth gradient (lum drop) | 12 (flat) | — | **74** |
| mean luminance / contrast | 170.8 / 41.0 | 143.9 / 50.2 | 161.8 / 66.1 |

Palette landed close without argument: sky high `#acd9e2` against `#b7cfd8`, sky
low `#efe8d5` against `#f2ddbe` — notably *better* than the Pond's, whose amber
band ran hot at saturation 0.34. Water `#6595a0` → `#374143`, bluer than the
other two levels by design. No pure black. The high contrast (66.1) is the
strong sky-versus-sea split, which is what an ocean looks like.

**Horizon came in at 52.23% — 25px *high*, the opposite direction from the
Stream's misses.** Fitted the same way, mirrored: regrow 25px of sky at the top
by stretching the smooth upper band, drop 25px of water off the bottom. The
canvas stays **1584×672**, matching the Pond and Stream exactly, and both edits
are free — the top is a smooth gradient, and layer 2 repaints the water anyway.
Horizon now sits on **row 376, design y=201**, the same row as the other two
levels.


```
ART NEEDED: Ocean background, layer 2 of 3 — water
Prompt:             Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape, modelled with light rather than filled with flat
          color. Outlines are fine, delicate and varying in weight, the way a
          brush leaves them; never thick, uniform or inked. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          Just the surface of the open ocean on a bright calm day, seen from
          the side at eye level. Long low swells rolling horizontally, soft
          pale foam catching the light along their crests, and the glitter of
          reflected sky broken across the surface. The water must have a clear
          sense of depth — lighter and more broken where it catches the light
          nearest the top, deepening through a mid blue-teal to a much darker,
          cooler band toward the bottom of the canvas. Do not paint it as one
          flat tone; the deepening from top to bottom is the point of this
          layer. No horizon, no sky, no boat, no people, no land. The painted
          water fills the bottom of the canvas and stops in a straight
          horizontal line. It does not matter exactly where that line falls, so
          long as the water fills at least the bottom third. Everything above
          that line must be filled with flat, solid, uniform magenta (#FF00FF)
          — a plain backdrop color, one single unvarying color, not a
          checkerboard, not a gradient, not transparency. No magenta anywhere
          in the water itself. The image is 1584 by 672 pixels, aspect ratio
          2.36:1. Output as PNG.
Save as:  assets/background-ocean-water.png
Size:     1584×672. Delivered on flat magenta above the line; the alpha is a cut
          by row, then rescaled to sit under layer 1's horizon
Wired in: not yet — the middle plane, #bg-water for .loc-ocean
```

**✅ Landed 2026-09-01, first attempt.** **The strongest depth gradient of any
layer in the epic** — a surface-to-depth luminance drop of **131.8**, against the
Stream water's 112, the Pond water's 83 and the Ocean far layer's 74. Depth
`#2f5966` against a `#375c58` target; surface `#c5d6cd` is the light-catching
crest band the prompt asked for. Only **0.16%** of the water goes past the
`#33291f` floor.

Magenta: 6-row transition, pink gone by 3 rows below the cut, **zero** after it.
The waterline landed at 45.68% and did not matter — the clean 362-row band was
rescaled into the 296 rows below layer 1's horizon at row 376.

Verified: RGBA 1584×672, fully transparent above row 376, fully opaque below, no
magenta anywhere, composited against layer 1 at game scale before committing.


```
ART NEEDED: Ocean background, layer 3 of 3 — foreground detail
Prompt:             Soft painterly illustration in the style of Studio Ghibli background
          art, warm muted color palette, gentle diffused lighting, thin warm
          brown outlines rather than black, cozy and inviting mood, no harsh
          shadows, no neon or saturated colors. Painted by hand in soft gouache
          and watercolor, with visible brushwork and gentle tonal variation
          inside every shape, modelled with light rather than filled with flat
          color. Outlines are fine, delicate and varying in weight, the way a
          brush leaves them; never thick, uniform or inked. This must NOT look
          like flat vector art, a cartoon, or a clean digital illustration with
          even line weight.
          Foreground open-water detail, framing an empty center, on a calm
          day. Along the very bottom-left corner and the very bottom-right
          corner of the canvas: low drifting patches of pale sea foam and
          scattered bubbles lying flat on the water close to the viewer, and on
          one side only, the top of a small weathered wooden channel buoy
          sitting low in the water with a little seaweed and barnacle growth at
          its waterline. Everything here is low, flat and calm. There is NO
          breaking wave, NO curling crest, NO tall spray and NO whitewater —
          this is a quiet sea, not a rough one. These details hug the very
          bottom edge of the canvas and must all stay within the bottom quarter
          of the image, never rising into the middle of it. The entire center of the canvas, and the whole middle of the
          bottom edge, must be completely empty backdrop with nothing painted
          in it at all. Everything that is not one of those corner details must
          be filled with flat, solid, uniform magenta (#FF00FF) — a plain
          backdrop color, one single unvarying color, not a checkerboard, not a
          gradient, not transparency. No magenta, pink or purple anywhere in
          the foam or buoy. The image is 1584 by 672 pixels, aspect ratio
          2.36:1. Output as PNG.
Save as:  assets/background-ocean-fore.png
Size:     1584×672. Delivered on flat magenta; alpha keyed locally
Wired in: not yet — the near plane, #bg-fore for .loc-ocean. Nothing may land
          where the bottom-center finger-guide panel sits, and R5 puts a Boston
          Whaler with a stern fighting chair in this level — a bigger hull than
          the Pond's rowboat, so the empty center matters more here, not less
```

**⚠️ Attempt 1 (2026-09-01) — rerolled, and the prompt above is fixed.** It came
back as big curling Hokusai-style breakers with heavy spray. Two problems, one
of them fatal:

| | Pond fore | Stream fore | Ocean fore, attempt 1 |
|---|---|---|---|
| painted inside the **rig's box** | 0.2% | 1.6% | **42.9%** |
| painted in the bottom-center third | 0.0% | 6.5% | 1.8% ✅ |
| total coverage | 9.5% | 20.3% | 19.0% ✅ |

**42.9% of the rig's box was behind a wave** — and R5 puts a Boston Whaler
there, a bigger hull than the Pond's rowboat, so the real cost is worse than
that. The keep-out and the coverage were both fine; the problem was purely
*height*, with detail reaching 36.5% down where the waterline is at 55.95%.

Tonally it was wrong too: layers 1 and 2 are "a bright calm day" with long low
swells, and these were breakers. Different weather in the same scene, and
`ART_DIRECTION.md`'s mood is cozy, not perilous.

**The cause was the subject, not the adjectives** — see `GEMINI_NOTES.md`, *pick
foreground subjects that are naturally small*. "The near crest of a swell
**breaking**… **close to the viewer**" has no small version; a breaking wave is
big by definition. The Pond and Stream foregrounds worked because lily pads,
reeds, rocks and ferns are *inherently* low objects, so "hug the bottom edge"
agreed with the subject instead of fighting it. The rewrite swaps the breaking
crest for **flat drifting foam patches**, adds an explicit "NO breaking wave, NO
curling crest, NO tall spray", and caps the height at the bottom quarter.


**✅ Layer 3 landed 2026-09-01 on attempt 2 — the cleanest foreground of the
three levels.**

| | Pond fore | Stream fore | **Ocean fore** |
|---|---|---|---|
| painted in the rig's box | 0.2% | 1.6% | **0.0%** |
| painted in the bottom-center third | 0.0% | 6.5% | **0.0%** |
| total coverage | 9.5% | 20.3% | 6.6% |

Detail tops out at 66.7% / 76.2% down — entirely inside the bottom quarter the
rewritten prompt asked for, against attempt 1's 36.5% / 44.6%. Backdrop
`#d148b0` (softened again, as the Pond's was) but uniform at stdev ~1, so it
keyed cleanly: **0.00%** purple among visible pixels.

**Swapping the subject was the whole fix.** Same height instruction, same
framing language — only "the near crest of a swell breaking" became "low
drifting patches of pale sea foam". The buoy survived unchanged and is the nicest
object in any of the three foregrounds.

**R3 is closed.** All nine images are painted, keyed and wired; `.loc-ocean`'s
`center 11%` offset is deleted along with the Stream's `scale 1.246`, so **no
scene carries a framing patch any more** and every level works the same way.
Verified in Chromium across all three: correct images on all nine planes, no
failed asset requests, `#scene` carrying no background image, the CSS `.reeds`
hidden everywhere, and **every waterline landing on screen y=396 = design
y=198**.

### ✅ G1 — the angler, taken apart (landed 2026-08-25)

All three PNGs are in, salvaged and wired: `body-kid.png` (RGBA 560×864),
`hat-straw.png` (1131×617) and `rod-basic.png` (800×800). Offsets in
`CONFIG.rig.layers` were tuned in the browser against the old `kid.png` side by
side, so the composite reads at the same size and sits in the boat the same way.
The rod arrived on a **blue** checkerboard — GEMINI_NOTES.md's legacy recipe
detects the pair per file instead of assuming gray.

The original request, kept for the pattern the next sprite set follows:

### G1 — the angler, taken apart (3 PNGs, they land together)

`assets/kid.png` bakes hat + body + rod into one sprite, which is why hats have
been deferred since the boat shop and why every biome shows the same angler.
G1 splits it into three layers (`BUILD_PLAN_GRAPHICS.md`). The code is already
wired: `CONFIG.rig.layers` stacks a body, a hat and a rod inside `#rig`, and a
missing PNG renders as nothing (a `background-image` 404 is silent), so the
scene looks exactly as it does today until these arrive.

**Drop all three at once.** The body layer currently points at the old
all-in-one `kid.png`; if `hat-straw.png` lands alone the kid wears two hats.
When they're in, tell Claude — the layer offsets in `config.js` get tuned
against the real art (they're first guesses right now).

**Style reference for all three:** open `assets/kid.png`. Same chunky pixel
scale, same palette (straw tan hat with a darker band, teal-green shirt, warm
skin, brown wooden rod), same side-on view facing **right**. The angler renders
about 64x63 px on screen, so keep the detail readable at that size.

```
ART NEEDED: the angler's body, with no hat and no rod (G1)
Prompt:   Pixel art of a young child sitting side-on facing right in a fishing
          pose, cozy retro game asset, chunky clean pixels, warm dawn lake
          palette — teal-green long-sleeved shirt, warm tan skin, short brown
          hair, dark shoes, knees drawn up as if seated in a small boat. BOTH
          HANDS CLOSED IN A GRIP in front of the chest as if holding a fishing
          rod, but NO ROD DRAWN and NO HAT — bare head, hair visible, the hands
          gripping empty air. Single centered subject, transparent background,
          no text, no UI, no watermark, no baked-in shadow.
Save as:  assets/body-kid.png
Size:     ~64x63 proportions (roughly square), transparent, tight crop. The
          head must sit at the TOP of the sprite with a little clearance, so a
          separate hat layer can be placed over it.
Wired in: ✅ CONFIG.rig.layers — change the body layer's `file` from "kid" to
          "body-kid" and it's live.
```

```
ART NEEDED: the straw hat, as its own layer (G1)
Prompt:   Pixel art of a child's straw sun hat, cozy retro game asset, chunky
          clean pixels, side view facing right, wide floppy brim, straw-tan
          weave with a darker brown band around the crown, matching the hat in
          assets/kid.png. Hat alone — no head, no face, nothing under it.
          Single centered subject, transparent background, no text, no UI, no
          watermark, no baked-in shadow.
Save as:  assets/hat-straw.png
Size:     about 40x26 proportions (wider than tall), transparent, tight crop to
          the brim. Scale it to sit on a head roughly 26 px wide at the game's
          64x63 angler size.
Wired in: ✅ CONFIG.rig.layers, the hat layer. First of the swappable shop hats
          (G4).
```

```
ART NEEDED: the fishing rod, as its own layer (G1)
Prompt:   Pixel art of a simple wooden fishing rod, cozy retro game asset,
          chunky clean pixels, a slightly tapered brown branch-like pole with a
          darker grip wrap at the thick end, drawn on a DIAGONAL running from
          the lower-left (the grip) up to the upper-right (the thin tip),
          matching the rod in assets/kid.png. Rod alone — no hands, no line, no
          hook, no fish. Transparent background, no text, no UI, no watermark,
          no baked-in shadow.
Save as:  assets/rod-basic.png
Size:     ~52x52, transparent, tight crop, with the grip end at the very
          bottom-left corner and the tip at the very top-right corner of the
          canvas — the line is aimed at that tip, so a consistent diagonal
          matters more than the exact length.
Wired in: ✅ CONFIG.rig.layers, the rod layer. First of the swappable shop rods
          (G4), which also closes the rod-icon gap noted below.
```

**One instruction for every future body sprite** (G2's waders and fighting-chair
poses, G3's age/sex sets): draw the head at the **same anchor point** within the
canvas for a given pose. If every body in a pose puts its head in the same
place, one hat PNG fits all of them and G4 never needs per-character hat sizes.

### ❌ V2 — the angler and its gear, drawn to register (4 PNGs, Pond pose) — WITHDRAWN 2026-08-31

**Do not generate these.** The pieces were specified in the pixel style and for
a body/hat/rod split; `ART_DIRECTION.md` replaces both, and R4 of the refresh
re-requests the angler as head/torso/arm/rod in one costume per level. **The
method described here survives and is now a standing rule** — see *The
same-canvas rule* near the top of this file. That is why this section is kept.

**This replaces the G1 approach below, which didn't work.** G1 asked for a hat
and a rod as isolated sprites and then tried to line them up with offsets. At 4x
zoom it looked close; at game scale the hat sat on the hair like a sticker and
the fist closed on empty air with the rod crossing it. No offset fixes that.

**The new rule: every piece is generated FROM the body sprite, and comes back on
the same canvas, already in position.** In Gemini, attach the reference image
and ask for the piece for *that* character. Then all four layers share one box,
every offset is zero, and registration is the generator's job rather than mine.

The grip is solved by a sandwich rather than by alignment: the body has an
**open** curled hand, the rod paints over it, and a small **fingers** sprite
paints over the rod's grip. Fingers close over whatever is underneath, so any
rod looks held — which is what makes a rod shop possible at all.

Layer order: **vessel → body → rod → fingers → hat**.

Do these in order; #1 is the reference for the other three.

```
ART NEEDED: the Pond angler's body, open hand (V2 #1 — the reference)
Prompt:   Pixel art of a young child sitting side-on facing right in a fishing
          pose, cozy retro game asset, chunky clean pixels, warm dawn lake
          palette — teal-green long-sleeved shirt, warm tan skin, short brown
          hair, dark shoes, knees drawn up as if seated in a small boat. Bare
          head, no hat, no rod. The near arm reaches forward and the hand is
          held OPEN in a loose C-curl, palm facing the viewer, fingers apart —
          as if about to take hold of a rod, NOT clenched. Single centered
          subject, transparent background, no text, no watermark, no shadow.
Save as:  assets/body-kid-boat.png
Size:     roughly 2:3 portrait, transparent, tight crop. Whatever canvas this
          comes back on IS the canvas — the next three are drawn onto it.
```

```
ART NEEDED: the fingers that close over a rod grip (V2 #2)
Prompt:   [ATTACH assets/body-kid-boat.png AS A REFERENCE IMAGE]
          Using this character as reference: draw ONLY the fingers and thumb of
          this child's near hand, curled closed as if gripping a fishing rod —
          the same skin tone, the same chunky pixel scale, the same lighting.
          Output them on a transparent canvas THE SAME SIZE as the reference
          image, positioned exactly where that hand is, so the fingers overlay
          the reference hand perfectly. Nothing else in the image — no arm, no
          body, no rod, no background.
Save as:  assets/hand-kid-boat.png
Size:     same canvas as body-kid-boat.png, aligned. This is the top half of the
          grip: it paints over the rod so the hand looks closed around it.
```

```
ART NEEDED: the straw hat, drawn onto this character (V2 #3)
Prompt:   [ATTACH assets/body-kid-boat.png AS A REFERENCE IMAGE]
          Using this character as reference: draw a child's straw sun hat sized
          and angled to fit THIS head — wide floppy brim, straw-tan weave, a
          darker brown band around the crown, same chunky pixel scale and
          lighting as the reference. Output the hat alone on a transparent
          canvas THE SAME SIZE as the reference image, positioned exactly where
          it would sit on that head, so it lands correctly when layered over the
          reference. Nothing else in the image — no head, no face, no body.
Save as:  assets/hat-straw.png   (replaces the current one)
Size:     same canvas as body-kid-boat.png, aligned.
```

```
ART NEEDED: the basic rod, drawn into this character's hand (V2 #4)
Prompt:   [ATTACH assets/body-kid-boat.png AS A REFERENCE IMAGE]
          Using this character as reference: draw a simple wooden fishing rod —
          a tapered brown pole with a darker grip wrap at the thick end — angled
          up and to the right the way this child would hold it, with the GRIP END
          sitting inside that open hand and the thin tip extending up past the
          head to the upper right. Same chunky pixel scale and lighting as the
          reference. Output the rod alone on a transparent canvas THE SAME SIZE
          as the reference image, positioned exactly where it would be when held,
          so it lands correctly when layered over the reference. Nothing else in
          the image — no hand, no body, no line, no hook.
Save as:  assets/rod-basic.png   (replaces the current one)
Size:     same canvas as body-kid-boat.png, aligned.
```

**When all four land**, Claude composites them locally before wiring anything and
looks at the stack at game scale. If a piece is out of place that's a **reroll,
not an offset tweak** — nudging offsets is exactly how G1 ended up janky. The
same four prompts then repeat for the Stream (waders, standing) and Ocean
(fighting chair) poses in V3, and each new shop hat or rod is one more
reference-drawn PNG per pose.

### ✅ The social preview card, re-lettered (landed 2026-08-31)

The GitHub link card had **"TYPING FISHING"** painted into the art, so after the
rename it advertised a name that existed nowhere else in the project. It is now
`HOOK, LINE` / `AND SENTENCE` over the same scene.

**This one was not generated — it was re-lettered in Pillow, and that was the
right call.** The scene was fine; only the text was wrong. Asking Gemini to
re-shoot it means asking for 23 characters of exact title plus a 30-character
subtitle, and spelling is the one thing image models reliably get wrong — the
old card got away with 14 characters on one line. Compositing is exact by
construction and re-runnable in seconds if the wording ever changes.

The recipe, should the name or tagline ever move again:

1. **Repaint the text area per row.** The title sits on open water, which is a
   smooth *vertical* gradient — so for each row take the median colour of the
   non-text pixels in `x 250..600` and flood that row across the repair rect.
   The seam is invisible; a single flat fill for the whole block is not.
2. **Know what you must not paint over.** The safe rect is `x 60..600,
   y 412..576`: the boat ends at y≈390, the key-cap panel starts at x≈790, and
   the fishing line only enters that x-range below y≈445. Verify with a
   bright-pixel scan before filling, not by eye.
3. **Set the type in real Silkscreen** — the same face as the game's `<h1>`,
   fetched from the Google Fonts CDN. Render it *small* and upscale
   `Image.NEAREST` (4× for the title, 2× for the subtitle) so the glyphs stay
   chunky instead of anti-aliased.
4. **Mind the comma.** At the first spacing tried, line one's comma in
   "HOOK," landed directly above the E of "SENTENCE" and read as **SÉNTENCE**.
   That is a property of this wording, not of the tool — a Gemini reroll would
   hit it too. A wider line gap (title lines at y=418 and y=492) fixes it.

Title colour `#F2EDE4`, subtitle gold `#F0C060`, both sampled from the original
card. The script is scratchpad-only, like the transparency salvage script above.

**Still needs a human:** GitHub's social preview is *not* served from the repo
tree, so committing the PNG is only half the job — upload it at
**Settings → General → Social preview**.

### ❌ The Stream scene, re-shot — WITHDRAWN 2026-08-31 (folded into R3)

**Do not generate this.** R3 repaints all three levels in the new direction, as
three layers each, so a re-shot pixel-era Stream would be thrown away on
arrival. **The framing lesson below is the part that matters and carries into
every R3 prompt**: a side view with a flat waterline at ~55% (design y=198), and
`.loc-stream`'s scale-1.246x workaround gets deleted when the new art lands
rather than re-tuned.

`assets/background-stream.png` is in and wired, but it came back as a forest
pool seen from **above**, with its water in a low diagonal band, rather than the
side view with a flat waterline at ~55% the prompt asked for. Under `cover` the
boat floated ~100px above the water; dropping the boat to meet the water buried
the whole rig behind the finger-guide panel. The scene is currently held
together by scaling the art up 1.246x and offsetting it (`#scene.loc-stream` in
style.css) so the near bank lands on y=198 — playable and pretty, but it costs
the sky and runs the art chunkier than the other two biomes.

The ocean prompt produced exactly the right composition, so this one borrows its
framing language. When this PNG lands, `.loc-stream` goes back to plain `cover`
and the offset comment comes out.

```
ART NEEDED: the Stream fishing scene, re-shot as a side view
Prompt:   Pixel art SIDE VIEW of a cozy forest stream for a fishing game, seen
          straight on from the opposite bank — eye level at the water, NOT from
          above, the way you'd see a lake from a boat sitting in it. Chunky
          clean pixels, warm dawn palette but cooler and greener than the pond:
          teal-to-emerald water filling the whole bottom half of the frame in
          flat horizontal bands, a far bank of mossy rocks and ferns meeting the
          water in a straight horizontal line across the middle, pines and muted
          purple hills behind it, warm sky with soft gold light above. The water
          must be OPEN and unobstructed from the left edge to the right edge —
          no sandbars, no rocks breaking the surface, no near bank in the
          foreground. No text, no UI, no characters, no boat, no fish, no
          watermark, no baked-in shadow. Landscape scene, fills the frame.
Save as:  assets/background-stream.png  (replaces the current one)
Size:     ~1400x600 (roughly 2.4:1, matching background.png and
          background-ocean.png). THE ONE THING THAT MATTERS: the waterline —
          where the far bank meets the water — must be a flat horizontal line at
          55% of the image height, with open water everywhere below it. That's
          the line the boat, bobber and fish coordinates are all built on.
Wired in: ✅ YES — `#scene.loc-stream` already points at this filename. Tell
          Claude when it lands and the framing workaround comes out with it.
```

Stream **fish need no art** — they reuse the shared per-tier sprites tinted by
each species' `color`.

### ✅ A6/A8 — the Ocean biome + the Muskie hero sprite (landed 2026-08-25)

Both PNGs are in and wired. Two things worth knowing for the next scene and the
next sprite:

**`assets/background-ocean.png`** came back 1408×768 (1.83:1) rather than the
~2.4:1 the spec asked for, so `cover` crops its top and bottom instead of its
sides, and its horizon (51.3% down the source) would have landed at y≈185 in the
720×360 scene. The pond's waterline lands at y≈198, which is what the boat,
bobber and fish coordinates assume. Fixed in the `.loc-ocean` rule with
`background-position: center 11%` rather than a reroll — the shipped stream
background lands at y≈210 and reads fine, so **±13px of waterline drift is
inside tolerance**. Reach for a `background-position` nudge before asking Matt
to regenerate.

**`assets/fish-muskie.png`** arrived as the fake-transparency case (GEMINI_NOTES.md) (RGB,
1264×848, checkerboard baked in as opaque gray) and was salvaged to RGBA
1128×391, tight-cropped, sparkles intact. Two deviations from the prompt, both
kept: it's **lavender** (matching `muskie.color` `#d4c5f0`) rather than the
olive-and-bronze the prompt described, and it **faces left** like every other
fish sprite — the prompt's "facing right" was wrong, since `lineToFish()` aims
at the mouth on the sprite's left edge. It's also long (2.9:1 against the shared
sprites' 1.5:1), so its rule widens `#fish` to 96px or the hero would render
*shorter* than a common fish.


### ✅ Family easter egg — the dino-nugget junk item (landed 2026-08-25)

`assets/junk-nugget.png` is in and wired: `CONFIG.junk.items` gained
`{ id: "nugget", name: "a dinosaur chicken nugget", file: "junk-nugget" }`, so
it rolls alongside the boot/can/weed, and `PUNS.junk` gained a dino-mite line.

Arrived as the fake-transparency case (GEMINI_NOTES.md) in its **black-checkerboard**
variant (RGB 1024×1024, squares at 0 and 145). Salvaged on `chroma<=26` with no
brightness gate — safe here because the nugget is all tan, brown, teal and
ketchup-red, with no neutral pixel of its own. Final: RGBA 696×574, which sits
right next to `junk-boot.png` in the 62×41 `#fish` box.

**Optional / not yet wired — deep-sea + fly rod shop icons.** The advanced plan
lists rod icons, but the shop doesn't render rod art today (rods have no `file`
field the way boats do). If we want them, they'd be small transparent sprites
(`assets/rod-fly.png`, `assets/rod-deepsea.png`, ~64×64) and would need a small
shop-UI change to show them — worth doing as its own step, not blocking A6. Say
the word and I'll spec them properly.
