# Homepage scroll/rendering audit — implementation follow-up

## Scope

Initial findings and follow-up verification for `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `src/routes/layout.css`, and `src/lib/components/MobileNav.svelte`. Requirements checked against `docs/UX.md`, `docs/QUALITY.md`, and `docs/UI_SYSTEM.md`.

Browser verification ran against the local Vite development server in headless Chromium 1234. Responsive widths: 320, 360, 375, 390, 640, 768, 1024, 1280, and 1440 CSS px; additional mobile test: 390×844, DPR 3. This is **not** a real-phone GPU profile, production Lighthouse run, or field Core Web Vitals result.

## Fixes implemented and verified

1. **Navbar layout stability and 640px overflow** — desktop navigation now starts at `md` (768px). Compact tablet/mobile widths use the drawer. At desktop widths, a fixed 172px CTA slot remains in layout and only its opacity/transform changes. Before/after CTA states now have identical link positions at 768, 1024, and 1440px; no header link is outside the viewport. At 640px the desktop CTA/nav links are not forced into the header. The drawer and contextual bottom CTA remain available through 767px.
2. **Slow upward scroll reveals the mobile header** — direction travel accumulates from a direction-change anchor, with separate 24px down / 12px up thresholds. With the previous reproduction (2px upward increments), the header now returns from y=-73 to y=0. Menu-open, focused-header, and near-top safeguards remain. No smooth-scroll library was added.
3. **Video playback follows actual exposed homepage regions** — the fixed video pauses through the opaque middle canvas, footer, hidden document, and open mobile drawer; it plays again in exposed hero/product areas and resumes after drawer close. It is not observed directly for intersection because a fixed full-screen video remains geometrically intersecting while covered.
4. **Reduced-motion and data-saver media policy** — no autoplay or source URLs are present in the initial markup. Video sources are attached only when playback is allowed and an exposed region is visible. In the reduced-motion browser test, the poster loaded but neither WebM nor MP4 was requested. Simulated `navigator.connection.saveData=true` leaves playback paused. Save-Data is honored on browsers that expose the Network Information API; browser support varies.
5. **Below-fold footer image** — added `loading="lazy"` and `decoding="async"`, preserving the approved picture sources, dimensions, sizing, priority, crop, and mask. No footer wave image request was recorded at page top; scrolling toward the footer loaded the selected AVIF.
6. **Large-area blur** — removed backdrop blur from the full-screen veil, the near-opaque 94% canvas, and translucent product/proof cards. Existing small CTA/pill treatments remain. Their visual roles and colors were retained. Earlier synthetic A/B results were too noisy to prove blur was the source of jank; this is a rendering-cost precaution, not a claimed measured frame-rate gain.
7. **Scrollbar affordance** — restored native browser scrollbars; the computed `scrollbar-width` is `auto`. Smooth anchor behavior and reduced-motion overrides remain.

## Verification results

- No JavaScript errors or document horizontal overflow across the nine responsive widths; the audit script now asserts these checks and fails on regression.
- No header CTA/link outside viewport bounds; stable positions between top and scrolled CTA states at desktop widths.
- Slow-scroll header return passed, as did open/close drawer focus and scroll locking at 640px.
- Video state checks passed for middle canvas, footer, drawer, reduced-motion, and simulated Save-Data; drawer open/close and slow-scroll return are also asserted by the script.
- Footer decorative artwork is no longer requested on initial page load.
- `pnpm check`, `pnpm test` (43 tests), `pnpm lint`, and `pnpm build` passed. The first build attempt was blocked by the still-running local Vite process holding `.svelte-kit/cloudflare`; after closing that process, the build and Cloudflare adapter completed successfully.

Artifacts: `results.json`, `home-*-*.png`, `mobile-header-return.png`, `mobile-middle.png`, `mobile-footer.png`, and `audit-home-scroll.mjs` (run with the local Vite server at `localhost:5173`). Older `media.json` and `scroll-samples.json` capture the initial diagnostic and are **pre-fix**; their results should not be read as measurements of the implementation above.

## Remaining limits

- No physical Android/iOS device paint/decode/GPU/battery profile was available. Headless rAF interval data is not compositor FPS.
- No production LCP/INP/CLS p75 data was measured. Keep the documented gates: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1.
- The page is still long on mobile (~11,200px at 390px width); this is content/layout, not evidence of slow scrolling.
- Save-Data and `effectiveType` support varies by browser and network; reduced-motion works independently.
