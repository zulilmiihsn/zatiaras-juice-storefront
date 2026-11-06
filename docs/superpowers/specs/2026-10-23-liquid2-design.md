# Liquid 2 — 3D simulated wave that swallows the drink

Date: 2026-10-23
Status: approved by owner 2026-10-23

## Intent

Liquid 1 (`docs/LIQUID1.md`) simulates only a 1D wave line and extrudes it into a
shaded mesh, so the liquid reads as 2.5D: it can rise over the drink but cannot pass
behind it, curl around it, or move in depth. Liquid 2 is a new, separate scroll
splash in which the liquid is a real 3D simulated volume that evolves over time
("4D" in the owner's words: 3D space plus continuous motion). The wave forms,
collides with the drink, wraps it front and back, and keeps rising until it covers
the screen.

Visual targets supplied by the owner (kept outside the repo, described here):

- Reference A: thick, glossy Heritage Magenta liquid on a cream background; a broad
  rolling wave whose crests lift into crown splashes with teardrop droplets breaking
  off. Smooth, viscous, highly reflective surface.
- Reference B: a V-shaped crown splash rising from both sides around an empty centre,
  where the drink will stand; liquid sheets curl inward, with droplets at the tips.

The result must look natural, not like a canned render.

## Goals

1. Real-time simulation every frame. Motion, collisions, and splashes come from
   physics state, not from keyframed curves, templates, or video. Seeded and
   fixed-step, like Liquid 1, so runs are reproducible for QA.
2. The drink is a transparent product image (photo), not a 3D model. The camera is
   fixed and faces the front, so a flat image is sufficient.
3. The liquid collides with the drink: the simulation treats the drink as a solid
   upright cylinder (invisible proxy matching the image's silhouette width and
   height), so waves split around it, run up against it, and close behind it.
4. Correct depth layering: liquid behind the cylinder is drawn behind the image and
   liquid in front is drawn over it, decided per pixel from simulated depth, so the
   drink appears to sink into the wave.
5. Scroll-driven, same as Liquid 1: forward scroll advances the sequence. Backward
   scroll drains it (owner's decision): the simulation keeps running forward in
   time while the mean level and injected energy follow `progress` down, so the
   liquid recedes naturally rather than replaying the forward motion in reverse. No
   state snapshots. QA reproducibility therefore holds for an identical input
   timeline (seed plus scroll and pointer sequence). Sequence:
   1. Calm, slightly restless magenta surface below the drink.
   2. Scroll energy builds swells from both sides that grow into a rolling wave.
   3. Swells collide at and around the drink, wrap it front and back, and throw crown
      sheets and droplets from breaking crests (reference B composition).
   4. The level keeps rising until the screen is fully magenta; `oncovered(true)`
      fires and the next section continues in the same colour.
6. Balanced performance: smooth on mid-range phones and visibly richer on laptops.
   Quality scales with device (grid resolution, particle count, drawing-buffer
   size), not by switching to a different look.

## Non-goals

- No 3D model of the drink, no camera orbit or pan.
- No changes to Liquid 1 (`Liquid1Splash.svelte`, `$lib/liquid1/`, `/qa/liquid1`) or
  to the current homepage hero. Liquid 2 is a preview route only; adopting it on the
  homepage is a later, separate decision.
- No new runtime dependency (no three.js, no physics library); WebGL2 directly, as in
  Liquid 1.
- No WebGPU path.

## Anti-goals (would count as failure even if it "works")

- Pre-rendered video, sprite sheets, or baked animation loops.
- Liquid that visibly passes through the drink, or a drink that floats on top of the
  liquid instead of being enveloped.
- A look that reads as a flat 2D layer sliding up the screen (Liquid 1's limitation).
- Stutter on a mid-range phone during the main sequence.
- Scroll hijacking: the scene must not intercept or alter native scrolling.

## Approach (decided)

Hybrid simulation stepped on the CPU in typed arrays and uploaded as textures each
frame, the way Liquid 1 steps `WaveLine` and `SurfaceWaves`; all rendering runs on the
GPU through WebGL2. (Planning change, 2026-10-23: the draft said GPU simulation
passes. At the planned grid sizes, at most 160x112 cells and 1,536 particles, the CPU
cost is small, and a CPU step stays deterministic across GPUs and unit-testable in
Vitest.)

- **Body:** a 2D grid over the floor plane (x by depth z) solving shallow-water /
  height-field equations: each cell holds height and velocity. This gives waves
  that travel in any direction across the plane, interfere, reflect, and run up on
  the cylinder obstacle (cells inside the cylinder are solid boundary cells). Scroll
  energy enters as swells injected from the left and right edges; wind adds
  low-amplitude restlessness at rest; absorbing far boundaries prevent pile-up at
  screen edges; the mean level rises with scroll progress to the cover state.
- **Crests and spray:** where the field indicates breaking (steepness or upward
  acceleration past a threshold, including run-up against the cylinder), emit GPU
  particles carrying 3D position and velocity. Particles fall under gravity with
  drag by size, collide with the cylinder, and are re-absorbed when they land on the
  surface, depositing momentum back into the grid. This produces crown sheets,
  teardrop droplets, and the V-shaped wrap of reference B.
- **Rendering:** the height field is rendered as a perspective mesh from the fixed
  front camera. Particles are rendered as sphere impostors and merged with the body
  through screen-space fluid rendering (depth splat, bilateral smoothing, normal
  reconstruction), so splashes read as one continuous liquid. Shading reuses Liquid
  1's material model: opaque, linear-space Fresnel, crisp studio highlights,
  internal-scattering glow, Heritage Magenta hue preserved.
- **Compositing with the drink:** the image is drawn inside the same WebGL scene as a
  textured quad positioned at the cylinder's depth, so the depth test resolves
  front/back occlusion per pixel. The DOM `<img>` is kept only for the static
  fallback and no-JavaScript cases.

Rejected: full 3D particle fluid (FLIP/SPH) for the whole volume — most physically
complete but not able to fill the screen at a smooth frame rate on mid-range
phones. Rejected: extending Liquid 1's 1D line — cannot produce depth or wrapping.

## Constraints

- Stack: SvelteKit + Svelte 5 runes, TypeScript, Vitest, `playwright-core` for browser
  QA; pnpm. Run commands via `rtk` as the repo does.
- Mirror Liquid 1's structure and conventions:
  - Engine in `src/lib/liquid2/` with unit tests for the pure simulation logic.
  - Component `src/lib/components/Liquid2Splash.svelte` with the same props as
    `Liquid1Splash` (`progress`, `anchorX`, `anchorY`, `size`, `oncovered`, `class`),
    plus a prop for the drink image source and its intrinsic size.
  - Preview route `src/routes/qa/liquid2/+page.svelte`, `noindex`, same 250dvh track
    and 100dvh sticky stage pattern as `/qa/liquid1`.
  - Doc `docs/LIQUID2.md`.
- Keep Liquid 1's operational guarantees: stop drawing when offscreen, when the
  document is hidden, and after the covered endpoint settles; restart on resize and
  reverse scroll; handle WebGL context loss; adaptive resolution; drawing buffer
  capped at 900,000 px desktop / 450,000 px touch; 60 FPS cap; sustained overload
  switches to the static fallback.
- Fallback when WebGL2 or float render targets are unavailable, on reduced motion,
  or with data saver: static image of the drink plus a static wave image, with
  reversible scroll coverage, as Liquid 1 does.
- Accessibility: the canvas is decorative (`aria-hidden`); the drink keeps a real
  `alt` text; content stays readable without JavaScript.

## Validation

- Unit tests for deterministic simulation pieces (step stability, energy bounds,
  cylinder boundary blocks flow, particle absorption, level-rise mapping to
  `progress`).
- Browser QA with the existing script against the new route:
  `QA_PATH=/qa/liquid2 rtk node scripts/qa-liquid.mjs` (extend the script only where
  Liquid 2 needs new checks, e.g. liquid visible both in front of and behind the
  drink at mid-sequence, full coverage at the end).
- Frame timing with `scripts/benchmark-liquid.mjs` on desktop viewport, plus a
  throttled-CPU mobile-viewport run as the mid-range phone proxy.

## Left to the builder

- Grid resolution per device tier, particle budget, and the exact breaking criteria.
- Shallow-water scheme details (e.g. staggered grid, semi-Lagrangian advection) and
  float texture formats, with a fallback when `EXT_color_buffer_float` is missing.
- Cylinder proxy fit from the image (fixed ratios per image are acceptable).
- Screen-space smoothing parameters and lighting constants.
- How much Liquid 1 code (material shader, splash-drop logic, component lifecycle)
  is copied into `$lib/liquid2/` versus re-implemented; Liquid 1 files must not be
  modified.

## Scene and interaction details (assistant's calls, from builder review)

- **Reference images:** copied to `scratch/liquid2-review/refs/reference-a-wave.png`
  and `reference-b-crown.png`. The plan ends with an owner visual review of the
  `/qa/liquid2` route against these; tuning stops when the owner approves.
- **Camera:** fixed perspective, raised above the calm surface and tilted down about
  15–20°, so the floor plane shows depth and liquid visibly passes behind the drink.
  The grid's depth (z) extent reaches from just in front of the near clip to well
  behind the drink. Cover is reached by the surface climbing past the camera (as
  Liquid 1's wave "rolls over the camera"); the covered colour equals the next
  section's `bg-brand`.
- **Drink placement:** `anchorX`/`anchorY` give the drink's base on screen; `size` gives
  its height as a fraction of the canvas height. At rest the base sits slightly below
  the calm surface (partly submerged). The drink stays fixed on screen while the
  level buries it. The cylinder proxy is placed by unprojecting the base anchor onto
  the calm surface plane.
- **Pointer and touch:** kept, as in Liquid 1: pointer moves and taps inject impulses
  into the grid at the pointer's unprojected surface point. Existing QA pointer and
  touch checks apply.
- **Fallback image:** a new still rendered from the Liquid 2 scene at mid-sequence
  (drink wrapped), stored at `static/images/liquid2/wave-{desktop,mobile}.png`,
  produced by extending `scripts/render-liquid-still.mjs` to take a route/target.
- **Performance gates:** desktop 1440x900 p95 frame time ≤ 20 ms; mobile proxy
  390x844 with 4x CPU throttle p95 ≤ 33 ms. The browser proxy does not model a
  phone GPU's fill rate, so the plan ends with an owner check on a real mid-range
  phone.

## Calls made by the assistant (not discussed with the owner)

- Drink image for the preview: `static/images/assortment/avocado-960.webp` (the asset
  `/qa/liquid1` already uses; transparent product cut-out). Swappable via prop.
- Hybrid height-field + particles + screen-space rendering as the technique.
- No new dependencies; WebGL2 only.
- Preview route only; homepage untouched.
