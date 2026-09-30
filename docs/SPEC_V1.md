# SPEC_V1.md — Functional Specification (multi-city)

**Cut-off:** 2026-09-25. Samarinda-only statements in the 2026-09-15 pack are superseded.

## Routes

`/`, `/menu`, `/menu/[slug]`, `/locations`, `/samarinda`, `/samarinda/juanda`,
`/samarinda/slamet-riyadi`, `/berau`, `/berau/merah-delima`, `/balikpapan`,
`/balikpapan/kutilang`, `/balikpapan/gatot-subroto`, `/order`, `/order/[id]`,
`/track`, `/feedback`, `/about`, `/group`. No fake delivery routes.

## Homepage (brand-level, 8 sections)

01 Hero (Jus Alpukat, `Buahnya Berasa.`, `[PESAN SEKARANG →]`, coverage
"Samarinda · Berau · Balikpapan"). 02 Jus Apa Aja Ada + `Lihat Semua Menu`.
03 Menu Andalan (real cards; price via outlet context or safe reference state).
04 Pesan Dulu. Tinggal Ambil. (3 steps + Pesan Sekarang). 05 Temukan Zatiaras
(multi-city grouping). 06 Pesan Rame-Rame (outlet-aware). 07 Product/process proof
(no fake claims). 08 Support + footer. One cinematic hero only; reduced-motion = full
static hero.

## Navbar

Desktop: `[logo] Menu Outlet Pesan Rame-Rame ... Cart (+ contextual Pesan Sekarang)`.
Direct on Fruit Cream, no capsule; Plus Jakarta Sans; ink default, magenta hover/active

- underline, `aria-current="page"`, 140–220ms. Top: no duplicate CTA while hero CTA
  visible (IntersectionObserver, no layout shift, reserved space). Scrolled ~60–64px,
  cream opaque. No decorative progress line. Cart = utility (icon, real badge only).
  Mobile: `[logo] [Cart] [Menu]`, ~56–64px; hide-on-scroll-down with hysteresis; never
  hide when drawer open/focus in header/near top. Drawer: primary Menu/Outlet/Pesan
  Rame-Rame; secondary Lacak/Bantuan (only existing routes).

## Location (just-in-time, never interrupt browsing)

No blocking modal on first load, no global location banner — browse bebas.
Outlet ditanyakan hanya pada momen niat order (buka selector outlet).
Priority: remembered (`lastSelectedOutlet`) > IP city suggestion (Cloudflare cf,
suggestion only, e.g. "Sepertinya kamu berada di Balikpapan.") > manual
city/outlet selector > browser geo only after explicit "Gunakan Lokasi Saya".
Saran IP tampil sebagai hint lunak DI DALAM selector ("Saran berdasarkan lokasimu:
X. Bisa salah — silakan pilih manual."), bukan interupsi global — pelajaran dari
kasus nyata ISP Samarinda yang ter-geo ke Balikpapan. Denial → IP/manual fallback,
never block, never nag. Remembered outlet shown as "Outlet: X, City [Ganti]",
never silently overridden by IP.

## Cart / outlet invariant

One normal cart = one `outletId`. Cross-outlet add refused. Switch warns
("…harga atau ketersediaan dapat berubah." [Ganti Outlet] [Batal]) then
`revalidateForOutlet`: unchanged / price-changed / unavailable (removed listed, intent
preserved in messaging, never silently discarded).

## Price/availability

Global `MenuItem` master + outlet offering (`priceFor`/`availabilityFor`/
`OutletMenuOffering { outletId, menuItemId, price, availability, isOrderable }`).
States `AVAILABLE/LIMITED/SOLD_OUT`, no exact inventory promises. If price varies and
no outlet selected → "Pilih outlet untuk melihat harga".
Current repo seed menu data is unverified (`MENU_VERIFIED=false`,
`AVAILABILITY_VERIFIED=false`): discovery/product pages remain browseable; no seeded
price or stock claim is rendered, add-to-cart is unavailable, and direct checkout is
held with a clear explanation until approved outlet offerings are configured.

## Checkout/tracking

Checkout minimal/enclosed nav. Guest checkout (name, WhatsApp, outlet, slot, cart).
Server rechecks outlet acceptance + orderability before payment. Lifecycle
`DRAFT → PENDING_PAYMENT → PAID → CONFIRMED → PREPARING → READY → COMPLETED`
(+ failure/refund/expiry paths). NO VERIFIED PAYMENT = NO PRODUCTION.
`fulfillmentMethod: PICKUP` (future `DELIVERY`, not exposed).

## Definition of Done (multi-city)

Homepage brand-level; route/data model supports all 5 outlets (ordering activates only
after approved offerings are configured); no hardcoded Samarinda in shared logic;
location priority respected; cart invariant + revalidation; city/outlet pages + structured
data; sitemap/canonical valid; docs updated; tests/check/lint/build pass.
