"""Render selected cached frames without modifying the simulation cache."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--frames', default='all')
parser.add_argument('--width', type=int, default=3840)
parser.add_argument('--samples', type=int, default=16)
parser.add_argument('--setup-only', action='store_true')
parser.add_argument('--resume', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(bpy.data.filepath).parent
scene = bpy.context.scene
first_frame = int(scene.get('liquid2_render_start', scene.frame_start))
last_frame = int(scene.get('liquid2_render_end', scene.frame_end))
cached_first, cached_last = first_frame, last_frame
if '-' in args.frames:
    first_frame, last_frame = map(int, args.frames.split('-'))
    if not cached_first <= first_frame <= last_frame <= cached_last:
        raise ValueError(f'Render interval must stay within {cached_first}–{cached_last}.')
    frames = list(range(first_frame, last_frame + 1))
else:
    frames = list(range(first_frame, last_frame + 1)) if args.frames == 'all' else list(map(int, args.frames.split(',')))
if any(frame < cached_first or frame > cached_last for frame in frames):
    raise ValueError(f'Render frames must be between {cached_first} and {cached_last}.')
juice = bpy.data.materials.get('Opaque pink juice')
if juice is None or juice.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value != 0:
    raise RuntimeError('Render the opaque juice scene created by scripts/bake-liquid2.py.')
juice.node_tree.nodes['Principled BSDF'].subsurface_method = 'BURLEY'
if args.width <= 0 or args.samples < 1:
    raise ValueError('Render width and samples must be positive.')
scene.render.resolution_x = args.width
scene.render.resolution_y = round(args.width * 9 / 16)
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '16'
scene.cycles.samples = args.samples
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_min_samples = min(4, args.samples)
scene.cycles.adaptive_threshold = 0.03
scene.cycles.use_denoising = True
# Opaque primary-surface normals and albedo are clean guides. Denoise the beauty
# without running two additional neural prefilters over those unchanged guides.
scene.cycles.denoising_prefilter = 'NONE'
scene.render.use_persistent_data = True
scene.cycles.max_bounces = 4
scene.cycles.diffuse_bounces = 1
scene.cycles.glossy_bounces = 2
scene.cycles.transmission_bounces = 0
scene.cycles.transparent_max_bounces = 4
scene.render.engine = 'CYCLES'
# Material, studio lights, source photograph and camera belong to the saved scene.
# The bake script owns that look; rendering only selects output quality and frames.
domain = bpy.data.objects['Liquid domain']
# Kernel meshing can extend a few millimetres into a solid even when the parcels
# obey its boundary. The same finite-cell contact layer can sit just in front of
# a photographic proxy at its narrow foot. Give that proxy half a cell of camera
# depth tolerance; its image projection stays fixed and the fluid mesh is intact.
fluid_modifier = next(mod for mod in domain.modifiers if mod.type == 'FLUID' and mod.fluid_type == 'DOMAIN')
photo_depth_bias = max(domain.dimensions) / fluid_modifier.domain_settings.resolution_max * 0.5
forward = scene.camera.matrix_world.to_quaternion() @ Vector((0, 0, -1))
product = bpy.data.objects['Original Zatiaras product - unmodified photograph']
previous_bias = float(product.get('liquid2_photo_depth_bias_m', 0))
product.location += forward * (previous_bias - photo_depth_bias)
product['liquid2_photo_depth_bias_m'] = photo_depth_bias
settings = {
    'renderer_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'blend_sha256': hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),
    'blender': bpy.app.version_string,
    'engine': scene.render.engine,
    'width': scene.render.resolution_x,
    'height': scene.render.resolution_y,
    'samples': scene.cycles.samples,
    'color_depth': scene.render.image_settings.color_depth,
    'physical_fps': scene.render.fps,
    'frame_start': first_frame,
    'frame_end': last_frame,
    'frame_count': last_frame - first_frame + 1,
    'material': juice.name,
    'transmission': 0,
    'subsurface_method': juice.node_tree.nodes['Principled BSDF'].subsurface_method,
    'denoising_prefilter': scene.cycles.denoising_prefilter,
    'photo_depth_bias_m': photo_depth_bias,
    'setup_only': args.setup_only,
}
identity = hashlib.sha256(json.dumps(settings, sort_keys=True).encode()).hexdigest()[:12]
out = root / f'frames-{args.width}-{args.samples}-{identity}'
out.mkdir(exist_ok=True)
manifest = out / 'render.json'
if args.resume and manifest.exists():
    if json.loads(manifest.read_text(encoding='utf-8')) != settings:
        raise RuntimeError('Render settings or source scene changed; cannot resume these frames.')
manifest.write_text(json.dumps(settings, indent=2), encoding='utf-8')
(root / 'latest-render.json').write_text(json.dumps({'directory': str(out), **settings}, indent=2), encoding='utf-8')
print('LIQUID2_RENDER_DIR', out, flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'liquid2-render.blend'), copy=True)
for frame in frames:
    destination = out / f'{frame - first_frame + 1:04d}.png'
    if args.resume and destination.exists() and destination.stat().st_size > 64:
        print(f'LIQUID2_REUSED {frame}', flush=True)
        continue
    start = time.monotonic()
    scene.frame_set(frame)
    if args.setup_only:
        domain.hide_render = True
    scene.render.filepath = str(destination)
    bpy.ops.render.render(write_still=True)
    print(f'LIQUID2_RENDERED {frame} {time.monotonic() - start:.1f}s', flush=True)
