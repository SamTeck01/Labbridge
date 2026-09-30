"""Converts the Mixamo Dr. Curie FBX (walk, with skin) into a small game-ready glb.
Usage: python3 tools/blender/dr_curie.py path/to/curie.fbx [idle.fbx]
- strips root motion so the game drives her position
- adds an "Idle" clip (from idle.fbx if given, else a relaxed hold from the walk)
- decimates heavy meshes and downsizes textures (compressed later by build_all.sh)"""
import sys, os, bpy

src = sys.argv[1]
idle_src = sys.argv[2] if len(sys.argv) > 2 else None
out = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models/dr-curie.glb"))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=False)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
walk = arm.animation_data.action
walk.name = "Walk"

def strip_root_motion(action):
    for fc in action.fcurves:
        if 'Hips' in fc.data_path and fc.data_path.endswith('location') and fc.array_index == 2:
            first = fc.keyframe_points[0].co[1]
            for k in fc.keyframe_points:
                k.co[1] = first; k.handle_left[1] = first; k.handle_right[1] = first
strip_root_motion(walk)

if idle_src:
    before = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=idle_src, automatic_bone_orientation=False)
    idle = next(a for a in bpy.data.actions if a not in before)
    for o in [o for o in bpy.data.objects if o.type == 'ARMATURE' and o is not arm]:
        bpy.data.objects.remove(o, do_unlink=True)
    strip_root_motion(idle)
else:
    # Hold a mid-stride pose where the feet pass each other, with a slow breathing sway.
    idle = walk.copy()
    hold = 8.0
    for fc in idle.fcurves:
        v = fc.evaluate(hold)
        fc.keyframe_points.clear()
        breathe = 'Spine' in fc.data_path and fc.data_path.endswith('rotation_quaternion') and fc.array_index == 1
        for f, dv in ((1, 0), (30, 0.012 if breathe else 0), (60, 0)):
            fc.keyframe_points.insert(f, v + dv)
idle.name = "Idle"

# Push both clips as NLA strips so the exporter writes each as its own animation.
arm.animation_data.action = None
for a in (idle, walk):
    tr = arm.animation_data.nla_tracks.new(); tr.name = a.name
    tr.strips.new(a.name, int(a.frame_range[0]), a)

# Lighter geometry: skinned decimation keeps weights.
for o in bpy.data.objects:
    if o.type == 'MESH':
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if tris > 5000:
            m = o.modifiers.new("decimate", 'DECIMATE'); m.ratio = 0.55
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_move_to_index(modifier="decimate", index=0)
            bpy.ops.object.modifier_apply(modifier="decimate")

# 4K textures -> 1K (2K for the body/face atlas).
for img in bpy.data.images:
    if img.size[0] > 1024:
        target = 2048 if 'Body' in img.name else 1024
        img.scale(target, target)
        img.pack()

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_skins=True, export_yup=True,
                          export_image_format='JPEG', export_jpeg_quality=85)
print("exported", out)
