# ADR — Multi-City, Multi-Outlet V1 (2026-09-25)

**Status:** ACCEPTED
**Date:** 2026-09-25
**Supersedes:** DEC-002 (Samarinda pilot, Juanda + Slamet Riyadi) — SUPERSEDED for website product scope.

## OLD

V1 pilot geography = Samarinda / Juanda + Slamet Riyadi.

## NEW

V1 launch scope = all verified active outlets in Samarinda, Berau, and Balikpapan:

- Samarinda: Juanda, Slamet Riyadi
- Berau: Merah Delima
- Balikpapan: Kutilang, Gatot Subroto

## Reason

The product is intended to function immediately as a unified Zatiaras digital storefront
rather than being architecturally centered on one city.

## Consequences

- Homepage becomes brand-level (not Samarinda-specific).
- City routes added: `/samarinda`, `/berau`, `/balikpapan`.
- Outlet routes: `/samarinda/juanda`, `/samarinda/slamet-riyadi`, `/berau/merah-delima`,
  `/balikpapan/kutilang`, `/balikpapan/gatot-subroto`.
- Outlet context becomes first-class (city/outlet = discovery + fulfillment + pricing +
  availability + pickup-capacity + analytics dimensions).
- Menu/pricing/availability resolve through outlet context (`OutletMenuOffering` /
  `priceFor` / `availabilityFor` hooks).
- One normal cart belongs to one outlet; outlet switch requires warning + revalidation.
- Local SEO becomes multi-city (brand → city → outlet entity hierarchy).
- QA must cover all active outlets; analytics needs city/outlet_id dimensions.
- Operational facts for Berau/Balikpapan outlets remain `VERIFY_VIA_GBP` / `VERIFY_VIA_OPS`
  until confirmed — no fabrication.

## Brand authority (unchanged)

Official brand PDFs and approved SVG/font assets remain authoritative for visual identity.
This ADR changes product scope only, not logo/colors/type/Z-Flow rules.

## Human PDF note

Older human PDFs stating "Samarinda pilot" are stale on geography/scope sections.
Visual brand authority from official brand PDFs remains valid.
Future PDF revision should update scope sections to this ADR.
