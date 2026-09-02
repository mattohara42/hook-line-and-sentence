#!/usr/bin/env python3
"""Cut one piece of R7 gear out of a delivered edit of a pose (R7).

This is an ART PIPELINE tool, not part of the game. Nothing loads it at runtime
and it is not a build step.

    python3 tools/cut-gear.py <pose> <stem> <delivered.jpg|png>
    python3 tools/cut-gear.py pond hat-straw assets/Gemini_hat-straw-pond.png

Writes assets/<stem>-<pose>.png. Add that stem to CONFIG.rig.gearArt afterwards
or the game will never draw it (GEMINI_NOTES.md's delivery checklist, step 7).

Gear is asked for as an EDIT of the pose it belongs to: the pose's own painting
goes up as the reference and comes back with one thing added or swapped
(ART.md, the R7 section). So the piece is not keyed out of a fresh canvas, it is
the part of the returned painting that DIFFERS from the reference, which is what
this tool finds.

Three things it has to get right, and each is measured rather than assumed:

  1. REGISTRATION. The generator returns its own canvas size (1008x1056 against
     the 1344x1391 asked, on the first delivery) and the two aspects do not
     match exactly, so a single scale cannot fit both axes. The fit is therefore
     per-axis, taken from the LOWER 45% of the figure: no hat can reach there,
     and a rod swap does not move the boots. If the fitted silhouettes then
     disagree by more than a fringe, the figure was redrawn rather than edited
     and the delivery is a reroll.
  2. THE PIECE ITSELF. Everything that changed by more than THRESH, plus
     everything the delivery paints where the reference had backdrop. That mask
     arrives in two parts on a hat, because a pale hatband over pale hair leaves
     a thin seam of unchanged pixels across the crown, so the mask is closed and
     its enclosed holes filled before the largest component is taken. Without
     the fill the crown and the brim are two components and the brim is lost.
  3. THE CANVAS. Every gear piece for a pose is written at the FULL canvas of
     that pose's painting, not cropped to its own content. A pose's layer box
     lives on the pose (CONFIG.rig.poses.<pose>.layers), so every hat that will
     ever be drawn for it has to share one box, and a straw brim reaches 47px
     further left than the angler's own crop. The canvas is the box they can all
     share, and it costs nothing: transparent PNG rows compress away.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Per pose, measured off its own cut rather than shared. `crop` and `design` are
# what tools/cut-angler.py produced for it: where the layer crop sits inside
# assets/angler-<pose>.png, and the box CONFIG.rig.poses.<pose>.layers carries
# for it. Everything else here is derived from those two.
#
#   neck  rows below this cannot be part of a hat (canvas px)
#   face  the eye, nose and mouth, which belong to the body layer: a piece that
#         covers them cannot be fixed downstream and is a reroll
POSES = {
    "pond":   dict(crop=(115, 8, 1222, 1331), design=(39, -44, 70,  76),
                   neck=800, face=(400, 625, 570, 790)),
    "stream": dict(crop=(331, 8, 1048, 1466), design=(38, -70, 88, 123),
                   neck=810, face=(470, 650, 610, 800)),
    "ocean":  dict(crop=(81,  7, 1237, 1419), design=(38, -48, 71,  82),
                   neck=820, face=(300, 650, 410, 800)),
}
THRESH = 45

pose_name, stem, src_path = sys.argv[1], sys.argv[2], sys.argv[3]
P = POSES[pose_name]
CX, CY, CW, CH = P["crop"]
DX, DY, DW_, DH = P["design"]
# The scale that produced this pose's own box. CONFIG carries it rounded to
# whole design px, so the two axes disagree in the 4th decimal (70/1222 against
# 76/1331); the mean is within 0.2 design px of either across the whole canvas.
# It has to be ONE number rather than two: .rig-layer is `background: contain`,
# so a box whose aspect differs from the image's letterboxes it and shifts the
# piece by the difference.
sd = (DW_ / CW + DH / CH) / 2

ref_rgba = np.asarray(Image.open(os.path.join(ROOT, "assets", "angler-%s.png" % pose_name))
                      .convert("RGBA"), dtype=float)
H, W = ref_rgba.shape[:2]
mr = ref_rgba[..., 3] > 16

src = Image.open(src_path).convert("RGB")
S = np.asarray(src, dtype=float)
border = np.concatenate([S[0:3].reshape(-1, 3), S[-3:].reshape(-1, 3),
                         S[:, 0:3].reshape(-1, 3), S[:, -3:].reshape(-1, 3)])
KEY = np.median(border, axis=0)
ms = np.sqrt(((S - KEY) ** 2).sum(axis=2)) > 90
print("delivered %dx%d (asked %dx%d), key %s, border stdev %s"
      % (src.width, src.height, W, H, KEY.astype(int), border.std(axis=0).round(1)))

# --- 1. register the delivery onto the pose's canvas ---------------------------
def bbox(m):
    ys, xs = np.where(m)
    return xs.min(), xs.max(), ys.min(), ys.max()

def lower(m):
    x0, x1, y0, y1 = bbox(m)
    mm = m.copy(); mm[:y0 + int(0.55 * (y1 - y0))] = False
    return bbox(mm)

ls, lr = lower(ms), lower(mr)
sx = (lr[1] - lr[0]) / (ls[1] - ls[0])
sy = (lr[3] - lr[2]) / (ls[3] - ls[2])
tx, ty = lr[0] - ls[0] * sx, lr[2] - ls[2] * sy
aff = (1 / sx, 0, -tx / sx, 0, 1 / sy, -ty / sy)
D = np.asarray(src.transform((W, H), Image.AFFINE, aff, Image.BICUBIC,
                             fillcolor=tuple(KEY.astype(int))), dtype=float)
md = np.asarray(Image.fromarray((ms * 255).astype(np.uint8))
                .transform((W, H), Image.AFFINE, aff, Image.BICUBIC, fillcolor=0)) > 128
iou = (md & mr).sum() / (md | mr).sum()
print("fit: scale (%.4f, %.4f) offset (%.1f, %.1f) -> silhouette IoU %.4f, "
      "%d px the reference has and the delivery does not" % (sx, sy, tx, ty, iou, (mr & ~md).sum()))

# The reference is keyed, so its backdrop is alpha over black. Flatten it back
# onto the delivery's own key colour first, or every backdrop pixel reads as a
# change and the piece swallows the whole canvas.
a3 = (ref_rgba[..., 3:4] / 255.0)
ref_rgb = ref_rgba[..., :3] * a3 + KEY * (1 - a3)
dist = np.sqrt(((D - ref_rgb) ** 2).sum(axis=2))
below = (md & mr); below[:P["neck"]] = False
print("the pose below the neck: median colour distance %.1f, %.1f%% differs by >40 "
      "(a redraw shows here)" % (np.median(dist[below]), 100 * (dist[below] > 40).mean()))

# --- 2. the piece: what changed -----------------------------------------------
def I(m): return Image.fromarray((m * 255).astype(np.uint8))
def A(i): return np.asarray(i) > 128
def dilate(m, k): return A(I(m).filter(ImageFilter.MaxFilter(k)))
def erode(m, k): return A(I(m).filter(ImageFilter.MinFilter(k)))

def flood(m):
    """every pixel of ~m reachable from the border, so m | the rest fills holes"""
    out, seen, q = ~m, np.zeros_like(m), deque()
    for x in range(m.shape[1]):
        for y in (0, m.shape[0] - 1):
            if out[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(m.shape[0]):
        for x in (0, m.shape[1] - 1):
            if out[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
            if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and out[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return m | (out & ~seen)

def largest(m):
    lab, cur, sizes = np.zeros(m.shape, np.int32), 0, {}
    for sy_ in range(m.shape[0]):
        for sx_ in np.where(m[sy_])[0]:
            if lab[sy_, sx_]: continue
            cur += 1; n = 0; q = deque([(sy_, sx_)]); lab[sy_, sx_] = cur
            while q:
                y, x = q.popleft(); n += 1
                for ny, nx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                    if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur; q.append((ny, nx))
            sizes[cur] = n
    order = sorted(sizes.values(), reverse=True)
    print("changed components: %s%s" % (order[:4], " ..." if len(order) > 4 else ""))
    return lab == max(sizes, key=sizes.get)

window = np.zeros((H, W), bool); window[:P["neck"]] = True
changed = ((dist > THRESH) | (md & ~mr)) & window
closed = flood(erode(dilate(changed, 11), 11))
piece = flood(dilate(largest(erode(closed, 7)), 9) & closed)

fx0, fy0, fx1, fy1 = P["face"]
face = np.zeros((H, W), bool); face[fy0:fy1, fx0:fx1] = True
overlap = (piece & face).sum()
x0, x1, y0, y1 = bbox(piece)
print("piece: %d px, bbox x[%d,%d] y[%d,%d]; it covers %d px of the face box"
      % (piece.sum(), x0, x1, y0, y1, overlap))

# --- 3. alpha, and the write ---------------------------------------------------
# outside the pose's own silhouette the piece sits on backdrop, so its edge is
# ramped and unpremultiplied the way every other cut in this project does it.
# Inside the silhouette it covers paint that the body layer still carries under
# it, so there is nothing to unmix and the edge is hard on purpose.
# The edge of a brim against the backdrop is the case GEMINI_NOTES.md says the
# distance ramp gets wrong: a JPEG's ringing around a saturated key is not a
# linear mix, and the ramp calls a half-magenta pixel 0.9 opaque and leaves a
# pink rim all round the hat. Read alpha from how much KEY the pixel carries
# instead, which is what cut-vessel.py and cut-fish.py both ended up doing.
# Magenta is the one colour here whose green falls below both red and blue, so
# straw, skin, cloth and warm brown outlines all clip to fully opaque.
gap = np.minimum(D[..., 0], D[..., 2]) - D[..., 1]
gap_key = min(KEY[0], KEY[2]) - KEY[1]
# Unmix EVERYWHERE, including where the piece covers the pose. Forcing alpha to
# 1 inside the pose's own silhouette looks safe (the body layer carries what is
# under the hat) but it paints backdrop wherever the delivery removed content:
# a brim pushes the hair silhouette in, and along that seam the delivery is
# backdrop where the reference was hair. It cost a violet blotch at the temple.
# Unmix has no such case, and it clips to 1 on every warm or neutral colour in
# this palette, greys included.
alpha = np.clip(1.0 - gap / gap_key, 0.0, 1.0) * piece
t = np.clip(alpha, 1e-3, 1.0)[..., None]
fg = np.clip((D - (1.0 - t) * KEY) / t, 0, 255)
# Whatever key survives unmixing is an EDGE phenomenon (GEMINI_NOTES.md: residue
# hugs edges, 0-8px), so despill only the outer rim rather than deriving a
# palette rule per item. A rule tuned for straw would warm the carbon rod's grey
# blank, and the rim is where all of it lives anyway.
rim = piece & ~erode(piece, 13) & ~mr
spill = rim & (fg[..., 2] > fg[..., 1] + 6)
fg[..., 2] = np.where(spill, np.minimum(fg[..., 2], fg[..., 1]), fg[..., 2])
fg[..., 0] = np.where(spill & (fg[..., 0] > fg[..., 1] * 1.9), fg[..., 1] * 1.9, fg[..., 0])
print("despilled %d rim px of %d" % (spill.sum(), rim.sum()))
out = np.dstack([fg, alpha * 255]).astype(np.uint8)
out[alpha <= 0] = 0

path = os.path.join(ROOT, "assets", "%s-%s.png" % (stem, pose_name))
Image.fromarray(out, "RGBA").save(path, optimize=True)
sub = fg[alpha > 0.5]
print("palette: %d pure-black px, %.3f%% darker than umber%s"
      % ((sub.max(axis=1) < 8).sum(),
         100 * (sub.sum(axis=1) < 0x33 + 0x29 + 0x1f).mean(),
         "" if not (sub.sum(axis=1) < 0x33 + 0x29 + 0x1f).any()
         else " (mean %s)" % sub[sub.sum(axis=1) < 0x33 + 0x29 + 0x1f].mean(axis=0).round(0)))
print("\n  %s  %dx%d  %.0f KB" % (path, W, H, os.path.getsize(path) / 1024))
print("  CONFIG.rig.poses.%s hat/rod layer box (the whole canvas, so every piece shares it):"
      % pose_name)
print("    x: %.1f  y: %.1f  w: %.1f  h: %.1f   (scale %.6f)"
      % (DX - CX * sd, DY - CY * sd, W * sd, H * sd, sd))
print("  then add \"%s-%s\" to CONFIG.rig.gearArt" % (stem, pose_name))
