"""PR32 evidence-only Blender asset audit and studio render.

Use official Blender 5.2 binary, import existing licensed CC0 GLB and make a
reproducible inspection scene. Never mutate or overwrite the source asset.
Run in CI using: blender -b --factory-startup --python ... -- input.glb outdir.
External blender-skills' qa_check.py and mesh_stats.py subsequently open the
saved asset .blend. Their result is the asset gate, not an invented image.
"""
import bpy
from mathutils import Vector
import json
import sys
from pathlib import Path

args = sys.argv[sys.argv.index("--") + 1:]
source, destination = Path(args[0]).resolve(), Path(args[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)
name = source.stem
if source.suffix.lower() != ".glb" or not source.is_file():
    raise ValueError("Expected one existing .glb asset")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
asset_objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not asset_objs:
    raise RuntimeError("No mesh imported: " + str(source))
bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(corner) for o in asset_objs for corner in o.bound_box]
lo = Vector([min(v[i] for v in pts) for i in range(3)])
hi = Vector([max(v[i] for v in pts) for i in range(3)])
dims = hi - lo
tris = sum(max(0, len(poly.vertices) - 2) for o in asset_objs for poly in o.data.polygons)
mats = sorted({m.name for o in asset_objs for m in o.data.materials if m})
report = {
    "asset": name,
    "source": str(source),
    "blender": bpy.app.version_string,
    "mesh_objects": len(asset_objs),
    "triangles": tris,
    "materials": mats,
    "dimensions_m": [round(v, 4) for v in dims],
    "bounding_min": [round(v, 4) for v in lo],
    "bounding_max": [round(v, 4) for v in hi],
    "mobile_3000_prop_tris_guideline_exceeded": tris > 3000,
    "source_unchanged": True,
    "asset_approved_for_game": False,
}
(destination / (name + "-audit.json")).write_text(json.dumps(report, indent=2))
# Save as a standalone asset (before any artificial backdrop/lighting geometry),
# so the upstream skill scripts evaluate the actual imported GLB only.
bpy.ops.wm.save_as_mainfile(filepath=str(destination / (name + "-asset.blend")))

center = (hi + lo) * .5
longest = max(dims)
floor_z = lo.z - .06
bpy.ops.mesh.primitive_plane_add(size=2, location=(center.x, center.y, floor_z))
floor = bpy.context.object
floor.name = "PREVIEW_ONLY_FLOOR"
floor.scale = (longest * 1.7, longest * 1.7, 1)
mat = bpy.data.materials.new("PREVIEW_ONLY_PaperBackdrop")
mat.diffuse_color = (.72, .76, .65, 1)
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (.76, .79, .68, 1)
bsdf.inputs["Roughness"].default_value = 1
floor.data.materials.append(mat)

sun_data = bpy.data.lights.new("PREVIEW_ONLY_WarmSun", "SUN")
sun_data.energy = 2.0
sun_data.angle = .16
sun = bpy.data.objects.new("PREVIEW_ONLY_WarmSun", sun_data)
bpy.context.collection.objects.link(sun)
sun.rotation_euler = (.50, -.48, -.32)
area_data = bpy.data.lights.new("PREVIEW_ONLY_Fill", "AREA")
area_data.energy = 650
area_data.shape = "DISK"
area_data.size = longest * 1.7
area = bpy.data.objects.new("PREVIEW_ONLY_Fill", area_data)
bpy.context.collection.objects.link(area)
area.location = center + Vector((-longest, -longest, longest * 1.5))
area.rotation_euler = (center - area.location).to_track_quat("-Z", "Y").to_euler()

camera_data = bpy.data.cameras.new("PREVIEW_ONLY_Camera")
camera = bpy.data.objects.new("PREVIEW_ONLY_Camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = center + Vector((longest * 1.35, -longest * 1.6, longest * 1.25))
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = longest * 2.45
bpy.context.scene.camera = camera
world = bpy.data.worlds.new("PREVIEW_ONLY_SoftSky")
bpy.context.scene.world = world
world.use_nodes = True
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (.75, .84, .93, 1)
background.inputs["Strength"].default_value = .6
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.render.resolution_x = 960
scene.render.resolution_y = 640
scene.render.resolution_percentage = 65
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(destination / (name + "-review.png"))
scene.render.film_transparent = False
bpy.ops.render.render(write_still=True)
print("PR32 Blender evidence:", json.dumps(report))
