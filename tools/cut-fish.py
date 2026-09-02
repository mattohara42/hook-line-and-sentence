#!/usr/bin/env python3
"""Cut a wave of fish out of one delivered sheet (R6).

An ART PIPELINE tool, not part of the game — nothing loads it at runtime and it
is not a build step. Third of its family after cut-angler.py and cut-vessel.py,
and the same argument as both: don't generate a piece you could cut.

    python3 tools/cut-fish.py <sheet> [source.jpg|png]

A sheet carries several fish on one canvas, separated by the flat magenta
backdrop, so they come apart as connected components — which is also why a sheet
is safe to ask for: the generator has no composition to get wrong, and painting
four fish in one pass is the one thing it does BETTER than four passes, because
they end up in the same style by construction.

Each fish is then split in two at the CAUDAL PEDUNCLE — the narrowest vertical
section of any fish, and the reason the cut can be *found* rather than traced,
the way cut-vessel.py finds a sheer. Everything behind it is the tail layer,
which the game sweeps about the cut; everything ahead is the body. Both halves
keep one shared crop, so their offsets are zero by construction.

Writes assets/fish-<id>-{body,tail}.png per species and prints the
CONFIG.fish.species block, computed rather than tuned.
"""
import sys, os, json
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Which species are on which sheet, in READING ORDER — rows top to bottom, and
# left to right within a row. That is the prompt's own layout written down, and
# it is deliberately not a grid of quadrant names: sheet A is 2x2 and sheet B is
# a row of three, and a list covers both without the table knowing which.
SHEETS = {
    "pond-common": dict(
        src="assets/Gemini_fish-pond-common.jpg",
        layout=["bluegill", "perch", "minnow", "pumpkinseed"],
        alpha="unmix", rear=(0.60, 0.88), overlap=3,
    ),
    "pond-uncommon": dict(
        src="assets/Gemini_fish-pond-uncommon.jpg",
        layout=["carp", "bass", "trout"],
        alpha="unmix", rear=(0.60, 0.88), overlap=3,
    ),
    "pond-rare": dict(
        src="assets/Gemini_fish-pond-rare.jpg",
        layout=["pike", "walleye", "koi"],
        alpha="unmix", rear=(0.60, 0.88), overlap=3,
    ),
}

# Mirrors CONFIG.fish.lengthByTier. config.js is the source of truth and a data
# test holds landed art to it; this copy exists because the tool cannot import
# an ES module. A species' length comes from its RANK and never from its
# painting: the generator draws every subject to fill its frame, so scaling from
# the source would make a minnow and a pike the same size.
LENGTH_BY_TIER = {"common": 54, "uncommon": 64, "rare": 78, "legendary": 96}

TOL, LO, HI = 70.0, 55.0, 115.0
MIN_COMPONENT = 500          # px; anything smaller is a speck, not a fish

name = sys.argv[1] if len(sys.argv) > 1 else "pond-common"
S = SHEETS[name]
SRC = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, S["src"])
FISH = {f["id"]: f for f in json.load(open(os.path.join(ROOT, "data", "fish.json")))}

im = Image.open(SRC).convert("RGB")
W, H = im.size
a = np.asarray(im, dtype=np.float64)

border = np.concatenate([a[0:3].reshape(-1, 3), a[-3:].reshape(-1, 3),
                         a[:, 0:3].reshape(-1, 3), a[:, -3:].reshape(-1, 3)])
KEY = np.median(border, axis=0)
dist = np.sqrt(((a - KEY) ** 2).sum(axis=2))
print("sheet %s  %dx%d  key %s (stdev %s)"
      % (name, W, H, KEY.round(1), border.std(axis=0).round(1)))

# 1. flood the backdrop from the border, then take the enclosed pockets too — the
#    gap between a pectoral fin and a belly is backdrop the border cannot reach
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

# 2. alpha. `unmix` is the default for fish and it is not the vessel's edge case:
#    fins are thin and the generator paints some backdrop THROUGH them, which the
#    distance ramp reads as opaque violet. Taking alpha from how much key a pixel
#    carries removes the key's contribution by construction — and leaves nothing
#    to despill, which matters here because a despill rule keyed on "blue above
#    green is residue" would eat the pumpkinseed's blue-green cheek lines.
if S["alpha"] == "unmix":
    gap = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    alpha = np.clip(1.0 - gap / (min(KEY[0], KEY[2]) - KEY[1]), 0.0, 1.0)
    alpha[bg] = 0.0
    t = np.clip(alpha, 1e-3, 1.0)[..., None]
    fg = np.clip((a - (1.0 - t) * KEY) / t, 0, 255)
else:
    alpha = np.clip((dist - LO) / (HI - LO), 0.0, 1.0)
    alpha[bg] = 0.0
    t = np.clip(alpha, 1e-3, 1.0)[..., None]
    fg = np.clip((a - (1.0 - t) * KEY) / t, 0, 255)
    solid = alpha > 0.05
    spill = solid & (fg[..., 2] > fg[..., 1] + 6)
    fg[..., 2] = np.where(spill, np.minimum(fg[..., 2], fg[..., 1]), fg[..., 2])
keyed = np.dstack([fg, alpha * 255])
print("backdrop %.1f%% (%d px of it enclosed), alpha model %s"
      % (100 * bg.mean(), pockets.sum(), S["alpha"]))

