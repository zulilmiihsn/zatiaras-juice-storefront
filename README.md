# Zatiaras Web V1 — Owned Digital Storefront

**Cut-off:** 2026-09-28
**Scope:** Multi-city V1 — Samarinda (Juanda, Slamet Riyadi) · Berau (Merah Delima) · Balikpapan (Kutilang, Gatot Subroto)
**Status:** Multi-city architecture implemented; Berau/Balikpapan operational facts pending verification.

> Supersession note: scope "Samarinda pilot, Juanda + Slamet Riyadi" (baseline 2026-09-15,
> `ZATIARAS_WEB_V1_SOURCE_OF_TRUTH_2026-09-15/`, DEC-002) is SUPERSEDED for website product
> scope by `docs/adr/ADR_MULTI_CITY_MULTI_OUTLET_V1_2026-09-25.md`. Older human PDFs stating
> "Samarinda pilot" are stale on geography/scope; official brand PDFs remain authoritative
> for visual identity.

## Product

Mobile-first, multi-city, multi-outlet owned digital storefront + public discovery app.
Customers discover products/locations, select an outlet, browse menu, order, pay, track,
get human support on failure, and pick up. V1 fulfillment is pickup-first (`Pesan Sekarang`
→ outlet context → pickup). Architecture stays delivery-compatible without exposing delivery.

## Source authority

- Product scope: this repo's `docs/` + ADR above (newest owner direction).
- Brand visuals: official brand PDFs + `docs/BRAND_REFERENCES.md`. Never redraw logo/Z-Flow.
- Behavior truth: executable contracts/tests (`src/lib/core/contracts.ts`, `*-logic.test.ts`).
- Historical pack: `ZATIARAS_WEB_V1_SOURCE_OF_TRUTH_2026-09-15/` preserved; stale on geography.

## Reading order

`AGENTS.md` → `docs/PRODUCT.md` → `docs/SPEC_V1.md` → `docs/UX.md` → `docs/UI_SYSTEM.md` →
`docs/ARCHITECTURE.md` / `docs/CONTRACTS.md` → `docs/BRAND_REFERENCES.md` →
`docs/QUALITY.md` → `docs/SEO_AI_DISCOVERY.md` / `docs/ANALYTICS.md` → code + tests.

## Routes (IA)

`/`, `/menu`, `/menu/[slug]`, `/locations`, `/samarinda`, `/samarinda/juanda`,
`/samarinda/slamet-riyadi`, `/berau`, `/berau/merah-delima`, `/balikpapan`,
`/balikpapan/kutilang`, `/balikpapan/gatot-subroto`, `/order`, `/order/[id]`,
`/track`, `/feedback`, `/about`, `/group`.

## Develop

```sh
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm lint
pnpm build
```

QA screenshots: `pnpm dev --port 5199` (satu shell), lalu `node scripts/shots.mjs`
di shell lain. Memakai `playwright-core` + chromium bawaan Playwright yang sudah
terinstal; hasil ke `scratch/shots/`.

## Operational-data gaps (not fabricated)

Research 2026-09-25 (repo publik resmi tim `zulilmiihsn/zatiaras-juice-storefront`,
live site `zatiarasjuice.biz.id`, struk GoFood Berau Des 2023, profil Kitalulus):

Verified and applied:

- Merah Delima (Berau): Jl. Merah Delima depan Klinik Berlian Bakti, Tanjung Redeb;
  08:00–22:00 WITA; +62813-4988-2015 (triple-source).
- Juanda (Samarinda): Jl. Ir. H. Juanda samping Ami Ali Parfum, Sidodadi,
  Samarinda Ulu 75243 (repo resmi + Kitalulus). Hours keep reconciled planning truth.

Still open:

- Slamet Riyadi street address; Kutilang + Gatot Subroto street addresses/coords
  (hours owner-confirmed 2026-09-25: Slamet Riyadi 07:00–22:00 Mon–Sat, Sunday
  closed; Kutilang + Gatot Subroto same as Juanda 07:00–23:00 daily).
- Outlet pin coordinates (only city-level centroids known — not used as pins).
- Final menu/price truth (Supabase live, not publicly accessible; 2023 receipt stale).
- Payment provider, group threshold, slot capacity.

Until current outlet menu/price/availability is verified (`MENU_VERIFIED` and
`AVAILABILITY_VERIFIED`), site stays browseable but add-to-cart/checkout are held with
a clear notice; seeded prices/statuses are not shown as real offers.
