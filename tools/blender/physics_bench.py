"""DC circuit board: 12 V bench supply, knife switch, rotary rheostat, filament bulb,
analogue ammeter, patch leads. Board 1.4 m wide. Output: public/models/physics-bench.glb"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

reset()
board = mat("board_laminate", (0.16, 0.09, 0.045), rough=0.55)
grey = mat("psu_grey", (0.55, 0.57, 0.6), rough=0.4, metal=0.2)
panel = mat("panel_black", (0.04, 0.04, 0.045), rough=0.5)
seg = mat("seven_seg_red", (1, 0.15, 0.1), emission=(1, 0.15, 0.1))
red = mat("red_plastic", (0.5, 0.01, 0.01), rough=0.35)
blk = mat("black_plastic", (0.03, 0.03, 0.03), rough=0.35)
brass = mat("brass", (0.8, 0.62, 0.3), metal=1.0, rough=0.25)
copper = mat("copper", (0.85, 0.45, 0.3), metal=1.0, rough=0.3)
ceramic = mat("ceramic", (0.93, 0.92, 0.88), rough=0.4)
slate = mat("slate_base", (0.15, 0.15, 0.16), rough=0.6)
bulb_glass = mat("bulb_glass", (1.0, 0.95, 0.8), rough=0.05, transmission=0.6, emission=(1.0, 0.75, 0.35))
steel = mat("brushed_steel", (0.62, 0.63, 0.65), metal=1.0, rough=0.28)
dial = mat("meter_face", (0.95, 0.94, 0.9), rough=0.6)
ink = mat("ink", (0.02, 0.02, 0.02), rough=0.6)
coil = mat("nichrome_coil", (0.45, 0.42, 0.4), metal=1.0, rough=0.4)

box("circuit_board", (1.4, 0.5, 0.02), (0, 0, 0.01), board, bev=0.004)
Z = 0.02

# 12 V bench supply (left)
px = -0.52
box("psu_case", (0.24, 0.2, 0.12), (px, 0.04, Z + 0.06), grey, bev=0.008)
box("psu_front", (0.22, 0.004, 0.1), (px, -0.061, Z + 0.06), panel, bev=0.001)
box("psu_display", (0.08, 0.002, 0.025), (px - 0.05, -0.064, Z + 0.09), seg, bev=0)
vk = empty("phys_voltage_knob", (px + 0.04, -0.07, Z + 0.085))
parent(cyl("psu_knob", 0.014, 0.015, (px + 0.04, -0.07, Z + 0.085), blk, verts=32, rot=(math.pi / 2, 0, 0), bev=0.002), vk)
parent(box("psu_knob_pointer", (0.002, 0.004, 0.01), (px + 0.04, -0.078, Z + 0.093), mat("pointer_white", (0.9, 0.9, 0.9), rough=0.5), bev=0), vk)
for dx, m in ((0.03, red), (0.07, blk)):
    cyl("psu_post", 0.007, 0.018, (px + dx, -0.07, Z + 0.035), m, verts=20, rot=(math.pi / 2, 0, 0), bev=0.001)

# Knife switch (hinge at left; blade rotates up to open)
sx = -0.22
box("switch_base", (0.16, 0.07, 0.015), (sx, -0.05, Z + 0.0075), slate, bev=0.003)
for x in (sx - 0.055, sx + 0.055):
    box("switch_jaw", (0.008, 0.02, 0.03), (x, -0.05, Z + 0.03), copper, bev=0.001)
blade = empty("phys_knife_switch", (sx - 0.055, -0.05, Z + 0.035))
parent(box("blade", (0.12, 0.004, 0.012), (sx + 0.005, -0.05, Z + 0.035), copper, bev=0.001), blade)
parent(cyl("blade_handle", 0.008, 0.035, (sx + 0.075, -0.05, Z + 0.035), blk, verts=20, rot=(0, math.pi / 2, 0), bev=0.002), blade)

# Rotary rheostat
rx = 0.05
lathe("rheostat_body", [(0, 0), (0.05, 0), (0.05, 0.035), (0.046, 0.04), (0, 0.04)], ceramic, loc=(rx, 0.05, Z))
bpy.ops.mesh.primitive_torus_add(major_radius=0.04, minor_radius=0.006, location=(rx, 0.05, Z + 0.03), major_segments=64)
smooth(assign(bpy.context.object, coil)); bpy.context.object.name = "rheostat_coil"
pot = empty("phys_potentiometer", (rx, 0.05, Z + 0.04))
parent(lathe("rheostat_knob", [(0, 0.04), (0.018, 0.04), (0.018, 0.058), (0.014, 0.064), (0, 0.064)], blk, loc=(rx, 0.05, Z)), pot)
parent(box("knob_pointer", (0.003, 0.03, 0.003), (rx, 0.035, Z + 0.065), ceramic, bev=0), pot)

# Filament bulb in holder
bx = 0.3
lathe("bulb_holder", [(0, 0), (0.035, 0), (0.035, 0.012), (0.014, 0.018), (0.014, 0.045), (0, 0.045)], blk, loc=(bx, -0.05, Z))
b = lathe("phys_bulb", [(0.0, 0.045), (0.012, 0.045), (0.013, 0.06), (0.028, 0.085), (0.03, 0.1), (0.024, 0.118), (0.0, 0.126)], bulb_glass, loc=(bx, -0.05, Z))
wire("filament", [(bx - 0.008, -0.05, Z + 0.07), (bx - 0.004, -0.05, Z + 0.095), (bx + 0.004, -0.05, Z + 0.095), (bx + 0.008, -0.05, Z + 0.07)], coil, radius=0.0006)

# Analogue ammeter with moving needle
ax = 0.52
box("ammeter_case", (0.14, 0.08, 0.11), (ax, 0.04, Z + 0.055), blk, bev=0.006)
box("ammeter_face", (0.12, 0.002, 0.08), (ax, -0.0015, Z + 0.065), dial, bev=0)
for i in range(11):
    a = math.radians(-50 + i * 10)
    box("tick", (0.0012, 0.001, 0.008 if i % 5 else 0.012), (ax + math.sin(a) * 0.045, -0.003, Z + 0.035 + math.cos(a) * 0.045), ink, bev=0)
needle = empty("phys_ammeter_needle", (ax, -0.004, Z + 0.035))
parent(box("needle", (0.0012, 0.001, 0.05), (ax, -0.004, Z + 0.06), red, bev=0), needle)
for dx, m in ((-0.04, red), (0.04, blk)):
    cyl("meter_post", 0.006, 0.016, (ax + dx, -0.004, Z + 0.012), m, verts=20, rot=(math.pi / 2, 0, 0))

# Patch leads between components
leads = [
    [(px + 0.03, -0.08, Z + 0.035), (px + 0.1, -0.14, Z + 0.01), (sx - 0.06, -0.09, Z + 0.02), (sx - 0.055, -0.06, Z + 0.03)],
    [(sx + 0.055, -0.06, Z + 0.03), (sx + 0.12, -0.12, Z + 0.01), (rx - 0.05, -0.02, Z + 0.01), (rx - 0.045, 0.03, Z + 0.035)],
    [(rx + 0.045, 0.06, Z + 0.035), (rx + 0.12, 0.0, Z + 0.01), (bx - 0.04, -0.06, Z + 0.01), (bx - 0.03, -0.05, Z + 0.01)],
    [(bx + 0.03, -0.05, Z + 0.01), (bx + 0.1, -0.1, Z + 0.01), (ax - 0.04, -0.03, Z + 0.012)],
    [(ax + 0.04, -0.03, Z + 0.012), (ax, -0.18, Z + 0.01), (0, -0.2, Z + 0.01), (px + 0.07, -0.12, Z + 0.01), (px + 0.07, -0.08, Z + 0.035)],
]
for i, pts in enumerate(leads):
    wire(f"lead_{i}", pts, red if i % 2 == 0 else blk)

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models/physics-bench.glb"))
export(out)
if "--preview" in sys.argv:
    preview(sys.argv[sys.argv.index("--preview") + 1], target=(0, 0, 0.05), dist=1.5, elev=0.55, az=-0.15)
print("exported", out)