# 3. one fish per connected component. A sheet that comes back with the wrong
#    number of them is the one delivery fault worth stopping on: two fish sharing
#    a fin tip cannot be told apart here.
solid = alpha > 0.12
lab = np.zeros((H, W), dtype=np.int32)
comps = []
for sy in range(H):
    for sx in range(W):
        if solid[sy, sx] and lab[sy, sx] == 0:
            n = len(comps) + 1
            lab[sy, sx] = n
            stack = [(sx, sy)]
            xs, ys = [], []
            while stack:
                x, y = stack.pop()
                xs.append(x); ys.append(y)
                for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                    if 0 <= nx < W and 0 <= ny < H and solid[ny, nx] and lab[ny, nx] == 0:
                        lab[ny, nx] = n; stack.append((nx, ny))
            if len(xs) >= MIN_COMPONENT:
                comps.append((n, len(xs), min(xs), min(ys), max(xs), max(ys)))
            else:
                lab[ys, xs] = 0
want = len(S["layout"])
print("found %d fish-sized components (expected %d)" % (len(comps), want))
if len(comps) != want:
    sys.exit("  ✗ the sheet did not separate: fix the generation, not the tool")

# Put the components into reading order so the layout list can name them. Rows
# are found rather than assumed — cluster the centres by y, splitting wherever
# the gap exceeds half the median fish height — so a 2x2 sheet and a row of
# three both come out in the order the prompt listed them.
def reading_order(comps):
    heights = sorted(y1 - y0 + 1 for _, _, _, y0, _, y1 in comps)
    gap = heights[len(heights) // 2] / 2
    rows, rest = [], sorted(comps, key=lambda c: (c[3] + c[5]) / 2)
    for c in rest:
        cy = (c[3] + c[5]) / 2
        if rows and cy - (rows[-1][-1][3] + rows[-1][-1][5]) / 2 <= gap:
            rows[-1].append(c)
        else:
            rows.append([c])
    return [c for row in rows for c in sorted(row, key=lambda c: (c[2] + c[4]) / 2)]

ordered = reading_order(comps)
print("reading order: %d row(s)" % (1 + sum(
    1 for a_, b_ in zip(ordered, ordered[1:])
    if (b_[3] + b_[5]) / 2 - (a_[3] + a_[5]) / 2 > (a_[5] - a_[3]) / 2)))

block = []
for (n, px, x0, y0, x1, y1), fid in zip(ordered, S["layout"]):
    m = lab == n
    fw, fh = x1 - x0 + 1, y1 - y0 + 1

    # the peduncle: the narrowest vertical section in the rear of the fish. Found,
    # not traced — and the depth either side of it is printed so a sheet whose
    # minimum is shallow (a fish drawn with no waist) shows up as a number.
    depth = m[:, x0:x1 + 1].sum(axis=0)
    lo, hi = int(fw * S["rear"][0]), int(fw * S["rear"][1])
    cut = lo + int(np.argmin(depth[lo:hi]))
    fan = int(depth[cut:].max())
    col = np.where(m[:, x0 + cut])[0]
    pivot = (cut, (col.min() + col.max()) / 2 - y0)

    # the mouth: leftmost column, at its own vertical centre. The art faces left
    # and drawFish() attaches the line here.
    mouth_col = np.where(m[:, x0])[0]
    mouth = (0, (mouth_col.min() + mouth_col.max()) / 2 - y0)

    # split, with a few px of overlap at the seam so a swept tail never opens a
    # transparent wedge against the body it rotates away from
    o = S["overlap"]
    body = np.zeros_like(keyed); tail = np.zeros_like(keyed)
    bm = m.copy(); bm[:, x0 + cut + o:] = False
    tm = m.copy(); tm[:, :x0 + cut - o] = False
    body[bm] = keyed[bm]; tail[tm] = keyed[tm]

    box = (x0, y0, x1 + 1, y1 + 1)                 # ONE crop, shared by both halves
    for arr, part in ((body, "body"), (tail, "tail")):
        img = Image.fromarray(arr.astype(np.uint8), "RGBA").crop(box)
        path = os.path.join(ROOT, "assets", "fish-%s-%s.png" % (fid, part))
        img.save(path, optimize=True)
        print("  %-24s %-11s %6.1f KB" % (os.path.basename(path), "%dx%d" % img.size,
                                          os.path.getsize(path) / 1024))
    out = tail.copy(); bmask = body[..., 3] > 30; out[bmask] = body[bmask]
    both = (out[..., 3] > 30) & (keyed[..., 3] > 30) & m[..., None][..., 0]
    differ = int((np.abs(out[..., :3] - keyed[..., :3]).max(axis=2) > 0)[both].sum())

    scale = LENGTH_BY_TIER[FISH[fid]["tier"]] / fw
    print("    %-12s at %4d,%-4d %5d px  peduncle x=%d/%d (%.0f%% back), %d px deep against a %d px fan (%.2fx)"
          % (fid, x0, y0, px, cut, fw, 100 * cut / fw, int(depth[cut]), fan, fan / max(depth[cut], 1)))
    print("    recomposite tail+body vs the sheet: %d px of %d differ" % (differ, int(both.sum())))
    block.append("      %s: { w: %.0f, h: %.0f, mouth: { x: %.0f, y: %.0f }, tail: { x: %.0f, y: %.0f },\n"
                 "                 layers: [{ id: \"tail\", file: \"fish-%s-tail\" }, { id: \"body\", file: \"fish-%s-body\" }] },"
                 % (fid, fw * scale, fh * scale, mouth[0] * scale, mouth[1] * scale,
                    pivot[0] * scale, pivot[1] * scale, fid, fid))

print("\n  CONFIG.fish.species — measured, not tuned\n")
print("\n".join(block))
