"""Shared helpers for LabBridge asset scripts (run with Python + the `bpy` wheel)."""
import bpy, bmesh, math
from mathutils import Vector

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, metal=0.0, rough=0.5, transmission=0.0, ior=1.45, alpha=1.0, emission=None):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["IOR"].default_value = ior
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha; m.blend_method = 'BLEND'
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1); b.inputs["Emission Strength"].default_value = 3
    return m

def assign(obj, m):
    obj.data.materials.clear(); obj.data.materials.append(m); return obj

def smooth(obj, angle=35):
    for p in obj.data.polygons: p.use_smooth = True
    try:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    except Exception: pass
    return obj

def bevel(obj, width=0.003, segments=3):
    mod = obj.modifiers.new("bevel", 'BEVEL'); mod.width = width; mod.segments = segments; mod.limit_method = 'ANGLE'
    return obj

def box(name, size, loc, m, bev=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bev: bevel(o, bev)
    return smooth(assign(o, m))

def cyl(name, r, h, loc, m, verts=48, rot=(0,0,0), bev=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    if bev: bevel(o, bev)
    return smooth(assign(o, m))

def lathe(name, profile, m, loc=(0,0,0), steps=64, thickness=0.0):
    """Revolve a list of (radius, z) points around Z. Glassware, bottles, knobs."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in profile]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.location = loc
    s = o.modifiers.new("screw", 'SCREW'); s.steps = steps; s.render_steps = steps; s.use_merge_vertices = True; s.use_normal_calculate = True
    if thickness:
        t = o.modifiers.new("solid", 'SOLIDIFY'); t.thickness = thickness; t.offset = -1
    bpy.context.view_layer.objects.active = o
    return smooth(assign(o, m), 60)

def empty(name, loc=(0,0,0), parent=None):
    o = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(o); o.location = loc
    if parent: o.parent = parent
    return o

def parent(child, par):
    bpy.context.view_layer.update()  # fresh world matrices for newly created objects
    mw = child.matrix_world.copy(); child.parent = par; child.matrix_world = mw
    return child

def export(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True)

def preview(path, target=(0,0,0.3), dist=1.1, elev=0.35, az=-0.6, floor=True):
    """Studio render for review."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 64; sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 900, 900
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.82, 0.85, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    if floor:
        bpy.ops.mesh.primitive_plane_add(size=6); fl = bpy.context.object
        assign(fl, mat("studio_floor", (0.05, 0.05, 0.055), rough=0.35))
    for loc, e in [((1.5, -1.5, 2.5), 220), ((-2, -0.5, 1.5), 80), ((0, 2, 2), 120)]:
        bpy.ops.object.light_add(type='AREA', location=loc); l = bpy.context.object
        l.data.energy = e; l.data.size = 1.5
        l.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    t = Vector(target); cam_loc = t + Vector((math.sin(az)*math.cos(elev), -math.cos(az)*math.cos(elev), math.sin(elev))) * dist
    bpy.ops.object.camera_add(location=cam_loc); c = bpy.context.object
    c.rotation_euler = (t - cam_loc).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = 50
    sc.camera = c; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def image_texture(name, pixels, size):
    """Create a Blender image from a numpy float array (h, w, 4) in 0..1."""
    img = bpy.data.images.new(name, size, size, alpha=False)
    img.pixels.foreach_set(pixels.astype("float32").ravel())
    img.pack()
    return img

def textured_mat(name, img, rough=0.5, metal=0.0, rough_img=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m

def scale_uvs(obj, sx, sy=None):
    sy = sy or sx
    for loop in obj.data.uv_layers.active.data:
        loop.uv = (loop.uv[0] * sx, loop.uv[1] * sy)

def wire(name, points, m, radius=0.0025):
    """Flexible cable through a list of 3D points (smooth bezier tube)."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = radius; cu.bevel_resolution = 3
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(points) - 1)
    for bp, p in zip(sp.bezier_points, points):
        bp.co = p; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return smooth(assign(bpy.context.object, m))
