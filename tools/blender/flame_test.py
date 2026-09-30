"""Flame test kit for the fume hood worktop. Origin = burner base; front (toward student) = -Y.
Bunsen burner (air collar, gas hose), hood gas tap, nichrome loop, HCl beaker, spotting tile with
five salts, piezo lighter. Output: public/models/flame-test.glb"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

reset()
chrome = mat("chrome", (0.85, 0.86, 0.88), metal=1.0, rough=0.15)
cast = mat("cast_base", (0.05, 0.05, 0.06), rough=0.5, metal=0.4)
rubber = mat("gas_hose", (0.35, 0.12, 0.04), rough=0.6)
brass = mat("brass", (0.8, 0.62, 0.3), metal=1.0, rough=0.25)
yellow = mat("gas_yellow", (0.9, 0.7, 0.05), rough=0.4)
glass = mat("borosilicate", (0.95, 0.97, 1.0), rough=0.02, transmission=1.0, ior=1.47)
acid = mat("hcl_solution", (0.9, 0.95, 1.0), rough=0.05, transmission=0.9, ior=1.34)
ceramic = mat("spot_tile", (0.93, 0.93, 0.92), rough=0.3)
nichrome = mat("nichrome", (0.55, 0.53, 0.5), metal=1.0, rough=0.35)
salt_white = mat("salt_white", (0.93, 0.93, 0.91), rough=0.95)
salt_cu = mat("salt_copper", (0.1, 0.45, 0.4), rough=0.9)
lighter_red = mat("lighter_red", (0.5, 0.03, 0.02), rough=0.4)
ink = mat("label_ink", (0.02, 0.02, 0.02), rough=0.6)

# --- Bunsen burner (origin) ---
bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.012, vertices=6, location=(0, 0, 0.006))
smooth(assign(bpy.context.object, cast)); bpy.context.object.name = "burner_base"
cyl("burner_barrel", 0.008, 0.13, (0, 0, 0.077), chrome, verts=24)
cyl("barrel_bore", 0.0065, 0.004, (0, 0, 0.1405), cast, verts=24)
cyl("gas_inlet", 0.004, 0.035, (0.0, 0.025, 0.02), brass, verts=16, rot=(math.pi / 2, 0, 0))
collar = empty("flame_air_collar", (0, 0, 0.03))
parent(lathe("air_collar", [(0.0095, 0.022), (0.0105, 0.022), (0.0105, 0.042), (0.0095, 0.042)], brass, thickness=0.0), collar)
parent(box("collar_tab", (0.004, 0.012, 0.006), (0.0, -0.014, 0.032), brass, bev=0.001), collar)
empty("anchor_flame", (0, 0, 0.142))

# --- Hood gas tap (on the back of the worktop) and hose ---
tx, ty = 0.15, 0.45
box("tap_block", (0.03, 0.03, 0.05), (tx, ty, 0.025), brass, bev=0.004)
tap = empty("flame_gas_tap", (tx, ty - 0.016, 0.04))
parent(box("tap_lever", (0.05, 0.008, 0.008), (tx + 0.02, ty - 0.02, 0.04), yellow, bev=0.002), tap)
wire("gas_hose", [(0.0, 0.05, 0.02), (0.02, 0.15, 0.005), (0.1, 0.3, 0.005), (tx, ty - 0.02, 0.02)], rubber, radius=0.005)

# --- Spotting tile with five salts (left) ---
sx, sy = -0.26, -0.08
box("spot_tile", (0.16, 0.05, 0.012), (sx, sy, 0.006), ceramic, bev=0.003)
salts = [("li", salt_white), ("na", salt_white), ("k", salt_white), ("ca", salt_white), ("cu", salt_cu)]
for i, (key, m) in enumerate(salts):
    x = sx - 0.06 + i * 0.03
    well = empty(f"flame_salt_{key}", (x, sy, 0.012))
    parent(lathe(f"salt_{key}", [(0, 0.011), (0.0115, 0.011), (0.011, 0.014), (0.006, 0.018), (0, 0.019)], m, loc=(x, sy, 0)), well)
    parent(empty(f"anchor_salt_{key}", (x, sy, 0.018)), well)
    box(f"label_{key}", (0.006, 0.0005, 0.004), (x, sy - 0.0252, 0.006), ink, bev=0)

# --- Beaker of dilute HCl for cleaning the loop (right) ---
bx, by = 0.22, -0.08
acidn = empty("flame_acid", (bx, by, 0))
parent(lathe("acid_beaker", [(0, 0), (0.028, 0), (0.028, 0.07), (0.031, 0.072)], glass, loc=(bx, by, 0), thickness=0.0012), acidn)
parent(lathe("acid_liquid", [(0, 0.002), (0.0265, 0.002), (0.0265, 0.035), (0, 0.035)], acid, loc=(bx, by, 0)), acidn)
parent(empty("anchor_acid", (bx, by, 0.03)), acidn)

# --- Nichrome loop lying at the front, handle to the right ---
lx, ly = 0.1, -0.2
loop = empty("flame_loop", (lx, ly, 0.006))
parent(cyl("loop_handle", 0.004, 0.1, (lx + 0.05, ly, 0.006), glass, verts=12, rot=(0, math.pi / 2, 0)), loop)
parent(cyl("loop_wire", 0.0006, 0.06, (lx - 0.03, ly, 0.006), nichrome, verts=8, rot=(0, math.pi / 2, 0)), loop)
bpy.ops.mesh.primitive_torus_add(major_radius=0.0025, minor_radius=0.0006, location=(lx - 0.062, ly, 0.006), rotation=(math.pi / 2, 0, 0))
t = bpy.context.object; t.name = "loop_ring"; smooth(assign(t, nichrome)); parent(t, loop)
parent(empty("anchor_loop_tip", (lx - 0.062, ly, 0.006)), loop)

# --- Piezo lighter (front left) ---
gx, gy = -0.1, -0.2
lighter = empty("flame_lighter", (gx, gy, 0.01))
parent(box("lighter_body", (0.09, 0.02, 0.018), (gx + 0.03, gy, 0.01), lighter_red, bev=0.004), lighter)
parent(cyl("lighter_nozzle", 0.004, 0.08, (gx - 0.05, gy, 0.012), chrome, verts=12, rot=(0, math.pi / 2, 0)), lighter)
parent(empty("anchor_lighter_tip", (gx - 0.09, gy, 0.012)), lighter)

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models/flame-test.glb"))
export(out)
if "--preview" in sys.argv:
    preview(sys.argv[sys.argv.index("--preview") + 1], target=(0, 0.05, 0.05), dist=0.9, elev=0.5, az=-0.2)
print("exported", out)
