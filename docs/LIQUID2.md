# Liquid 2

## Bottom-fed rise revision — 2026-10-28

The current owner correction replaces the visible resting pool and side inlets.
The opening contains the original product photograph against cream, with no
visible liquid. A deep volume starts wholly below the camera and carries initial
upward momentum. A faster central core strikes the cup foot first. These regions
partition the same initial volume without overlapping emitters. Gravity, pressure,
viscosity and cup collision evolve the liquid after that initial launch. There is
no continuous inlet or horizontal emission in this shot. A nominal 60 Hz timeline
with time scale 0.3 supplies the slow-motion frames.
The cache retains 48 simulation frames. The displayed interval ends at frame 32,
where the volume covers the entire image, so the completed opaque tail does not
consume the remaining scroll. Those 32 frames are encoded at 24 FPS.

The fixed camera now looks down by approximately 5.7 degrees. This keeps the free
surface nearly edge-on and agrees more closely with the supplied upright product
photograph. Raising only the liquid camera to 28 degrees had exposed a broad floor
plane beneath a photograph taken from a different viewpoint.

The original photograph is visible to camera rays only. The tapered solid cup and
lid provide reflection and shadow geometry. Reflecting the depth-warped photo had
produced stretched vertical stripes on the surface. Juice remains opaque, with
zero transmission, roughness 0.32, shallow scattering and a subtle pulp-scale bump.

Native scroll maps the entire sequence to the entire track. Video fills the whole
stage on desktop and portrait viewports; mobile typography makes room for the
upright cup. The simulated volume supplies the full-screen flood. The coverage
callback waits for the final video frame to finish seeking. Static and unavailable
media instead extend the final rendered texture upward from below the screen.
The loading poster remains in place until the requested pose is decoded, so
finishing the scroll before the movie arrives cannot reveal its empty first frame.
That accessible fallback is an editorial wipe, not another fluid simulation. Both
paths replace the old opacity fade to a solid pink rectangle. Reverse scroll
restores the empty opening frame.

The reproducible scene and cache are written to `scratch/liquid2-offline/rise-160-<fingerprint>/`;
the fingerprint includes the builder source and simulation dimensions so a revised
shot cannot silently reuse an older cache. The earlier `juice-128/` bake is retained.
The default preview remains isolated at
`/qa/liquid2`; the homepage and the optional live engine are unchanged.

The export uses `scripts/encode-liquid2.mjs` with a completed UHD render manifest
and an existing FFmpeg executable. It checks that every frame in the selected interval exists, encodes
independently decodable 24 FPS UHD/mobile movies, decodes both movies in full, and
publishes the five `rise-*` media assets only after all exports pass. Posters use
the empty opening; the static fallback's flood texture uses the final fluid frame.

Reproduction for this shot uses the existing portable Blender and FFmpeg:

```powershell
rtk .\scratch\liquid2-offline\tools\blender-4.5.3-windows-x64\blender.exe --background --threads 3 --python-exit-code 1 --python scripts/bake-liquid2.py -- --resolution 160 --frames 48 --width 3840 --bake
rtk .\scratch\liquid2-offline\tools\blender-4.5.3-windows-x64\blender.exe --background scratch/liquid2-offline/rise-160-0f08ba0d/liquid2.blend --threads 3 --python-exit-code 1 --python scripts/render-liquid2.py -- --frames 1-32 --width 3840 --samples 8 --resume
rtk node scripts/encode-liquid2.mjs scratch/liquid2-offline/rise-160-0f08ba0d/latest-render.json D:/Tesseract/scratch/media-inspect-deps/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe
rtk node scripts/qa-liquid2-baked.mjs
```

## Previous opaque juice and UHD revision — 2026-10-27

The owner approved pre-rendering to prioritize visual realism over a live browser
simulation. `/qa/liquid2` now uses `Liquid2Film.svelte`; the earlier WebGL experiment
remains available at `/qa/liquid2?engine=live`.

The juice is baked with Blender 4.5.3 Mantaflow FLIP around a closed, tapered cup.
Two short inlet pulses hit the cup; pressure, gravity, viscosity, the solid boundary
and surface tension evolve the liquid after the valves close. Diffusion is enabled
with a selected kinematic viscosity of 0.0002 m²/s; this is a visual simulation
choice, not a measured viscosity of the actual product. A 12-step preroll lets the
initial reservoir settle. The saved bake has 60 physical frames; frames 13–60
become the 48 displayed frames.

The material is fully opaque: transmission is zero, alpha is one, and pink body
color replaces the previous absorption-only glass appearance. Roughness, shallow
subsurface diffusion and soft studio lights give it broad wet highlights. The
camera elevation is approximately 28°, compared with 11.5° in the water revision.
The initial surface is smoother and the photographed cup foot meets the reservoir.

