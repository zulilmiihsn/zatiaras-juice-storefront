# Liquid 2

A real-time 3D liquid for the scroll hero. The liquid is a simulated pool, not a drawn
line. It swells as the page scrolls, collides with the drink and wraps it front and
back, throws crowns of drops, and keeps rising until the frame is covered. Scrolling
back drains it. The design and its decisions are in
`docs/superpowers/specs/2026-10-23-liquid2-design.md`. Liquid 1 (`docs/LIQUID1.md`) is
unchanged.

- Component: `src/lib/components/Liquid2Splash.svelte`. It takes the same props as
  `Liquid1Splash` plus `drinkSrc` (a same-origin transparent cut-out), `drinkAspect`, and
  `debug`. `debug` exposes `window.liquid2Debug` for the browser QA.
- Engine: `src/lib/liquid2/`:
  - `scene.ts` holds the fixed product-shot camera, the drink's cylinder proxy, scroll
    progress to level, and the device quality tiers.
  - `shallow-water.ts` is the pool, a staggered-grid shallow-water field. The drink is a
    solid obstacle, the side and front edges absorb waves, and swells come in from the
    left and right. Crests that get steep or run up against the drink break.
  - `spray.ts` holds drops thrown by breaking crests. Gravity and size-dependent drag act
    on them, they bounce off the drink, and they return their volume to the pool when
    they land.
  - `sim.ts` drives the simulation from scroll. It maps progress to level and drive, lifts
    the obstacle once the drink is submerged, and drains on reverse scroll.
  - `renderer.ts` and `shaders.ts` hold the WebGL2 renderer. It draws the drink quad at
    the cylinder's front-face depth, then the pool mesh, then the spray as depth-writing
    impostor spheres, so the depth test decides per pixel which liquid is in front of the
    drink. The material is copied from Liquid 1.
- Static fallbacks: `static/images/liquid2/wave-{desktop,mobile}.png`, rendered from the
  live scene at progress 0.28 with the drink included.
- Preview route: `/qa/liquid2`.

The simulation runs on the CPU in typed arrays with fixed 1/120 s steps and seeded
randomness. Its state is uploaded to the GPU each frame. Tiers are 160x112 cells with
1,536 drops on desktop, and 96x64 cells with 768 drops on touch devices. The drawing
buffer budget, the 60 FPS cap, adaptive resolution, offscreen suspension, context-loss
handling, and the overload fallback are the same as in Liquid 1.

## Validation

```sh
rtk pnpm vitest run src/lib/liquid2
QA_PATH=/qa/liquid2 rtk node scripts/qa-liquid.mjs
QA_PATH=/qa/liquid2 QA_BASE_URL=http://127.0.0.1:5199 rtk node scripts/benchmark-liquid.mjs liquid2
QA_PATH=/qa/liquid2 QA_BASE_URL=http://127.0.0.1:5199 rtk node scripts/benchmark-liquid.mjs liquid2-mobile --mobile
QA_PATH=/qa/liquid2 STILL_DIR=static/images/liquid2 STILL_PROGRESS=0.28 QA_BASE_URL=http://127.0.0.1:5199 rtk node scripts/render-liquid-still.mjs
```

In Git Bash, prefix `MSYS_NO_PATHCONV=1` so the path is not rewritten.

For `/qa/liquid2`, the browser QA runs the shared checks and adds three of its own:

- Liquid wraps the drink. Part of the drink's box shows liquid in front of the drink,
  and hiding the drink reveals more liquid that was behind it.
- A drink image that fails to load still leaves the liquid live, with no WebGL error.
- Running without `EXT_color_buffer_float` still renders live and covers the frame.

The shared checks that read Liquid 1's shader uniforms read `window.liquid2Debug`
instead.

## Measured performance (2026-10-23)

These numbers come from Chromium with the laptop's Intel HD Graphics 620 through ANGLE
D3D11, against the dev server. Each figure is the p95 interval between draw calls.

| Run | Idle | Pointer | Scrolling through the swell |
| --- | --- | --- | --- |
| Desktop 1440x900 | 17.9 ms | 17.9 ms | 18.6 ms (gate ≤ 20 ms) |
| Mobile 390x844, CPU throttled 4x | 17.9 ms | 17.9 ms | 21.8 ms (gate ≤ 33 ms) |

The browser proxy does not model a phone GPU's fill rate. A real mid-range phone still
needs to be checked by hand.
