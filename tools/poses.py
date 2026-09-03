#!/usr/bin/env python3
"""The per-pose geometry of the three painted anglers — one copy, two readers.

An ART PIPELINE module, not part of the game. `tools/cut-angler.py` cuts a
pose's rig layers with these numbers and `tools/gear-register.py` puts a gear
delivery into the coordinates they are written in. They were one dict inside
cut-angler.py until the first rod delivery needed them too, and a second copy of
a fitted axis is the kind of duplication that goes wrong silently.
"""

# Every number below was measured off that pose's own delivered painting. The
# only thing shared between poses is the method.
#
#   pad         how many rows assets/angler-<pose>.png carries ABOVE this
#               coordinate space. That file is cut-angler.py's own OUTPUT: the
#               keyed painting on a canvas padded upward to hold the synthesised
#               rod tip. Every number here is in the RAW delivery's pixels, and
#               a gear return is in the padded ones, because gear-ref.py builds
#               the prompt attachment from the padded file. Subtracting `pad`
#               from a padded y is what reconciles them, and it is the whole job
#               of gear-register.py. Measured three ways that agree to a pixel
#               (the axis through the painted tip, the shaft's centreline with
#               this slope held, a scan for the best corridor coverage) and
#               then drawn; every raw delivery lands at 1024 tall, which is the
#               size the angler prompts asked for.
#   axis        the rod's fitted centreline, x = m*y + b, in source px
#   half        half the shaft's width, outline included
#   butt        the rod's lowest point along the axis
#   hand        the band of rows where the hand covers the rod (synthesised)
#   reel        an off-axis circle the corridor would otherwise miss, or None.
#               It has to cover the reel the pose was PAINTED with, not just
#               enough of it to read: whatever it leaves behind stays in the
#               body and arm layers, where the gate rod's own reel hides it
#               perfectly — until a rod with no reel is equipped and it hangs in
#               mid-air. The Ocean's was 58, which stopped exactly at the brass
#               reel's rim and left a 2,766 px crescent in the body layer. 90
#               covers it and destroys nothing: the child's own nearest paint is
#               76 px from that centre and the hand band protects the fingers.
#               The Stream's 42 is right and must not be grown the same way —
#               there the child's own arm is inside 70.
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
        pad=367,
        axis=(-0.9002, 1012.9), half=16.0, butt=560.0, hand=(408.0, 560.0),
        reel=None, rod_xmin=None, rod_len=65.0, tip_half=1.2, grip=(572.0, 490.0),
        arm=dict(pivot=(487.0, 558.0), wrist=(566.0, 502.0), hand=(602.0, 486.0),
                 r_fore=30.0, r_hand=60.0, joint=35.0),
        profile_rows=(370, 405), figure_h=50.0, feet_y=200.0, centre_x=79.5,
        rod_file="rod-stick-pond",
    ),
    "ocean": dict(
        pad=442,
        axis=(-0.8156, 962.3), half=22.0, butt=612.0, hand=(398.0, 492.0),
        reel=(595.0, 360.0, 90.0), rod_xmin=None, rod_len=65.0, tip_half=2.5,
        grip=(603.0, 440.0),
        arm=dict(pivot=(292.0, 445.0), elbow=(418.0, 517.0), wrist=(508.0, 487.0),
                 hand=(615.0, 440.0), r_fore=42.0, r_hand=58.0, joint=34.0),
        profile_rows=(100, 250), figure_h=51.0, feet_y=202.0, centre_x=79.5,
        rod_file="rod-deepsea-ocean",
    ),
    "stream": dict(
        pad=486,
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
