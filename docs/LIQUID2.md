# Liquid 2

A real-time 3D liquid for the scroll hero. The liquid is a simulated pool, not a drawn
line. As the page scrolls, sheets of liquid rise out of the pool and whirl around the
drink: a main sheet, a faster inner one and an outer one turning the other way, so they
cross and collide. Their crests break into rounded tongues of liquid that lean the way
they travel, folds run across them, and their lips curl over toward the cup, passing in
front of and behind it;
the faster the scroll, the higher and faster it spins. When scrolling stops it coasts on
its momentum and sinks back into the pool. The pool level keeps rising until the frame
is covered. There are no drops or splashes. Scrolling back drains it. The design and its decisions are in
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
    left and right.
  - `swirl.ts` is the whirl. Its form is a set of parametric sheets (`SWIRL_LAYERS`): each
    a spiral centre line around the drink with a tall, thin arc cross-section whose lip
    folds back over, tapering into the pool at both ends, with travelling tongues on the
    crest and diagonal folds. A height field cannot fold over itself, so the ribbon is its own
    surface. Its motion comes from a small physical model. Scroll speed excites an
    underdamped energy spring that lifts the sheet, and that energy spins it up against
    drag, so it surges, overshoots, coasts, and settles.
  - `sim.ts` drives the simulation from scroll. It maps progress to level (easing at 0.6
    units/s) and drive, advances the swirl, and lets the swirl's foot drag the pool so
    it ripples in the wake. It lifts the obstacle once the drink is submerged and drains
    on reverse scroll.
  - `renderer.ts` and `shaders.ts` hold the WebGL2 renderer. It draws the drink quad at
    the cylinder's front-face depth, then the pool mesh, then the swirl sheets (rebuilt on
    the CPU each frame: three sheets of 220x28 segments on desktop, two of 80x14 on touch
    devices), so the depth
    test decides per pixel which liquid is in front of the drink. The far edge of the pool fades into the
    page. The material is copied from Liquid 1.
- Static fallbacks: `static/images/liquid2/wave-{desktop,mobile}.png`, rendered from the
  live scene at progress 0.28 with the drink included.
- Preview route: `/qa/liquid2`.

The simulation runs on the CPU in typed arrays with fixed 1/120 s steps and seeded
randomness. Its state is uploaded to the GPU each frame. Tiers are 160x112 cells on desktop and
96x64 cells on touch devices. The drawing
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

## Measured performance (2026-10-24)

These numbers come from Chromium with the laptop's Intel HD Graphics 620 through ANGLE
D3D11, against the dev server. Each figure is the p95 interval between draw calls.

| Run | Idle | Pointer | Scrolling through the swell |
| --- | --- | --- | --- |
| Desktop 1440x900 | 16.8 ms | – | 11.0 ms (gate ≤ 20 ms) |
| Mobile 390x844, CPU throttled 4x | 18.8–21.7 ms | – | 17.0–17.9 ms over 3 runs (gate ≤ 33 ms) |

The browser proxy does not model a phone GPU's fill rate. A real mid-range phone still
needs to be checked by hand.
