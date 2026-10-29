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
- Homepage sections share 48/64/80/96px vertical padding at phone/640px/1024px/1280px
  breakpoints, with 32/40/48px heading-to-content gaps. Align content and the home
  header to the same 1152px measure and 16/24/32px gutters. Let stacked mobile
  content determine section height; never clip it to a viewport. The hero uses a
  100dvh minimum, and outlet discovery retains its accessible 100dvh map frame.
  Desktop assortment retains its viewport composition with 96px header clearance;
  its internal spacing, product row and type adapt to viewport height.
- Keep product images proportional to their columns, product labels aligned,
  and both pickup columns vertically centered. Closing CTA bottom clearance
  remains 48/64/80px before the footer divider.

## 3. Page patterns

- Storefront/discovery: shared public header + one `<main>` + brand footer.
- Page intro: eyebrow → one clear H1 → short explanatory copy → optional primary action.
- Homepage hero: retain the video/poster, headline, description, commerce actions,
  and multi-city cue. Product showcase card and decorative Z-Flow overlay are
  removed; keep the copy left-aligned without an empty grid column.
  Use a two-line solid magenta `JUS / ALPUKAT` headline in the official
  ExtraBold display face, with both lines at the same type scale, sized
  `clamp(3.5rem, 19vw, 9rem)` with .9 line height and the display face's
  native -.01em tracking. Use a .04em same-color stroke for fuller letterforms;
  the headline wrapper spans up to 768px so the 144px desktop type fits.
  No contrasting text outlines or layered text shadows.
  Do not show `Buahnya Berasa.` as a hero subheading. Supporting copy:
  `Jus buah segar dengan rasa asli buah pilihan.` /
  `Pesan online, ambil di outlet terdekat.`
  Keep supporting copy plain and left-aligned, without a decorative rule.
  Commerce actions use simple rounded-full pills with 52px minimum height:
  solid magenta primary with a plain arrow, white secondary with a restrained
  one-pixel border. No hard offset shadows, thick frames, or inset arrow tiles.
  Wrap actions on narrow phones; keep them inline when their intrinsic widths fit.
  Actions: `Pesan Sekarang` → `/menu`, `Pilih Outlet` → `/locations`;
  retain the plain pin-led `Samarinda · Berau · Balikpapan` coverage cue.
- Browse pages: responsive card grid; one column at narrow mobile, two at tablet,
  up to four at wide desktop where item content supports it.
- - Homepage section 02 (Paling Laris) uses `BestSellers.svelte`, replacing the former
    `AssortmentMenu` and `FeaturedMenu` (both described the same three products).
    A bento: Jus Alpukat is the largest card (flat field, cup photo full card width), Alpukat
    Kocok and Jus Mangga stack beside it (copy left, cup right). Size and order carry the
    rank, plus one magenta rotating "Pilihan nomor satu" stamp on the top seller. Headings and
    product names are uppercase official display (ExtraBold) through `KernedText.svelte`
    (per-letter baseline correction from `$lib/kern`, shared with the hero). The section
    title is solid colour only (no gradient, outline or text shadow): `LARIS` sits on a solid
    Heritage Magenta sticker (white text, tilted -1.6deg), the rest is ink; letters rise in
    one by one. Each product name keeps its first words in ink and colours the flavour word
    (`ALPUKAT`, `KOCOK`, `MANGGA`) in a deep tone of its card field (`#33570c`, `#6b3a1f`,
    `#b83c0a`); the backdrop word takes the same tone. The top-seller
    card carries a tone-on-tone backdrop word behind its cup. A `Lihat semua menu` link
    sits under the intro sentence. Cups follow the pointer (parallax, fine pointers only,
    never under reduced motion), rise in with a spring after entering the viewport (cards
    enter from the side: top seller from the left, the others from the right) and then
    float gently at rest with staggered phases. The third card is mirrored (cup left,
    copy right) for rhythm, and each card gets a faint deeper-tone wash on hover.
    Cards are flat flavor-colour fields holding
    the official photos from `static/images/assortment/` (`avocado`, `avocado-chocolate`,
    `mango`); the cup never overlaps card text. One `Pesan` link per card (whole card is the
    hit area) to `/menu/[slug]`; analytics `product_clicked` with source `terlaris`.
    No price (owner decision), never stock or availability. Bento from
    768px, one column below. From 1024px the whole section fits one viewport height (100dvh
    minus 96px header clearance, minimum 560px) with type and gaps scaled by dvh. Keyboard focus ring sits on the card; hover lifts and tilts the
    cup; entrance is staggered after JS loads; reduced-motion and no-JavaScript render fully.
    `AssortmentMenu.svelte` and its assets are no longer used on the homepage.
