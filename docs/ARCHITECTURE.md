# ARCHITECTURE.md — Multi-City V1

**Cut-off:** 2026-09-25. Extends 2026-09-15 pack; geography superseded.

## Domain model

- `City { id, name }`: samarinda / berau / balikpapan.
- `Outlet { id, name, city, cityId, address, hours, load, acceptsWebOrders, verified }`.
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
(`nearestOutlet`, currently null pending verified coords → safe fallback).

## Cart invariant

Pure `revalidateForOutlet(lines, targetOutlet)` returns kept/removed/priceChanged;
store `switchOutletWithRevalidation` persists + remembers outlet. UI confirms first.

## Stack

SvelteKit + Cloudflare (`wrangler.jsonc`, adapter-cloudflare), TypeScript/Zod-style
contracts, Vitest. SSR/prerender for brand/city/outlet/menu factual content.

## Open (do not invent)

Production DB, payment provider, group threshold, slot capacity, final menu/price,
refund automation, verified outlet coords/hours/addresses for Berau/Balikpapan.