The original `Avocado Zatiaras Juice Showcase.png` photograph is projected onto a
depth-displaced surface fitted to the cup. Its native 1372x1147 pixels are used
directly; UV cropping preserves the logo and avoids the compressed 960-pixel WebP.
The rendering proxy has half a simulation cell of depth tolerance at contact so
kernel reconstruction does not produce stray pink fragments through its foot.
This remains a fixed-camera composite, not a complete scanned product model.
Mantaflow is a finite-resolution numerical simulation; a successful bake does not
prove indistinguishability from filmed water.

The master is rendered natively at 3840x2160 into 16-bit PNGs. Desktop playback uses
the UHD encode; small viewports use a 1920x1080 derivative of the same master.
Posters use the same two resolutions. The photograph retains the detail available
in the original source; rendering at UHD does not create new photographic detail.

The MP4 contains independently decodable frames for native video seeking. Forward
and reverse scroll select frames from the same bake. Reverse scroll therefore
reverses the recorded motion; it does not compute a new draining simulation.
The 48 simulation frames run at 60 Hz and play at 24 FPS, giving the splash
measured slow motion without optical-flow-generated frames.
Pointer movement no longer perturbs the water in the default mode. The last 16%
of the scroll track fades to the brand color as an editorial transition, rather
than claiming a simulated full-screen flood.

`Liquid2Film.svelte` reuses the homepage's media policy: video loads only while
visible, and reduced motion, data saver and 2G connections retain the poster.
Unavailable media also retains the poster and reversible cover transition. Native
scrolling is untouched, outstanding seeks are coalesced, and unmount releases the
media source and listeners. Portrait framing centers the photographed cup and
keeps the image below the introductory copy. Its bottom follows the visible
viewport while the QA header scrolls away. Short phone viewports use a smaller
media composition and less introductory top spacing to prevent text overlap.

Reproduction with Blender 4.5.3 and FFmpeg:

- `rtk .\scratch\liquid2-offline\tools\blender-4.5.3-windows-x64\blender.exe --background --threads 3 --python scripts/bake-liquid2.py -- --resolution 128 --frames 48 --width 3840 --bake`
- `rtk .\scratch\liquid2-offline\tools\blender-4.5.3-windows-x64\blender.exe --background scratch/liquid2-offline/juice-128/liquid2.blend --threads 3 --python scripts/render-liquid2.py -- --frames all --width 3840 --samples 8 --resume`
- Render frames use 4 to 8 adaptive Cycles samples. The Blender scene and Mantaflow
  cache are saved separately from the rendered frames.
- `FFmpeg` encodes frames from the directory named in `scratch/liquid2-offline/juice-128/latest-render.json` at 24 FPS with `libx264`, CRF 18 and keyframe interval 1. The UHD and mobile outputs are `juice-uhd.mp4` and `juice-mobile.mp4` in `static/videos/liquid2/`.
- Encode `juice-poster.webp` and `juice-poster-mobile.webp` from displayed frame 1 with lossless WebP at 3840x2160 and 1920x1080.
- `rtk node scripts/qa-liquid2-baked.mjs` checks decoded image changes,
  forward/reverse seeking, rapid input, coverage, viewport bounds and fallbacks.

Verification on 2026-10-28: 139 unit tests passed; `pnpm check` and `pnpm build`
passed. Chromium QA passed 41 checks at 1920x1080, 390x844 and 320x568, including
native video dimensions, header scroll anchoring, forward/reverse seek, rapid
input, coverage, reduced motion, data saver, media failure and no JavaScript.
Measured seek p95 was 56 ms. Both MP4s decode all 48 frames at 24 FPS with BT.709
tags. The UHD encode is 12,541,667 bytes; the mobile encode is 4,458,249 bytes.

The first quiet-region mesh sample has approximately 0.43 mm height RMS variation.
Comparisons with the higher-sample reference retained SSIM 0.993–0.997 in the
checked opaque regions; these numerical checks do not establish photographic
realism. The source photograph retains its original detail limit.

Changed Svelte/JavaScript files pass ESLint and Prettier. `pnpm lint` still stops
at 76 pre-existing formatting issues outside these changes. The production build
was repeated with the existing approved build permission after the sandbox blocked
Wrangler's log write in the Windows profile; no application change was required.

The portable Blender installation, editable scene, caches and diagnostic renders
live in `scratch/liquid2-offline/`, which is ignored by Git. No runtime dependency
was added to the storefront. The previous live-engine analysis below describes
the earlier implementation, not the default offline sequence.

