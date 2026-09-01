#!/usr/bin/env python3
"""Cut the Pond angler's rig layers out of the one delivered painting (R4).

This is an ART PIPELINE tool, not part of the game — nothing loads it at
runtime and it is not a build step. It exists so the cut is reproducible: if a
better source ever arrives (a larger canvas, a cleaner download), re-run this
instead of redoing the work by hand.

    python3 tools/cut-angler-pond.py <source.jpg|png>

Writes assets/angler-pond.png (the keyed source), assets/angler-pond-body.png
and assets/rod-basic-pond.png. The two layers share ONE canvas, so their box in
CONFIG.rig.poses.pond is identical and the offsets are zero by construction.

Method and its reasoning are in ART.md (the R4 section) and GEMINI_NOTES.md
(the salvage recipes). The short version: flood the magenta backdrop in from
the border, ramp the alpha across the fringe and unpremultiply, despill using a
test derived from THIS subject's palette, then split the rod off geometrically
along its fitted axis. The rod's occluded stretch — the part the hand covers —
is synthesised from the cross-section just above the hand, because the rod
paints BEHIND the body and that stretch is never actually seen.
"""
import sys, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "assets", "angler-pond.png")

# --- the rod, fitted from the delivered art (x = M*y + B, in source px) ------
M, B = -0.9002, 1012.9   # 48 degrees above horizontal
HALF = 16.0              # half the shaft's width, outline included
Y_TIP, Y_TAPER, Y_BUTT = 60.0, 130.0, 560.0
HAND_TOP = 408.0         # below this the corridor holds fingers, not rod
TOL, LO, HI = 90.0, 55.0, 115.0

im = Image.open(SRC).convert("RGB")
W, H = im.size
a = np.asarray(im, dtype=np.float64)

border = np.concatenate([a[0:3].reshape(-1, 3), a[-3:].reshape(-1, 3),
                         a[:, 0:3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
KEY = np.median(border, axis=0)
dist = np.sqrt(((a - KEY) ** 2).sum(axis=2))

# 1. flood from the border — never a global key, and pick up enclosed pockets
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
bg |= (dist <= TOL) & ~bg          # silhouette holes the border can't reach

# 2. alpha ramp across the fringe, unpremultiplied so edges carry no key colour
alpha = np.clip((dist - LO) / (HI - LO), 0.0, 1.0)
alpha[bg] = 0.0
t = np.clip(alpha, 1e-3, 1.0)[..., None]
fg = np.clip((a - (1.0 - t) * KEY) / t, 0, 255)

# 3. despill. Derived from this subject: terracotta, tan skin, oat, warm brown
#    and brown wood never put blue above green, so anything that does is residue.
solid = alpha > 0.05
spill = solid & (fg[..., 2] > fg[..., 1] + 6)
fg[..., 2] = np.where(spill, np.minimum(fg[..., 2], fg[..., 1]), fg[..., 2])
fg[..., 0] = np.where(spill & (fg[..., 0] > fg[..., 1] * 1.9), fg[..., 1] * 1.9, fg[..., 0])
keyed = np.dstack([fg, alpha * 255])

# --- split the rod off along its axis ---------------------------------------
Y, X = np.mgrid[0:H, 0:W]
perp = np.abs(X - M * Y - B) / np.sqrt(1 + M * M)
half = np.where(Y >= Y_TAPER, HALF, np.clip((Y - Y_TIP) / (Y_TAPER - Y_TIP), 0, 1) * HALF)
corridor = (perp <= half) & (Y >= Y_TIP) & (Y <= Y_BUTT)
hand = (Y >= HAND_TOP) & (Y <= Y_BUTT)

rod = np.zeros_like(keyed)
visible = corridor & ~hand & (keyed[..., 3] > 30)
rod[visible] = keyed[visible]

offsets = np.arange(-int(HALF), int(HALF) + 1)
profile = np.zeros((len(offsets), 4))
for i, o in enumerate(offsets):
    cols = [keyed[y, int(round(M * y + B)) + o] for y in range(370, 405)
            if 0 <= int(round(M * y + B)) + o < W
            and keyed[y, int(round(M * y + B)) + o, 3] > 30]
    if cols:
        profile[i] = np.mean(cols, axis=0)
for y in range(int(HAND_TOP), int(Y_BUTT) + 1):
    for i, o in enumerate(offsets):
        xi = int(round(M * y + B)) + o
        if 0 <= xi < W and profile[i, 3] > 30:
            rod[y, xi] = profile[i]

body = keyed.copy()
body[(perp <= HALF) & (Y <= Y_BUTT) & ~hand] = 0   # incl. the tip the taper drops

# --- crop both to ONE shared box, so the pose needs a single set of offsets --
union = (rod[..., 3] > 30) | (body[..., 3] > 30)
ys, xs = np.where(union)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

def save(arr, name, crop=True):
    img = Image.fromarray(arr.astype(np.uint8), "RGBA")
    if crop:
        img = img.crop(box)
    path = os.path.join(ROOT, "assets", name)
    img.save(path, optimize=True)
    print("%-24s %-11s %6.0f KB" % (name, "%dx%d" % img.size, os.path.getsize(path) / 1024))

print("key %s   backdrop %.1f%%   shared crop %s" % (KEY.round(1), 100 * bg.mean(), box))
save(keyed, "angler-pond.png", crop=False)
save(body, "angler-pond-body.png")
save(rod, "rod-basic-pond.png")
