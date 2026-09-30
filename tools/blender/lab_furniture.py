"""Lab furniture, each exported to its own .glb (front faces -Y = toward the room):
lab-stool, fume-hood, safety-shower, whiteboard, reagent-shelf."""
import sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import *

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models"))

def materials():
    return dict(
        chrome=mat("chrome", (0.85, 0.86, 0.88), metal=1.0, rough=0.12),
        steel=mat("brushed_steel", (0.62, 0.63, 0.65), metal=1.0, rough=0.28),
        black=mat("black_plastic", (0.03, 0.03, 0.03), rough=0.4),
        seat=mat("seat_pu", (0.02, 0.06, 0.16), rough=0.55),
        white=mat("powder_coat_white", (0.72, 0.73, 0.74), rough=0.4),
        epoxy=mat("black_epoxy", (0.025, 0.025, 0.028), rough=0.3),
        glass=mat("safety_glass", (0.9, 0.95, 1.0), rough=0.02, transmission=1.0, ior=1.5),
        green=mat("safety_green", (0.02, 0.35, 0.08), rough=0.4),
        yellow=mat("safety_yellow", (0.8, 0.55, 0.0), rough=0.4),
        board=mat("whiteboard", (0.85, 0.86, 0.86), rough=0.12),
        alu=mat("aluminium_frame", (0.7, 0.71, 0.72), metal=1.0, rough=0.3),
        amber=mat("amber_glass", (0.35, 0.12, 0.02), rough=0.05, transmission=0.8, ior=1.5),
        clear=mat("clear_glass", (0.95, 0.97, 1.0), rough=0.02, transmission=1.0, ior=1.47),
        cap_b=mat("cap_blue", (0.02, 0.1, 0.4), rough=0.4),
        cap_r=mat("cap_red", (0.5, 0.02, 0.02), rough=0.4),
        label=mat("label_paper", (0.85, 0.83, 0.78), rough=0.9),
        led=mat("led_panel", (1, 1, 1), emission=(1.0, 0.98, 0.95)),
    )

def stool():
    reset(); M = materials()
    for i in range(5):
        a = i * 2 * math.pi / 5
        leg = box("star_leg", (0.3, 0.035, 0.025), (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.06), M["chrome"], bev=0.008)
        leg.rotation_euler = (0, 0, a)
        cyl("castor", 0.025, 0.03, (math.cos(a) * 0.29, math.sin(a) * 0.29, 0.025), M["black"], verts=16, rot=(math.pi / 2, 0, a))
    cyl("gas_lift", 0.025, 0.42, (0, 0, 0.3), M["chrome"], verts=24)
    cyl("gas_lift_cover", 0.035, 0.2, (0, 0, 0.19), M["black"], verts=24)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.012, location=(0, 0, 0.3))
    smooth(assign(bpy.context.object, M["chrome"])); bpy.context.object.name = "foot_ring"
    lathe("lab_stool_seat", [(0, 0.54), (0.17, 0.54), (0.185, 0.555), (0.19, 0.585), (0.18, 0.61), (0.12, 0.62), (0, 0.62)], M["seat"])
    export(f"{OUT}/lab-stool.glb")

def fume_hood():
    reset(); M = materials()
    W, D = 2.4, 1.2
    box("hood_base_cabinet", (W, D - 0.1, 0.9), (0, 0.05, 0.45), M["white"], bev=0.01)
    box("hood_worktop", (W, D, 0.03), (0, 0, 0.915), M["epoxy"], bev=0.004)
    box("hood_back", (W, 0.05, 1.5), (0, D / 2 - 0.025, 1.68), M["white"], bev=0)
    for s in (-1, 1):
        box("hood_side", (0.12, D, 1.9), (s * (W / 2 - 0.06), 0, 1.88), M["white"], bev=0.01)
        box("hood_side_window", (0.01, 0.6, 0.9), (s * (W / 2 - 0.121), 0, 1.5), M["glass"], bev=0)
    box("hood_top", (W, D, 0.5), (0, 0, 2.58), M["white"], bev=0.01)
    box("hood_airfoil", (W - 0.24, 0.12, 0.03), (0, -D / 2 + 0.06, 0.95), M["steel"], bev=0.01)
    box("sash_glass", (W - 0.26, 0.012, 0.8), (0, -D / 2 + 0.03, 1.75), M["glass"], bev=0)
    box("sash_frame_bottom", (W - 0.24, 0.04, 0.05), (0, -D / 2 + 0.03, 1.35), M["alu"], bev=0.005)
    box("sash_handle", (1.2, 0.03, 0.02), (0, -D / 2, 1.34), M["alu"], bev=0.006)
    box("airflow_monitor", (0.14, 0.02, 0.1), (W / 2 - 0.2, -D / 2 + 0.005, 2.45), M["black"], bev=0.004)
    box("airflow_led", (0.03, 0.005, 0.015), (W / 2 - 0.2, -D / 2 - 0.006, 2.46), mat("led_green", (0.1, 0.9, 0.3), emission=(0.1, 0.9, 0.3)), bev=0)
    box("hood_light", (W - 0.4, 0.3, 0.01), (0, 0, 2.325), M["led"], bev=0)
    cyl("exhaust_duct", 0.18, 1.0, (0, 0.1, 3.3), M["steel"], verts=32)
    for i in range(3):
        box("cabinet_door", (0.76, 0.02, 0.7), (-0.78 + i * 0.78, -D / 2 + 0.04, 0.45), M["white"], bev=0.005)
        cyl("door_handle", 0.007, 0.14, (-0.78 + i * 0.78, -D / 2 + 0.02, 0.7), M["steel"], verts=12, rot=(0, math.pi / 2, 0))
    export(f"{OUT}/fume-hood.glb")

