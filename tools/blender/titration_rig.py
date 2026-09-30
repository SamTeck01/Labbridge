"""Titration rig: retort stand, 50 mL burette with PTFE stopcock, 250 mL Erlenmeyer flask,
magnetic stirrer, phenolphthalein dropper bottle. Output: public/models/titration-rig.glb"""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

reset()
steel   = mat("brushed_steel", (0.62, 0.63, 0.65), metal=1.0, rough=0.28)
paint   = mat("stand_paint", (0.10, 0.11, 0.13), rough=0.45)
glass   = mat("borosilicate", (0.95, 0.97, 1.0), rough=0.02, transmission=1.0, ior=1.47)
naoh    = mat("naoh_solution", (0.9, 0.95, 1.0), rough=0.05, transmission=0.9, ior=1.34)
flaskl  = mat("flask_solution", (0.97, 0.97, 0.97), rough=0.05, transmission=0.6, ior=1.34)
ptfe    = mat("ptfe_blue", (0.08, 0.35, 0.75), rough=0.4)
rubber  = mat("rubber", (0.06, 0.06, 0.06), rough=0.8)
ceramic = mat("ceramic_top", (0.92, 0.92, 0.9), rough=0.3)
stirbod = mat("stirrer_body", (0.85, 0.86, 0.88), rough=0.35)
ink     = mat("graduation_ink", (0.02, 0.02, 0.02), rough=0.6)
amber   = mat("amber_glass", (0.45, 0.2, 0.03), rough=0.05, transmission=0.8, ior=1.5)
white_p = mat("white_ptfe", (0.95, 0.95, 0.95), rough=0.4)
label   = mat("label_paper", (0.96, 0.94, 0.88), rough=0.9)

# --- Retort stand ---
box("stand_base", (0.30, 0.20, 0.014), (0, 0, 0.007), paint, bev=0.003)
for x in (-0.13, 0.13):
    for y in (-0.08, 0.08):
        cyl("foot", 0.008, 0.003, (x, y, 0.0015), rubber, verts=16)
rod_x, rod_y = -0.10, 0.06
cyl("stand_rod", 0.006, 0.62, (rod_x, rod_y, 0.31 + 0.014), steel, verts=24)
lathe("rod_cap", [(0, 0.634), (0.0065, 0.634), (0.0065, 0.638), (0, 0.642)], steel)

# --- Magnetic stirrer ---
sx, sy = 0.03, -0.02
box("stirrer_body", (0.15, 0.16, 0.055), (sx, sy, 0.014 + 0.0275), stirbod, bev=0.008)
box("stirrer_top", (0.13, 0.13, 0.005), (sx, sy + 0.005, 0.014 + 0.0575), ceramic, bev=0.002)
knob = empty("chem_stirrer_knob", (sx + 0.035, sy - 0.081, 0.04))
k = lathe("knob_mesh", [(0, 0), (0.012, 0), (0.012, 0.012), (0.010, 0.016), (0, 0.016)], rubber, loc=(0, 0, 0))
k.rotation_euler = (math.pi / 2, 0, 0); k.location = (0, 0, 0); k.parent = knob
box("led", (0.006, 0.002, 0.004), (sx - 0.04, sy - 0.0805, 0.045), mat("led_green", (0.1, 0.9, 0.3), emission=(0.1, 0.9, 0.3)), bev=0)

# --- Erlenmeyer flask (250 mL) ---
fz = 0.014 + 0.06
flask = empty("chem_flask", (sx, sy + 0.005, fz))
prof = [(0.0, 0.0), (0.036, 0.0), (0.041, 0.003), (0.042, 0.008), (0.034, 0.045), (0.022, 0.085),
        (0.016, 0.105), (0.0155, 0.128), (0.0175, 0.130), (0.0175, 0.134), (0.0145, 0.134)]
g = lathe("flask_glass", prof, glass, thickness=0.0015); g.parent = flask
liq = lathe("chem_flask_liquid", [(0, 0.002), (0.039, 0.002), (0.0405, 0.008), (0.0355, 0.038), (0, 0.038)], flaskl)
liq.parent = flask
bar = empty("chem_stir_bar", (0, 0, 0.007), parent=flask)
b = cyl("stir_bar_mesh", 0.0035, 0.025, (0, 0, 0), white_p, verts=16, rot=(0, math.pi / 2, 0), bev=0.0015); b.parent = bar

