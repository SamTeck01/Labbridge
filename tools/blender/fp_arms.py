"""First-person arms cut from the Mixamo Dr. Curie character (realistic rigged hands).
Keeps forearms + hands (gloved) and lab-coat sleeves; forearm bones become roots aimed forward,
palms down, so the game can place each hand anywhere and curl the real finger bones.
Usage: python3 tools/blender/fp_arms.py path/to/curie.fbx [--preview out.png] [--curl]"""
import sys, os, math, bpy, bmesh
from mathutils import Matrix, Vector
sys.path.insert(0, os.path.dirname(__file__))
from common import mat, preview

src = sys.argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, automatic_bone_orientation=False)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
arm.animation_data_clear()

KEEP = lambda g: ('ForeArm' in g) or ('Hand' in g)

# Drop everything except body (hands) and coat (sleeves)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and not any(k in o.name for k in ('Body', 'Coat')):
        bpy.data.objects.remove(o, do_unlink=True)

# Units: bake the FBX 0.01 scale / rotation into real metres
bpy.ops.object.select_all(action='SELECT')
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes:
    names = {g.index: g.name for g in o.vertex_groups}
    bm = bmesh.new(); bm.from_mesh(o.data)
    dl = bm.verts.layers.deform.active
    kill = []
    for v in bm.verts:
        w = v[dl] if dl else {}
        best = max(w.items(), key=lambda kv: kv[1])[0] if w else None
        if best is None or not KEEP(names.get(best, '')):
            kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(o.data); bm.free()
    o.data.materials.clear()
    if 'Coat' in o.name:
        o.data.materials.append(mat("lab_coat_sleeve", (0.8, 0.81, 0.82), rough=0.85))
    else:
        o.data.materials.append(mat("nitrile_glove", (0.02, 0.1, 0.42), rough=0.4))

# Bones: keep forearm/hand chains only; forearms become roots
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones
for b in list(eb):
    if not KEEP(b.name):
        eb.remove(b)
for b in eb:
    if 'ForeArm' in b.name:
        b.parent = None
bpy.ops.object.mode_set(mode='POSE')

# Aim each forearm forward (+Y), keeping palms down; place elbows low and to the sides.
for side, x in (('Right', 0.2), ('Left', -0.2)):
    pb = next(p for p in arm.pose.bones if p.name.endswith(f'{side}ForeArm'))
    cur = (pb.tail - pb.head).normalized()
    ang = math.atan2(cur.x, cur.y)  # rotate about Z so the bone points along +Y
    R = Matrix.Rotation(ang, 4, 'Z')
    m = R @ pb.matrix
    m.translation = Vector((x, -0.28, -0.05))
    pb.matrix = m
    bpy.context.view_layer.update()

# Bake this pose into the mesh and make it the rest pose
bpy.ops.object.mode_set(mode='OBJECT')
for o in meshes:
    bpy.context.view_layer.objects.active = o
    mod = next(m for m in o.modifiers if m.type == 'ARMATURE')
    bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
for o in meshes:
    m = o.modifiers.new("Armature", 'ARMATURE'); m.object = arm

if "--curl" in sys.argv:  # preview check: curl right index to find the curl axis
    for p in arm.pose.bones:
        if 'RightHandIndex' in p.name or 'RightHandMiddle' in p.name:
            p.rotation_mode = 'XYZ'; p.rotation_euler = (math.radians(60), 0, 0)

out = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../public/models/fp-arms.glb"))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_skins=True, export_animations=False, export_yup=True)
for o in meshes:
    print(o.name, "verts", len(o.data.vertices))
print("bones", [b.name for b in arm.data.bones][:8], len(arm.data.bones))
if "--preview" in sys.argv:
    bpy.context.view_layer.update()
    for o in meshes:
        ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
        pts = [o.matrix_world @ v.co for v in ev.to_mesh().vertices]
        print(o.name, "min", [round(min(p[i] for p in pts), 3) for i in range(3)], "max", [round(max(p[i] for p in pts), 3) for i in range(3)])
    # first-person-ish view: from behind and above the elbows, looking forward/down
    preview(sys.argv[sys.argv.index("--preview") + 1], target=(0, 0.0, -0.08), dist=0.55, elev=0.55, az=0.0, floor=False)
print("exported", out)
