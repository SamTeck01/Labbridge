"""Pourable titration props (origin at base centre, pour lip marked with an anchor):
naoh-bottle (500 mL reagent bottle of 0.1 M NaOH) and hcl-cylinder (25 mL measuring cylinder)."""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models"))

def naoh_bottle():
    reset()
    glass = mat("clear_glass", (0.95, 0.97, 1.0), rough=0.02, transmission=1.0, ior=1.47)
    label = mat("label_naoh", (0.9, 0.9, 0.86), rough=0.9)
    band = mat("hazard_band", (0.55, 0.04, 0.02), rough=0.6)
    lathe("bottle_glass", [(0.0, 0.0), (0.036, 0.0), (0.04, 0.005), (0.04, 0.12), (0.034, 0.14), (0.016, 0.158),
                           (0.015, 0.175), (0.0175, 0.178), (0.0175, 0.184), (0.0145, 0.184)], glass, thickness=0.002)
    lathe("label_naoh", [(0.0405, 0.035), (0.0405, 0.095)], label)
    lathe("hazard_band", [(0.0406, 0.089), (0.0406, 0.095)], band)
    empty("anchor_base", (0, 0, 0.003))
    empty("anchor_lip", (0, -0.0175, 0.184))  # pour from the front of the neck
    export(f"{OUT}/naoh-bottle.glb")

def hcl_cylinder():
    reset()
    glass = mat("clear_glass", (0.95, 0.97, 1.0), rough=0.02, transmission=1.0, ior=1.47)
    ink = mat("graduation_ink", (0.02, 0.02, 0.02), rough=0.6)
    tag = mat("tag_blue", (0.05, 0.2, 0.55), rough=0.5)
    # hexagonal foot
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.03, depth=0.008, location=(0, 0, 0.004))
    smooth(assign(bpy.context.object, glass)); bpy.context.object.name = "cylinder_foot"
    lathe("cylinder_glass", [(0.0, 0.008), (0.0115, 0.008), (0.0115, 0.165), (0.013, 0.168), (0.0125, 0.17)], glass, thickness=0.0012)
    box("pour_spout", (0.008, 0.01, 0.004), (0, -0.013, 0.168), glass, bev=0.001)
    for i in range(26):
        z = 0.02 + i * 0.0055
        box("grad", (0.006 if i % 5 == 0 else 0.0035, 0.0004, 0.0004), (0.004, -0.0118, z), ink, bev=0)
    box("tag", (0.014, 0.001, 0.012), (-0.006, -0.0122, 0.16), tag, bev=0)
    empty("anchor_base", (0, 0, 0.009))
    empty("anchor_lip", (0, -0.017, 0.169))
    export(f"{OUT}/hcl-cylinder.glb")

for f in (naoh_bottle, hcl_cylinder):
    f(); print("exported", f.__name__)
