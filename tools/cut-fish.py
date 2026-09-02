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
import sys, os, json, math
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
        alpha="unmix", rear=(0.60, 0.88),
    ),
    "pond-uncommon": dict(
        src="assets/Gemini_fish-pond-uncommon.jpg",
        layout=["carp", "bass", "trout"],
        alpha="unmix", rear=(0.60, 0.88),
    ),
    "pond-rare": dict(
        src="assets/Gemini_fish-pond-rare.jpg",
        layout=["pike", "walleye", "koi"],
        alpha="unmix", rear=(0.60, 0.88),
    ),
    # Wave 2, registered ahead of the art so cutting a delivered sheet is one
    # command. The grayling is the one to watch: its sail-like dorsal fin is the
    # tallest thing on any fish in the game, so if `rear` ever needs widening for
    # a species, it will be that one.
    "stream-common": dict(
        src="assets/Gemini_fish-stream-common.jpg",
        layout=["dace", "chub", "stickleback", "sculpin"],
        alpha="unmix", rear=(0.60, 0.88),
    ),
    # Delivered as ONE sheet of six rather than the two rows of three the prompts
    # asked for, and that is better than what was asked: the rainbow and the
    # steelhead are the pair hardest to tell apart, and putting them on one
    # canvas means the generator drew them against each other instead of in two
    # separate passes. Three rows of two, so reading order pairs them by row.
    "stream-trout": dict(
        src="assets/Gemini_fish-stream-trout.jpg",
        layout=["rainbowtrout", "browntrout", "steelhead", "grayling", "salmon", "catfish"],
        alpha="unmix", rear=(0.60, 0.88),
    ),
    # Wave 3, the Ocean, grouped so that each set of look-alikes shares a canvas:
    # the four silver pelagics on one, the three billfish-shaped rares on the
    # other. The muskie goes alone because the fish it must not resemble — the
    # Pond's northern pike — is in another biome and already generated, so no
    # sheet can put them together.
    "ocean-shoal": dict(
        src="assets/Gemini_fish-ocean-shoal.jpg",
        layout=["herring", "mackerel", "anchovy", "sardine", "mahi", "snapper"],
        alpha="unmix", rear=(0.60, 0.88),
    ),
    "ocean-deep": dict(
        src="assets/Gemini_fish-ocean-deep.jpg",
        layout=["cod", "grouper", "unicornfish", "marlin", "tuna", "swordfish"],
        alpha="unmix", rear=(0.60, 0.88),
    ),
    "ocean-muskie": dict(
        src="assets/Gemini_fish-ocean-muskie.jpg",
        layout=["muskie"],
        alpha="unmix", rear=(0.60, 0.88),
    ),
}

# Mirrors CONFIG.fish.lengthByTier. config.js is the source of truth and a data
# test holds landed art to it; this copy exists because the tool cannot import
# an ES module. A species' length comes from its RANK and never from its
# painting: the generator draws every subject to fill its frame, so scaling from
# the source would make a minnow and a pike the same size.
LENGTH_BY_TIER = {"common": 54, "uncommon": 64, "rare": 78, "legendary": 96}

# Mirrors CONFIG.fish.swim.tailDeg, for the same reason LENGTH_BY_TIER does. It
# sets how far the seam has to overlap: the tail rotates about the peduncle's
# midpoint, so each corner of the cut swings (depth/2)*sin(deg) away from the
# body, and anything past the overlap opens as a transparent wedge. A fixed
# overlap gets this wrong at both ends — 3px was over-generous for the pike's
# 39px peduncle and half a design pixel short on the koi's 90px one, which is
# 2.7 device px of daylight on a retina screen, on the biggest fish in the Pond.
TAIL_SWEEP_DEG = 7.0

TOL, LO, HI = 70.0, 55.0, 115.0
# A sheet may carry things that are not fish. The Ocean's first sheet came back
# captioned with species names, and a flat size threshold called seventeen word
# fragments fish. So take the N LARGEST components instead, where N is the
# layout's length, and prove the separation rather than assume it: the smallest
# fish kept must be this many times the largest thing dropped. On that sheet the
# real gap was 33x (35,115 px against 1,048), so anything under 4x means two
# fish have merged or a subject is missing, and the tool should stop.
MIN_SIZE_RATIO = 4.0

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
            comps.append((n, len(xs), min(xs), min(ys), max(xs), max(ys)))
want = len(S["layout"])
if len(comps) < want:
    sys.exit("  ✗ only %d components for %d species: two subjects have merged" % (len(comps), want))
