"""Analytical balance (0.1 mg) with glass draft shield and sliding door, benchtop centrifuge
with hinged lid and rotor, tube rack. 1.6 m wide. Output: public/models/analytical-bench.glb"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

reset()
white = mat("instrument_white", (0.7, 0.71, 0.72), rough=0.35)
dgrey = mat("instrument_dark", (0.05, 0.055, 0.06), rough=0.4)
steel = mat("brushed_steel", (0.62, 0.63, 0.65), metal=1.0, rough=0.28)
glass = mat("shield_glass", (0.95, 0.97, 1.0), rough=0.02, transmission=1.0, ior=1.5)
lcd = mat("lcd_display", (0.15, 0.35, 0.3), rough=0.2, emission=(0.3, 0.9, 0.7))
btn = mat("button_blue", (0.02, 0.15, 0.45), rough=0.4)
btn_g = mat("button_green", (0.02, 0.35, 0.08), rough=0.4)
alu = mat("rotor_aluminium", (0.7, 0.71, 0.72), metal=1.0, rough=0.35)
tube = mat("tube_pp", (0.9, 0.9, 0.85), rough=0.2, transmission=0.5)
cap_c = mat("tube_cap", (0.5, 0.05, 0.3), rough=0.4)
rack = mat("rack_blue", (0.04, 0.15, 0.4), rough=0.5)
smoke = mat("smoked_window", (0.1, 0.12, 0.14), rough=0.05, transmission=0.7, ior=1.5)

# ---------- Analytical balance (left) ----------
bx = -0.35
box("balance_body", (0.22, 0.36, 0.09), (bx, 0.02, 0.045), white, bev=0.01)
box("balance_front_panel", (0.2, 0.06, 0.03), (bx, -0.17, 0.035), dgrey, bev=0.006)
box("res_balance_display", (0.09, 0.004, 0.018), (bx, -0.2, 0.04), lcd, bev=0)
tare = empty("res_tare_btn", (bx + 0.07, -0.201, 0.035))
parent(box("tare_button", (0.022, 0.006, 0.012), (bx + 0.07, -0.201, 0.035), btn, bev=0.002), tare)
box("power_btn", (0.016, 0.006, 0.012), (bx - 0.075, -0.201, 0.035), dgrey, bev=0.002)
# draft shield: frame + fixed glass, sliding door on the right side (slides back +Y)
sz0, sh = 0.09, 0.22
box("shield_top", (0.2, 0.26, 0.008), (bx, 0.06, sz0 + sh), white, bev=0.003)
for (x, y, sx, sy) in [(bx - 0.1, 0.06, 0.004, 0.26), (bx, -0.07, 0.2, 0.004), (bx, 0.19, 0.2, 0.004)]:
    box("shield_glass", (sx, sy, sh), (x, y, sz0 + sh / 2), glass, bev=0)
for x in (bx - 0.1, bx + 0.1):
    for y in (-0.07, 0.19):
        box("shield_post", (0.008, 0.008, sh), (x, y, sz0 + sh / 2), white, bev=0.002)
door = empty("res_balance_door", (bx + 0.1, 0.06, sz0))
parent(box("door_glass", (0.004, 0.25, sh - 0.01), (bx + 0.102, 0.06, sz0 + sh / 2), glass, bev=0), door)
parent(box("door_handle", (0.012, 0.04, 0.012), (bx + 0.108, -0.02, sz0 + sh - 0.03), white, bev=0.003), door)
lathe("weighing_pan", [(0, 0.1), (0.045, 0.1), (0.047, 0.104), (0, 0.104)], steel, loc=(bx, 0.06, 0))
cyl("pan_stem", 0.006, 0.012, (bx, 0.06, 0.094), steel, verts=16)
lathe("weigh_boat", [(0, 0.104), (0.02, 0.104), (0.028, 0.114), (0.0275, 0.114), (0.0195, 0.105), (0, 0.105)], mat("weigh_boat", (0.9, 0.9, 0.9), rough=0.5), loc=(bx, 0.06, 0))

# ---------- Benchtop centrifuge (right) ----------
cx = 0.3
lathe("centrifuge_body", [(0, 0), (0.17, 0), (0.18, 0.01), (0.18, 0.2), (0.17, 0.21), (0, 0.21)], white, loc=(cx, 0.04, 0))
box("centrifuge_console", (0.2, 0.08, 0.1), (cx, -0.15, 0.06), white, bev=0.02)
box("centrifuge_lcd", (0.08, 0.004, 0.025), (cx - 0.03, -0.191, 0.08), lcd, bev=0)
st = empty("res_centrifuge_start", (cx + 0.06, -0.192, 0.08))
parent(cyl("start_button", 0.012, 0.008, (cx + 0.06, -0.192, 0.08), btn_g, verts=24, rot=(math.pi / 2, 0, 0), bev=0.002), st)
rotor = empty("res_centrifuge_rotor", (cx, 0.04, 0.17))
parent(lathe("rotor", [(0, 0.15), (0.13, 0.15), (0.14, 0.17), (0.06, 0.2), (0.015, 0.2), (0.015, 0.215), (0, 0.215)], alu, loc=(cx, 0.04, 0)), rotor)
for i in range(8):
    a = i * math.pi / 4
    x, y = cx + math.cos(a) * 0.1, 0.04 + math.sin(a) * 0.1
    parent(cyl("rotor_tube", 0.009, 0.03, (x, y, 0.19), tube, verts=16), rotor)
    parent(cyl("rotor_cap", 0.0095, 0.006, (x, y, 0.207), cap_c, verts=16), rotor)
# lid hinged at the back (+Y); smoked viewing window
lid = empty("res_centrifuge_lid", (cx, 0.22, 0.21))
parent(lathe("lid_shell", [(0, 0.21), (0.175, 0.21), (0.175, 0.225), (0.16, 0.24), (0, 0.245)], white, loc=(cx, 0.04, 0)), lid)
parent(cyl("lid_window", 0.08, 0.004, (cx, 0.04, 0.246), smoke, verts=48), lid)

# ---------- Tube rack with samples ----------
box("tube_rack", (0.16, 0.06, 0.05), (0.62, -0.05, 0.025), rack, bev=0.004)
for i in range(6):
    x = 0.56 + i * 0.024
    cyl("sample_tube", 0.006, 0.09, (x, -0.05, 0.065), tube, verts=16)
    cyl("sample_cap", 0.0068, 0.012, (x, -0.05, 0.114), cap_c, verts=16)

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models/analytical-bench.glb"))
export(out)
if "--preview" in sys.argv:
    preview(sys.argv[sys.argv.index("--preview") + 1], target=(0.1, 0, 0.1), dist=1.3, elev=0.4, az=-0.25)
print("exported", out)
