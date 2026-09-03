#!/usr/bin/env python3
"""Put an R7 gear delivery back into the pose's own coordinates, for cut-angler.

An ART PIPELINE tool, not part of the game. Nothing loads it at runtime and it
is not a build step.

    python3 tools/gear-register.py <pose> <download.jpg>   # writes assets/reg-<name>.png

This is the inverse of `gear-ref.py`, and the pair is the whole round trip:

    gear-ref.py       angler-<pose>.png  ->  ref-angler-<pose>.png   (attach this)
    <the generator>   ref-angler-<pose>.png  ->  the download
    gear-register.py  the download  ->  reg-<name>.png               (cut this)

Two things have to be undone, and skipping either looks like the generator
missing the axis when it did not:

1. **Scale and offset.** The generator ignores the canvas size every single
   time — the first rod came back 992x1079 against the 1387x1510 asked — so the
   return has to be fitted back onto the reference before any pose number means
   anything. The fit is `cut-gear.py`'s, and for the same reasons: maximise
   silhouette agreement OUTSIDE the region that legitimately changed, and pivot
   the search about the two centroids so scale and offset do not trade off. The
   excluded region here is the rod corridor rather than a hat box, which leaves
   the child's whole body, the waders and the net in the objective.

2. **The pad.** `assets/angler-<pose>.png` is cut-angler.py's own output, on a
   canvas padded upward to hold the synthesised rod tip, and `gear-ref.py`
   builds the attachment from it. So the return is in padded coordinates while
   every number in `poses.py` is in the raw delivery's. `POSES[pose]["pad"]`
   reconciles them, and cropping it off also restores what cut-angler.py's
   `t_edge` assumes: that the shaft runs off the top of the frame. That is why a
   delivery whose tip overshoots the reference's costs nothing.

The output is opaque on flat magenta, which is what cut-angler.py expects and
what its own guard insists on.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from poses import POSES, TOL

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_OUT = (255, 0, 255)

if len(sys.argv) < 3:
    sys.exit("usage: gear-register.py <pose> <download.jpg> [out.png]\n"
             "  poses: " + ", ".join(sorted(POSES)))
pose_name, SRC = sys.argv[1], sys.argv[2]
P = POSES[pose_name]
M, B = P["axis"]
PAD = P["pad"]
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
    ROOT, "assets", "reg-" + os.path.splitext(os.path.basename(SRC))[0]
    .replace("Gemini_", "") + ".png")

# --- the reference, rebuilt here rather than read ------------------------------
# ref-angler-<pose>.png is gitignored, so deriving it again costs one composite
# and removes a file this tool would otherwise depend on existing.
art = Image.open(os.path.join(ROOT, "assets", "angler-%s.png" % pose_name)).convert("RGBA")
ref_img = Image.alpha_composite(Image.new("RGBA", art.size, KEY_OUT + (255,)), art).convert("RGB")
R = np.asarray(ref_img, dtype=float)
H, W = R.shape[:2]
mr = np.sqrt(((R - np.array(KEY_OUT, float)) ** 2).sum(axis=2)) > TOL

src = Image.open(SRC).convert("RGB")
S = np.asarray(src, dtype=float)
border = np.concatenate([S[0:3].reshape(-1, 3), S[-3:].reshape(-1, 3),
                         S[:, 0:3].reshape(-1, 3), S[:, -3:].reshape(-1, 3)])
KEY = np.median(border, axis=0)
ms = np.sqrt(((S - KEY) ** 2).sum(axis=2)) > TOL
print("delivered %dx%d (the pose's canvas is %dx%d), key %s, border stdev %s"
      % (src.width, src.height, W, H, KEY.astype(int), border.std(axis=0).round(1)))


def I(m):
    return Image.fromarray((m * 255).astype(np.uint8))


# --- the reroll check, before anything that costs work -------------------------
deep = np.asarray(I(ms).filter(ImageFilter.MinFilter(17))) > 128
bled = int(((np.sqrt(((S - KEY) ** 2).sum(axis=2)) <= TOL) & deep).sum())
print("backdrop bled into the subject: %d px deeper than 8px in%s"
      % (bled, "" if bled == 0 else "  <-- REROLL, per ART.md's delivery checks"))

# --- 1. fit, with the rod corridor out of the objective ------------------------
Y, X = np.mgrid[0:H, 0:W]
Bp = B + (-M) * PAD
perp = np.abs(X - M * Y - Bp) / np.sqrt(1 + M * M)
corridor = (perp <= P["half"] * 3) & (Y <= P["butt"] + PAD)
if P["reel"]:
    rx, ry, rr = P["reel"]
    corridor |= np.hypot(X - rx, Y - (ry + PAD)) <= rr * 1.8
outside = ~corridor
ref_out = mr & outside

cs = np.array([np.where(ms)[1].mean(), np.where(ms)[0].mean()])
cr = np.array([np.where(mr)[1].mean(), np.where(mr)[0].mean()])


def affine(sx, sy, tx, ty):
    return (1 / sx, 0, cs[0] - (cr[0] + tx) / sx,
            0, 1 / sy, cs[1] - (cr[1] + ty) / sy)


def warp(m, a, res=Image.BILINEAR):
    return np.asarray(I(m).transform((W, H), Image.AFFINE, a, res, fillcolor=0)) > 128


def agree(sx, sy, tx, ty):
    w = warp(ms, affine(sx, sy, tx, ty)) & outside
    return (w & ref_out).sum() / max((w | ref_out).sum(), 1)


sx, sy, tx, ty = W / src.width, H / src.height, 0.0, 0.0
step = [0.03 * sx, 0.03 * sy, 24.0, 24.0]
best = agree(sx, sy, tx, ty)
for _ in range(8):
    for i in range(4):
        while True:
            moved = False
            for d in (+1, -1):
                cand = [sx, sy, tx, ty]
                cand[i] += d * step[i]
                v = agree(*cand)
                if v > best + 1e-5:
                    best, (sx, sy, tx, ty), moved = v, cand, True
                    break
            if not moved:
                break
    step = [v / 2 for v in step]

aff = affine(sx, sy, tx, ty)
D = np.asarray(src.transform((W, H), Image.AFFINE, aff, Image.BICUBIC,
                             fillcolor=tuple(KEY.astype(int))), dtype=float)
md = warp(ms, aff, Image.BICUBIC)
print("fit: scale (%.4f, %.4f) offset (%.1f, %.1f); agreement off the rod %.4f, "
      "whole-figure IoU %.4f" % (sx, sy, tx, ty, best, (md & mr).sum() / (md | mr).sum()))

both = md & mr & outside
dist = np.sqrt(((D - R) ** 2).sum(axis=2))
print("the pose, off the rod: median colour distance %.1f, %.1f%% differs by >40 "
      "(a redraw shows here); %d px the reference has and the return does not"
      % (np.median(dist[both]), 100 * (dist[both] > 40).mean(), (mr & ~md & outside).sum()))

# --- 2. the rod, against the corridor it has to be cut with --------------------
shaft = md & (Y < P["hand"][0] + PAD) & (perp <= P["half"] * 3)
if shaft.sum() > 200:
    ys, xs = np.where(shaft)
    on = (np.abs(xs - (M * ys + Bp)) / np.sqrt(1 + M * M)) <= P["half"]
    offs = [(mm := np.median(xs[np.abs(ys - y) < 12] - (M * y + Bp))) for y in
            np.linspace(ys.min() + 20, P["hand"][0] + PAD - 20, 5)
            if (np.abs(ys - y) < 12).sum() > 5]
    print("the rod: %.1f%% of the shaft above the hand is inside the pose's half-width; "
          "centreline off by %.1f to %.1f px"
          % (100 * on.mean(), min(offs, key=abs), max(offs, key=abs)))

# --- 3. drop the pad, and write it on flat magenta ----------------------------
out = D.copy()
out[~md] = KEY_OUT
out = out[PAD:]
Image.fromarray(out.astype(np.uint8)).save(OUT)
print("\n  %s  %dx%d  <- cut this one, not the download"
      % (os.path.relpath(OUT, ROOT), out.shape[1], out.shape[0]))
print("  python3 tools/cut-angler.py %s %s --rod <stem>"
      % (pose_name, os.path.relpath(OUT, ROOT)))
