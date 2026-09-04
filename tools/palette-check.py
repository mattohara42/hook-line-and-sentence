#!/usr/bin/env python3
"""Judge a delivery's darks against the art direction — the check ART.md used to
state wrongly.

An ART PIPELINE tool, not part of the game. Nothing loads it at runtime.

    python3 tools/palette-check.py assets/rod-deepsea-pond.png [more.png ...]
    python3 tools/palette-check.py --corpus       # the control: every piece the game loads

WHY THIS EXISTS, AND WHAT IT REPLACES

ART.md's delivery checklist said "Palette: no pure black, nothing darker than
`#33291f`" and `GEMINI_NOTES.md` said the same. Both are binary, and measured
against the 109 pieces the game actually loads, **both are false**:

    "no pure black"                 rejects  25 of 109  (23%)
    "nothing darker than #33291f"   rejects  76 of 109  (70%)

Every rod in the game fails the first, R4's own painted deepsea included, and
`rod-bamboo-ocean` carries 3,136 pure-black pixels. They are anti-aliased
outline and JPEG ringing — paint nobody chose — and rejecting a delivery for
them would have cost real generations. The rule `ART_DIRECTION.md` actually
cares about is that **nothing reads as black**: no black linework, no black
shadow. A handful of black pixels on an outline is neither.

WHAT SEPARATES THEM, MEASURED RATHER THAN GUESSED

A chosen black REGION survives erosion; an outline does not. Eroding the
subject by 3px and then asking how much pure black is left splits the two
populations with no overlap at all:

    what the game loads today (n=109)   0.000%  median,  0.820%  worst
    pixel-era art, which really did
    use black linework       (n=11)    14.394%  mildest, 23.152% worst

That is a 17x gap, so the gate sits at **2%** — 2.4x above the worst piece the
game ships and 7x below the mildest piece that genuinely fails. The worst
survivor is `fish-anchovy-body`, and drawing its flagged pixels shows exactly
what you would want to survive: the pupil, and the fine linework on the gill
cover and fin rays.

WHAT IS REPORTED BUT NOT GATED, AND WHY

- **Raw pure-black count.** 23% of shipped pieces have some. Informational.
- **Share below umber (`#33291f`).** 70% of shipped pieces have some, up to 7%
  of the interior. A painting has gradients; umber is the darkest tone anyone
  *picks*, not a floor the generator respects. Informational.
- **Whether those darks read warm.** They do everywhere it matters: of 109
  pieces only four have cool sub-umber paint, and all four should —
  `background-ocean-water` (R-B -44), `background-stream-water` (-39) and the
  two silver schooling fish, `fish-mackerel-body` (-10) and `fish-herring-body`
  (-7). So a cool reading is a "go and look", never a rejection: deep water and
  a silver fish are supposed to be cool.

The gate is one number. Everything else on this printout is context, and the
habit this repo keeps is to run `--corpus` first so a delivery's figures have
something to be judged against.
"""
import sys, os, glob
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UMBER = np.array([0x33, 0x29, 0x1f], dtype=float)
UMBER_L = UMBER.mean()          # 41.0 — the darkest tone ART_DIRECTION.md names
BLACK_L = 8.0                   # "reads as black" rather than "is exactly (0,0,0)"
ERODE = 3                       # kills an outline and its anti-aliasing, keeps a region
GATE = 2.0                      # % of the eroded interior; see the docstring


def measure(path):
    a = np.asarray(Image.open(path).convert("RGBA"), dtype=float)
    rgb, alpha = a[..., :3], a[..., 3]
    solid = alpha > 250
    if solid.sum() < 500:
        return None
    lum = rgb.mean(axis=2)
    black = lum < BLACK_L
    inner = ndimage.binary_erosion(solid, np.ones((ERODE * 2 + 1,) * 2))
    # a piece thinner than the erosion is all outline; judge it whole rather
    # than reporting on an empty mask
    thin = inner.sum() < 100
    if thin:
        inner = solid
    sub = inner & (lum < UMBER_L)
    rb = float((rgb[sub][:, 0] - rgb[sub][:, 2]).mean()) if sub.sum() else float("nan")
    return dict(px=int(solid.sum()), thin=thin,
                black=int((solid & black).sum()),
                inner_black=100.0 * (inner & black).sum() / inner.sum(),
                sub=100.0 * sub.sum() / inner.sum(), rb=rb)


def game_art():
    """Every piece the game can draw — read from config.js rather than a glob, so
    a new registry line is covered the day it lands."""
    import json, re, subprocess
    js = """import('%s/config.js').then(m => { const C = m.CONFIG, f = new Set();
      for (const p of Object.values(C.rig.poses)) {
        for (const L of p.layers) if (L.file) f.add(L.file);
        if (p.vessel) { f.add(p.vessel.far); f.add(p.vessel.near); } }
      for (const e of C.rig.gearArt) f.add(e);
      for (const s of Object.values(C.fish.species)) for (const L of s.layers) f.add(L.file);
      console.log(JSON.stringify([...f].filter(Boolean))); });""" % ROOT
    stems = json.loads(subprocess.run(["node", "-e", js], capture_output=True,
                                      text=True, cwd=ROOT).stdout)
    files = [os.path.join(ROOT, "assets", s + ".png") for s in stems]
    files += sorted(glob.glob(os.path.join(ROOT, "assets", "background-*-*.png")))
    return [f for f in files if os.path.exists(f)]


def line(path, m):
    verdict = "READS AS BLACK" if m["inner_black"] >= GATE else "ok"
    warm = "" if not (m["rb"] < 0) else "   <- cool darks, go and look"
    print("  %-28s %-14s eroded black %6.3f%%  (raw %5d px)  below umber %5.2f%%  R-B %+5.0f%s%s"
          % (os.path.basename(path), verdict, m["inner_black"], m["black"], m["sub"],
             m["rb"], "  [thin piece: judged whole]" if m["thin"] else "", warm))


argv = sys.argv[1:]
if not argv:
    sys.exit(__doc__.strip().split("\n\n")[2])

if argv[0] == "--corpus":
    rows = [(f, measure(f)) for f in game_art()]
    rows = [(f, m) for f, m in rows if m]
    v = sorted(m["inner_black"] for _, m in rows)
    print("the control — %d pieces the game loads:" % len(rows))
    print("  eroded pure-black share   min %.3f%%  median %.3f%%  worst %.3f%%   (gate is %.1f%%)"
          % (v[0], v[len(v) // 2], v[-1], GATE))
    print("  pieces carrying any (0,0,0) at all: %d of %d — which is why that is not the rule"
          % (sum(1 for _, m in rows if m["black"]), len(rows)))
    print("  pieces carrying paint below umber:  %d of %d — nor is that"
          % (sum(1 for _, m in rows if m["sub"] > 0), len(rows)))
    worst = sorted(rows, key=lambda r: -r[1]["inner_black"])[:3]
    print("  worst three:")
    for f, m in worst:
        line(f, m)
    sys.exit(0)

fails = 0
for path in argv:
    m = measure(path)
    if not m:
        print("  %-28s too little solid paint to judge" % os.path.basename(path))
        continue
    line(path, m)
    fails += m["inner_black"] >= GATE
print("\n%d of %d over the %.1f%% gate. Run --corpus for the control before reading much"
      " into a number." % (fails, len(argv), GATE))
sys.exit(1 if fails else 0)