## Previous live engine

Preview: `/qa/liquid2`. This revision follows the owner's request for several thin,
connected water tongues around the glass. The annotated reference is saved at
`scratch/liquid2-review/refs/owner-wave-folds-20261024.png`.

The main pool stays at its resting level through the first 74% of the scroll track.
Scroll supplies energy to incoming wave packets. Their impact raises local films;
gravity folds and drains them as each crest passes. Scroll progress does not set a
crest height. The final part of the track fills the viewport, with a maximum mean
rise of 0.28 scene units/s. Reverse scroll drains at 0.6 units/s and removes incoming
forcing. Physics always advances forward in time.

Liquid 1 and the homepage are outside this revision. Rejected particle, ribbon and
ballistic-sheet experiments are preserved under `scratch/liquid2-review/`.

## Engine and ownership

- `scene.ts` owns the fixed camera, image placement, delayed level curve and quality
  tiers. The avocado cut-out includes surrounding fruit; collision fits the glass
  itself. Its top and bottom radii are 23% and 13.5% of the drawn image width.
  `radiusAt` supplies the tapered profile.
- `shallow-water.ts` owns the reservoir's 120 Hz height/velocity field and solid
  cells. Its obstacle follows the radius at the current mean level. Distant forcing
  remains small so local impact does not lift the entire pool. Gaussian impulses
  evaluate their separable axes once, retaining the same forcing with fewer
  exponential evaluations.
- `fluid.ts` owns the bounded three-dimensional position-based impact flow: seeded
  emission, a spatial hash, density constraints, solid-boundary kernel support,
  gravity, cohesion, viscosity and collision projection. Incoming packets approach
  from both sides. Their frequency follows gravity and a wavelength of four glass
  heights. No live parcel is overwritten when capacity is exhausted, and an occupied
  inlet cannot create overlapping mass.
- The impact solver exposes kernel-weighted velocity and total hydraulic head.
  Head includes kinetic energy, the pressure accumulated by the density solve and
  gravitational potential relative to the reservoir. Stagnation pressure therefore
  remains available when impact slows the incoming flow. The incoming boundary
  supplies the energy budget; stored pressure decays instead of holding a steady jet.
- `sheets.ts` resolves four thin free-surface patches below particle scale. Their
  feet follow the actual reservoir. Inlet head supplies wall-film momentum;
  gravity, capillary curvature, wall shear and unilateral longitudinal stretch
  constraints evolve their shape. Transverse motion has no cloth stiffness.
  Inlet data is sampled once per surface column; angular momentum is transported
  through the film rather than resampling the core at every material node.
- `sim.ts` separates bulk volume from local energy. A rendered frame advances at
  most two reservoir steps, one 60 Hz core step and one 60 Hz film step. Excess
  elapsed time cannot create a pressure-solve backlog.
- `surface.ts` owns reservoir reconstruction, static film topology and an independent
  CPU reference for film geometry. Reservoir positions use three floats per vertex.
  Runtime film reconstruction happens in `SHEET_VS`: bicubic interpolation, two
  thin faces and a rounded capillary rim. An RGBA32F vertex texture carries the
  physical nodes, normals, current area and reference area. Only these source nodes
  are uploaded per frame; reconstructed positions are not rebuilt on the CPU.
  Thickness responds to the material's reference and current surface areas. The
  foot extends slightly below the actual filled pool, preventing a visible crack.
  The tapered collision profile also projects the reconstructed surface outside
  the glass. No prescribed mound, spiral or crest path is added to the simulation.
- `renderer.ts` and `shaders.ts` share one camera, solid depth and water material.
  Submerged core samples use normalized poly6 kernels; ray casting extracts their
  union with the reservoir at an isovalue of 0.5. Thin films use their continuous
  surface mesh so particle spacing cannot create visible bead-shaped ridges.
  Both representations participate in the same depth buffer and cup occlusion.
  Conservative projected kernel coverage skips empty rays. Pipelines are warmed
  before the first scroll injects material. RGBA16F targets have an RGBA8 fallback;
  no WebGPU or new dependency is required. A shared 80-byte std140 uniform buffer
  supplies the camera and material state to every scene pass once per frame;
  resolution remains specific to each render target.
- `Liquid2Splash.svelte` owns native scroll input, pointer/touch disturbances,
  cleanup, adaptive resolution, visibility suspension, context loss and still mode.
  Input speed uses real elapsed time, independently of the bounded physics clock.
  Each capped draw advances one fixed quantum to avoid solver skips from RAF jitter.
  Adaptive drawing-buffer changes leave the live camera and physical material in
  place; only an actual scene-layout change remaps them.