- Homepage section 03 (Jus Apa Aja Ada) uses `Categories.svelte`: five category panels in
  priority order. From 1024px they sit side by side and fit one viewport (100dvh minus 96px,
  minimum 560px); the open panel grows (`flex-grow` 5.2) showing a big tone-coloured name,
  blurb, up to 5 sample menu names (only from data) plus "dan lainnya", a `Lihat <kategori>` link to
  `/menu?kategori=<slug>`, and a tone-on-tone official cup mark as the photo placeholder;
  closed panels show a vertical name and a plus. Mouse hover opens a panel after 90ms
  (>=1024px only), click or keyboard focus opens it too, the first panel is open by default.
  Below 1024px it is a vertical accordion (heading buttons with `aria-expanded`, closed
  bodies `inert`). Title `JUS APA AJA` ink + `ADA` solid Heritage Magenta. No-JavaScript
  users get plain links to all five categories. `/menu` filters by `?kategori=` with a
  chip nav; unknown slugs show everything.
- Homepage pickup explainer (SPEC_V1 section 04): use `PickupSteps.svelte`,
  an editorial two-column composition from 1024px, stacked on smaller screens.
  Start directly with the headline, without an eyebrow/count-range strip or its separator.
  Keep three semantic ordered steps with large numbers in Plus Jakarta Sans
  ExtraBold (800) for all three numerals, loaded as a scoped
  font face so other page typography stays unchanged. The final pickup step
  uses one ink surface. Copy explains outlet/menu selection, account-free online
  payment, then checking readiness and showing the order code. Do not promise
  zero queues or expose payment implementation details. Keep `Pesan Sekarang`
  linked to `/menu`. Entrance motion is optional; reduced-motion and no-JavaScript
  rendering must preserve complete visible content.
- Homepage outlet discovery uses a light blush 2D map (sage parks, thin magenta arterials), a compact title/city panel at
  top left and a centered, bounded outlet-card row below (maximum 1040px; one branch 480px).
  Remove the oversized outer shelf, decorative fruit and repeated logo/photo placeholders.
  Cards use a radio indicator, branch name, safe address, hours and aligned actions.
  A wavy cream rim is the frame edge (soft pink shadow, no outline or glow clipped by the section).
  The map remains visible; there is no map/list toggle or separate list mode.
  Desktop uses native radio card selection. Mobile keeps one selected card in map view,
  with a native outlet select that keeps every branch available.
  The section remains 100dvh at standard viewport sizes. The mobile header compacts into one row.
  ResizeObserver measures the inset map frame, heading and shelf for clear pin framing.
  Omit its redundant label/overview control when that clear area is short; retain pin, zoom and credits.
  Below 520px viewport height, grow the map section to preserve accessible controls.
  No-JavaScript rendering uses the compact controls and five direct branch links without a map.
  Show selected branch name, safe address and local hours directly. Keep homepage actions
  to `Pesan Sekarang` and text-labeled verified-coordinate directions. The order link
  carries outlet intent to the menu, which owns the cart confirmation/revalidation flow.
  Extended information lives on
  branch pages; no outlet-detail disclosure. Unknown addresses/coordinates remain explicit.
  Floating controls use cream with ink text, and the primary action uses magenta.
  Never fabricate store imagery, distances,
  nearest-outlet badges or live-open status to match the visual reference.
  City overviews use balanced left/right camera padding; only a verified selected pin
  needs the larger left inset to avoid the city panel. Balikpapan's coarse city reference
  uses OSM place=city node 2417847197 rather than the former coastal camera reference.
  Native attribution sits above the card shelf and remains reachable; short clear areas
  place it at the left to avoid the zoom controls.
  The Zatiaras Magenta map uses blush land, soft blush water, sage parks, quiet road labels
  and the exact official magenta cup pin. Arterial roads use brand magenta with a darker
  casing and ink street names. Local streets use muted rose for contrast against blush,
  with finer strokes than arterial roads. Footprints fade in from zoom 15; secondary
  street labels appear from zoom 16, preserving the hierarchy at the initial zoom.
  Selected pins use an ink label with light text and an `Outlet pilihan` caption;
  unselected pins retain a neutral label. Native camera easing honors reduced motion.
  Camera stays north-up with pitch/maxPitch zero; verified branch view uses zoom 14.8.
  No extrusion layers, facade textures, invented geography or substitute store photography.
  Keep pin and its branch label within the map frame at all viewport sizes.
  Lazy map loading, retry, reduced motion, keyboard selection and no-map navigation remain.
  Required credits remain available through the native attribution control: initially a
  44px circular information button, expanding left into a rounded credit bar on activation.
  Keep every source link inside the map on small screens. Native Enter/Space toggling,
  Escape to close and return focus, and reduced-motion support remain available.
  City and branch previews never mutate cart/storage.
  Suppress the global mobile commerce bar while any part of this section is visible,
  including the map below the outlet column, so source credits remain reachable.
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

