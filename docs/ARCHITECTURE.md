# ARCHITECTURE.md — Multi-City V1

**Cut-off:** 2026-09-25. Extends 2026-09-15 pack; geography superseded.

## Domain model

- `City { id, name }`: samarinda / berau / balikpapan.
- `Outlet { id, name, city, cityId, address, hours, load, acceptsWebOrders, verified }`.
- Optional `Outlet.coordinates { latitude, longitude, verified, source, verifiedAt }`
  is an independent map-verification gate; legacy `verified` does not create pins.
- `MenuItem` (global master: id, name, description, reference price, image).
- `OutletMenuOffering { outletId, menuItemId, price, availability, isOrderable }`
  (implemented via `priceFor`/`availabilityFor` hooks; per-outlet overrides allowed later).
- `OutletMenuAvailability` retained where used; do not duplicate models needlessly.
- `Order { outletId, fulfillmentMethod?: 'PICKUP', ... }` (future `'DELIVERY'` not exposed).
- `Cart` session: `{ lines, outletId }` + `lastSelectedOutlet` persistence.
- `PickupSlot`, `Payment`, `Refund`, `SupportCase` unchanged semantically.
- `LocationSource: remembered | ip | manual | browser-geolocation`.

See `src/lib/core/contracts.ts`, `src/lib/core/outlets.ts`, `src/lib/data/menu.ts`,
`src/lib/location/suggest.ts`, `src/lib/stores/cart-logic.ts`.

## Location pipeline

`readRememberedOutlet()` → `suggestFromCf(cf)` (Cloudflare city/region → city
suggestion, never outlet lock) → manual `OutletSelector` → explicit browser geo
(`nearestOutlet` stays null while branch coordinate coverage is incomplete → safe fallback).

## Cart invariant

Pure `revalidateForOutlet(lines, targetOutlet)` returns kept/removed/priceChanged;
store `switchOutletWithRevalidation` persists + remembers outlet. UI confirms first.

## Stack

SvelteKit + Cloudflare (`wrangler.jsonc`, adapter-cloudflare), TypeScript/Zod-style
contracts, Vitest. SSR/prerender for brand/city/outlet/menu factual content.

Homepage map: lazy MapLibre GL JS + dedicated Vite worker, static
`/maps/zatiaras.json`, OpenFreeMap vector tiles/glyphs/sprites. No API key or
precise browser geolocation. Native map controls/camera; inline outlet information and actions.
North-up 2D camera (pitch/maxPitch 0); native city/outlet selects preview outlet
context without persistence. The inset map sits behind a city panel and outlet-card shelf;
desktop cards use native radios and mobile adds a native outlet select. Discovery stays
on the map without a separate list mode. `/menu?outlet=...` carries order intent to the existing menu
outlet-change handler; validation, populated-cart confirmation and revalidation stay there.
The finder measures viewport/header/card bounds with ResizeObserver and passes camera
padding to OutletMap. The map owns canvas resizing and selected-point framing. A short
unobstructed area hides redundant pin text and overview controls. Native style uses only the upstream
sprite and source geometry. The 3D layers, material generator, sprite assets and related
QA were removed when the user selected the 2D direction on 2026-10-16.
Cooperative touch gestures preserve page scrolling; no scroll-wheel zoom capture.
Dispose map, markers, observer, media listeners, startup timer and tweens on unmount.
Provider failure or missing WebGL leaves outlet selectors/navigation available.

Juanda coordinate provenance (2026-10-12): employer listing
https://www.kitalulus.com/company/zatiaras-juice-samarinda-r6vq publishes
`G4FP+GX5, Jl. Ir. H. Juanda, Sidodadi, Samarinda`. Google Open Location Code
`recoverNearest` against the existing Samarinda city reference yields
`6PFVG4FP+GX5`, cell centre `-0.4762375, 117.137484375`. Remaining four branches
have no verified coordinates and are not plotted. No inferred nearest-outlet
ranking while coverage is incomplete. Source geography for overview cameras
remains the existing `CITY_CENTROIDS`; centroids never become outlet markers.
Balikpapan's overview/coarse city reference uses the OSM `place=city` feature
https://api.openstreetmap.org/api/0.6/node/2417847197.json:
`-1.2398711, 116.8593379` (checked 2026-10-17). This replaces the coastal camera
reference `-1.2654, 116.8312` so wide map views prioritize the urban area. Branch
coordinate verification remains independent; this city reference never creates pins.
Berau's legacy overview reference incorrectly used southern latitude. Corrected
to `2.1406 N, 117.5186 E` from the official Kelurahan Tanjung Redeb profile
https://kel-tanjungredeb.beraukab.go.id/profil (checked 2026-10-12). This is a
city-area reference for overview and coarse suggestions, not Merah Delima's pin.

## Open (do not invent)

Production DB, payment provider, group threshold, slot capacity, final menu/price,
refund automation, verified outlet coords/hours/addresses for Berau/Balikpapan.
