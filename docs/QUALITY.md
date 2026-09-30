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
- Mobile nav/drawer/bottom CTA; reduced-motion static hero; keyboard + focus + Escape; no sticky overlap.
- Core Web Vitals p75: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- Payments: server-verify, idempotent webhooks, no production on unverified; paid-failure → WhatsApp recovery.

## Gates

`pnpm test`, `pnpm check`, `pnpm lint`, `pnpm build` must pass. No dead links/routes.
No fabricated operational data (`VERIFY_VIA_GBP`/`VERIFY_VIA_OPS` where unverified).
