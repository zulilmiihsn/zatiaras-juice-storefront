# Liquid 2

Preview: `/qa/liquid2`. The main pool stays at its resting level through the first 74%
of the scroll track. Scroll supplies incoming kinetic energy to a local fluid stream;
it does not prescribe a splash height. The fluid presses against the fitted cup,
splits around it, rises and falls under gravity. Only the final part of the track fills
the viewport, at a maximum mean-level rise of 0.28 scene units/s. Reverse scroll drains
at 0.6 units/s and removes the incoming forcing.

The owner's annotated reference is saved as
`scratch/liquid2-review/refs/owner-collision-runup-20261024.png`. Earlier ribbon, mound
and wall-film prototypes are archived under `scratch/liquid2-review/`; they are not
part of the active engine. Liquid 1 and the homepage are unchanged by this revision.

## Engine and ownership

- `scene.ts` owns the fixed camera, image placement, delayed level curve and quality
  tiers. The avocado cut-out includes surrounding fruit; its collision radius must fit
  the glass itself. The top and bottom radii are calibrated from the photograph to 23%
  and 13.5% of its drawn width. `radiusAt` supplies the tapered profile. Fixtures without
  a bottom radius retain a cylindrical boundary.
- `shallow-water.ts` owns the reservoir's 120 Hz height/velocity field and solid cells.
  Its obstacle footprint follows the radius at the current mean level. Gravity is shared
  with the local fluid solver. Distant forcing is deliberately small.
- `fluid.ts` owns the three-dimensional position-based fluid: a bounded inlet,
  spatial-hash neighbourhoods, iterative density constraints, analytic solid-boundary
  kernel support, gravity, cohesion, viscosity and collision projection. A blocked inlet
  cannot create overlapping particles. No live particle is overwritten when capacity is
  exhausted. The inlet carries forward and upward wave momentum; the solver determines
  the subsequent trajectory. The physics runs at 60 Hz with interpolated render samples.
- `sim.ts` separates bulk volume from local kinetic energy. A rendered frame advances
  at most two reservoir substeps and one fluid step; excess elapsed time is dropped to
  prevent a catch-up spiral. Reverse input is not played backward through stored states.
- `surface.ts` reconstructs the actual reservoir only. No geometric crest, timed
  sinusoidal mound or independent splash ribbon is added to it.
- `renderer.ts` and `shaders.ts` reconstruct the local fluid surface on the GPU. Poly6
  samples accumulate into a layered density atlas; the normalized fluid field is joined
  smoothly with the actual reservoir height. Ray casting extracts the shared surface at
  an isovalue of 0.5. The depth surface and density gradient supply one material and
  consistent normals. The product photograph writes the matching tapered solid depth.
  Float colour targets use RGBA16F; RGBA8 accumulation is available when float colour
  buffers are unavailable. There is no WebGPU path or new dependency.
- `Liquid2Splash.svelte` owns native scroll input, pointer/touch disturbances, resource
  cleanup, visibility suspension, adaptive resolution, context-loss handling and still
  mode. Input speed uses real elapsed time, independently of the capped physics clock.

Desktop uses 144x96 reservoir cells and at most 1,280 local fluid parcels. Touch devices
use 48x32 cells and at most 320 coarser parcels, with a comparable local volume budget.
The canvas budgets remain 900,000 pixels desktop and 450,000 pixels touch, with a 60 FPS
draw cap. Offscreen, hidden and settled covered scenes suspend drawing. Reduced motion,
data saver, missing WebGL2, allocation failure or sustained overload use the static
fallback. The fallback images include the drink and are captured from the real scene at
progress 0.3 while incoming momentum is still active.

## Validation

```sh
rtk pnpm test
rtk pnpm check
rtk pnpm lint
rtk pnpm build
QA_PATH=/qa/liquid2 rtk node scripts/qa-liquid.mjs
QA_PATH=/qa/liquid1 rtk node scripts/qa-liquid.mjs
QA_PATH=/qa/liquid2 QA_BASE_URL=http://127.0.0.1:5199 rtk node scripts/benchmark-liquid.mjs liquid2-gpu-density
QA_PATH=/qa/liquid2 QA_BASE_URL=http://127.0.0.1:5199 rtk node scripts/benchmark-liquid.mjs liquid2-gpu-density-mobile --mobile
QA_PATH=/qa/liquid2 STILL_DIR=static/images/liquid2 STILL_PROGRESS=0.3 QA_BASE_URL=http://127.0.0.1:5199 rtk node scripts/render-liquid-still.mjs
```

Unit tests cover delayed bulk rise, collision against a tapered glass, height gain
compared with an unobstructed stream, bounded particle capacity, invalid input, fixed-step
replay across render rates, layout changes and a reservoir that remains low during local
impact. Browser QA also checks visible local rise, a quiet distant field, front/back
occlusion, full coverage, reverse input, viewport bounds, pixel continuity, pointer/touch,
resize, suspension, context loss, failed drink loading, float-target fallback and no JS.

The current revision passed 127 unit tests. Repository-wide lint still reports
pre-existing formatting in 75 files, including imported skill packs and planning notes.
The application files changed here are checked separately with Prettier and ESLint.

## Measured performance

Measured on 2026-10-24 against the development server in Chromium, using Intel HD
Graphics 620 through ANGLE D3D11. These are p95 intervals between complete rendered
frames; multiple render passes are not counted as separate frames.

| Run | Idle | Pointer | Scrolling through impact |
| --- | --- | --- | --- |
| Desktop 1440x900 | 18.7 ms | 18.5 ms | 19.4 ms, gate 20 ms |
| Mobile 390x844, CPU throttled 4x | 22.6 ms | 22.3 ms | 32.5 ms, gate 33 ms |

The mobile run is a CPU proxy and does not reproduce a phone GPU. A physical-phone
check and owner visual acceptance remain separate from the automated gates. The local
solver is a finite-resolution interactive fluid approximation, and the drink remains a
photograph viewed from one fixed camera.

On Windows, stop the relevant Vite/workerd processes before building if they hold the
generated Cloudflare output directory open. If generated output is moved aside, regenerate
worker types before building and again after the worker module has been recreated.
