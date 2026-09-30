# AGENTS.md — Zatiaras Web V1 (multi-city)

**Cut-off:** 2026-09-28 · **Scope:** Samarinda · Berau · Balikpapan (5 outlet aktif)
**Supersedes:** Samarinda-only pilot assumptions (DEC-002 SUPERSEDED — see `docs/adr/ADR_MULTI_CITY_MULTI_OUTLET_V1_2026-09-25.md`).

## Mission

Build Zatiaras Web V1 as a mobile-first, multi-city, multi-outlet owned digital storefront
and pickup-ordering platform. Homepage is brand-level; transactions are outlet-level.

## Guardrails (hard rules)

- Never assume Samarinda is the entire business scope.
- Never hardcode an outlet into shared business logic — city/outlet are data-driven (`src/lib/core/outlets.ts`).
- Homepage is brand-level (coverage cue "Samarinda · Berau · Balikpapan").
- Price and availability resolve through outlet context (`priceFor` / `availabilityFor` / `OutletMenuOffering`).
- Never expose seeded/unverified price or availability as customer-facing operational truth.
- One normal cart belongs to one outlet (`outletId`); outlet change requires warning + revalidation.
- IP geolocation is suggestion only — never silently lock an outlet.
- Precise browser geolocation only after explicit user intent ("Gunakan Lokasi Saya"); denial falls back safely.
- Manual outlet selection must always remain available; remembered outlet takes priority over IP.
- `Pesan Sekarang` remains the primary commerce CTA (maps to pickup in V1; delivery-ready wording).
- V1 is pickup-first. Do not fabricate delivery.
- Do not publish unverified branch data — use `VERIFY_VIA_GBP` / `VERIFY_VIA_OPS` markers.
- Do not redraw official brand assets. Do not fabricate Z-Flow.
- Never trust browser-only payment status; server-verify; idempotent webhooks; no production without verified payment.

## Domain values (do not reinterpret)

- Availability: `AVAILABLE`, `LIMITED`, `SOLD_OUT`.
- Outlet load: `NORMAL`, `BUSY`, `VERY_BUSY`, `PAUSED` (`PAUSED` = no new web orders).
- Order lifecycle: `DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → PREPARING → READY → COMPLETED`
  (+ `FULFILLMENT_FAILED → REFUND_PENDING → REFUNDED`, `EXPIRED`, `CANCELLED`).
- Guest checkout, no mandatory account. Group orders above threshold need approval before payment.
- Paid-order exception → human WhatsApp support.

## Task execution

1. Identify requirement IDs and read relevant Markdown source-of-truth.
2. Inspect existing UI/routes before editing; preserve approved sections and assets.
3. Implement the smallest coherent vertical slice and keep mobile/responsive states aligned.
4. Add/update meaningful tests and screenshot/viewport checks for visual changes.
5. Run `pnpm test`, `pnpm check`, `pnpm lint`, and `pnpm build`.
6. Summarize changed behavior and remaining verified data gaps.
