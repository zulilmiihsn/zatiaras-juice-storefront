# Liquid 1

A frozen copy of the liquid prototype, kept for reuse in other use cases while the
main prototype (`docs/LIQUID_PROTOTYPE.md`) explores a different approach.

- Component: `src/lib/components/Liquid1Splash.svelte` (same props as `LiquidSplash`:
  `progress`, `anchorX`, `anchorY`, `size`, `oncovered`, `class`).
- Engine: `src/lib/liquid1/` (`wave.ts`, `wave-line.ts`, `surface-waves.ts`, with tests).
- Static fallbacks: `static/images/liquid1/wave-{desktop,mobile}.png`.
- Preview route: `/qa/liquid1`.
- Optional props, defaults unchanged: `maxLevel` (level at progress 1, default 7.4,
  which covers the box), `minSwell` (swell energy floor, default 0), `spray` (default
  true; false stops crests throwing droplets), `dye` (display-space RGB, default the
  Liquid 1 pink `[1, 0.035, 0.4]`; the shadow floor scales with it), `fade` (eases the
  liquid into a flat colour over a fraction of the box bottom, default off) and a `still`
  snippet that replaces the default still image.
- In use: the public footer divider (`src/lib/components/FooterWave.svelte`, rendered by
  `src/routes/+layout.svelte`). Progress follows the divider scrolling into view,
  `maxLevel` is 1.6 so the surface stays visible, `minSwell` 0.8 keeps it rolling at
  any scroll position or while idle, `spray` is off, the `dye` matches the footer
  magenta `#d90359`, `fade` blends the bottom 40% into that colour (the footer gradient
  holds `#d90359` down to the box edge, so the hand-off has no seam), and the supplied divider artwork
  (`/images/zatiaras-wave-divider-*`) is the still image.

Behaviour at the time of the copy: a wind-stirred calm surface; scroll drives swells
in from both sides that collide; breaking crests emit splash parcels rendered as a
merged liquid surface; the level rises over the drink until the screen is covered.
The design and validation notes in `docs/LIQUID_PROTOTYPE.md` describe this version
as of 2026-10-23.

Falling drops leave a mark on the main liquid in proportion to their momentum
(radius cubed times fall speed): a small local dip in the edge, capped so a drop
can never raise a new wave, and a ring on the face where it hit that fades
quickly. Landings throw no new spray; the pit and its rims cannot trigger another
splash for 0.6 s.

Validate with the shared browser check against this route:

```sh
QA_PATH=/qa/liquid1 rtk node scripts/qa-liquid.mjs
```

In Git Bash, prefix `MSYS_NO_PATHCONV=1` so the path is not rewritten.
