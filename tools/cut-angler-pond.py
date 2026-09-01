#!/usr/bin/env python3
"""Cut the Pond angler's rig layers out of the one delivered painting (R4).

This is an ART PIPELINE tool, not part of the game — nothing loads it at
runtime and it is not a build step. It exists so the cut is reproducible: if a
better source ever arrives (a larger canvas, a cleaner download), re-run this
instead of redoing the work by hand.

    python3 tools/cut-angler-pond.py <source.jpg|png>

Writes assets/angler-pond.png (the keyed source), assets/angler-pond-body.png
and assets/rod-stick-pond.png. The two layers share ONE canvas, so their box in
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
Y_BUTT = 560.0           # the butt, where it tucks behind the knee
HAND_TOP = 408.0         # below this the corridor holds fingers, not rod
TOL, LO, HI = 90.0, 55.0, 115.0

# The delivered painting ran the rod off the top-right corner, so the canvas —
# not the drawing — decided its length, and it came out 51% of the old rig's.
# So the shaft is EXTENDED along its own axis onto a padded canvas rather than
# tapered in. This is the same synthesis that fills the hand-occluded stretch,
# and it is sound for the same reason: a straight shaft is featureless content
# with no recognisable form to violate. Both targets are in design px, so
# retuning the rod is a one-line change here.
CHILD_H  = 50.0          # the seated kid's height on the 720x360 canvas
ROD_LEN  = 65.0          # grip to tip; the old browser-tuned rig was 65.1
TIP_HALF = 1.2           # half-width at the very tip, in source px
GRIP = (572.0, 490.0)    # where the hand closes on the pole, in source px

# The arm. The upper arm and elbow are hidden behind the drawn-up knee, so the
# visible limb is forearm + hand only, emerging from behind it — which is why
# there is no shoulder cut through the torso. It pivots where it vanishes, so
# the cut end barely moves and stays tucked. The cut is flat there rather than
# a round cap, or it bites into the knee.
ARM_PIVOT = (487.0, 558.0)
ARM_WRIST = (566.0, 502.0)
ARM_HAND  = (602.0, 486.0)
R_FORE, R_HAND, JOINT = 30.0, 60.0, 35.0

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
corridor = (perp <= HALF) & (Y <= Y_BUTT)
hand = (Y >= HAND_TOP) & (Y <= Y_BUTT)

# the child alone sets the scale, so measure it before anything is padded
child = (keyed[..., 3] > 30) & ~corridor
cys, cxs = np.where(child)
scale = CHILD_H / (cys.max() - cys.min() + 1)          # design px per source px
rod_len = ROD_LEN / scale                              # how long the rod must be
unit = np.array([-M, -1.0]) / np.sqrt(1 + M * M)       # up and to the right
across = np.array([unit[1], -unit[0]])
tip = np.array(GRIP) + rod_len * unit
print("child %d px tall -> scale %.5f;  rod %.0f src px, tip at (%.0f, %.0f)"
      % (cys.max() - cys.min() + 1, scale, rod_len, tip[0], tip[1]))

# pad so the extended shaft fits, and carry the axis into padded coordinates
PAD_T = max(0, int(np.ceil(-tip[1])) + 8)
PAD_R = max(0, int(np.ceil(tip[0] - W)) + 8)
keyed = np.pad(keyed, ((PAD_T, 0), (0, PAD_R), (0, 0)))
Hp, Wp = keyed.shape[:2]
Bp = B + (-M) * PAD_T                                  # x = M*(y-PAD_T) + B
gripp = np.array([GRIP[0], GRIP[1] + PAD_T])
print("padded canvas %dx%d (top +%d, right +%d)" % (Wp, Hp, PAD_T, PAD_R))

Yp, Xp = np.mgrid[0:Hp, 0:Wp]
perpp = np.abs(Xp - M * Yp - Bp) / np.sqrt(1 + M * M)
corridorp = (perpp <= HALF) & (Yp <= Y_BUTT + PAD_T)
handp = (Yp >= HAND_TOP + PAD_T) & (Yp <= Y_BUTT + PAD_T)

rod = np.zeros_like(keyed)
visible = corridorp & ~handp & (keyed[..., 3] > 30)
rod[visible] = keyed[visible]

# one clean cross-section of the shaft, reused for both syntheses
offsets = np.arange(-int(HALF), int(HALF) + 1)
profile = np.zeros((len(offsets), 4))
for i, o in enumerate(offsets):
    cols = [keyed[y, int(round(M * (y - PAD_T) + B)) + o]
            for y in range(100 + PAD_T, 300 + PAD_T)
            if 0 <= int(round(M * (y - PAD_T) + B)) + o < Wp
            and keyed[y, int(round(M * (y - PAD_T) + B)) + o, 3] > 30]
    if cols:
        profile[i] = np.mean(cols, axis=0)

def stamp(t, half):
    """Paint one cross-section at distance t along the axis from the grip,
    resampling the real profile so the outline tapers with the shaft."""
    c = gripp + t * unit
    for o in np.arange(-half, half + 0.5, 0.5):
        idx = (o / half) * HALF + HALF if half > 0 else HALF
        i0, i1 = int(np.floor(idx)), min(int(np.floor(idx)) + 1, len(offsets) - 1)
        f = idx - i0
        if not (0 <= i0 < len(offsets)) or profile[i0, 3] <= 30:
            continue
        px_ = c + o * across
        xi, yi = int(round(px_[0])), int(round(px_[1]))
        if 0 <= xi < Wp and 0 <= yi < Hp:
            rod[yi, xi] = profile[i0] * (1 - f) + profile[i1] * f

# the stretch the hand hides — never seen, because the rod paints behind
t_hand0 = np.dot(np.array([M * (HAND_TOP) + B, HAND_TOP + PAD_T]) - gripp, unit)
t_butt  = np.dot(np.array([M * (Y_BUTT) + B, Y_BUTT + PAD_T]) - gripp, unit)
for t in np.arange(t_butt, t_hand0, 0.5):
    stamp(t, HALF)

# and the extension: from where the delivered canvas cut the shaft off, out to
# the real tip, tapering the profile as it goes
t_edge = np.dot(np.array([M * 0 + B, 0 + PAD_T]) - gripp, unit)
for t in np.arange(t_edge, rod_len, 0.5):
    k = (t - t_edge) / (rod_len - t_edge)
    stamp(t, HALF + (TIP_HALF - HALF) * k)
print("extended the shaft from t=%.0f to t=%.0f src px (%.0f%% of its length)"
      % (t_edge, rod_len, 100 * (rod_len - t_edge) / rod_len))

# --- split the forearm and hand off, pivoting where the knee hides them ------
Pv = np.array([ARM_PIVOT[0], ARM_PIVOT[1] + PAD_T])
Wr = np.array([ARM_WRIST[0], ARM_WRIST[1] + PAD_T])
Hn = np.array([ARM_HAND[0],  ARM_HAND[1]  + PAD_T])
d = Wr - Pv; L2 = (d * d).sum(); u = d / np.sqrt(L2)
tt = np.clip(((Xp - Pv[0]) * d[0] + (Yp - Pv[1]) * d[1]) / L2, 0, 1)
along = (Xp - Pv[0]) * u[0] + (Yp - Pv[1]) * u[1]
limb = np.hypot(Xp - (Pv[0] + tt*d[0]), Yp - (Pv[1] + tt*d[1])) <= R_FORE
palm = np.hypot(Xp - Hn[0], Yp - Hn[1]) <= R_HAND
arm = (limb | palm) & (along >= 0) & (keyed[..., 3] > 30)

body = keyed.copy()
body[corridorp & ~handp] = 0
# The body keeps the first JOINT px past the pivot as well, so the knee stays
# whole. The arm carries a copy of them, hidden because the arm paints behind
# the body — the standard joint overlap. They sit at the pivot, so they move a
# quarter of a design px across the whole swing.
body[arm & (along >= JOINT)] = 0
armlayer = np.zeros_like(keyed)
armlayer[arm] = keyed[arm]
print("arm layer %d px; body keeps the joint within %.0f px of the pivot" % (arm.sum(), JOINT))

# --- crop both to ONE shared box, so the pose needs a single set of offsets --
union = (rod[..., 3] > 30) | (body[..., 3] > 30) | (armlayer[..., 3] > 30)
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
save(armlayer, "angler-pond-arm.png")
save(rod, "rod-stick-pond.png")

# rod -> arm -> body must rebuild the delivered painting exactly, or the split
# has lost or invented something
out = rod.copy()
for layer in (armlayer, body):
    m = layer[..., 3] > 30
    out[m] = layer[m]
both = (out[..., 3] > 30) & (keyed[..., 3] > 30)
print("recomposite rod->arm->body: mean %.2f max %.0f over %d px"
      % (np.abs(out[..., :3] - keyed[..., :3])[both].mean(),
         np.abs(out[..., :3] - keyed[..., :3])[both].max(), both.sum()))
