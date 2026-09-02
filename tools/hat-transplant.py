#!/usr/bin/env python3
"""Land a hat painted for one pose on another pose's head (R7).

This is an ART PIPELINE tool, not part of the game. Nothing loads it at runtime
and it is not a build step.

    python3 tools/hat-transplant.py <stem> <from-pose> <to-pose>
    python3 tools/hat-transplant.py hat-straw pond stream

Writes assets/<stem>-<to-pose>.png. Register it in CONFIG.rig.gearArt like any
other delivery.

**This is not an offset tweak, and the difference matters.** The standing rule is
that a piece which does not fit is a reroll, and it holds. What makes this
legitimate is that it is not a piece being nudged into place by eye: it is the
same measurement R4 used to size the three poses against each other, which is
that they are one character drawn at three scales and the HEAD is what relates
them. The transform is found by maximising agreement between the two poses' own
above-the-neck silhouettes, and the tool refuses if they do not actually
correspond.

Measured on the straw hat against real generations at both other poses, which is
the only reason to believe any of it:

  Pond -> Stream   heads register at IoU 0.904 (uniform scale 0.672). The
                   transplanted hat against the separately generated one is IoU
                   0.62 with the same area to 10%, and at the 18 design px a head
                   occupies on screen they are indistinguishable. USE IT.
  Pond -> Ocean    heads register at 0.837, and the tool refuses. Forced through
                   anyway it lands IoU 0.712 against the real one and the hat sits
                   PERCHED: too high and too far back, forehead and fringe
                   exposed, still visible at 54px. The Ocean's head is the only
                   one that is not upright and this transform carries no rotation.
                   GENERATE IT.

So MIN_HEAD_IOU sits between the two real cases rather than at a round number
someone liked. It has two data points, which is enough to separate the case that
works from the case that does not and not enough to be a law: if a third pose
ever lands between 0.84 and 0.90, look at the result before trusting either side
of the line.
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# where each pose's layer crop sits inside its painted canvas, and the row below
# which a head is no longer a head. Both are cut-gear.py's numbers; keep them in
# step if a pose is ever re-cut.
POSES = {
    "pond":   dict(crop=(115, 8), canvas=(1344, 1391), neck=800),
    "stream": dict(crop=(331, 8), canvas=(1387, 1510), neck=810),
    "ocean":  dict(crop=(81,  7), canvas=(1324, 1466), neck=820),
}
MIN_HEAD_IOU = 0.85

stem, src_pose, dst_pose = sys.argv[1], sys.argv[2], sys.argv[3]


def head(pose):
    """the pose's own head, taken off the BODY layer so the rod is not in it"""
    P = POSES[pose]
    W, H = P["canvas"]
    m = np.zeros((H, W), bool)
    b = np.asarray(Image.open(os.path.join(ROOT, "assets", "angler-%s-body.png" % pose))
                   .convert("RGBA"))[..., 3] > 16
    ox, oy = P["crop"]
    m[oy:oy + b.shape[0], ox:ox + b.shape[1]] = b
    m[P["neck"]:] = False
    return m


ms, md = head(src_pose), head(dst_pose)
Wd, Hd = POSES[dst_pose]["canvas"]
cs = np.array([np.where(ms)[1].mean(), np.where(ms)[0].mean()])
cd = np.array([np.where(md)[1].mean(), np.where(md)[0].mean()])


def affine(k, tx, ty):
    return (1 / k, 0, cs[0] - (cd[0] + tx) / k,
            0, 1 / k, cs[1] - (cd[1] + ty) / k)


def warp(img, k, tx, ty, mode=Image.BICUBIC):
    return img.transform((Wd, Hd), Image.AFFINE, affine(k, tx, ty), mode, fillcolor=0)


src_img = Image.fromarray((ms * 255).astype(np.uint8))
def score(k, tx, ty):
    w = np.asarray(warp(src_img, k, tx, ty, Image.BILINEAR)) > 128
    return (w & md).sum() / (w | md).sum()

# a uniform scale only: the same head, drawn bigger or smaller. Anything that
# needed a shear or a rotation would not be the same head.
k, tx, ty = 1.0, 0.0, 0.0
best, step = score(k, tx, ty), [0.08, 40.0, 40.0]
for _ in range(8):
    for i in range(3):
        while True:
            moved = False
            for d in (+1, -1):
                cand = [k, tx, ty]; cand[i] += d * step[i]
                v = score(*cand)
                if v > best + 1e-5:
                    best, (k, tx, ty), moved = v, cand, True
                    break
            if not moved:
                break
    step = [v / 2 for v in step]

print("%s head onto %s head: scale %.4f, offset (%.1f, %.1f), head IoU %.4f"
      % (src_pose, dst_pose, k, tx, ty, best))
if best < MIN_HEAD_IOU:
    sys.exit("the two heads do not correspond well enough (%.3f < %.2f) — generate this "
             "one instead of transplanting it" % (best, MIN_HEAD_IOU))

hat = Image.open(os.path.join(ROOT, "assets", "%s-%s.png" % (stem, src_pose))).convert("RGBA")
out = warp(hat, k, tx, ty)
path = os.path.join(ROOT, "assets", "%s-%s.png" % (stem, dst_pose))
out.save(path, optimize=True)
print("  %s  %dx%d  %.0f KB" % (path, Wd, Hd, os.path.getsize(path) / 1024))
print('  then add "%s-%s" to CONFIG.rig.gearArt' % (stem, dst_pose))
