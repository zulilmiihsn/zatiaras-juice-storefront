# Liquid scroll prototype

Preview route: `/qa/liquid`. The public homepage is not changed.

This implements the signature scroll interaction described in `UX.md`:
native page scrolling drives a continuous magenta wave until it covers the
viewport. Scrolling backward restores the exposed surface. The scene uses
WebGL2 and a rasterized, deformable 3D mesh, not a fluid-dynamics solver.

## Implementation

- `src/lib/liquid/wave-line.ts`: the top edge is a simulated 1D damped wave
  line. At rest only wind stirs it, so it reads as flat and restless. Scroll
  energy drives swells in from both sides and opposing turbulence through the
  body; crests collide, and a crest that rises fast or grows past its breaking
  height throws droplets that fall back into the surface. Absorbing ends keep
  liquid from piling up at the screen edges. Steps are fixed and seeded.
- `src/lib/liquid/wave.ts`: one bounded vertex grid forms the deep wave body
  under that simulated edge. Taller waves on the light's side shade the
  liquid behind them, troughs get ambient occlusion, and deeper liquid darkens
  gently. Breaking crests throw jets of chained drops plus fine mist; drops are
  drawn as teardrop impostors with the same material, with air drag by size. Deformation runs per vertex; the fragment shader computes
  Fresnel reflection and crisp studio-light highlights in linear color space.
  The liquid is fully opaque: an internal-scattering glow brightens thin and
  grazing areas instead of showing the background. Fine ripples stream down
  the face, and scroll speed accelerates that flow rather than bending the body.
  Pink shadows retain depth while preserving the reference hue. Native
  antialiasing smooths the silhouette within the existing drawing-buffer budget.
  The previous expensive raymarch prototype is archived unchanged at
  `scratch/liquid-review/crown-raymarch.ts` and is not imported by the app.
- `src/lib/components/LiquidSplash.svelte`: damped scroll progress, bounded
  scroll inertia, pointer displacement, touch impulses, adaptive resolution,
  context-loss handling, and renderer cleanup.
- `src/routes/qa/liquid/+page.svelte`: a 250dvh track and a 100dvh sticky scene.
  The next section shares the final liquid color.

Idle motion is a slow continuous swell; the former random splash impulses are
removed. Pointer movement and deliberate taps deform the connected surface.
The scene does not intercept scrolling. It stops drawing while offscreen,
while the document is hidden, and after the fully covered endpoint settles.
Resize and reverse scrolling restart drawing. No new dependency is required.
The drawing buffer is capped at 900,000 pixels on desktop and 450,000 on touch
devices, including HiDPI displays. Rendering is capped at 60 FPS; because the surface is
always in motion there is no slower idle rate. Sustained overload switches to the
static fallback.

Reduced motion, data saver, and unavailable or lost WebGL use transparent
renders of the same connected wave at `static/images/hero/wave-{desktop,mobile}.png`.
Regenerate them from the running scene with `rtk node scripts/render-liquid-still.mjs`.
The supplied reference image is retained separately as a visual reference. Fallback scroll
coverage is reversible; the static image and menu link remain available without
JavaScript. These wave assets are separate from the official logo and Z-Flow assets.

## Validation

Start the dev server, then run:

```sh
rtk pnpm dev --host 127.0.0.1 --port 5199
rtk node scripts/qa-liquid.mjs
```

The browser check covers eight viewport widths, actual shader compilation,
25 opaque canvas samples at full coverage, reverse scrolling, desktop pointer
and mobile touch input, resize after coverage, offscreen suspension, context
loss, reduced-motion changes, data saver, unavailable WebGL, and no JavaScript.
It also checks bright pink output, a connected liquid body, no droplets while
calm, droplets from colliding waves while scrolling, and the HiDPI pixel budget.
Screenshots and results are saved in `scratch/liquid-review/`.

Run `rtk node scripts/benchmark-liquid.mjs after` against the production preview
on port 4173 to measure frame intervals using the same 1440x900 browser viewport.

Real-device frame rates depend on GPU and viewport size; the browser check
establishes rendering and interaction correctness, not a universal FPS guarantee.
