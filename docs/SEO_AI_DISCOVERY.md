# SEO_AI_DISCOVERY.md — Multi-City Local Discovery

**Cut-off:** 2026-09-25. Samarinda-only SEO superseded.

## Entity hierarchy

Zatiaras Juice → Samarinda (Juanda, Slamet Riyadi) / Berau (Merah Delima) /
Balikpapan (Kutilang, Gatot Subroto). Homepage = brand coverage; city pages =
city relevance; outlet pages = outlet truth.

## Implementation

- SSR/prerender factual content; per-page title/description/canonical.
- Per-outlet `JuiceBar` JSON-LD (name, city, hours/address only when verified —
  `localBusinessJsonLd` omits unverified fields rather than fabricating).
- `Organization.areaServed = [Samarinda, Berau, Balikpapan]`.
- Sitemap includes `/`, `/menu`, `/menu/*`, `/locations`, 3 city + 5 outlet pages,
  `/about`, `/group`, `/feedback`.
- Breadcrumb JSON-LD on hub/detail pages. No mass low-quality geo pages; no fake
  "best juice" claims; product `Offer` uses outlet-context availability.
