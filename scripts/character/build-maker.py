"""Build CTRL's clothed Maker avatar from the CC0 Quaternius Standard packs.

Run with Blender Python (bpy 5.x), passing --assets and --output.
Source packs remain outside the website. Output is a self-contained glTF binary.
"""
import argparse
import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

parser = argparse.ArgumentParser()
parser.add_argument('--assets', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
base = args.assets / 'universal-base/Universal Base Characters[Standard]'
anim = args.assets / 'universal-animation/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 24
bpy.ops.import_scene.gltf(filepath=str(base / 'Base Characters/Godot - UE/Superhero_Female_FullBody.gltf'))
rig = bpy.data.objects['Armature']
rig.name = 'MakerRig'
body = bpy.data.objects['Superhero_Female']
body.name = 'MakerSkin'
parts = [body, bpy.data.objects['Eyes'], bpy.data.objects['Eyebrows']]

# Imported glTF is in Blender's Z-up coordinates, with the face toward -Y.
def active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def material(name, color, roughness=.75, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metal
    return m


# Linear colors, chosen to read as terracotta / cream / cobalt under daylight.
cream = material('Maker · cotton', (.80, .73, .58))
orange = material('Maker · terracotta canvas', (.50, .155, .054))
seam = material('Maker · canvas stitching', (.70, .30, .11))
blue = material('Maker · cobalt tool bag', (.024, .09, .24))
black = material('Maker · rubber and straps', (.023, .028, .03))
brass = material('Maker · brushed hardware', (.39, .32, .19), .38, .5)
hairmat = material('Maker · soft black hair', (.014, .012, .011), .48)

# Keep the artist's face and iris artwork; omit oversized/missing normal maps.
for obj in parts:
    for m in obj.data.materials:
        if not m or not m.use_nodes:
            continue
        p = m.node_tree.nodes.get('Principled BSDF')
        for key in ['Normal', 'Roughness']:
            for link in list(p.inputs[key].links):
                m.node_tree.links.remove(link)
        p.inputs['Roughness'].default_value = .78
        if obj == body:
            tex = next(n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and 'BaseColor' in n.image.name)
            tex.image = bpy.data.images.load(str(base / 'Base Characters/Textures/T_Superhero_Female_Light_BaseColor.png'))
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and max(n.image.size) > 1024:
                n.image.scale(1024, 1024)
parts[2].data.materials.clear()
parts[2].data.materials.append(hairmat)

# The source surface is retained for cloth fit and weighted skin binding.
source = body.copy()
source.data = body.data.copy()
source.name = 'FitReference'
bpy.context.collection.objects.link(source)
source.hide_render = True
bvh = BVHTree.FromPolygons([v.co for v in source.data.vertices], [p.vertices[:] for p in source.data.polygons])
kd = KDTree(len(source.data.vertices))
for v in source.data.vertices:
    kd.insert(v.co, v.index)
kd.balance()
source_groups = {g.index:g.name for g in source.vertex_groups}


def skin(obj, bone=None):
    """Interpolate three nearest source weights, or rigid-bind a small accessory."""
    active(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.vertex_groups.clear()
    if bone:
        obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    else:
        groups = {name:obj.vertex_groups.new(name=name) for name in source_groups.values()}
        for v in obj.data.vertices:
            near = kd.find_n(v.co, 3)
            weights = {}
            for _, i, distance in near:
                factor = 1 / max(distance, .00001)**2
                for g in source.data.vertices[i].groups:
                    name = source_groups[g.group]
                    weights[name] = weights.get(name, 0) + g.weight * factor
            best = sorted(weights.items(), key=lambda item:-item[1])[:4]
            total = sum(w for _, w in best)
            for name, weight in best:
                groups[name].add([v.index], weight / total, 'REPLACE')
    arm = obj.modifiers.new('Maker skin', 'ARMATURE')
    arm.object = rig
    obj.parent = rig
    parts.append(obj)
    return obj


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def solid(obj, thickness=.003):
    active(obj)
    s = obj.modifiers.new('Cloth edge', 'SOLIDIFY')
    s.thickness = thickness
    bpy.ops.object.modifier_apply(modifier=s.name)


def cut_surface(name, keep, transform, mat, planes=()):
    obj = source.copy()
    obj.data = source.data.copy()
    obj.name = name
    obj.hide_render = False
    obj.modifiers.clear()
    bpy.context.collection.objects.link(obj)
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    # glTF UV seams are split vertices. Weld before relaxation so garments
    # cannot tear open along those seams. Blender keeps the per-loop UVs.
    bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=.00001)
    if planes:
        for point, normal in planes:
            bmesh.ops.bisect_plane(mesh,geom=list(mesh.verts)+list(mesh.edges)+list(mesh.faces),dist=.000001,plane_co=point,plane_no=normal,clear_outer=True)
    else:
        bmesh.ops.delete(mesh, geom=[v for v in mesh.verts if not keep(v.co)], context='VERTS')
    mesh.normal_update()
    for v in mesh.verts:
        v.co = transform(v.co.copy(), v.normal.copy())
    mesh.to_mesh(obj.data)
    mesh.free()
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.material_index = 0
    smooth(obj)
    active(obj)
    sub = obj.modifiers.new('Cloth relaxation', 'SMOOTH')
    sub.factor = .45
    sub.iterations = 3
    bpy.ops.object.modifier_apply(modifier=sub.name)
    solid(obj)
    # Original weights survived the mesh cuts and the solidification.
    arm = obj.modifiers.new('Maker skin', 'ARMATURE')
    arm.object = rig
    obj.parent = rig
    parts.append(obj)
    return obj


tee = cut_surface('Cream short sleeve tee', lambda p:1.05<p.z<1.486 and abs(p.x)<.345,
                  lambda p,n:p+n*.019, cream, [((0,0,1.045),(0,0,-1)),((0,0,1.486),(0,0,1)),((.355,0,0),(1,0,0)),((-.355,0,0),(-1,0,0))])


def trouser_shape(p, n):
    if p.z < .85:
        center = .111 if p.x > 0 else -.111
        # Relaxed workwear, with room at knees and a gathered ankle.
        fullness = .025 + .016 * math.sin(math.pi * min(1, max(0, (p.z-.13)/.70)))
        radial = Vector((p.x-center, p.y-.040, 0))
        if radial.length:
            p += radial.normalized() * fullness
    else:
        p += n*.024
    if p.z < .18:
        center = .111 if p.x > 0 else -.111
        p.x = center + (p.x-center)*.78
        p.y = .045 + (p.y-.045)*.82
    return p


pants = cut_surface('Relaxed overall trousers', lambda p:.135<p.z<1.102, trouser_shape, orange, [((0,0,.105),(0,0,-1)),((0,0,1.125),(0,0,1))])


def mesh_part(name, vertices, faces, mat, bone=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return skin(obj, bone)


def front_y(x, z, offset=.024):
    hit = bvh.ray_cast(Vector((x,-1,z)), Vector((0,1,0)))
    return (hit[0].y if hit[0] else -.10) - offset


def patch(name, xs, zs, mat, offset=.056):
    def depth(x,z):
        y=front_y(x,z,offset)
        if name in ['Overall bib','Chest pocket']:
            t=min(1,max(0,(z-1.045)/.333))
            y=-.178-.018*math.sin(t*math.pi)+.012*(x/.125)**2-(offset-.056)
        return y
    verts = [(x,depth(x,z),z) for z in zs for x in xs]
    w = len(xs)
    faces = [(j*w+i,j*w+i+1,(j+1)*w+i+1,(j+1)*w+i) for j in range(len(zs)-1) for i in range(w-1)]
    obj = mesh_part(name, verts, faces, mat)
    return obj


bib = patch('Overall bib', [-.125+i*.25/12 for i in range(13)], [1.111+i*.267/16 for i in range(17)], orange)
# Shoulder straps conform to the actual body and remain part of the skin.
for side in [-1,1]:
    xs = [side*.112-.018+i*.036/4 for i in range(5)]
    patch('Front overall strap', xs, [1.36+i*.105/12 for i in range(13)], orange, .061)
    verts=[]
    for i in range(17):
        t=i/16
        y=-.10+t*.20
        for x in xs:
            hit=bvh.ray_cast(Vector((x,y,1.8)),Vector((0,0,-1)))
            z=(hit[0].z if hit[0] else 1.451)+.043
            verts.append((x,y,z))
    mesh_part('Shoulder overall strap',verts,[(j*5+i,j*5+i+1,(j+1)*5+i+1,(j+1)*5+i) for j in range(16) for i in range(4)],orange)
    verts=[]
    for j in range(15):
        z=1.105+j*.345/14
        x=side*(.035+.077*j/14)
        hit=bvh.ray_cast(Vector((x,1,z)),Vector((0,-1,0)))
        y=(hit[0].y if hit[0] else .1)+.034
        verts.extend([(x-.018,y,z),(x+.018,y,z)])
    mesh_part('Back overall strap',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(14)],orange)


def box(name, loc, scale, mat, bevel=.008, bone=None, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name=name
    obj.scale=scale
    if rotation:
        obj.rotation_euler=rotation
    active(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=obj.modifiers.new('Soft edges','BEVEL')
        mod.width=bevel
        mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(mat)
    smooth(obj)
    return skin(obj,bone)


def tube(name, points, radius, mat, bone=None):
    c=bpy.data.curves.new(name,'CURVE')
    c.dimensions='3D'
    c.resolution_u=2
    c.bevel_depth=radius
    c.bevel_resolution=2
    s=c.splines.new('POLY')
    s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*v,1)
    obj=bpy.data.objects.new(name,c)
    bpy.context.collection.objects.link(obj)
    active(obj)
    bpy.ops.object.convert(target='MESH')
    obj=bpy.context.object
    obj.data.materials.append(mat)
    return skin(obj,bone)


# Collar binding, bib pocket, stitched edges and brass buckles.
tube('Cotton collar',[(.069*math.cos(t),.027+.063*math.sin(t),1.476) for t in [i*math.tau/48 for i in range(49)]],.005,cream)
patch('Chest pocket',[-.065+i*.13/8 for i in range(9)],[1.215+i*.105/8 for i in range(9)],orange,.064)
for x in [-.121,.121]:
    tube('Bib stitch',[(x,min(front_y(x,z,.060),front_y(.07,z,.060),front_y(-.07,z,.060)),z) for z in [1.08+i*.28/20 for i in range(21)]],.0013,seam)
for side in [-1,1]:
    box('Strap buckle',(side*.111,front_y(side*.111,1.364,.070),1.364),(.033,.014,.029),brass,.004)
    box('Cargo pocket',(side*.179,-.060,.754),(.078,.036,.123),orange,.012)
    box('Cargo pocket flap',(side*.181,-.083,.805),(.083,.009,.028),seam,.003)
    box('Pocket rivet',(side*.180,-.09,.798),(.008,.005,.008),brass,.003)

# A blue belt and the practical, visible tool pouch.
verts=[]
for z in [1.064,1.108]:
    for i in range(64):
        a=i*math.tau/64
        verts.append((.179*math.cos(a),.014+(.191 if math.sin(a)<0 else .140)*math.sin(a),z))
mesh_part('Cobalt utility belt',verts,[(i,(i+1)%64,(i+1)%64+64,i+64) for i in range(64)],blue,'pelvis')
box('Belt buckle',(0,-.184,1.085),(.045,.015,.036),brass,.004,'pelvis')
box('Buckle insert',(0,-.194,1.085),(.029,.005,.019),blue,.002,'pelvis')
box('Tool pouch',(.196,-.058,.965),(.124,.075,.147),blue,.012,'pelvis', (0,0,-.1))
box('Tool pouch front',(.196,-.102,.944),(.112,.016,.090),blue,.006,'pelvis')
for i in range(3):
    x=.163+i*.031
    tube('Pocket seam',[(x,-.112,.909),(x,-.112,.976)],.0015,cream,'pelvis')
    tube('Tool handle',[(x,-.063,.985),(x,-.063,1.085+i*.008)],.007,cream if i==1 else seam,'pelvis')
    box('Tool tip',(x,-.063,1.092+i*.008),(.012,.013,.025),brass,.003,'pelvis')
for x in [.148,.239]:
    box('Pouch rivet',(x,-.116,.973),(.007,.004,.007),brass,.003,'pelvis')

# Chunky, rounded court shoes. Bind every piece to its corresponding foot.
for side, suffix in [(1,'l'),(-1,'r')]:
    x=side*.111
    bone='foot_'+suffix
    box('Rubber sole',(x,-.031,.036),(.132,.264,.052),orange,.026,bone)
    box('Cream midsole',(x,-.036,.061),(.129,.261,.036),cream,.017,bone)
    box('Sneaker upper',(x,-.019,.094),(.117,.224,.082),cream,.037,bone)
    box('Sneaker tongue',(x,.011,.128),(.070,.092,.042),cream,.012,bone,(-.18,0,0))
    box('Blue heel tab',(x,.078,.132),(.033,.012,.054),blue,.005,bone)
    for j in range(3):
        y=-.037+j*.021
        tube('Shoelaces',[(x-.031,y,.135),(x+.031,y+.006,.135)],.0025,cream,bone)
    for j in [-1,0,1]:
        box('Sole tread',(x+j*.037,-.042,.013),(.027,.187,.009),black,.003,bone)

# Keep skin only where visible: head/neck, forearms and hands.
mesh=bmesh.new()
mesh.from_mesh(body.data)
bmesh.ops.delete(mesh,geom=[v for v in mesh.verts if v.co.z<.18 or (v.co.z<1.465 and abs(v.co.x)<.280)],context='VERTS')
mesh.to_mesh(body.data)
mesh.free()

# The CC0 long style is chin-length; give it a compact bob silhouette.
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(base/'Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/Hair_Long.gltf'))
new=set(bpy.data.objects)-before
hair=next(o for o in new if o.type=='MESH' and o.name.startswith('Hair_Long'))
hair.parent=None
hair.modifiers.clear()
for v in hair.data.vertices:
    if v.co.z < 1.59:
        v.co.z=1.54+(v.co.z-1.501)*.55
    v.co.x*=1.035
hair.data.materials.clear()
hair.data.materials.append(hairmat)
hair.name='Maker bob'
skin(hair,'Head')
for o in new:
    if o!=hair and o.name in bpy.data.objects:bpy.data.objects.remove(o,do_unlink=True)
box('Terracotta hair clip',(-.095,-.060,1.718),(.028,.014,.034),orange,.004,'Head',(0,-.1,-.45))
box('Hair clip inset',(-.097,-.070,1.718),(.012,.003,.018),cream,.002,'Head',(0,-.1,-.45))

# CTRL's tiny garment label is real geometry; no baked billboard artwork.
label_y=-.216
box('CTRL woven patch',(0,label_y,1.27),(.047,.003,.054),cream,.001)
mesh_part('CTRL patch orange mark',[(-.017,label_y-.003,1.265),(.001,label_y-.003,1.292),(.001,label_y-.003,1.265)],[(0,1,2)],orange)
mesh_part('CTRL patch blue mark',[(.003,label_y-.003,1.265),(.018,label_y-.003,1.265),(.018,label_y-.003,1.289)],[(0,1,2)],blue)
for x in [-.014,-.005,.004,.013]:
    box('Patch lettering',(x,label_y-.003,1.255),(.005,.001,.003),black,0)

# Merge wardrobe pieces by material during GLB export. Vertex groups keep the
# accessories attached; only the reusable animation skeleton stays separate.
for obj in parts:
    active(obj)
    for modifier in list(obj.modifiers):
        if modifier.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=modifier.name)
    smooth(obj)
active(body)
for obj in parts:obj.select_set(True)
bpy.ops.object.join()
body=bpy.context.object
body.name='TheMaker'
body.parent=rig
# Slightly larger head keeps facial expression readable at gameplay distance.
for v in body.data.vertices:
    t=min(1,max(0,(v.co.z-1.50)/.055))
    v.co.x*=1+.10*t
    v.co.y=.012+(v.co.y-.012)*(1+.10*t)
    v.co.z+=max(0,v.co.z-1.55)*.10
# Join retains every source's material slot; consolidate duplicate slots.
slots=list(body.data.materials)
unique=[]
for mat in slots:
    if mat not in unique:unique.append(mat)
indices=[unique.index(m) for m in slots]
polygon_materials=[indices[p.material_index] for p in body.data.polygons]
body.data.materials.clear()
for mat in unique:body.data.materials.append(mat)
for polygon, index in zip(body.data.polygons, polygon_materials):polygon.material_index=index

# Animation retargeting preserves the target's limb lengths. Bake global
# rotation deltas from the companion CC0 rig and inherit target parent motion.
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(anim))
new=set(bpy.data.objects)-before
source_rig=next(o for o in new if o.type=='ARMATURE')
source_rig.animation_data_create()
for track in source_rig.animation_data.nla_tracks:track.mute=True
rig.animation_data_create()
baked=[]
clips={'Idle_Loop':'Idle','Walk_Loop':'Walk','Sitting_Enter':'SitDown','Sitting_Idle_Loop':'Seated','Interact':'Interact','Dance_Loop':'Victory'}
for source_name, target_name in clips.items():
    original=bpy.data.actions.get(source_name)
    if original is None:raise RuntimeError('Missing source animation '+source_name)
    source_rig.animation_data.action=original
    if original.slots:source_rig.animation_data.action_slot=original.slots[0]
    if target_name==source_name:original.name='Source_'+source_name
    action=bpy.data.actions.new(target_name)
    rig.animation_data.action=action
    start,end=original.frame_range
    for frame in range(math.ceil(end)+1):
        bpy.context.scene.frame_set(frame)
        for pb in rig.pose.bones:
            sb=source_rig.pose.bones.get(pb.name)
            if sb is None:continue
            rest=pb.bone.matrix_local
            delta=sb.matrix.to_quaternion() @ sb.bone.matrix_local.to_quaternion().inverted()
            rot=delta @ rest.to_quaternion()
            if pb.parent:
                head=pb.parent.matrix @ pb.parent.bone.matrix_local.inverted() @ rest.translation
            else:
                head=rest.translation.copy()
            if pb.name=='pelvis':
                head += (sb.matrix.translation-sb.bone.matrix_local.translation)*.94
            pb.matrix=Matrix.Translation(head) @ rot.to_matrix().to_4x4()
            pb.rotation_mode='QUATERNION'
            pb.keyframe_insert('rotation_quaternion',frame=frame)
            if pb.name=='pelvis':pb.keyframe_insert('location',frame=frame)
        bpy.context.view_layer.update()
    baked.append(action)
    print('Baked',target_name,math.ceil(end)+1,'frames',flush=True)
rig.animation_data.action=None
for action in baked:
    track=rig.animation_data.nla_tracks.new()
    track.name=action.name
    strip=track.strips.new(action.name,0,action)
    track.mute=True
for o in new:bpy.data.objects.remove(o,do_unlink=True)
bpy.data.objects.remove(source,do_unlink=True)
for action in list(bpy.data.actions):
    if action not in baked and action.users==0:bpy.data.actions.remove(action)
# Rest state at export, animations remain in named NLA tracks.
for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
bpy.context.scene.frame_set(0)
active(body)
rig.select_set(True)
args.output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(args.output),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
    export_nla_strips_merged_animation_name='Maker',export_image_format='JPEG',export_jpeg_quality=88,
    export_materials='EXPORT',export_yup=True,export_apply=False)
print(json.dumps({'output':str(args.output),'bytes':args.output.stat().st_size,'vertices':len(body.data.vertices),'materials':len(unique),'clips':[a.name for a in baked]}),flush=True)