# --- Burette clamp ---
bx, by = sx, sy + 0.005
box("boss_head", (0.02, 0.022, 0.028), (rod_x, rod_y, 0.47), steel, bev=0.002)
cyl("clamp_arm", 0.004, (rod_y - by) + 0.0, (rod_x + 0.005, (rod_y + by) / 2, 0.47), steel, verts=16, rot=(math.pi / 2, 0, 0))
cyl("clamp_arm_x", 0.004, abs(bx - rod_x), ((bx + rod_x) / 2, by, 0.47), steel, verts=16, rot=(0, math.pi / 2, 0))
for dx in (-0.011, 0.011):
    box("clamp_jaw", (0.004, 0.02, 0.022), (bx + dx, by, 0.47), rubber, bev=0.0015)
lathe("boss_screw", [(0, 0), (0.004, 0), (0.004, 0.02), (0.009, 0.02), (0.009, 0.026), (0, 0.026)], steel,
      loc=(rod_x - 0.01, rod_y, 0.47)).rotation_euler = (0, -math.pi / 2, 0)

# --- Burette (50 mL) ---
tube_bot, tube_top = 0.262, 0.61
lathe("burette_glass", [(0.0065, tube_bot), (0.0065, tube_top), (0.0072, tube_top + 0.002), (0.0072, tube_top + 0.004)], glass, thickness=0.001)
lathe("burette_tip", [(0.0, 0.228), (0.0012, 0.228), (0.002, 0.236), (0.004, 0.245), (0.0065, 0.252), (0.0065, 0.262)], glass, thickness=0.0006)
cyl("burette_naoh", 0.0055, 0.26, (bx, by, 0.262 + 0.13), naoh, verts=24)
for obj_name in ("burette_glass", "burette_tip"):
    o = bpy.data.objects[obj_name]; o.location = (bx, by, 0)
# graduations every mL (major every 5 mL)
for i in range(51):
    z = tube_top - 0.02 - i * 0.0062
    major = i % 5 == 0
    box("grad", (0.004 if major else 0.0022, 0.0004, 0.00045), (bx - 0.0045, by - 0.0058, z), ink, bev=0)

# stopcock: pivot at valve centre, handle vertical = open (matches runtime rotation.z)
sc = empty("chem_stopcock", (bx, by, 0.255))
body = cyl("stopcock_barrel", 0.0045, 0.03, (bx, by, 0.255), glass, verts=24, rot=(math.pi / 2, 0, 0))
parent(cyl("stopcock_plug", 0.0038, 0.036, (bx, by, 0.255), ptfe, verts=24, rot=(math.pi / 2, 0, 0)), sc)
parent(box("stopcock_handle", (0.006, 0.004, 0.028), (bx, by - 0.02, 0.255), ptfe, bev=0.0015), sc)
parent(cyl("stopcock_nut", 0.005, 0.004, (bx, by + 0.02, 0.255), ptfe, verts=6, rot=(math.pi / 2, 0, 0)), sc)

# --- Phenolphthalein dropper bottle ---
ind = empty("chem_indicator", (0.14, -0.06, 0.014))
parent(lathe("bottle", [(0, 0), (0.014, 0), (0.016, 0.004), (0.016, 0.045), (0.011, 0.055), (0.006, 0.058), (0.006, 0.064), (0, 0.064)], amber, loc=(0.14, -0.06, 0.014)), ind)
parent(lathe("pipette_bulb", [(0.003, 0.064), (0.0075, 0.064), (0.0075, 0.072), (0.006, 0.085), (0, 0.09)], rubber, loc=(0.14, -0.06, 0.014)), ind)
lbl = lathe("label", [(0.0162, 0.012), (0.0162, 0.036)], label, loc=(0.14, -0.06, 0.014)); parent(lbl, ind)

for o in bpy.data.objects:
    if o.type == 'MESH':
        bpy.context.view_layer.objects.active = o

out = os.path.join(os.path.dirname(__file__), "../../public/models/titration-rig.glb")
export(os.path.abspath(out))
if "--preview" in sys.argv:
    preview(sys.argv[sys.argv.index("--preview") + 1], target=(0.02, 0, 0.28), dist=0.95, elev=0.25)
print("exported", os.path.abspath(out))