Desktop uses 112x80 reservoir cells, at most 1,280 core parcels and 1,352 film
nodes. Touch uses 48x32 cells, 384 parcels and 392 film nodes. Drawing buffers remain
capped at 900,000 pixels desktop and 450,000 pixels touch, with a 60 FPS draw cap.
Offscreen, hidden and settled covered scenes suspend drawing. Reduced motion,
data saver, missing WebGL2, allocation failure or sustained overload use a still
captured from the live scene, including the drink.

This is a finite-resolution impact and thin-film approximation. It does not solve
full-volume Navier-Stokes flow or film breakup. The product remains a photograph
viewed from one camera. Automated physics and lifecycle checks do not establish
photographic realism; owner visual review and a physical-phone check remain separate.

## Validation

```sh
rtk pnpm test --maxWorkers=2
rtk pnpm check
rtk pnpm lint
rtk pnpm build
```

Browser checks and captures use the existing scripts:

```powershell
rtk node --input-type=module -e "process.env.QA_PATH='/qa/liquid2'; await import('./scripts/qa-liquid.mjs');"
rtk node --input-type=module -e "process.env.QA_PATH='/qa/liquid1'; await import('./scripts/qa-liquid.mjs');"
rtk node scripts/qa-liquid2-film.mjs
rtk node --input-type=module -e "process.env.QA_PATH='/qa/liquid2'; process.env.QA_BASE_URL='http://127.0.0.1:5199'; process.argv=['node','scripts/benchmark-liquid.mjs','liquid2-final']; await import('./scripts/benchmark-liquid.mjs');"
rtk node --input-type=module -e "process.env.QA_PATH='/qa/liquid2'; process.env.QA_BASE_URL='http://127.0.0.1:5199'; process.argv=['node','scripts/benchmark-liquid.mjs','liquid2-scene-buffer-mobile','--mobile']; await import('./scripts/benchmark-liquid.mjs');"
rtk node --input-type=module -e "process.env.QA_PATH='/qa/liquid2'; process.env.QA_BASE_URL='http://127.0.0.1:5199'; process.env.STILL_DIR='static/images/liquid2'; process.env.STILL_PROGRESS='0.6'; await import('./scripts/render-liquid-still.mjs');"
```

Unit tests cover the delayed mean level, tapered collision, inlet width, bounded
capacity, fixed-step replay, positive impact rise and gravity-driven decay. Film
tests also check that every rendered component reaches the reservoir, that pressure
is required for lift, that the pool is not raised by film forces, and that active
vertices stay outside the cup. Browser QA covers visible local rise, quiet distant
water, occlusion, pixel continuity, coverage/reverse scroll, viewport bounds,
pointer/touch, resize, suspension and capability failures.

The GPU reconstruction check uses WebGL2 transform feedback from the production
vertex shader. It compares all positions with the CPU reference in curved, impact
and submerged states at both quality tiers, and requires finite unit normals.
Normal direction is compared on the controlled curved films: collapsed contact
rims have ill-conditioned frames even when their positions agree. The largest
position difference in the current check is 0.00000036 scene units across 57,264
vertices. This numerical check does not establish visual realism.

Current automated results: 138 unit tests across 28 files, 39 Liquid 2 browser
checks, 31 Liquid 1 regression checks, and six GPU-reference cases passed. Browser
reports are in `scratch/liquid2-review/qa-final-liquid2.json` and
`scratch/liquid2-review/qa-final-liquid1.json`.

Performance remains above the existing scroll p95 limits on the Intel HD Graphics
620 test machine. These are Vite dev-server measurements; touch includes 4x CPU
throttling. Both markers are still enforced, and the live renderer remained active.

| Tier          | First draw p95 | Completed submission p95 | Limit | Result   |
| ------------- | -------------: | -----------------------: | ----: | -------- |
| Desktop       |        20.5 ms |                  21.1 ms | 20 ms | Exceeded |
| Touch, CPU 4x |        43.7 ms |                  42.9 ms | 33 ms | Exceeded |

Reports: `scratch/liquid-review/performance-liquid2-final.json` and
`scratch/liquid-review/performance-liquid2-scene-buffer-mobile.json`. Meeting these
limits and testing on a physical phone remain outstanding; functional QA passing
does not waive either performance assertion.

Repository-wide lint has 75 existing formatting failures outside this work. Changed
application files are checked separately with Prettier and ESLint.

On Windows, stop only the relevant project Vite/workerd processes before building
if they lock generated Cloudflare output. Do not move generated output merely to
avoid a lock; regenerate worker types if generated worker modules are recreated.
