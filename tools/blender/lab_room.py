"""Lab room shell: vinyl floor, painted walls, suspended ceiling with LED panels, windows,
skirting, and four island benches (black epoxy top, grey base cabinets, gas taps, sockets).
Room 24 x 24 m, benches at (+-4.5, +-3.5), bench top surface at 0.94 m.
Output: public/models/lab-room.glb"""
import sys, os, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import *

reset()
rng = np.random.default_rng(7)
H = 3.8  # ceiling height

# --- Textures (generated, no external files) ---
def vinyl_tiles(n=512):
    base = np.array([0.56, 0.58, 0.58])
    img = np.ones((n, n, 4)); img[..., :3] = base
    speck = rng.random((n, n))
    img[speck > 0.97, :3] = [0.35, 0.37, 0.38]
    img[speck < 0.02, :3] = [0.75, 0.76, 0.75]
    tile_var = rng.normal(0, 0.012, (2, 2))
    for i in range(2):
        for j in range(2):
            img[i*n//2:(i+1)*n//2, j*n//2:(j+1)*n//2, :3] += tile_var[i, j]
    img[::n//2, :, :3] *= 0.8; img[:, ::n//2, :3] *= 0.8   # grout seams
    return np.clip(img, 0, 1)

def ceiling_tiles(n=256):
    img = np.ones((n, n, 4)); img[..., :3] = 0.86
    img[..., :3] -= rng.random((n, n, 1)) * 0.04  # fissured mineral fibre
    img[:3, :, :3] = 0.7; img[:, :3, :3] = 0.7      # T-bar grid
    return np.clip(img, 0, 1)

floor_m = textured_mat("vinyl_floor", image_texture("vinyl", vinyl_tiles(), 512), rough=0.45)
ceil_m = textured_mat("ceiling_tile", image_texture("ceiling", ceiling_tiles(), 256), rough=0.9)
wall_m = mat("wall_paint", (0.80, 0.80, 0.77), rough=0.8)
skirt_m = mat("skirting_vinyl", (0.18, 0.19, 0.2), rough=0.6)
epoxy = mat("black_epoxy", (0.025, 0.025, 0.028), rough=0.3)
cab = mat("cabinet_grey", (0.62, 0.64, 0.66), rough=0.45)
cab_dark = mat("cabinet_plinth", (0.12, 0.12, 0.13), rough=0.7)
steel = mat("brushed_steel", (0.62, 0.63, 0.65), metal=1.0, rough=0.28)
led = mat("led_panel", (1, 1, 1), rough=0.3, emission=(1.0, 0.98, 0.95))
frame_m = mat("window_frame", (0.85, 0.86, 0.87), metal=0.6, rough=0.35)
sky = mat("exterior", (0.62, 0.78, 0.92), emission=(0.62, 0.78, 0.92))
gas_y = mat("gas_yellow", (0.9, 0.7, 0.05), rough=0.4)
socket = mat("socket_white", (0.93, 0.93, 0.92), rough=0.4)

# --- Floor & ceiling ---
bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, 0)); f = bpy.context.object; f.name = "floor"
assign(f, floor_m); scale_uvs(f, 12)
bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, H), rotation=(math.pi, 0, 0)); c = bpy.context.object; c.name = "ceiling"
assign(c, ceil_m); scale_uvs(c, 40)
for x in (-4.5, 4.5, 0):
    for y in (-3.5, 3.5, 0) if x else (-8, 0, 8):
        box("led_panel", (1.2, 0.6, 0.03), (x, y, H - 0.015), led, bev=0.002)
        box("led_frame", (1.24, 0.64, 0.02), (x, y, H - 0.005), frame_m, bev=0)

# --- Walls (Blender Y = -three Z) ---
def wall(name, size, loc):
    return box(name, size, loc, wall_m, bev=0)
