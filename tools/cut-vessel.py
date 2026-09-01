#!/usr/bin/env python3
"""Cut a vessel's far and near halves out of one delivered painting (R5).

An ART PIPELINE tool, not part of the game — nothing loads it at runtime and it
is not a build step. Companion to cut-angler.py and the same idea: don't
generate a piece you could cut. A side-on boat already contains both halves, so
asking for two images that have to register would invent a problem this doesn't
have.

    python3 tools/cut-vessel.py <name> <source.jpg|png>

The cut follows the NEAR gunwale's inner edge — the sheer. Everything below it
(the rail and the topsides) becomes `-near.png`, which paints in FRONT of the
angler so the kid sits down IN the hull; everything above (the interior, the
thwarts, the far gunwale, the stem) becomes `-far.png`, behind them. That is
V1's front-plane trick applied to the boat.

The sheer is found rather than hand-traced: it is a LIGHTER band with a darker
line above it, so per column the detector takes the brightest row in a window
around a coarse guess and walks up to where the brightness falls away. A
low-order polynomial then fits the result, because a sheer is a fair curve and
the fit removes detector jitter where a thwart or a plank seam crosses it.
"""
import sys, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Coarse anchors per vessel, read once off a gridded render; the detector
# refines them per column. Only needs to be within ~35px.
VESSELS = {
    "boat-pond": dict(
        guess=[(40, 290), (300, 305), (600, 307), (800, 312), (1000, 300),
               (1200, 268), (1350, 232), (1470, 192), (1560, 158)],
        window=35, drop=28, degree=4, alpha="ramp",
    ),
    "boat-ocean": dict(
        guess=[(60, 258), (200, 283), (400, 306), (600, 318), (800, 319),
               (1000, 306), (1200, 275), (1300, 250), (1400, 215), (1550, 160)],
        window=35, drop=28, degree=4, alpha="unmix",
    ),
}
TOL, LO, HI = 70.0, 55.0, 115.0

name = sys.argv[1] if len(sys.argv) > 1 else "boat-pond"
V = VESSELS[name]
SRC = sys.argv[2]

im = Image.open(SRC).convert("RGB")
W, H = im.size
a = np.asarray(im, dtype=np.float64)

border = np.concatenate([a[0:3].reshape(-1, 3), a[-3:].reshape(-1, 3),
                         a[:, 0:3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
KEY = np.median(border, axis=0)
dist = np.sqrt(((a - KEY) ** 2).sum(axis=2))

bg = np.zeros((H, W), dtype=bool)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if dist[y, x] <= TOL and not bg[y, x]:
            bg[y, x] = True; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if dist[y, x] <= TOL and not bg[y, x]:
            bg[y, x] = True; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
        if 0 <= nx < W and 0 <= ny < H and not bg[ny, nx] and dist[ny, nx] <= TOL:
            bg[ny, nx] = True; q.append((nx, ny))
# Two ways to read alpha back out of the backdrop, one per painting:
#   ramp   alpha from the distance to the key, despilled afterwards. Enough for
#          an opaque subject like the rowboat, where every pixel is either paint
#          or backdrop.
#   unmix  alpha from how much KEY the pixel carries. The Whaler's windscreen is
#          glass and the backdrop is genuinely visible THROUGH it; the ramp
#          cannot tell that from an opaque violet and paints a purple blob on a
#          cream boat. Magenta is the one colour in this palette whose green
#          falls below both red and blue, so that gap measures the key's share
#          directly -- and removing it by construction leaves nothing to despill.
if V["alpha"] == "unmix":
    gap = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    alpha = np.clip(1.0 - gap / (min(KEY[0], KEY[2]) - KEY[1]), 0.0, 1.0)
    alpha[bg] = 0.0
    t = np.clip(alpha, 1e-3, 1.0)[..., None]
    fg = np.clip((a - (1.0 - t) * KEY) / t, 0, 255)
else:
    bg |= (dist <= TOL) & ~bg
    alpha = np.clip((dist - LO) / (HI - LO), 0.0, 1.0)
    alpha[bg] = 0.0
    t = np.clip(alpha, 1e-3, 1.0)[..., None]
    fg = np.clip((a - (1.0 - t) * KEY) / t, 0, 255)
    # despill: this subject is warm timber; blue never exceeds green on a plank
    solid = alpha > 0.05
    spill = solid & (fg[..., 2] > fg[..., 1] + 6)
    fg[..., 2] = np.where(spill, np.minimum(fg[..., 2], fg[..., 1]), fg[..., 2])
keyed = np.dstack([fg, alpha * 255])
print("key %s  backdrop %.1f%%" % (KEY.round(1), 100 * bg.mean()))

L = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
ys, xs = np.where(~bg)
gx = [p[0] for p in V["guess"]]; gy = [p[1] for p in V["guess"]]
found = []
for x in range(xs.min() + 1, xs.max()):
    g = int(np.interp(x, gx, gy))
    lo, hi = max(0, g - V["window"]), min(H - 1, g + V["window"])
    col = L[lo:hi, x]
    if not len(col):
        continue
    r = lo + int(np.argmax(col)); peak = L[r, x]; y = r
    while y > lo and L[y, x] > peak - V["drop"]:
        y -= 1
    found.append((x, y))
F = np.array(found)
coef = np.polyfit(F[:, 0], F[:, 1], V["degree"])
sheer = np.poly1d(coef)
resid = np.abs(F[:, 1] - sheer(F[:, 0]))
print("sheer detected over %d columns; fit residual mean %.1f px, 95th %.1f"
      % (len(F), resid.mean(), np.percentile(resid, 95)))

Y, X = np.mgrid[0:H, 0:W]
below = Y >= sheer(X)
near = np.zeros_like(keyed); far = np.zeros_like(keyed)
near[below] = keyed[below]
far[~below] = keyed[~below]

# both halves keep ONE shared crop, so the vessel needs a single box in config
ysn, xsn = np.where((near[..., 3] > 30) | (far[..., 3] > 30))
box = (xsn.min(), ysn.min(), xsn.max() + 1, ysn.max() + 1)

def save(arr, suffix):
    img = Image.fromarray(arr.astype(np.uint8), "RGBA").crop(box)
    path = os.path.join(ROOT, "assets", "%s-%s.png" % (name, suffix))
    img.save(path, optimize=True)
    print("  %-24s %-11s %6.0f KB" % (os.path.basename(path), "%dx%d" % img.size,
                                      os.path.getsize(path) / 1024))
    return img.size

size = save(far, "far"); save(near, "near")
print("shared crop %s -> %dx%d, aspect %.3f" % (box, size[0], size[1], size[0] / size[1]))
out = far.copy(); m = near[..., 3] > 30; out[m] = near[m]
both = (out[..., 3] > 30) & (keyed[..., 3] > 30)
print("recomposite far+near vs the painting: %d px of %d differ at all"
      % (int((np.abs(out[..., :3] - keyed[..., :3]).max(axis=2) > 0)[both].sum()), int(both.sum())))
# where the sheer sits inside the crop, so the vessel can be placed against the kid
print("sheer at the crop's mid-length: y=%.0f of %d (%.1f%% down)"
      % (sheer((box[0]+box[2])/2) - box[1], size[1],
         100 * (sheer((box[0]+box[2])/2) - box[1]) / size[1]))
