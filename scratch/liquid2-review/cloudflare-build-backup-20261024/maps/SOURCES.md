# Zatiaras map style

`zatiaras.json` adapts OpenFreeMap's Positron style with the Zatiaras cream/ink
palette, preserving geographic data, zoom hierarchy and provider attribution.
The warm land/building palette now separates muted sage water/parks and readable
road labels. Optional 3D extrudes only provider-supplied `render_height` values;
no default heights or synthetic outlet models are added. Map attribution uses
short linked OpenStreetMap/OpenMapTiles/Positron credits. Optional OpenFreeMap
branding is omitted. Credits remain visible initially and accessible from the
native information control after collapse.

- Source: https://tiles.openfreemap.org/styles/positron (retrieved 2026-10-12).
- Regenerate: `node scripts/build-map-style.mjs` (network required).
- Style origins: OpenFreeMap, OpenMapTiles Positron, CartoDB Basemaps by Stamen
  and Paul Norman for CartoDB Inc. Design: CC BY 4.0 / original CartoDB CC BY 3.0;
  style code: BSD 3-Clause. See bundled upstream license notices.
- Data: OpenStreetMap contributors, OpenMapTiles, served by OpenFreeMap.
- Keep the visible map attribution control. The hosted service is independent
  of Zatiaras; list navigation remains available if it fails.
