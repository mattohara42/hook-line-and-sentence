#!/usr/bin/env python3
"""Cut an angler's rig layers out of the one delivered painting per pose (R4).

This is an ART PIPELINE tool, not part of the game — nothing loads it at
runtime and it is not a build step. It exists so the cut is reproducible: if a
better source ever arrives (a larger canvas, a cleaner download), re-run this
instead of redoing the work by hand.

    python3 tools/cut-angler.py <pose> <source.jpg|png>

Writes assets/angler-<pose>.png (the keyed source) plus the three cut layers.
They share ONE canvas, so their box in CONFIG.rig.poses.<pose> is identical and
the offsets are zero by construction.

Every number a pose needs is in POSES below, measured off its own delivered
painting — nothing here is shared between poses except the method. Scale is set
by matching the HEAD, not the figure: the generator draws each pose to fill its
frame, so the standing Stream kid came back only 2% taller than the seated Pond
one. Scaling both alike would make a standing child no taller than a sitting
one.

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

# Every number below was measured off that pose's own delivered painting. The
# only thing shared between poses is the method.
#
#   axis        the rod's fitted centreline, x = m*y + b, in source px
#   half        half the shaft's width, outline included
#   butt        the rod's lowest point along the axis
#   hand        the band of rows where the hand covers the rod (synthesised)
#   reel        an off-axis circle the corridor would otherwise miss, or None
#   rod_xmin    a hard left bound, where the corridor would otherwise bite into
#               the body (the Stream's butt passes close to the waders)
#   rod_len     grip to tip, in DESIGN px — the delivered rod is cropped by the
#               canvas, so this is a decision, not a measurement
#   arm         pivot / wrist / hand centre, and an optional elbow when the
#               limb bends visibly (the Ocean's does; the other two hide their
#               upper arm). The pivot is where the limb disappears behind
#               something the body layer carries: the Pond's forearm behind the
#               drawn-up knee, the Stream's and Ocean's sleeve behind the vest.
#               The cut end then sits AT the pivot and never moves.
#   figure_h    see below — measured as the widest row in the top 20% of the
#               figure, which is the one head measure that has stayed consistent
#               across all three poses (318 / 217 / 315 source px).
#   figure_h    how tall the figure should render, in design px. NOT scaled from
#               the source: the generator draws every pose to fill its frame, so
#               the standing Stream kid came back only 2% taller than the seated
#               Pond one. 50 seated / 75 standing comes from matching the two
#               HEADS — the Pond's is 318 source px wide at its scale, which is
#               18.1 design px, and the Stream's 217 px head matches at 0.083.
#   feet_y      where the figure's feet land, in scene design px
#   centre_x    where the figure's centre lands, in scene design px
POSES = {
    "pond": dict(
        axis=(-0.9002, 1012.9), half=16.0, butt=560.0, hand=(408.0, 560.0),
        reel=None, rod_xmin=None, rod_len=65.0, tip_half=1.2, grip=(572.0, 490.0),
        arm=dict(pivot=(487.0, 558.0), wrist=(566.0, 502.0), hand=(602.0, 486.0),
                 r_fore=30.0, r_hand=60.0, joint=35.0),
        profile_rows=(370, 405), figure_h=50.0, feet_y=200.0, centre_x=79.5,
        rod_file="rod-stick-pond",
    ),
    "ocean": dict(
        axis=(-0.8156, 962.3), half=22.0, butt=612.0, hand=(398.0, 492.0),
        reel=(595.0, 360.0, 58.0), rod_xmin=None, rod_len=65.0, tip_half=2.5,
        grip=(603.0, 440.0),
        arm=dict(pivot=(292.0, 445.0), elbow=(418.0, 517.0), wrist=(508.0, 487.0),
                 hand=(615.0, 440.0), r_fore=42.0, r_hand=58.0, joint=34.0),
        profile_rows=(100, 250), figure_h=51.0, feet_y=202.0, centre_x=79.5,
        rod_file="rod-deepsea-ocean",
    ),
    "stream": dict(
        axis=(-0.8063, 993.2), half=15.0, butt=546.0, hand=(352.0, 464.0),
        reel=(631.0, 513.0, 42.0), rod_xmin=556.0, rod_len=95.0, tip_half=1.2,
        grip=(665.0, 407.0),
        arm=dict(pivot=(550.0, 452.0), wrist=(612.0, 434.0), hand=(658.0, 404.0),
                 r_fore=32.0, r_hand=56.0, joint=30.0),
        profile_rows=(150, 250), figure_h=75.0, feet_y=220.0, centre_x=80.0,
        rod_file="rod-bamboo-stream",
    ),
}
TOL, LO, HI = 90.0, 55.0, 115.0
RIG_X, RIG_Y = 20.0, 168.0     # #rig's position in style.css

pose_name = sys.argv[1] if len(sys.argv) > 1 else "pond"
P = POSES[pose_name]
SRC = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "assets", "angler-%s.png" % pose_name)
M, B = P["axis"]

im = Image.open(SRC).convert("RGB")
W, H = im.size
a = np.asarray(im, dtype=np.float64)

border = np.concatenate([a[0:3].reshape(-1, 3), a[-3:].reshape(-1, 3),
                         a[:, 0:3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
KEY = np.median(border, axis=0)
dist = np.sqrt(((a - KEY) ** 2).sum(axis=2))

# 1. flood from the border, never a global key, then pick up enclosed pockets --
#    a silhouette hole (the Stream net's mesh) is backdrop the border can't reach
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
pockets = (dist <= TOL) & ~bg
bg |= pockets

# 2. alpha ramp across the fringe, unpremultiplied so edges carry no key colour
alpha = np.clip((dist - LO) / (HI - LO), 0.0, 1.0)
alpha[bg] = 0.0
t = np.clip(alpha, 1e-3, 1.0)[..., None]
fg = np.clip((a - (1.0 - t) * KEY) / t, 0, 255)

# 3. despill, derived from this subject's palette: terracotta, tan skin, oat,
#    grey-green, warm brown and honey cane never put blue above green
solid = alpha > 0.05
spill = solid & (fg[..., 2] > fg[..., 1] + 6)
fg[..., 2] = np.where(spill, np.minimum(fg[..., 2], fg[..., 1]), fg[..., 2])
fg[..., 0] = np.where(spill & (fg[..., 0] > fg[..., 1] * 1.9), fg[..., 1] * 1.9, fg[..., 0])
keyed = np.dstack([fg, alpha * 255])
print("key %s  backdrop %.1f%%  enclosed pockets %d px" % (KEY.round(1), 100*bg.mean(), pockets.sum()))

# --- scale, from the figure rather than the frame -----------------------------
Y, X = np.mgrid[0:H, 0:W]
perp0 = np.abs(X - M * Y - B) / np.sqrt(1 + M * M)
figure = (keyed[..., 3] > 30) & (perp0 > P["half"] * 2)
fy, fx = np.where(figure)
scale = P["figure_h"] / (fy.max() - fy.min() + 1)
rod_len = P["rod_len"] / scale
unit = np.array([-M, -1.0]) / np.sqrt(1 + M * M)
across = np.array([unit[1], -unit[0]])
grip = np.array(P["grip"])
tip = grip + rod_len * unit
print("figure %d px tall -> scale %.5f; rod %.0f src px, tip (%.0f, %.0f)"
      % (fy.max()-fy.min()+1, scale, rod_len, tip[0], tip[1]))

PAD_T = max(0, int(np.ceil(-tip[1])) + 8)
PAD_R = max(0, int(np.ceil(tip[0] - W)) + 8)
keyed = np.pad(keyed, ((PAD_T, 0), (0, PAD_R), (0, 0)))
Hp, Wp = keyed.shape[:2]
Bp = B + (-M) * PAD_T
gripp = np.array([grip[0], grip[1] + PAD_T])
Yp, Xp = np.mgrid[0:Hp, 0:Wp]
perp = np.abs(Xp - M * Yp - Bp) / np.sqrt(1 + M * M)
print("padded %dx%d (top +%d, right +%d)" % (Wp, Hp, PAD_T, PAD_R))

# --- the rod ------------------------------------------------------------------
corridor = (perp <= P["half"]) & (Yp <= P["butt"] + PAD_T)
if P["reel"]:
    rx, ry, rr = P["reel"]
    corridor |= np.hypot(Xp - rx, Yp - (ry + PAD_T)) <= rr
if P["rod_xmin"]:
    corridor &= Xp >= P["rod_xmin"]
hand = (Yp >= P["hand"][0] + PAD_T) & (Yp <= P["hand"][1] + PAD_T)

rod = np.zeros_like(keyed)
visible = corridor & ~hand & (keyed[..., 3] > 30)
rod[visible] = keyed[visible]

offs = np.arange(-int(P["half"]), int(P["half"]) + 1)
profile = np.zeros((len(offs), 4))
r0, r1 = P["profile_rows"]
for i, o in enumerate(offs):
    cols = [keyed[y, int(round(M * (y - PAD_T) + B)) + o] for y in range(r0 + PAD_T, r1 + PAD_T)
            if 0 <= int(round(M * (y - PAD_T) + B)) + o < Wp
            and keyed[y, int(round(M * (y - PAD_T) + B)) + o, 3] > 30]
    if cols:
        profile[i] = np.mean(cols, axis=0)

def stamp(dist_along, half):
    c = gripp + dist_along * unit
    for o in np.arange(-half, half + 0.5, 0.5):
        idx = (o / half) * P["half"] + P["half"] if half > 0 else P["half"]
        i0 = int(np.floor(idx)); i1 = min(i0 + 1, len(offs) - 1); f = idx - i0
        if not (0 <= i0 < len(offs)) or profile[i0, 3] <= 30:
            continue
        q_ = c + o * across
        xi, yi = int(round(q_[0])), int(round(q_[1]))
        if 0 <= xi < Wp and 0 <= yi < Hp:
            rod[yi, xi] = profile[i0] * (1 - f) + profile[i1] * f

def along(pt):
    return float(np.dot(np.array(pt) - gripp, unit))

for t_ in np.arange(along((M*P["hand"][1] + B, P["hand"][1] + PAD_T)),
                    along((M*P["hand"][0] + B, P["hand"][0] + PAD_T)), 0.5):
    stamp(t_, P["half"])
t_edge = along((B, PAD_T))
for t_ in np.arange(t_edge, rod_len, 0.5):
    k = (t_ - t_edge) / (rod_len - t_edge)
    stamp(t_, P["half"] + (P["tip_half"] - P["half"]) * k)
print("extended the shaft from t=%.0f to t=%.0f (%.0f%% of its length)"
      % (t_edge, rod_len, 100 * (rod_len - t_edge) / rod_len))

# --- the arm ------------------------------------------------------------------
A = P["arm"]
Pv = np.array([A["pivot"][0], A["pivot"][1] + PAD_T])
Wr = np.array([A["wrist"][0], A["wrist"][1] + PAD_T])
Hn = np.array([A["hand"][0],  A["hand"][1]  + PAD_T])
def segment(p, q, r):
    v = q - p; l2 = (v * v).sum()
    k = np.clip(((Xp - p[0]) * v[0] + (Yp - p[1]) * v[1]) / l2, 0, 1)
    return np.hypot(Xp - (p[0] + k*v[0]), Yp - (p[1] + k*v[1])) <= r

# A limb that bends visibly needs two segments; the Pond and Stream hide their
# upper arm behind a knee or a vest, so one suffices there.
bones = [(Pv, Wr)]
if A.get("elbow"):
    El = np.array([A["elbow"][0], A["elbow"][1] + PAD_T])
    bones = [(Pv, El), (El, Wr)]
limb = np.zeros((Hp, Wp), dtype=bool)
for p_, q_ in bones:
    limb |= segment(p_, q_, A["r_fore"])
d = (bones[0][1] - Pv); u = d / np.sqrt((d * d).sum())
adist = (Xp - Pv[0]) * u[0] + (Yp - Pv[1]) * u[1]
arm = (limb | (np.hypot(Xp - Hn[0], Yp - Hn[1]) <= A["r_hand"])) & (adist >= 0) & (keyed[..., 3] > 30)

body = keyed.copy()
body[corridor & ~hand] = 0
body[arm & (adist >= A["joint"])] = 0
armlayer = np.zeros_like(keyed)
armlayer[arm] = keyed[arm]
print("arm %d px; body keeps the joint within %.0f px of the pivot" % (arm.sum(), A["joint"]))

# --- one shared crop, so the pose needs a single set of offsets ---------------
union = (rod[..., 3] > 30) | (body[..., 3] > 30) | (armlayer[..., 3] > 30)
ys, xs = np.where(union)
X0, Y0 = xs.min(), ys.min()
box = (X0, Y0, xs.max() + 1, ys.max() + 1)

def save(arr, name, crop=True):
    img = Image.fromarray(arr.astype(np.uint8), "RGBA")
    if crop:
        img = img.crop(box)
    path = os.path.join(ROOT, "assets", name)
    img.save(path, optimize=True)
    print("  %-26s %-11s %6.0f KB" % (name, "%dx%d" % img.size, os.path.getsize(path)/1024))

save(keyed, "angler-%s.png" % pose_name, crop=False)
save(body, "angler-%s-body.png" % pose_name)
save(armlayer, "angler-%s-arm.png" % pose_name)
save(rod, "%s.png" % P["rod_file"])

out = rod.copy()
for layer in (armlayer, body):
    m = layer[..., 3] > 30
    out[m] = layer[m]
both = (out[..., 3] > 30) & (keyed[..., 3] > 30)
diff = np.abs(out[..., :3] - keyed[..., :3])[both]
print("recomposite rod->arm->body: mean %.2f, %d px differ by >10 of %d (%.3f%%)"
      % (diff.mean(), (diff.max(axis=1) > 10).sum(), both.sum(),
         100*(diff.max(axis=1) > 10).sum()/both.sum()))

# --- the CONFIG block, computed rather than tuned ------------------------------
bh, bw = box[3]-box[1], box[2]-box[0]
by, bx = np.where(body[..., 3] > 30)
left = P["centre_x"] - ((bx.min()-X0) + (bx.max()-X0))/2*scale - RIG_X
top  = P["feet_y"] - (by.max()-Y0)*scale - RIG_Y
def rig(pt, padded=True):
    return (left + (pt[0]-X0)*scale, top + (pt[1]+(PAD_T if padded else 0)-Y0)*scale)
g, tp, ap = rig(P["grip"]), rig((tip[0], tip[1])), rig(A["pivot"])
print("\n  CONFIG.rig.poses.%s — box %.0fx%.0f at rig (%.0f, %.0f)" % (pose_name, bw*scale, bh*scale, left, top))
print("    layers x: %.0f  y: %.0f  w: %.0f  h: %.0f" % (left, top, bw*scale, bh*scale))
print("    rodPivot   { x: %.0f, y: %.0f }" % g)
print("    lineOrigin { x: %.0f, y: %.0f }" % tp)
print("    armPivot   { x: %.0f, y: %.0f }" % ap)
print("    rod is %.1f design px at %.1f deg; tip lands at scene (%.0f, %.0f)"
      % (np.hypot(tp[0]-g[0], tp[1]-g[1]), np.degrees(np.arctan2(g[1]-tp[1], tp[0]-g[0])),
         RIG_X+tp[0], RIG_Y+tp[1]))