- Public footer uses the supplied `zatiaras_magenta_wave_8K_exact.svg` artwork,
  which embeds a transparent 7680×4320 PNG; do not redraw its silhouette.
  Original SVG/WebP/AVIF files remain unchanged. Runtime uses
  `static/images/zatiaras-wave-divider-{1920,3840,5760}.{avif,webp}` derivatives.
  Crop the source to its top 32%-of-width band, preserving crests and droplets.
  Correct the broad diffuse bright band within the lower body, not just its edge:
  from source row 1600 to 2457, target a linear RGB trend from (237,3,96) to
  (217,3,89). Subtract each row's deviation from that trend using RGB medians
  sampled every 8px where alpha >245, averaged over ±32 rows. Ramp correction
  in with smoothstep over rows 1600–1900. Preserve per-pixel variation, alpha,
  and all pixels above row 1600; do not replace the tail with a flat-color fill.
  Encode AVIF at quality 90, 4:4:4 chroma, and WebP losslessly; resize directly
  from the corrected 8K PNG. Inspect the entire body for a brightness rebound,
  not only the final image/footer boundary.
  Use width-descriptor `srcset` with `sizes` matching the 760px minimum image
  width and viewport width, plus intrinsic dimensions to reserve image space.
  Match the shared underlay to the liquid's natural lower-body tone `#d90359`,
  transitioning from cream between 24% and 25.5% of rendered image width, then
  continuously darkening to `#b30053` at the footer bottom; no flat-color hold.
  Feather the image's final 22% with smoothstep-sampled alpha mask stops
  (78/82.4/86.8/91.2/95.6/100% → 1/.896/.648/.352/.104/0), exposing that same underlay
  before the image ends. Keep crests and droplets fully visible. Never fade the
  settling pool back up to `#FF1081` or leave an opaque image-to-gradient join.
  Keep footer content near the cropped band, not below the full 16:9 canvas;
  no hard rectangular backing behind the crest.
  This is decorative artwork, not an official Z-Flow logo. Preserve the supplied
  artwork and official brand asset geometry when restructuring footer content.
- Keep the liquid divider in normal flow: no negative top margin over preceding
  page content. Homepage closing CTA keeps 48/64/80px bottom clearance at
  mobile/tablet/desktop; do not add a second mobile spacer to `<main>`.
  The contextual mobile CTA hides when the footer enters the viewport.
- Footer support content overlaps only the divider's lower settling pool:
  raise its content wrapper by `clamp(40px, rendered wave width * .06, 144px)`.
  Keep the wrapper positioned above the decorative image without changing its
  dimensions, assets, alpha mask, or shared background gradient. The divider
  itself stays in normal flow and never overlaps the preceding homepage CTA.
  The logo starts below the underlay's 25.5%-of-wave-width magenta stop.
- Centerpiece hierarchy: official white lockup (64/80/96px high at
  mobile/small-screen/desktop breakpoints), support prompt, `Pesan lewat WhatsApp`
  (36/48/60px), outlined WhatsApp CTA, and 48px social shortcuts with 24px icons.
  Scope the larger shortcuts to this block; preserve the existing brand-column
  shortcuts, lower navigation spacing, copy, and official SVG proportions.
- Below the divider, use four desktop columns: brand, city-grouped outlets,
  help/services, and the exact `ZJ_CUP_STANDALONE.svg` symbol (the official Z
  mark, not a reconstructed cup illustration). Read city/outlet labels and
  branch links from `CITIES`/`OUTLETS`; do not copy branch names from mockups.
  Tablet uses two columns; narrow phones use a full-width brand statement,
  two navigation columns, then the centered official symbol.
- Footer navigation uses compact 28px rows at desktop widths (≥1024px),
  8px between city groups, and 24px grid padding above/below. Keep 44px
  navigation targets below that breakpoint or whenever any coarse pointer is
  present (including touch-enabled desktops). Social shortcuts stay 44px.
  Preserve font sizes and visible white focus outlines.
  Keep only implemented navigation destinations. `/privacy` and `/terms` are explicit
  customer-information pages, not footer filler: keep their copy accurate to current browser-side
  storage and gated checkout; obtain owner/legal approval and update them before server-side
  collection, payments, cancellation, or refund flows are activated. Do not add a separate FAQ
  unless approved content and support operations require it. Copyright uses the current year.

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
