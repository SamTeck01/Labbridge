"""Compound binocular microscope (38 cm). Eyepieces face -Y (toward the seated student).
Turret pivots about its vertical axis; objective placement matches runtime angles
(4x front, 10x at -X, 40x back, 100x at +X). Output: public/models/microscope.glb"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

reset()
enamel = mat("ivory_enamel", (0.88, 0.88, 0.85), rough=0.35)
black = mat("black_anodised", (0.03, 0.03, 0.035), rough=0.45, metal=0.3)
chrome = mat("chrome", (0.85, 0.86, 0.88), metal=1.0, rough=0.12)
rubber = mat("knurled_rubber", (0.05, 0.05, 0.05), rough=0.85)
lens = mat("lens_glass", (0.7, 0.8, 0.9), rough=0.02, transmission=1.0, ior=1.52)
lamp = mat("lamp_glow", (1, 0.95, 0.8), emission=(1, 0.95, 0.8))
slide_glass = mat("slide_glass", (0.9, 0.95, 0.95), rough=0.02, transmission=1.0)
stain = mat("specimen_stain", (0.55, 0.2, 0.45), rough=0.4)
bands = {"4x": (0.8, 0.1, 0.1), "10x": (0.9, 0.75, 0.1), "40x": (0.2, 0.45, 0.85), "100x": (0.95, 0.95, 0.95)}
card = mat("slide_box_blue", (0.1, 0.3, 0.6), rough=0.5)

# Base with illuminator
box("base", (0.19, 0.24, 0.045), (0, 0.01, 0.0225), enamel, bev=0.012)
cyl("illuminator_ring", 0.022, 0.008, (0, -0.03, 0.049), black, verts=32)
cyl("illuminator_lens", 0.016, 0.003, (0, -0.03, 0.053), lamp, verts=32)
sw = empty("micro_light_switch", (0.096, 0.03, 0.022))
parent(cyl("dimmer_dial", 0.016, 0.01, (0.1, 0.03, 0.022), rubber, verts=32, rot=(0, math.pi / 2, 0), bev=0.002), sw)

# Arm (limb): pillar + curved neck
box("pillar", (0.06, 0.05, 0.22), (0, 0.095, 0.155), enamel, bev=0.012)
bpy.ops.mesh.primitive_torus_add(major_radius=0.05, minor_radius=0.024, location=(0, 0.065, 0.265), rotation=(0, math.pi / 2, 0))
t = bpy.context.object; t.name = "neck"; t.scale = (1, 1, 1.1); smooth(assign(t, enamel))
box("head_mount", (0.05, 0.06, 0.04), (0, 0.04, 0.3), enamel, bev=0.01)

# Coaxial focus knobs both sides
for side in (-1, 1):
    x = side * 0.045
    c = empty("micro_coarse_focus" if side < 0 else "coarse_knob_r", (x, 0.07, 0.12))
    parent(cyl("coarse_knob", 0.026, 0.018, (x + side * 0.012, 0.07, 0.12), rubber, verts=40, rot=(0, math.pi / 2, 0), bev=0.003), c)
    f = empty("micro_fine_focus" if side < 0 else "fine_knob_r", (x, 0.07, 0.12))
    parent(cyl("fine_knob", 0.013, 0.014, (x + side * 0.027, 0.07, 0.12), black, verts=32, rot=(0, math.pi / 2, 0), bev=0.002), f)

# Stage assembly (moves with focus)
stage = empty("micro_stage", (0, -0.02, 0.15))
parent(box("stage_plate", (0.14, 0.13, 0.01), (0, -0.02, 0.15), black, bev=0.002), stage)
parent(cyl("condenser", 0.018, 0.035, (0, -0.03, 0.128), black, verts=32), stage)
parent(box("mech_stage_arm", (0.09, 0.012, 0.012), (0.02, -0.075, 0.161), chrome, bev=0.002), stage)
parent(cyl("stage_ctrl", 0.008, 0.05, (0.06, -0.02, 0.12), chrome, verts=20), stage)
parent(box("glass_slide", (0.075, 0.025, 0.0012), (0, -0.03, 0.1556), slide_glass, bev=0), stage)
parent(cyl("specimen", 0.006, 0.0005, (0, -0.03, 0.1565), stain, verts=24), stage)
for dx in (-0.045, 0.045):
    parent(box("stage_clip", (0.008, 0.03, 0.002), (dx, -0.03, 0.157), chrome, bev=0.0008), stage)

# Nosepiece turret: pivot 2.5 cm behind optical axis (axis at y = -0.03)
r = 0.025; pz = 0.255
tur = empty("micro_turret", (0, -0.03 + r, pz))
parent(lathe("nosepiece", [(0, 0.012), (0.036, 0.012), (0.04, 0.0), (0.03, -0.01), (0, -0.01)], chrome, loc=(0, -0.03 + r, pz)), tur)
offsets = {"4x": (0, -r), "10x": (-r, 0), "40x": (0, r), "100x": (r, 0)}
lengths = {"4x": 0.03, "10x": 0.038, "40x": 0.045, "100x": 0.048}
for name, (ox, oy) in offsets.items():
    L = lengths[name]; x, y = ox, -0.03 + r + oy
    o = lathe(f"objective_{name}", [(0, -L), (0.004, -L), (0.007, -L + 0.006), (0.009, -0.012), (0.009, -0.01), (0.009, 0.0), (0, 0.0)], black, loc=(x, y, pz - 0.01))
    parent(o, tur)
    parent(cyl(f"band_{name}", 0.0093, 0.003, (x, y, pz - 0.016), mat(f"band_{name}", bands[name], rough=0.4), verts=24), tur)
    parent(cyl(f"front_lens_{name}", 0.0035, 0.001, (x, y, pz - 0.01 - L), lens, verts=16), tur)

# Binocular head with eyepieces angled 30 degrees toward the student
box("head", (0.07, 0.08, 0.045), (0, -0.02, 0.29), enamel, bev=0.012)
eye = empty("micro_eyepieces", (0, -0.06, 0.33))
tilt = math.radians(30)
for dx in (-0.032, 0.032):
    for nm, rad, ln, z0, m in [("tube", 0.012, 0.06, 0.0, enamel), ("eyepiece", 0.011, 0.03, 0.045, black), ("eyecup", 0.013, 0.012, 0.064, rubber)]:
        cz = z0 + ln / 2
        loc = (dx, -0.04 - math.sin(tilt) * cz, 0.315 + math.cos(tilt) * cz)
        parent(cyl(nm, rad, ln, loc, m, verts=32, rot=(-tilt, 0, 0), bev=0.001), eye)
box("prism_housing", (0.1, 0.04, 0.03), (0, -0.045, 0.318), enamel, bev=0.01)

# Slide box (click to change specimen)
sb = empty("micro_slide", (-0.19, -0.06, 0))
parent(box("slide_box", (0.1, 0.12, 0.03), (-0.19, -0.06, 0.015), card, bev=0.004), sb)
for i in range(6):
    parent(box("stored_slide", (0.076, 0.0012, 0.022), (-0.19, -0.1 + i * 0.015, 0.03), slide_glass, bev=0), sb)

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models/microscope.glb"))
export(out)
if "--preview" in sys.argv:
    preview(sys.argv[sys.argv.index("--preview") + 1], target=(-0.03, 0, 0.17), dist=0.75, elev=0.3, az=-0.5)
print("exported", out)
