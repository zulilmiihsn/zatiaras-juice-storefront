# SPEC_V1.md — Functional Specification (multi-city)

**Cut-off:** 2026-09-25. Samarinda-only statements in the 2026-09-15 pack are superseded.

## Routes

`/`, `/menu`, `/menu/[slug]`, `/locations`, `/samarinda`, `/samarinda/juanda`,
`/samarinda/slamet-riyadi`, `/berau`, `/berau/merah-delima`, `/balikpapan`,
`/balikpapan/kutilang`, `/balikpapan/gatot-subroto`, `/cart`, `/checkout`,
`/order/[id]`, `/track`, `/feedback`, `/about`, `/group`, `/privacy`, `/terms`.
Unknown routes use the branded error page (`+error.svelte`). No standalone `/order` page:
ordering starts at `/menu` and follows `/cart` → `/checkout` → `/order/[id]`.
No fake delivery routes.

## Homepage (brand-level, 8 sections)

01 Hero (two-line solid magenta, heavier Jus Alpukat headline; no `Buahnya Berasa.`
subheading; supporting copy `Jus buah segar dengan rasa asli buah pilihan.`
and `Pesan online, ambil di outlet terdekat.`; `Pesan Sekarang` → `/menu`,
`Pilih Outlet` → `/locations`; coverage "Samarinda · Berau · Balikpapan").
02 Paling Laris (replaces the former Menu Andalan). Three best sellers in the
owner's sales order: Jus Alpukat, Alpukat Kocok, Jus Mangga; each links to `/menu/[slug]`.
No price, stock or availability on the homepage sections 02 and 03 (owner decision);
prices live on /menu.
03 Jus Apa Aja Ada: the five sales categories in priority order (Jus Buah & Sayur, Mix Jus,
Kocok, Baby, Non Jus), each linking to `/menu?kategori=<slug>`. Baby is described only as
fruit smoothies with whipped cream and fruit-piece topping (no age or health claims).
Sample names come from `MENU` (essential items per category, regular prices from the
official 2026-06-18 menu); Camilan is not shown on the homepage. A category with no items
shows an honest "sedang disiapkan" state on /menu. Category photos come later; official cup mark stands in.
04 Pesan Dulu. Tinggal Ambil. (3 steps + Pesan Sekarang). 05 Temukan Zatiaras
(multi-city grouping). 06 Pesan Rame-Rame (outlet-aware). 07 Product/process proof
(no fake claims). 08 Support + footer. One cinematic hero only; reduced-motion = full
static hero.

Homepage section 05 uses `OutletFinder`: a 100dvh map composition with a wavy top edge,
a compact city panel and a bounded, centered outlet-card row without a large outer shelf.
Fruit decorations and logo/photo placeholders are omitted. The row shows actual branch count,
card selection, address, local hours, `Pesan Sekarang`, and verified-coordinate directions.
The map is always visible; no map/list switch or separate list mode. Mobile uses a compact
header and outlet select to keep all branches available.
No invented branch imagery,
distance, nearest ranking or live-open status. Measured frame/overlay bounds reserve camera space.
Short clear areas omit redundant marker labels and overview controls. No outlet-detail disclosure appears on the homepage; branch pages
own extended information. Verified coordinates enable the direct directions link.
Unverified-coordinate notices stay visible. Pin and label remain inside the map frame
when resizing; page scrolling remains available over the map.
Very short viewports below 520px, large text zoom and no-JavaScript links may grow the
section to preserve readable, accessible content rather than clipping information.
Preview selection does not change the cart or
remembered outlet. Remembered context precedes the explicitly labeled IP city
suggestion. The order link passes the validated outlet via `/menu?outlet=...`; the menu
owns applying this intent through its existing outlet-change handler. A populated cart
requires confirmation and revalidation before changing outlet. Every viewport loads the map lazily near the section. Outlet navigation
works without map/network/WebGL and no-JavaScript
visitors receive direct links to all outlets. Missing branch coordinates resolve
to a clearly labeled city overview, never a fake branch pin or distance.
Map starts north-up with pitch fixed to zero, without a mode toggle. Source geography
uses the Zatiaras Magenta 2D style: blush land, muted plum water, magenta arterial roads,
and quieter rose local detail. Floating controls use cream/ink with a magenta CTA.
Buildings fade in only on closer zoom; label density follows zoom level.
Selected outlet labels gain an ink surface and `Outlet pilihan` caption. No extrusion
layers or decorative building textures.
Required map credits stay available through the native attribution information control.
Decision 2026-10-16: user-selected 2D city guide supersedes the 3D facade experiment.

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
Menu prices are taken from the official 2026-06-18 menu (`MENU_VERIFIED=true`);
availability is not (`AVAILABILITY_VERIFIED=false`): discovery/product pages remain
browseable; no stock claim is rendered, add-to-cart is unavailable, and direct checkout is
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
