# UX.md — Customer Journey & Interface (multi-city)

**Cut-off:** 2026-09-25. Supersedes Samarinda-only UX assumptions.

## Journey

Discover (brand homepage / city page / Maps) → choose outlet (suggested, remembered,
or manual) → browse outlet menu → cart (one outlet) → guest checkout → pay →
track (plain Indonesian) → pickup with code → support/WhatsApp on paid failure →
feedback → repeat.

## Homepage

Brand-level, 8 sections per SPEC_V1. Hero: `JUS ALPUKAT`, real cup, `Buahnya Berasa.`,
single `[PESAN SEKARANG →]`, coverage cue. No branch cards/prices/ratings/testimonials/
Maps/delivery claims in hero. One signature scroll sequence (type shift, cup
transform/opacity, magenta transition, "Kentalnya Beneran." proof), then release to
commerce. No scroll hijack/trap; reduced-motion = complete static hero.

## Navbar states

Top (desktop ~72–76px, cream): logo + Menu/Outlet/Pesan Rame-Rame + cart; no duplicate
Pesan Sekarang while hero CTA visible. Scrolled (~60–64px, opaque cream): contextual
Pesan Sekarang appears with reserved space (no shift of logo/links/cart). Mobile
(~56–64px): logo + cart + menu button; hide on intentional scroll-down (threshold +
hysteresis), show on scroll-up; drawer with focus trap, Escape close, focus restore.
Active link magenta + underline + `aria-current`. Cart label "Keranjang[, N item]".

## Outlet selection & location

Fast grouped selector: Samarinda (Juanda, Slamet Riyadi) / Berau (Merah Delima) /
Balikpapan (Kutilang, Gatot Subroto). IP suggestion copy example:
"Sepertinya kamu berada di Balikpapan." + prioritize local outlets; never auto-assign.
"Gunakan Lokasi Saya" triggers browser permission; granted → nearest verified outlet;
denied → fallback + analytics `browser_location_denied`, no nag, no block.
Remembered outlet chip: "Outlet: Kutilang, Balikpapan [Ganti]".

## Cart switch

Modal/inline warning with outlet names + consequence; [Ganti Outlet] runs revalidation
showing kept / price-changed (old → new) / unavailable-removed; [Batal] keeps cart.

## Locations UX

`/locations` hub groups by city with links to city + outlet pages; outlet pages show
verified facts only (unverified → "terverifikasi menyusul" + no fabricated map pin).

## Accessibility (WCAG 2.2 AA)

Semantic nav, keyboard support, visible focus, contrast, accessible modal/drawer
(Escape, focus trap/restore), no sticky overlap of focused content, reduced-motion
support, accessible cart/location labels.

## Performance

p75 LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. Transform/opacity animations,
IntersectionObserver, responsive images, SSR factual content; no layout-shift CTA,
no heavy blur/WebGL, no expensive scroll handlers.
