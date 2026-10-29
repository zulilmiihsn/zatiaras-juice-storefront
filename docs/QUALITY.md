# QUALITY.md — QA Gates (multi-city)

**Cut-off:** 2026-09-25. QA is NOT "Juanda + Slamet Riyadi only".

## Coverage matrix

Order/select flows per outlet: Juanda, Slamet Riyadi, Merah Delima, Kutilang,
Gatot Subroto; per city: Samarinda, Berau, Balikpapan.

## Required scenarios

- Correct IP suggestion (Balikpapan → Kutilang/Gatot Subroto prioritized, no auto-lock).
- Wrong IP / VPN-like city / unknown city → safe manual fallback.
- Precise location granted → nearest (once coords verified); denied → fallback, no nag, no block.
- Remembered outlet priority over IP; outlet switch warns + revalidates (price mismatch, unavailable item).
- Busy / very-busy / paused-web-order behavior; checkout recheck.
- Multi-city SEO: city + outlet pages, branch `JuiceBar` JSON-LD per outlet, sitemap/canonical.
- Public policies `/privacy` and `/terms` accurately describe current local browser storage and gated checkout; obtain owner/legal approval and update before backend/payment activation.
- Branded `+error.svelte` handles unknown routes without exposing internal error details; noindex and working recovery links.
- Mobile nav/drawer/bottom CTA; reduced-motion static hero; keyboard + focus + Escape; no sticky overlap.
- Core Web Vitals p75: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- Payments: server-verify, idempotent webhooks, no production on unverified; paid-failure → WhatsApp recovery.

## Gates

Homepage spacing: run `node scripts/qa-home-layout.mjs` against the dev server
(default `http://127.0.0.1:5199`, override with `QA_BASE_URL`). Check all seven
sections at the eight standard widths, a short landscape viewport, normal and
reduced motion, and no-JavaScript mobile content. Assert aligned headings, no
clipped content or overlapping sections, a largest top-seller card, and the
hero/map viewport heights. Screenshots and geometry are in `scratch/home-layout/verified/`.

Homepage section 02 (Paling Laris): run `node scripts/qa-best-sellers.mjs` against the dev server.
Check eight viewport widths, one-viewport fit on 1024/1280/1366/1440/1908px-wide laptops, three product links in sales order, a two-line title, loaded
images, no overflow or clipped text, cup never overlapping card text, 44px targets, keyboard
order/focus, normal/reduced motion, no-JavaScript content and the no-price rule (no `Rp` in
the section; never stock). Screenshots go to `scratch/best-review/`.

Homepage section 03 (Jus Apa Aja Ada): run `node scripts/qa-categories.mjs`. Check eight widths,
five panels with exactly one open, inert closed bodies, click/keyboard/hover opening (hover
only from 1024px), open panel content not clipped, one-viewport fit on laptops, no-JavaScript
links and the `/menu?kategori=` filter including Baby items.

Homepage map checks: all three cities/five branch previews, marker/select sync for
Juanda, no pins for unverified coordinates, lazy requests on every viewport,
source attribution, map failure/retry, native select keyboard selection and reduced motion,
remembered priority over IP suggestion, no cart/storage mutation during preview,
and direct no-JavaScript outlet links. Check 320/360/375/390/768/1024/1280/1440px.
Check default 2D with no mode toggle, readable palette, and no extrusion/material requests.
Check circular attribution expanding into a bar, visible source links on small maps,
Enter/Space toggling, Escape focus return, and reduced-motion support. Check an exact
100dvh section at the eight listed viewport sizes, with every content block inside its bounds.
Check all five branches at 320x568; long hours and unknown-location notices must fit.
Selected pin/visible label stay inside the map frame,
inline name/address/hours on all viewports, no outlet-detail disclosure, verified-coordinate
directions only, honest unknown-address copy, page scrolling over the map, and no overlap
from the global mobile CTA. Run `node scripts/qa-outlet-finder.mjs` against the dev server.
The inset map occupies most of the section. Floating city/outlet controls remain within the section;
selected pins and visible marker labels must not intersect either overlay on desktop/mobile.
The map remains visible without a view toggle; mobile outlet selection must expose every
real branch and preserve cart context. Decorative rims must never block attribution or controls.
Order CTA passes the chosen outlet to the menu; verify empty-cart selection, populated-cart
cancel/confirm with preserved items, and rejection of invalid outlet query values.
Branch name, address and hours remain visible directly; extended information lives on branch pages.
Screenshots from the locator QA capture the full section on desktop/mobile.

`pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` must pass. No dead links/routes.
No fabricated operational data (`VERIFY_VIA_GBP`/`VERIFY_VIA_OPS` where unverified).
