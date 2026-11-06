"""Build a camera-matched Mantaflow splash around the original product photograph.

Run with Blender in background mode. The cache is real liquid simulation, not
keyframed surface geometry. The earlier shot animated an inlet valve. This shot
launches one submerged volume with initial upward momentum and lets the solver
resolve gravity and cup contact without further forcing.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import bpy
import numpy as np
from mathutils import Vector


parser = argparse.ArgumentParser()
parser.add_argument('--resolution', type=int, default=160)
parser.add_argument('--frames', type=int, default=48)
parser.add_argument('--samples', type=int, default=32)
parser.add_argument('--width', type=int, default=3840)
parser.add_argument('--bake', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT / 'scratch' / 'liquid2-offline'
simulation_id = hashlib.sha256(Path(__file__).read_bytes() +
                               f'{args.resolution}:{args.frames}'.encode()).hexdigest()[:8]
RUN = ROOT / f'rise-{args.resolution}-{simulation_id}'
if args.bake and (RUN / 'cache').exists():
    raise RuntimeError('This simulation cache already exists. Reuse its saved scene instead of overwriting it.')
RUN.mkdir(parents=True, exist_ok=True)
PREROLL = 0

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
scene.gravity = (0, 0, -9.81)
scene.render.fps = 60
scene.frame_start = 1
scene.frame_end = args.frames + PREROLL
scene['liquid2_render_start'] = PREROLL + 1
scene['liquid2_render_end'] = scene.frame_end
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.adaptive_threshold = 0.025
scene.cycles.max_bounces = 6
scene.cycles.diffuse_bounces = 1
scene.cycles.glossy_bounces = 3
scene.cycles.transmission_bounces = 4
scene.cycles.transparent_max_bounces = 4
scene.render.threads_mode = 'FIXED'
scene.render.threads = 3
scene.render.resolution_x = args.width
scene.render.resolution_y = round(args.width * 9 / 16)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '16'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.render.filepath = str(RUN / 'frame-')


def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def cube(name, location, dimensions):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def principled(name, color, roughness=0.3):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat, bsdf


def effector(obj):
    mod = obj.modifiers.new('Liquid collision', 'FLUID')
    mod.fluid_type = 'EFFECTOR'
    mod.effector_settings.surface_distance = 0.001
    obj.hide_render = True
    return mod


# A closed tapered collider matches the photographed cup body; the cap prevents
# liquid from passing through the sealed lid. Fruit remains part of the source image.
bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=0.030, radius2=0.049,
                                depth=0.190, location=(0, 0, 0.095))
cup = bpy.context.object
cup.name = 'Cup collision - tapered solid'
effector(cup)
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.052, depth=0.009,
                                    location=(0, 0, 0.194))
lid = bpy.context.object
lid.name = 'Lid collision'
effector(lid)

# The first water material used optical absorption: thin films transmitted more
# of the cream studio than the deep pool. Juice instead has an opaque pink body,
# shallow internal scattering and broad wet highlights, with no transmission.
def linear_srgb(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


juice, bsdf = principled('Opaque pink juice', tuple(linear_srgb(c) for c in (229 / 255, 44 / 255, 132 / 255)), 0.32)
bsdf.inputs['IOR'].default_value = 1.38
bsdf.inputs['Specular IOR Level'].default_value = 0.28
bsdf.inputs['Transmission Weight'].default_value = 0
bsdf.inputs['Alpha'].default_value = 1
bsdf.inputs['Subsurface Weight'].default_value = 0.06
bsdf.inputs['Subsurface Radius'].default_value = (1, 0.35, 0.5)
bsdf.inputs['Subsurface Scale'].default_value = 0.003
bsdf.subsurface_method = 'BURLEY'
bsdf.inputs['Coat Weight'].default_value = 0.02
bsdf.inputs['Coat Roughness'].default_value = 0.3
# Sub-millimetre pulp breaks up perfect studio reflections without tinting the
# body or introducing transparent patches in the juice.
noise = juice.node_tree.nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 650
noise.inputs['Detail'].default_value = 2
bump = juice.node_tree.nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = 0.08
bump.inputs['Distance'].default_value = 0.00007
juice.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
juice.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

# The domain covers the visible reservoir, with open boundaries outside the frame.
domain = cube('Liquid domain', (-0.105, -0.03, -0.175), (1.13, 0.48, 1.45))
mod = domain.modifiers.new('Mantaflow FLIP liquid', 'FLUID')
mod.fluid_type = 'DOMAIN'
settings = mod.domain_settings
settings.domain_type = 'LIQUID'
settings.time_scale = 0.3
settings.resolution_max = args.resolution
settings.cache_type = 'MODULAR'
settings.cache_directory = str(RUN / 'cache')
settings.cache_frame_start = 1
settings.cache_frame_end = scene.frame_end
settings.cache_data_format = 'UNI'
settings.cache_mesh_format = 'BOBJECT'
settings.use_mesh = True
settings.mesh_scale = 3
settings.mesh_particle_radius = 1.6
settings.mesh_smoothen_pos = 3
settings.mesh_smoothen_neg = 3
settings.particle_number = 2
settings.particle_randomness = 0
settings.flip_ratio = 0.9
settings.use_adaptive_timesteps = True
settings.timesteps_min = 2
settings.timesteps_max = 8
settings.cfl_condition = 2
settings.use_diffusion = True
settings.viscosity_base = 2
settings.viscosity_exponent = 4
settings.surface_tension = 0.055
# Previous inlet layout:
# The container walls are outside the camera. A bottom-fed, closed tank conserves
# the injected mass so its free surface can rise above the whole camera frustum.
# The current launch uses open boundaries. Its deep, wide bolus carries the mass
# through the camera under gravity without reflecting from an artificial tank.
settings.use_collision_border_front = False
settings.use_collision_border_back = False
settings.use_collision_border_bottom = False
settings.use_collision_border_top = False
settings.use_collision_border_left = False
settings.use_collision_border_right = False
domain.data.materials.append(juice)
for poly in domain.data.polygons:
    poly.use_smooth = True
# Mantaflow returns the raw domain box before its first nonempty mesh. Keep that
# implementation fallback out of the deliberately empty opening shot.
for frame, hidden in [(1, True), (4, False)]:
    domain.hide_render = hidden
    domain.keyframe_insert(data_path='hide_render', frame=frame)


def launch_volume(obj, velocity):
    flow = obj.modifiers.new('Water source', 'FLUID')
    flow.fluid_type = 'FLOW'
    f = flow.flow_settings
    f.flow_type = 'LIQUID'
    f.flow_behavior = 'GEOMETRY'
    f.surface_distance = 0
    f.volume_density = 1
    if velocity:
        f.use_initial_velocity = True
        f.velocity_coord = velocity
        f.velocity_normal = 0
        # A short impulse travels into the cup. Closing the valve leaves all
        # subsequent curling, breakup and falling to the liquid solver.
        # The current shot supplies that impulse as an initial condition to a
        # deep volume below frame, preserving enough mass for the closing flood.
    obj.hide_render = True
    return obj


# Previous inlet layout:
# No reservoir is present at frame one. Both sources enter vertically below the
# visible frame; the local pulse hits the cup foot instead of flying in sideways.
# The current shot instead initializes one volume wholly below frame. Its side
# edges stay outside the camera, and its lower face remains below the frame as
# the upper surface rises over the cup and covers the viewport.
source_volume = cube('Juice launched below frame', (-0.105, -0.03, -0.47), (0.99, 0.34, 0.72))
# Partition the initial volume instead of overlapping liquid emitters. A faster
# central core strikes the cup foot first, making a visible upward splash while
# the surrounding body supplies the final flood. No side-facing velocity exists.
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.065, depth=0.72,
                                   location=(0, -0.015, -0.47))
impact_core = bpy.context.object
impact_core.name = 'Faster core below cup foot'
partition = source_volume.modifiers.new('Partition initial momentum', 'BOOLEAN')
partition.operation = 'DIFFERENCE'
partition.solver = 'EXACT'
partition.object = impact_core
activate(source_volume)
bpy.ops.object.modifier_apply(modifier=partition.name)
launch_volume(source_volume, (0, 0, 4.2))
launch_volume(impact_core, (0, 0, 6.2))

# Camera and product plane share the original framing. The source photograph is
# projected onto a depth-displaced mesh, preserving every original label pixel
# while allowing water to pass behind the solid cup and refract the photograph.
bpy.ops.object.camera_add(location=(0, -1.25, 0.225))
camera = bpy.context.object
camera.name = 'Fixed product camera'
direction = Vector((0, 0, 0.100)) - camera.location
camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 0.64
camera.data.shift_x = -0.18
camera.data.lens = 70
scene.camera = camera
q = camera.rotation_euler.to_quaternion()
right, up, forward = q @ Vector((1, 0, 0)), q @ Vector((0, 1, 0)), q @ Vector((0, 0, -1))
source_path = PROJECT / 'static' / 'Avocado Zatiaras Juice Showcase.png'
source = bpy.data.images.load(str(source_path))
source_w, source_h = source.size[:]
pixels = np.empty(source_w * source_h * 4, dtype=np.float32)
source.pixels.foreach_get(pixels)
ys, xs = np.nonzero(pixels.reshape((source_h, source_w, 4))[:, :, 3] > 32 / 255)
if not len(xs):
    raise RuntimeError('The original product photograph has no visible pixels.')
left, bottom = max(0, int(xs.min()) - 4), max(0, int(ys.min()) - 4)
right_edge, top_edge = min(source_w, int(xs.max()) + 5), min(source_h, int(ys.max()) + 5)
crop_w, crop_h = right_edge - left, top_edge - bottom
del pixels
photo_h = 0.208
photo_w = photo_h * crop_w / crop_h
# The visible cup foot is 5.5% above the supplied image's bottom edge. Anchor that
# point to the resting juice instead of letting the higher camera expose a gap.
center = Vector((-0.004, 0, 0.002 - up.z * ((0.055 - 0.5) * photo_h)))
cols, rows = 160, 130
vertices, faces, uvs = [], [], []


def cup_front(point):
    """Nearest ray hit with the tapered proxy, or the source image plane."""
    origin = point - forward * 0.5
    slope = (0.049 - 0.030) / 0.190
    radius = 0.030 + slope * origin.z
    ray_radius = slope * forward.z
    a = forward.x**2 + forward.y**2 - ray_radius**2
    b = 2 * (origin.x * forward.x + origin.y * forward.y - radius * ray_radius)
    c = origin.x**2 + origin.y**2 - radius**2
    disc = b*b - 4*a*c
    if disc >= 0:
        distance = (-b - math.sqrt(disc)) / (2*a)
        hit = origin + forward * distance
        if 0.003 < hit.z < 0.202:
            return hit - forward * 0.0002
    return point


for row in range(rows + 1):
    for col in range(cols + 1):
        u, v = col / cols, row / rows
        point = center + right * ((u - 0.5) * photo_w) + up * ((v - 0.5) * photo_h)
        vertices.append(tuple(cup_front(point)))
        uvs.append(((left + u * crop_w) / source_w, (bottom + v * crop_h) / source_h))
for row in range(rows):
    for col in range(cols):
        i = row * (cols + 1) + col
        faces.append((i, i + 1, i + cols + 2, i + cols + 1))
mesh = bpy.data.meshes.new('Camera-matched product depth')
mesh.from_pydata(vertices, [], faces)
mesh.update()
uv_layer = mesh.uv_layers.new(name='Original photograph')
for poly in mesh.polygons:
    for loop in poly.loop_indices:
        uv_layer.data[loop].uv = uvs[mesh.loops[loop].vertex_index]
product = bpy.data.objects.new('Original Zatiaras product - unmodified photograph', mesh)
scene.collection.objects.link(product)
product.visible_shadow = False
# A single-view photograph is valid only for camera rays. Its depth-warped UVs
# must not turn into stretched, vertical photographic stripes in the liquid.
product.visible_diffuse = False
product.visible_glossy = False
product.visible_transmission = False
proxy_material, _ = principled('Cup reflection proxy', (0.37, 0.43, 0.065), 0.3)
lid_material, _ = principled('Lid reflection proxy', (0.76, 0.77, 0.65), 0.2)
for solid, material in [(cup, proxy_material), (lid, lid_material)]:
    solid.hide_render = False
    solid.visible_camera = False
    solid.data.materials.append(material)
    for polygon in solid.data.polygons:
        polygon.use_smooth = True
mat = bpy.data.materials.new('Original product pixels')
mat.use_nodes = True
# The photograph is a camera plate, not a physical lamp. Excluding its thousands
# of textured faces from direct-light sampling also avoids a large light tree.
mat.cycles.emission_sampling = 'NONE'
n = mat.node_tree.nodes
n.clear()
output = n.new('ShaderNodeOutputMaterial')
mix = n.new('ShaderNodeMixShader')
transparent = n.new('ShaderNodeBsdfTransparent')
emission = n.new('ShaderNodeEmission')
texture = n.new('ShaderNodeTexImage')
texture.image = source
texture.interpolation = 'Cubic'
mat.node_tree.links.new(texture.outputs['Alpha'], mix.inputs[0])
mat.node_tree.links.new(transparent.outputs[0], mix.inputs[1])
mat.node_tree.links.new(emission.outputs[0], mix.inputs[2])
mat.node_tree.links.new(texture.outputs['Color'], emission.inputs['Color'])
mat.node_tree.links.new(mix.outputs[0], output.inputs['Surface'])
product.data.materials.append(mat)

# The liquid domain now covers the entire visible reservoir. Its open front and
# side boundaries lie outside the camera, so no static/simulated seam is visible.
floor, _ = principled('Cream studio', (0.93, 0.86, 0.75), 0.42)
ground = cube('Studio floor', (0, 0, -1.0), (200, 200, 0.01))
ground.data.materials.append(floor)
ground.visible_camera = False
world = bpy.data.worlds.new('Cream studio environment')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (1, 0.9387, 0.8388, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 1
scene.world = world

# A cream camera plate and transmission backdrop share a neutral negative-fill
# studio. Darker reflected surroundings reveal the thin water's Fresnel edges.
# The same studio now gives opaque juice broad, soft wet-surface reflections.
world_nodes = world.node_tree.nodes
world_links = world.node_tree.links
environment = world_nodes.new('ShaderNodeBackground')
environment.inputs[0].default_value = (0.28, 0.23, 0.23, 1)
environment.inputs[1].default_value = 0.7
paths = world_nodes.new('ShaderNodeLightPath')
backdrop = world_nodes.new('ShaderNodeMath')
backdrop.operation = 'MAXIMUM'
world_links.new(paths.outputs['Is Camera Ray'], backdrop.inputs[0])
world_links.new(paths.outputs['Is Transmission Ray'], backdrop.inputs[1])
studio = world_nodes.new('ShaderNodeMixShader')
world_links.new(backdrop.outputs[0], studio.inputs[0])
world_links.new(environment.outputs[0], studio.inputs[1])
world_links.new(world_nodes['Background'].outputs[0], studio.inputs[2])
world_links.new(studio.outputs[0], world_nodes['World Output'].inputs[0])


def softbox(name, location, energy, size, target=(0, 0, 0.10), height=None):
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = 'RECTANGLE'
    light.data.size = size
    light.data.size_y = height or size
    light.rotation_euler = (Vector(target) - light.location).to_track_quat('-Z', 'Y').to_euler()


softbox('Broad left softbox', (-0.35, -0.35, 0.65), 2, 0.45, height=0.65)
softbox('Right edge strip', (0.30, 0.10, 0.35), 1, 0.08, height=0.50)
softbox('Back transmission panel', (-0.12, 0.35, 0.38), 2, 0.30, height=0.45)
softbox('Front label fill', (0.20, -0.50, 0.28), 2, 0.45)

scene.frame_set(1)
activate(domain)
bpy.ops.wm.save_as_mainfile(filepath=str(RUN / 'liquid2.blend'))
metadata = {'solver': 'Blender Mantaflow FLIP', 'resolution': args.resolution,
            'physical_fps': 60, 'frames': args.frames, 'simulated_frames': scene.frame_end,
            'time_scale': settings.time_scale, 'simulation_id': simulation_id,
            'render_start': PREROLL + 1, 'render_end': scene.frame_end,
            'material': 'Opaque pink juice', 'transmission': 0,
            'kinematic_viscosity_m2_s': 0.0002, 'surface_tension': 0.055,
            'initial_volume': {'dimensions_m': list(source_volume.dimensions),
                               'top_m': source_volume.location.z + source_volume.dimensions.z / 2,
                               'velocity_m_s': list(source_volume.modifiers[0].flow_settings.velocity_coord)},
            'impact_core': {'dimensions_m': list(impact_core.dimensions),
                            'velocity_m_s': list(impact_core.modifiers[0].flow_settings.velocity_coord)},
            'continuous_inlets': False,
            'visible_initial_pool': False,
            'camera_elevation_degrees': math.degrees(math.atan2(0.225 - 0.100, 1.25)),
            'source': str(source_path.relative_to(PROJECT)),
            'source_size': [source_w, source_h], 'source_crop': [left, bottom, right_edge, top_edge]}
(RUN / 'scene.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
print('LIQUID2_SCENE', json.dumps(metadata), flush=True)
if args.bake:
    start = time.monotonic()

    def progress(scene):
        print(f'LIQUID2_FRAME {scene.frame_current} ELAPSED {time.monotonic() - start:.1f}s', flush=True)

    bpy.app.handlers.frame_change_post.append(progress)
    print('LIQUID2_BAKE_DATA_START', flush=True)
    bpy.ops.fluid.bake_data()
    print('LIQUID2_BAKE_DATA_SECONDS', time.monotonic() - start, flush=True)
    bpy.ops.fluid.bake_mesh()
    print('LIQUID2_BAKE_COMPLETE_SECONDS', time.monotonic() - start, flush=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(RUN / 'liquid2.blend'))
