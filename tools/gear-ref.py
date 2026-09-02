#!/usr/bin/env python3
"""Flatten a pose's painting back onto magenta, to attach to an R7 gear prompt.

This is an ART PIPELINE tool, not part of the game. Nothing loads it at runtime
and it is not a build step.

    python3 tools/gear-ref.py              # all three poses
    python3 tools/gear-ref.py pond

Every R7 gear painting is an EDIT of the pose it is drawn against (ART.md, the
R7 section), so the reference attached to the prompt has to be that pose's own
painting. assets/angler-<pose>.png is the keyed one, which means its backdrop is
alpha: an attachment carrying no magenta gives "keep the backdrop exactly as it
is" nothing to hold onto, and leaves the returned backdrop to whatever the
upload composites onto. This puts the magenta back.

Writes assets/ref-angler-<pose>.png, which .gitignore keeps out of the repo. It
is one line of derivation from a committed file rather than game art, so it is
regenerated on demand instead of stored.
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSES = ("pond", "stream", "ocean")
# The backdrop convention, GEMINI_NOTES.md. Nothing downstream assumes this
# exact value (the generator never returns it), but the attachment may as well
# carry the colour the prompt names.
KEY = (255, 0, 255, 255)


def flatten(pose):
    src = os.path.join(ROOT, "assets", "angler-%s.png" % pose)
    dst = os.path.join(ROOT, "assets", "ref-angler-%s.png" % pose)
    art = Image.open(src).convert("RGBA")
    out = Image.alpha_composite(Image.new("RGBA", art.size, KEY), art).convert("RGB")
    out.save(dst)
    print("%s  %d x %d  -> attach this one" % (dst, out.width, out.height))


for name in (sys.argv[1:] or POSES):
    if name not in POSES:
        sys.exit("unknown pose %r, expected one of %s" % (name, ", ".join(POSES)))
    flatten(name)
