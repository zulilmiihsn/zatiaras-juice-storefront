# CONTRACTS.md — Business/Executable Contracts (multi-city)

**Cut-off:** 2026-09-25. Executable: `src/lib/core/contracts.ts`.

- `City: Samarinda | Berau | Balikpapan`; `OutletId: juanda | slamet-riyadi | merah-delima | kutilang | gatot-subroto`.
- `Availability: AVAILABLE | LIMITED | SOLD_OUT` (no exact stock claims).
- `OutletLoad: NORMAL | BUSY | VERY_BUSY | PAUSED` (`PAUSED`/`acceptsWebOrders=false` → no new web orders; server recheck pre-payment).
- `OutletMenuOffering { outletId, menuItemId, price, availability, isOrderable }`; resolvers `priceFor`, `availabilityFor`, `isOrderable`.
- Cart owns `outletId`; cross-outlet add refused; switch requires explicit confirm + `revalidateForOutlet` (unchanged / price-changed / unavailable).
- `LocationSource: remembered | ip | manual | browser-geolocation`; IP = suggestion only; browser geo only after explicit intent.
- Order owns `outletId`; lifecycle `DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → PREPARING → READY → COMPLETED` (+ `FULFILLMENT_FAILED → REFUND_PENDING → REFUNDED`, `EXPIRED`, `CANCELLED`).
- Payment: server-verified, idempotent webhooks, no production on unverified.
- `FulfillmentMethod: PICKUP` (future `DELIVERY` reserved, unexposed).
- Tests: `cart-logic.test.ts` (invariant + revalidation), `location/suggest.test.ts` (5 outlets, grouping, IP suggestion), `menu.test.ts`, `events.test.ts`.