comps.sort(key=lambda c: -c[1])
kept, dropped = comps[:want], comps[want:]
ratio = kept[-1][1] / dropped[0][1] if dropped else float("inf")
print("found %d components; keeping the %d largest (%d..%d px), dropping %d "
      "(largest %d px) — separation %.1fx"
      % (len(comps), want, kept[-1][1], kept[0][1], len(dropped),
         dropped[0][1] if dropped else 0, ratio))
if ratio < MIN_SIZE_RATIO:
    sys.exit("  ✗ the smallest fish is only %.1fx the largest non-fish: too close to call"
             % ratio)
for c in dropped:                      # captions, specks — never reach a sprite
    lab[lab == c[0]] = 0
comps = kept

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
    # a species' length comes from its RANK, so the design box is known before
    # anything is measured — and the mouth is measured in that box, not in
    # source pixels then rounded into it
    scale = LENGTH_BY_TIER[FISH[fid]["tier"]] / fw

    # the peduncle: the narrowest vertical section in the rear of the fish. Found,
    # not traced — and the depth either side of it is printed so a sheet whose
    # minimum is shallow (a fish drawn with no waist) shows up as a number.
    depth = m[:, x0:x1 + 1].sum(axis=0)
    lo, hi = int(fw * S["rear"][0]), int(fw * S["rear"][1])
    cut = lo + int(np.argmin(depth[lo:hi]))
    fan = int(depth[cut:].max())
    col = np.where(m[:, x0 + cut])[0]
    pivot = (cut, (col.min() + col.max()) / 2 - y0)

    # the mouth, measured in DESIGN pixels — the unit the config stores and the
    # game draws in. Two things defeated simpler rules here, and both were found
    # by drawing the measured point onto the sprite rather than by reading the
    # number:
    #
    #   a catfish's leftmost pixel is the tip of a BARBEL, so "leftmost column at
    #   its vertical centre" attached the line to its forehead, 7 design px high.
    #   Weighting the leading 15% by alpha gives a whisker almost no say and a
    #   head all of it, which fixes that.
    #
    #   a unicornfish leads with a HORN above its snout, so even the weighted
    #   centre lands in open water between the two — 3.2 design px off the fish,
    #   where the line would attach to nothing. Holding that height and walking
    #   right to the first painted column finds the snout.
    #
    # And measuring in source px and rounding afterwards was wrong by
    # construction: half a design px is four source px, which is exactly the
    # width of that gap. So the mask is reduced to the box the game draws before
    # anything is measured, and the answer is on the silhouette by construction.
    dw, dh = int(round(fw * scale)), int(round(fh * scale))
    small = np.asarray(Image.fromarray((m[y0:y1 + 1, x0:x1 + 1] * 255).astype(np.uint8))
                       .resize((dw, dh), Image.LANCZOS)) > 100
    band = max(1, int(dw * 0.15))
    lead = small[:, :band].astype(float)
    wy = (lead.sum(axis=1) * np.arange(dh)).sum() / max(lead.sum(), 1)
    painted = np.where(small.any(axis=1))[0]
    row = min(max(int(round(wy)), 0), dh - 1)
    if not small[row].any():
        row = int(painted[np.argmin(np.abs(painted - row))])
    mouth_d = (int(np.where(small[row])[0][0]), row)

    # split, overlapping the seam by exactly what this fish's sweep needs so the
    # tail never opens a transparent wedge against the body it rotates away from
    o = math.ceil((depth[cut] / 2) * math.sin(math.radians(TAIL_SWEEP_DEG))) + 1
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

    print("    %-12s at %4d,%-4d %5d px  peduncle x=%d/%d (%.0f%% back), %d px deep against a %d px fan (%.2fx), seam overlap %d px"
          % (fid, x0, y0, px, cut, fw, 100 * cut / fw, int(depth[cut]), fan, fan / max(depth[cut], 1), o))
    print("    recomposite tail+body vs the sheet: %d px of %d differ" % (differ, int(both.sum())))
    block.append("      %s: { w: %.0f, h: %.0f, mouth: { x: %.0f, y: %.0f }, tail: { x: %.0f, y: %.0f },\n"
                 "                 layers: [{ id: \"tail\", file: \"fish-%s-tail\" }, { id: \"body\", file: \"fish-%s-body\" }] },"
                 % (fid, fw * scale, fh * scale, mouth_d[0], mouth_d[1],
                    pivot[0] * scale, pivot[1] * scale, fid, fid))

print("\n  CONFIG.fish.species — measured, not tuned\n")
print("\n".join(block))