wall("wall_back", (24, 0.2, H), (0, 12.1, H / 2))    # three z = -12
wall("wall_front", (24, 0.2, H), (0, -12.1, H / 2))  # three z = +12
wall("wall_right", (0.2, 24, H), (12.1, 0, H / 2))
# left wall with three window openings (three z -6,0,6 -> blender y 6,0,-6)
segs = [(-12, -7.6), (-4.4, -1.6), (1.6, 4.4), (7.6, 12)]
for a, b in segs:
    wall("wall_left", (0.2, b - a, H), (-12.1, (a + b) / 2, H / 2))
for wy in (-6, 0, 6):
    wall("wall_left_sill", (0.2, 3.2, 0.9), (-12.1, wy, 0.45))
    wall("wall_left_head", (0.2, 3.2, H - 3.3), (-12.1, wy, (3.3 + H) / 2))
    box("window_sill", (0.3, 3.3, 0.04), (-11.95, wy, 0.92), frame_m, bev=0.005)
    for dz in (0.9, 3.3):
        box("win_frame_h", (0.1, 3.2, 0.06), (-12.05, wy, dz), frame_m, bev=0.004)
    for dy in (-1.6, 0, 1.6):
        box("win_frame_v", (0.1, 0.06, 2.4), (-12.05, wy + dy, 2.1), frame_m, bev=0.004)
    box("exterior_view", (0.02, 3.2, 2.4), (-12.4, wy, 2.1), sky, bev=0)
for name, size, loc in [("skirt_b", (24, 0.02, 0.1), (0, 11.99, 0.05)), ("skirt_f", (24, 0.02, 0.1), (0, -11.99, 0.05)),
                        ("skirt_r", (0.02, 24, 0.1), (11.99, 0, 0.05)), ("skirt_l", (0.02, 24, 0.1), (-11.99, 0, 0.05))]:
    box(name, size, loc, skirt_m, bev=0)

# --- Island benches ---
def bench(cx, cy):
    top_h, top_t = 0.94, 0.025
    box("bench_top", (3.6, 1.8, top_t), (cx, cy, top_h - top_t / 2), epoxy, bev=0.004)
    box("bench_plinth", (3.4, 1.6, 0.1), (cx, cy, 0.05), cab_dark, bev=0)
    # base cabinets both long sides: 4 units each, drawer + door
    for side in (-1, 1):
        fy = cy + side * 0.79
        for i in range(4):
            ux = cx - 1.275 + i * 0.85
            box("cab_door", (0.82, 0.02, 0.56), (ux, fy, 0.1 + 0.29), cab, bev=0.004)
            box("cab_drawer", (0.82, 0.02, 0.17), (ux, fy, 0.1 + 0.56 + 0.11), cab, bev=0.004)
            for z in (0.62, 0.77):
                cyl("handle", 0.006, 0.14, (ux, fy + side * 0.025, z), steel, verts=12, rot=(0, math.pi / 2, 0))
    box("bench_carcass", (3.4, 1.56, 0.8), (cx, cy, 0.1 + 0.4), cab, bev=0)
    # service turrets on the short ends: gas tap + sockets
    for side in (-1, 1):
        tx = cx + side * 1.65
        box("service_turret", (0.14, 0.3, 0.12), (tx, cy, top_h + 0.06), cab, bev=0.01)
        cyl("gas_tap", 0.012, 0.06, (tx, cy + 0.1, top_h + 0.14), gas_y, verts=16)
        cyl("gas_nozzle", 0.005, 0.07, (tx - side * 0.04, cy + 0.1, top_h + 0.16), steel, verts=12, rot=(0, math.pi / 2, 0))
        box("socket", (0.005, 0.08, 0.08), (tx - side * 0.071, cy - 0.06, top_h + 0.06), socket, bev=0.002)

for x, z in [(-4.5, -3.5), (4.5, -3.5), (-4.5, 3.5), (4.5, 3.5)]:
    bench(x, -z)

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models/lab-room.glb"))
export(out)
print("exported", out)
