# SPEC_V1.md — Functional Specification (multi-city)

**Cut-off:** 2026-09-25. Samarinda-only statements in the 2026-09-15 pack are superseded.

## Routes

`/`, `/menu`, `/menu/[slug]`, `/locations`, `/samarinda`, `/samarinda/juanda`,
`/samarinda/slamet-riyadi`, `/berau`, `/berau/merah-delima`, `/balikpapan`,
`/balikpapan/mt-haryono`, `/cart`, `/checkout`,
`/order/[id]`, `/track`, `/feedback`, `/about`, `/group`, `/privacy`, `/terms`.
Unknown routes use the branded error page (`+error.svelte`). No standalone `/order` page:
ordering starts at `/menu` and follows `/cart` → `/checkout` → `/order/[id]`.
No fake delivery routes.

## Homepage (brand-level; eight sections after owner-approved consolidation)

01 Hero (two-line solid magenta, heavier Jus Alpukat headline; no `Buahnya Berasa`
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
04 `Buahnya Berasa` fruit story, using the supplied
strawberry/blender video. Native page scrolling controls the footage with 0.4s catch-up;
no wheel/touch interception. Owner-selected bright, full-viewport footage without a dark
scrim; sentences alternate left, right, left in one bounded column each. Supporting
words use cream with a berry keyline; accents use Heritage Magenta with a cream
keyline and subtle static highlight. Use short berry depth without blur/glow, the same
responsive size for every part (24px mobile minimum), and no decorative fruit cutouts.
Extend the first reading hold to progress 0.20 and the second through 0.64,
without lengthening the 300svh track or changing 0.4s smoothing.
High-contrast mode restores solid text. Keep the thin edge progress line. No local `Lihat menu` button (owner request). Three scroll chapters:
`Buahnya Berasa` → `Rasa buah tetap jadi bintang utama` → `Dari buah, jadi kesegaran`
Use varied, reversible vortex choreography: letters leave last-character first,
spinning and shrinking on curved paths into the blender on both exits; the right-hand
sentence arrives full-size from the right edge, with staggered same-side edge entrances
for the finale. Suction is exit-only; incoming text never grows from the blender. Reading holds stay
still; no simultaneous visible sentences. Remove decorative eyebrow/instruction badges. Reduced motion, save-data, short viewports, no JavaScript or
media failure retain a readable static illustration without the long sticky track.
This owner-requested scene supersedes the original hero-only sequence restriction.
No ingredient, hygiene, nutrition or operational claims are inferred from the footage.
05 Temukan Zatiaras (multi-city grouping), answering outlet proximity before the full
pickup explanation. 06 Pesan Dulu. Tinggal Ambil. (3 steps + Pesan Sekarang).
07 Pesan Rame-Rame (a secondary, outlet-aware group request; approval before payment).
08 Closing Pesan Sekarang, followed by support and the shared footer.

The owner-approved consolidation removes the separate `Kentalnya Beneran` proof block
formerly after group ordering. Its overlapping fruit message belongs to FruitStory;
size/outlet details belong to the selected menu/outlet and pickup flow. Do not migrate
internal compliance language or unsupported operational promises into marketing copy.
FruitStory remains a brand narrative, not evidence of an actual Zatiaras recipe/process.
Genuine texture/process proof requires verified Zatiaras material; synthetic cutouts and
the supplied blender clip do not establish composition. Preserve the approved visual
choreography and direct menu/outlet CTAs; visitors need not complete the story to order.

Homepage rhythm: hero track 300dvh, fruit-story track 300svh, each with a 100dvh film
stage rather than forcing every section to the same height. Content sections share
fluid 64–96px vertical padding and 32–48px content gaps (default root size), with
balanced closing-CTA padding. Keep desktop product/category viewport fitting and
map geometry. Static/no-JavaScript heroes do not retain an empty scrub track;
short-screen hero height follows content to keep actions accessible.

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
  cream opaque outside the fullscreen fruit film. When FruitStory covers the whole
  header row, use a transparent overlay with cream nav labels; restore the solid
  header on exit/reverse exit. The film remains 100dvh, with no header-height deduction.
  No decorative progress line. Cart = utility (icon, real badge only).
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

Homepage brand-level; route/data model supports all 4 outlets (ordering activates only
after approved offerings are configured); no hardcoded Samarinda in shared logic;
location priority respected; cart invariant + revalidation; city/outlet pages + structured
data; sitemap/canonical valid; docs updated; tests/check/lint/build pass.