def safety_shower():
    reset(); M = materials()
    cyl("shower_pipe", 0.03, 2.8, (0, 0.05, 1.4), M["yellow"], verts=20)
    cyl("shower_arm", 0.025, 0.4, (0, -0.15, 2.72), M["yellow"], verts=20, rot=(math.pi / 2, 0, 0))
    lathe("shower_head", [(0, 2.62), (0.05, 2.62), (0.2, 2.56), (0.2, 2.55), (0, 2.55)], M["yellow"], loc=(0, -0.35, 0))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.07, minor_radius=0.01, location=(0, -0.35, 2.1), rotation=(math.pi / 2, 0, 0))
    smooth(assign(bpy.context.object, M["steel"])); bpy.context.object.name = "pull_ring"
    cyl("pull_rod", 0.006, 0.4, (0, -0.35, 2.33), M["steel"], verts=12)
    cyl("eyewash_arm", 0.02, 0.25, (0, -0.1, 1.05), M["yellow"], verts=16, rot=(math.pi / 2, 0, 0))
    lathe("eyewash_bowl", [(0.05, 0.95), (0.2, 1.05), (0.21, 1.07), (0.19, 1.06), (0.04, 0.97), (0, 0.97)], M["steel"], loc=(0, -0.3, 0))
    box("push_flag", (0.12, 0.01, 0.1), (0, -0.52, 1.08), M["green"], bev=0.004)
    box("safety_sign", (0.3, 0.01, 0.3), (0, 0.07, 2.2), M["green"], bev=0.004)
    box("floor_marking", (1.2, 1.2, 0.002), (0, -0.4, 0.001), mat("floor_stripe", (0.8, 0.55, 0.0), rough=0.6), bev=0)
    export(f"{OUT}/safety-shower.glb")

def whiteboard():
    reset(); M = materials()
    # origin at board centre (matches placement at y = 2.5)
    box("board_surface", (4.2, 0.02, 2.2), (0, 0, 0), M["board"], bev=0)
    for z in (1.12, -1.12):
        box("frame_h", (4.28, 0.04, 0.04), (0, -0.01, z), M["alu"], bev=0.006)
    for x in (2.12, -2.12):
        box("frame_v", (0.04, 0.04, 2.28), (x, -0.01, 0), M["alu"], bev=0.006)
    box("marker_tray", (3.6, 0.1, 0.02), (0, -0.07, -1.12), M["alu"], bev=0.004)
    for i, c in enumerate([(0.02, 0.02, 0.02), (0.02, 0.05, 0.4), (0.5, 0.02, 0.02), (0.02, 0.3, 0.05)]):
        cyl("marker", 0.01, 0.13, (-0.3 + i * 0.05, -0.08, -1.1), mat(f"marker_{i}", c, rough=0.4), verts=12, rot=(0, math.pi / 2, 0))
    box("eraser", (0.14, 0.05, 0.035), (0.4, -0.08, -1.09), M["black"], bev=0.006)
    export(f"{OUT}/whiteboard.glb")

def reagent_shelf():
    reset(); M = materials()
    rng = np.random.default_rng(3)
    # origin at the shelf plank (placed at y = 2.1 above each bench), hung from the ceiling
    box("shelf_plank", (3.2, 0.35, 0.03), (0, 0, 0), M["epoxy"], bev=0.004)
    box("shelf_lip", (3.2, 0.015, 0.05), (0, -0.17, 0.02), M["steel"], bev=0.002)
    for x in (-1.5, 1.5):
        cyl("hanging_rod", 0.012, 1.7, (x, 0, 0.85), M["steel"], verts=12)
    box("task_light", (2.8, 0.08, 0.03), (0, -0.08, -0.03), M["alu"], bev=0.005)
    box("task_light_diffuser", (2.7, 0.06, 0.004), (0, -0.08, -0.046), M["led"], bev=0)
    x = -1.45
    while x < 1.45:
        kind = rng.integers(0, 3)
        if kind == 0:   # amber reagent bottle
            h, r, m, cap = 0.16, 0.042, M["amber"], M["cap_r"]
        elif kind == 1:  # clear Duran bottle
            h, r, m, cap = 0.19, 0.04, M["clear"], M["cap_b"]
        else:            # wide-mouth powder jar
            h, r, m, cap = 0.11, 0.045, mat("hdpe_white", (0.75, 0.75, 0.72), rough=0.5), M["cap_b"]
        lathe("bottle", [(0, 0.015), (r - 0.004, 0.015), (r, 0.02), (r, h * 0.75), (r * 0.5, h * 0.9), (r * 0.45, h), (0, h)], m, loc=(x, -0.02, 0))
        cyl("cap", r * 0.5, 0.03, (x, -0.02, h + 0.015), cap, verts=20)
        lathe("label", [(r + 0.0005, h * 0.3), (r + 0.0005, h * 0.6)], M["label"], loc=(x, -0.02, 0))
        x += r * 2 + 0.03 + rng.random() * 0.05
    export(f"{OUT}/reagent-shelf.glb")

for f in (stool, fume_hood, safety_shower, whiteboard, reagent_shelf):
    f(); print("exported", f.__name__)
