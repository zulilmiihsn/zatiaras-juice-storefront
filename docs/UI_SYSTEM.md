# UI_SYSTEM.md — Web Interface System

**Cut-off:** 2026-09-28 · **Authority:** `BRAND_REFERENCES.md`, official brand assets,
`UX.md`, `SPEC_V1.md`. This document organizes implementation rules; it does not
change brand identity or product scope.

## 1. Visual foundation

- Heritage Magenta `#FF1081`: primary action and brand recognition.
- Fruit Cream `#FFF8EC`: page/information canvas.
- Fruit Ink `#241A20`: headings and essential copy.
- White: elevated cards/forms. Fruit accents only for product cues or statuses.
- Functional UI: Plus Jakarta Sans. Zatiaras Display only for display headings/brand-led
  moments. Official SVG logo/cup assets only; no substitute logo or invented imagery.

## 2. Layout & spacing

- Mobile-first; viewport checks: **320, 360, 375, 390, 768, 1024, 1280, 1440px**.
- Page gutters: 16px at small phone, 24px from 640px, 32px on wide screens.
- Content measure: 1152px storefront, 960px form/detail, 672px reading/form flow.
- Spacing uses 4px rhythm; common steps 8/12/16/24/32/48/64px.
- Card radius 16–24px; one-pixel restrained borders; shadows only to separate layers.
- No horizontal scrolling, clipped labels, or content behind fixed navigation/CTA.

## 3. Page patterns

- Storefront/discovery: shared public header + one `<main>` + brand footer.
- Page intro: eyebrow → one clear H1 → short explanatory copy → optional primary action.
- Browse pages: responsive card grid; one column at narrow mobile, two at tablet,
  up to four at wide desktop where item content supports it.
- Forms: single column on phone, grouped columns only when related fields fit;
  labels stay visible, errors inline, action full-width on narrow viewports.
- Checkout/order: minimal header and no marketing footer/navigation.
- Outlet crew/admin tools: dedicated internal header, no storefront CTA/nav/footer.
- Empty/loading/error states retain the same page frame and explain next action.
- While menu prices/availability remain unverified, discovery stays open but prices
  are labeled pending confirmation and cart/checkout actions remain unavailable; never
  display seeded values as customer-facing operational truth.
- Group approval threshold is not configured; public copy promises outlet review, not
  an invented cup count.

## 4. Interaction & accessibility

- Tap targets ≥44×44 CSS px; visible `:focus-visible`, semantic controls, descriptive
  labels, keyboard-operable menus/dialogs, Escape close + focus restoration.
- Reduced motion respected. Avoid bounce, layout animation, continuous scroll work,
  decorative progress indicators, and excessive blur.
- Status never communicated by color alone. Inputs/selects/textarea have consistent
  focus, disabled, and error affordances.
- Mobile fixed controls are contextual and only shown when they do not duplicate the
  page's primary action; content reserves enough scroll clearance.

## 5. Responsive quality checks

- Route smoke every public, commerce, support, and crew route at 320px and 1440px.
- Measure `documentElement.scrollWidth <= innerWidth` at 320/360/375/390/768/1024/
  1280/1440px.
- Check header/drawer, page H1 wrap, cards, forms, sticky controls, footer, empty/error
  states, keyboard focus, and reduced motion.
- Preserve all approved sections, copy/material, official assets, and outlet-truth rules.

## 6. Shared implementation primitives

`src/routes/layout.css` defines brand tokens, shared page/card/form primitives,
typography balance, focus, motion, and mobile constraints. Route-specific Tailwind
classes may extend these primitives but should not redefine palette or spacing ad hoc.
