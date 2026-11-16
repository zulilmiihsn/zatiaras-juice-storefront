# UX.md — Customer Journey & Interface (multi-city)

**Cut-off:** 2026-09-25. Supersedes Samarinda-only UX assumptions.

## Journey

Discover (brand homepage / city page / Maps) → choose outlet (suggested, remembered,
or manual) → browse outlet menu → cart (one outlet) → guest checkout → pay →
track (plain Indonesian) → pickup with code → support/WhatsApp on paid failure →
feedback → repeat.

## Homepage

Brand-level, eight main sections in the owner-approved decision order:
Hero → Paling Laris → Jus Apa Aja Ada → Buahnya Berasa → Temukan Zatiaras →
Pesan Dulu, Tinggal Ambil → Pesan Rame-Rame → Closing Pesan Sekarang, then support/footer.
Show products before the brand narrative; answer outlet proximity before the full pickup
explanation. Group orders remain a secondary path. Hero retains `JUS ALPUKAT`, the
approved visuals, direct order/outlet actions and the multi-city coverage cue. No branch
cards/prices/ratings/testimonials/Maps/delivery claims in hero. Direct CTAs bypass the
story; no scroll hijack/trap and reduced-motion retains a complete static hero.

Scroll rhythm follows section purpose, not identical heights. Hero and FruitStory each
use a three-screen track (300dvh / 300svh), with only a one-screen film stage visible;
their additional sticky travel is approximately two screens. This replaces the longer
4.5-/3.6-screen tracks while preserving choreography and smoothing. Content sections
use shared fluid 64–96px vertical padding and 32–48px content gaps; closing uses the
same top/bottom spacing. Desktop product/category stages and the map keep their
viewport compositions. Product stages need explicit 64–96px boundary space before
BestSellers and after BestSellers/Categories; their compact internal padding alone
made adjacent sections feel crowded. Mobile uses content-section padding without
stacking these extra desktop gaps. Mobile information stays content-driven. No-JavaScript,
reduced-motion and data-saving hero states have no artificial scroll track. Short
screens also use a static hero that grows enough to retain both actions. Changing
motion preference or crossing the short-screen boundary restores accessible copy.

Remove the late standalone `Kentalnya Beneran` block rather than returning from group
ordering to product education. Consolidate its fruit-message role in FruitStory, without
presenting supplied footage/AI decoration as actual recipe or texture proof. Genuine
process/product evidence remains dependent on verified Zatiaras material.

After `Jus Apa Aja Ada`, the `Buahnya Berasa` story uses strawberry/blender footage
controlled by native scrolling with 0.4s smoothing. Full-viewport footage stays bright,
without a dark scrim. Sentences alternate sides (left, right, left) in single
columns. Supporting words are cream; accents are Heritage Magenta with a cream
keyline, a small static highlight and short berry depth, without blur or glow. All parts share one responsive size, at least
24px on mobile. Do not add fruit cutouts that compete with the moving film.
Extend stationary reading holds: first through 0.20, second from 0.48 through 0.64.
Keep per-letter suction exit and native-scroll smoothing without a longer track.
High-contrast mode restores solid text. The site-wide commerce CTA remains available, but this scene has
no local menu button. The three
chapters unfold as `Buahnya Berasa` → `Rasa buah tetap jadi bintang utama` →
`Dari buah, jadi kesegaran`, with varied blender-centred motion: individually
reverse-order letter suction on curved exits, full-size arrival from the right for the
right-aligned sentence, and staggered same-side
entrances for the finale. Only exits use the vortex; entrances never grow from the blender. Smooth reading
holds and short video-only beats separate the chapters; never overlap visible sentences. Remove the
decorative eyebrow and scroll-instruction badges. Assistive technology and
static fallbacks can read the full narrative without having to scrub the video. Static illustration replaces
the long scroll track for reduced motion, save-data, short viewports or media failure.
This owner-requested sequence is additional to, not a replacement for, the approved hero.

## Navbar states

Top (desktop ~72–76px, cream): logo + Menu/Outlet/Pesan Rame-Rame + cart; no duplicate
Pesan Sekarang while hero CTA visible. Scrolled (~60–64px, opaque cream): contextual
Pesan Sekarang appears with reserved space (no shift of logo/links/cart). Mobile
(~56–64px): logo + cart + menu button; hide on intentional scroll-down (threshold +
hysteresis), show on scroll-up; drawer with focus trap, Escape close, focus restore.
Active link magenta + underline + `aria-current`. Cart label "Keranjang[, N item]".
Over the full-viewport fruit film, the header becomes transparent and navigation labels
become cream with a local shadow. Restore cream outside the film, including reverse
scroll and route changes. Preserve mobile hide-on-scroll/focus behavior. FruitStory
fills 100dvh from y=0 behind the navbar, without deducting navbar height.

## Outlet selection & location

Fast grouped selector: Samarinda (Juanda, Slamet Riyadi) / Berau (Merah Delima) /
Balikpapan (MT Haryono). IP suggestion copy example:
"Sepertinya kamu berada di Balikpapan." + prioritize local outlets; never auto-assign.
"Gunakan Lokasi Saya" triggers browser permission; granted → nearest verified outlet;
denied → fallback + analytics `browser_location_denied`, no nag, no block.
Remembered outlet chip: "Outlet: MT Haryono, Balikpapan [Ganti]".

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
