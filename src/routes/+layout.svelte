<script lang="ts">
	import './layout.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { track } from '$lib/analytics/events';
	import { cart } from '$lib/stores/cart.svelte';
	import { AVAILABILITY_VERIFIED, MENU_VERIFIED } from '$lib/data/menu';
	import { CITIES, OUTLETS, getOutlet } from '$lib/core/outlets';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import FooterWave from '$lib/components/FooterWave.svelte';
	import lockup from '$lib/assets/brand/ZJ_LOGO_PRIMARY_LOCKUP_MAGENTA_FILLED_v01.svg';
	import lockupFooter from '$lib/assets/brand/ZJ_LOGO_PRIMARY_LOCKUP_MAGENTA_TRANSPARENT_v01_2026-09-04.svg';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	let { children } = $props();

	let menuOpen = $state(false);
	let compact = $state(false);
	let headerHidden = $state(false);
	let heroCtaVisible = $state(true);
	let footerVisible = $state(false);
	let finderVisible = $state(false);
	let finderIO: IntersectionObserver | null = null;
	let lastY = 0;
	let scrollDirection = 0;
	let directionStartY = 0;
	let headerEl: HTMLElement | null = $state(null);
	let heroIO: IntersectionObserver | null = null;
	let footerIO: IntersectionObserver | null = null;

	const isHome = $derived(page.url.pathname === '/');
	const isCheckout = $derived(page.url.pathname.startsWith('/checkout'));
	const isOrder = $derived(page.url.pathname.startsWith('/order'));
	const isInternal = $derived(
		page.url.pathname.startsWith('/outlet') ||
			page.url.pathname.startsWith('/analytics') ||
			page.url.pathname.startsWith('/qa')
	);
	// Checkout + konfirmasi/pelacakan: header minimal, tanpa navigasi dagang.
	const minimal = $derived(isCheckout || isOrder);
	// CTA navbar hanya kontekstual: di homepage sembunyi selagi hero CTA terlihat.
	const showNavCta = $derived(!isHome || !heroCtaVisible);
	const cartLabel = $derived(cart.count > 0 ? `Keranjang, ${cart.count} item` : 'Keranjang');
	const cartBadge = $derived(cart.count > 99 ? '99+' : String(cart.count));
	// CTA bawah mobile: sembunyi saat checkout, cart, order, drawer buka.
	const showBottomCta = $derived(
		!menuOpen && isHome && !heroCtaVisible && !footerVisible && !finderVisible
	);
	const cartOutletName = $derived(getOutlet(cart.outletId)?.name ?? cart.outletId);
	const outletActive = $derived(
		page.url.pathname.startsWith('/locations') ||
			page.url.pathname.startsWith('/samarinda') ||
			page.url.pathname.startsWith('/berau') ||
			page.url.pathname.startsWith('/balikpapan')
	);

	function setupHeroObserver(): void {
		heroIO?.disconnect();
		heroIO = null;
		heroCtaVisible = true;
		if (!isHome || typeof document === 'undefined') return;
		const el = document.getElementById('hero-order');
		if (!el) return;
		heroIO = new IntersectionObserver(
			(entries) => {
				heroCtaVisible = entries[0]?.isIntersecting ?? true;
			},
			{ threshold: 0 }
		);
		heroIO.observe(el);
	}

	function setupFooterObserver(): void {
		footerIO?.disconnect();
		footerIO = null;
		footerVisible = false;
		if (!isHome || typeof document === 'undefined') return;
		const footer = document.getElementById('footer-public');
		if (!footer) return;
		footerIO = new IntersectionObserver(
			(entries) => {
				footerVisible = entries[0]?.isIntersecting ?? false;
			},
			{ threshold: 0 }
		);
		footerIO.observe(footer);
	}

	function setupFinderObserver(): void {
		finderIO?.disconnect();
		finderVisible = false;
		if (!isHome || typeof document === 'undefined') return;
		const finder = document.getElementById('temukan-zatiaras');
		if (!finder) return;
		finderIO = new IntersectionObserver(
			([entry]) => {
				finderVisible = entry.isIntersecting;
			},
			{ rootMargin: '0px 0px 88px 0px' }
		);
		finderIO.observe(finder);
	}

	onMount(() => {
		setupHeroObserver();
		setupFooterObserver();
		setupFinderObserver();
		let raf = 0;
		lastY = window.scrollY;
		directionStartY = lastY;
		const isMobile = () =>
			typeof matchMedia !== 'undefined' && matchMedia('(max-width: 767px)').matches;
		const onScroll = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const y = window.scrollY;
				// Homepage: solid header only once the hero has scrolled under it, not on first scroll.
				const hero = isHome ? document.querySelector('.hero-scrub') : null;
				compact =
					hero && headerEl ? hero.getBoundingClientRect().bottom <= headerEl.offsetHeight : y > 8;
				const focusInHeader = !!headerEl?.contains(document.activeElement);
				if (menuOpen || focusInHeader || y < 64) {
					headerHidden = false;
					scrollDirection = 0;
					directionStartY = y;
				} else if (isMobile()) {
					const delta = y - lastY;
					if (delta !== 0) {
						const nextDirection = delta > 0 ? 1 : -1;
						if (nextDirection !== scrollDirection) {
							scrollDirection = nextDirection;
							directionStartY = lastY;
						}
						const distanceInDirection = Math.abs(y - directionStartY);
						if (scrollDirection === 1 && y > 140 && distanceInDirection >= 24) {
							headerHidden = true;
						} else if (scrollDirection === -1 && distanceInDirection >= 12) {
							headerHidden = false;
						}
					}
				} else {
					headerHidden = false;
					scrollDirection = 0;
					directionStartY = y;
				}
				lastY = y;
			});
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();
		return () => {
			window.removeEventListener('scroll', onScroll);
			cancelAnimationFrame(raf);
			heroIO?.disconnect();
			footerIO?.disconnect();
			finderIO?.disconnect();
		};
	});

	afterNavigate(() => {
		track('page_view', { path: page.url.pathname });
		menuOpen = false;
		headerHidden = false;
		lastY = typeof window === 'undefined' ? 0 : window.scrollY;
		scrollDirection = 0;
		directionStartY = lastY;
		tick().then(() => {
			setupHeroObserver();
			setupFooterObserver();
			setupFinderObserver();
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={zcup} />
	<link
		rel="preload"
		href="/fonts/ZatiarasDisplayV1-SemiBold-V1.2-RC4-Smooth.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	<link
		rel="preload"
		href="/fonts/ZatiarasDisplayV1-Bold-V1.2-RC4-Smooth.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	<link
		rel="preload"
		href="/fonts/ZatiarasDisplayV1-ExtraBold-V1.2-RC4-Smooth.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
</svelte:head>

<div
	class="flex min-h-[100dvh] flex-col bg-cream text-ink antialiased selection:bg-brand selection:text-white"
>
	<a
		href="#konten"
		class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
		>Lewati ke konten</a
	>

	{#if isInternal}
		<header class="border-b border-black/[0.08] bg-cream">
			<div
				class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
			>
				<a href="/" aria-label="Zatiaras Juice" class="flex items-center gap-3">
					<img src={lockup} alt="Zatiaras Juice" class="h-8 w-auto" />
					<span
						class="hidden border-l border-black/10 pl-3 text-xs font-semibold text-neutral-600 sm:block"
					>
						Ruang Operasional
					</span>
				</a>
				<nav
					class="flex w-full items-center gap-5 overflow-x-auto text-xs font-semibold text-ink sm:w-auto sm:gap-6"
					aria-label="Navigasi internal"
				>
					<a
						href="/outlet"
						aria-current={page.url.pathname.startsWith('/outlet') ? 'page' : undefined}
						class={page.url.pathname.startsWith('/outlet')
							? 'whitespace-nowrap text-brand'
							: 'whitespace-nowrap hover:text-brand'}>Antrean Outlet</a
					>
					<a
						href="/analytics"
						aria-current={page.url.pathname.startsWith('/analytics') ? 'page' : undefined}
						class={page.url.pathname.startsWith('/analytics')
							? 'whitespace-nowrap text-brand'
							: 'whitespace-nowrap hover:text-brand'}>Analytics</a
					>
					<a
						href="/qa"
						aria-current={page.url.pathname.startsWith('/qa') ? 'page' : undefined}
						class={page.url.pathname.startsWith('/qa')
							? 'whitespace-nowrap text-brand'
							: 'whitespace-nowrap hover:text-brand'}>QA</a
					>
				</nav>
			</div>
		</header>
	{:else if minimal}
		<!-- HEADER MINIMAL: checkout / konfirmasi / pelacakan -->
		<header class="sticky top-0 z-40 border-b border-black/[0.06] bg-cream/95">
			<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
				<a href="/" aria-label="Zatiaras Juice" class="shrink-0">
					<img src={lockup} alt="Zatiaras Juice" class="h-8 w-auto" />
				</a>
				<a
					href="/feedback"
					class="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold hover:border-brand/40"
					>Bantuan</a
				>
			</div>
		</header>
	{:else}
		<!-- HEADER STOREFRONT: Clear, video tembus -->
		<header
			bind:this={headerEl}
			class="sticky top-0 z-40 border-b transition-all duration-200 motion-reduce:transition-none {compact
				? 'border-ink/8 bg-cream shadow-xs'
				: isHome
					? 'border-transparent bg-transparent'
					: 'border-transparent bg-cream'} {isHome ? '-mb-[68px] sm:-mb-[73px]' : ''} {headerHidden
				? 'max-md:-translate-y-full'
				: ''} max-md:transition-transform max-md:duration-200"
		>
			<div
				class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3.5 sm:px-6 {isHome
					? 'lg:px-8'
					: ''}"
			>
				<a
					href="/"
					aria-label="Zatiaras Juice"
					class="tap-scale flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-95"
				>
					<img src={lockup} alt="Zatiaras Juice" class="h-8 w-auto sm:h-9" />
				</a>

				<nav
					class="hidden items-center gap-9 font-sans text-[15px] font-semibold md:flex"
					aria-label="Navigasi utama"
				>
					<a
						aria-current={page.url.pathname.startsWith('/menu') ? 'page' : undefined}
						class="group relative py-2 transition-colors duration-200 motion-reduce:transition-none {page.url.pathname.startsWith(
							'/menu'
						)
							? 'font-semibold text-brand'
							: 'text-ink hover:text-brand'}"
						href="/menu"
						>Menu<span
							class="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand transition-transform duration-200 motion-reduce:transition-none {page.url.pathname.startsWith(
								'/menu'
							)
								? 'scale-x-100'
								: 'scale-x-0 group-hover:scale-x-100'}"
							aria-hidden="true"
						></span></a
					>
					<a
						aria-current={outletActive ? 'page' : undefined}
						class="group relative py-2 transition-colors duration-200 motion-reduce:transition-none {outletActive
							? 'font-semibold text-brand'
							: 'text-ink hover:text-brand'}"
						href="/locations"
						>Outlet<span
							class="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand transition-transform duration-200 motion-reduce:transition-none {outletActive
								? 'scale-x-100'
								: 'scale-x-0 group-hover:scale-x-100'}"
							aria-hidden="true"
						></span></a
					>
					<a
						aria-current={page.url.pathname.startsWith('/group') ? 'page' : undefined}
						class="group relative py-2 transition-colors duration-200 motion-reduce:transition-none {page.url.pathname.startsWith(
							'/group'
						)
							? 'font-semibold text-brand'
							: 'text-ink hover:text-brand'}"
						href="/group"
						>Pesan Rame-Rame<span
							class="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand transition-transform duration-200 motion-reduce:transition-none {page.url.pathname.startsWith(
								'/group'
							)
								? 'scale-x-100'
								: 'scale-x-0 group-hover:scale-x-100'}"
							aria-hidden="true"
						></span></a
					>
				</nav>

				<div class="flex items-center gap-2 sm:gap-3">
					<!-- Cart -->
					<a
						href="/cart"
						aria-label={cartLabel}
						class="tap-scale relative flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-ink shadow-xs transition hover:border-brand/30 hover:bg-brand-soft/40"
					>
						<svg
							class="h-5 w-5 text-brand"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<circle cx="9" cy="21" r="1" />
							<circle cx="20" cy="21" r="1" />
							<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
						</svg>
						{#if cart.count > 0}
							<span
								class="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white shadow-xs"
							>
								{cartBadge}
							</span>
						{/if}
					</a>

					<!-- Slot CTA selalu disediakan agar navigasi tidak bergeser saat CTA muncul. -->
					<span class="hidden w-[172px] shrink-0 md:block" aria-hidden={!showNavCta}>
						<a
							href="/menu"
							tabindex={showNavCta ? 0 : -1}
							aria-hidden={!showNavCta}
							class="tap-scale inline-flex w-[172px] items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-bold whitespace-nowrap text-white shadow-md shadow-brand/20 transition-[opacity,transform,background-color] duration-200 hover:bg-brand-dark motion-reduce:transition-none {showNavCta
								? 'translate-y-0 opacity-100'
								: 'pointer-events-none -translate-y-1 opacity-0'}"
						>
							<span>Pesan Sekarang</span>
							<svg
								class="h-3.5 w-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								aria-hidden="true"
							>
								<path d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</a>
					</span>

					<!-- Pemicu drawer mobile -->
					<button
						type="button"
						class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white md:hidden"
						aria-expanded={menuOpen}
						aria-controls="navigasi-mobile"
						aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
						onclick={() => (menuOpen = !menuOpen)}
					>
						<svg
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							aria-hidden="true"
						>
							{#if menuOpen}
								<path d="M6 6l12 12M18 6L6 18" />
							{:else}
								<path d="M4 7h16M4 12h16M4 17h16" />
							{/if}
						</svg>
					</button>
				</div>
			</div>
		</header>
	{/if}

	<!-- MAIN CONTENT -->
	<main id="konten" class="flex-1">
		{@render children()}
	</main>

	{#if !minimal && !isInternal}
		<!-- CTA BAWAH KONTEKSTUAL MOBILE -->
		{#if showBottomCta}
			<aside
				class="mobile-cta pointer-events-none fixed right-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] left-0 z-30 px-4 md:hidden"
				aria-label="Aksi pesan mobile"
			>
				{#if cart.count > 0}
					<a
						href="/cart"
						class="tap-scale pointer-events-auto flex w-full items-center justify-between rounded-2xl border border-white/10 bg-ink px-5 py-3.5 text-white shadow-2xl shadow-ink/40"
					>
						<div class="flex items-center gap-3">
							<span
								class="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
							>
								{cartBadge}
							</span>
							<div class="text-left leading-tight">
								<p class="text-xs font-semibold text-white/70">Pesanan Pickup</p>
								<p class="text-sm font-bold tracking-tight text-white">
									{cartOutletName}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2.5">
							{#if MENU_VERIFIED && AVAILABILITY_VERIFIED}
								<span class="font-display text-sm font-bold text-brand-soft"
									>Rp{cart.subtotal.toLocaleString('id-ID')}</span
								>
							{:else}
								<span class="text-xs font-semibold text-white/70">Lihat pesanan</span>
							{/if}
							<div
								class="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"
							>
								<svg
									class="h-3.5 w-3.5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M5 12h14M12 5l7 7-7 7" />
								</svg>
							</div>
						</div>
					</a>
				{:else}
					<a
						href="/menu"
						class="tap-scale pointer-events-auto flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-2xl shadow-brand/30"
					>
						Pesan Sekarang
						<svg
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</a>
				{/if}
			</aside>
		{/if}
	{/if}

	{#if !isInternal && !minimal}
		<MobileNav open={menuOpen} onclose={() => (menuOpen = false)} />
	{/if}

	<!-- PUBLIC FOOTER: magenta brand footer with wave divider -->
	{#if !isInternal && !minimal}
		<footer
			id="footer-public"
			class="relative z-20 text-white [--footer-wave-width:max(100vw,760px)]"
			style="background: linear-gradient(to bottom, var(--color-cream) calc(var(--footer-wave-width) * 0.24), #d90359 calc(var(--footer-wave-width) * 0.255), #d90359 calc(var(--footer-wave-width) * 1229 / 3840), #b30053 100%)"
		>
			<!-- Live Liquid 1 surface; the supplied 8K divider artwork is its still image. -->
			<FooterWave />
			{#snippet footerSocials()}
				<div class="flex items-center gap-3">
					<a
						href="https://instagram.com/zatiarasjuice"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Instagram Zatiaras Juice"
						class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white hover:text-brand focus-visible:outline-white"
					>
						<svg
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<rect width="18" height="18" x="3" y="3" rx="5" />
							<circle cx="12" cy="12" r="4" />
							<circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
						</svg>
					</a>
					<a
						href="https://wa.me/6281349882015"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="WhatsApp Zatiaras Juice"
						class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white hover:text-brand focus-visible:outline-white"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path
								d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
							/>
						</svg>
					</a>
					<a
						href="/locations"
						aria-label="Lihat outlet Zatiaras"
						class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white hover:text-brand focus-visible:outline-white"
					>
						<svg
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
							<circle cx="12" cy="10" r="3" />
						</svg>
					</a>
				</div>
			{/snippet}

			<div
				class="relative z-10 mx-auto -mt-[clamp(40px,calc(var(--footer-wave-width)*0.06),144px)] max-w-6xl px-4 pt-2 pb-8 sm:px-6"
			>
				<!-- Top Centerpiece: Brand Lockup, Hotline WhatsApp, Socials -->
				<div
					class="flex flex-col items-center justify-center border-b border-white/25 pb-10 text-center sm:pb-12"
				>
					<img
						src={lockupFooter}
						alt="Zatiaras Juice"
						class="h-10 w-auto brightness-0 invert sm:h-14 lg:h-18"
					/>
					<p class="mt-8 text-xl font-semibold text-white sm:text-2xl">Hubungi kami di WhatsApp</p>
					<h2
						class="mt-4 font-display text-4xl leading-tight font-extrabold sm:text-5xl lg:text-6xl"
					>
						Pesan lewat WhatsApp
					</h2>
					<a
						href="https://wa.me/6281349882015"
						target="_blank"
						rel="noopener noreferrer"
						class="mt-8 inline-flex min-h-16 items-center justify-center gap-3 rounded-full border-2 border-white px-6 py-3 font-display text-2xl font-extrabold text-white transition-colors hover:bg-white hover:text-brand focus-visible:outline-white sm:px-8 sm:text-4xl"
					>
						<svg
							class="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
							/>
						</svg>
						Klik Disini
					</a>
					<div class="mt-8 [&_a]:h-12 [&_a]:w-12 [&_svg]:h-6 [&_svg]:w-6">
						{@render footerSocials()}
					</div>
				</div>

				<!-- Compact footer: brand, outlet, bantuan -->
				<div
					class="grid gap-8 pt-8 sm:grid-cols-[1.3fr_1fr_1fr] sm:gap-6 sm:pt-10 lg:grid-cols-[1.3fr_1fr_1fr_auto]"
				>
					<div>
						<img
							src={lockupFooter}
							alt="Zatiaras Juice"
							class="h-10 w-auto brightness-0 invert sm:h-12"
						/>
						<p class="mt-3 text-base font-bold text-white">Buahnya Berasa!</p>
						<p class="mt-2 max-w-xs text-sm leading-relaxed text-white/85">
							Kedai jus dan minuman buah lokal yang membuat buah terasa nyata dalam setiap gelas.
						</p>
						<div class="mt-4">{@render footerSocials()}</div>
					</div>

					<!-- Outlets -->
					<nav
						aria-label="Outlet di footer"
						class="text-sm lg:[&_a]:min-h-7 [@media(any-pointer:coarse)]:[&_a]:min-h-11!"
					>
						<h3 class="text-sm font-extrabold tracking-wide uppercase">Outlet Aktif</h3>
						<div class="mt-3 space-y-3">
							{#each CITIES as city (city.id)}
								<div>
									<a
										href={`/${city.id}`}
										class="inline-flex min-h-9 items-center text-base font-bold underline-offset-4 hover:underline focus-visible:outline-white"
										>{city.name}</a
									>
									<ul>
										{#each OUTLETS.filter((outlet) => outlet.cityId === city.id) as outlet (outlet.id)}
											<li>
												<a
													href={`/${city.id}/${outlet.id}`}
													class="inline-flex min-h-9 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-white"
												>
													<svg
														class="h-4 w-4 shrink-0"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														aria-hidden="true"
														><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle
															cx="12"
															cy="10"
															r="3"
														/></svg
													>
													{outlet.name}
												</a>
											</li>
										{/each}
									</ul>
								</div>
							{/each}
						</div>
						<a
							href="/locations"
							class="mt-2 inline-flex min-h-9 items-center font-semibold underline-offset-4 hover:underline focus-visible:outline-white"
							>Semua Outlet →</a
						>
					</nav>

					<!-- Navigation & Services -->
					<nav
						aria-label="Bantuan dan layanan di footer"
						class="text-sm lg:[&_a]:min-h-7 [@media(any-pointer:coarse)]:[&_a]:min-h-11!"
					>
						<h3 class="text-sm font-extrabold tracking-wide uppercase">Bantuan & Layanan</h3>
						<ul class="mt-3 lg:mt-2">
							<li>
								<a
									class="inline-flex min-h-9 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-white"
									href="/menu"
									><svg
										class="h-4 w-4 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg
									>Menu Lengkap</a
								>
							</li>
							<li>
								<a
									class="inline-flex min-h-9 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-white"
									href="/menu"
									><svg
										class="h-4 w-4 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
										><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg
									>Pesan Sekarang</a
								>
							</li>
							<li>
								<a
									class="inline-flex min-h-9 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-white"
									href="/track"
									><svg
										class="h-4 w-4 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
										><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg
									>Lacak Status Pesanan</a
								>
							</li>
							<li>
								<a
									class="inline-flex min-h-9 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-white"
									href="/group"
									><svg
										class="h-4 w-4 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
										><circle cx="9" cy="8" r="3.5" /><path
											d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"
										/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c0-3-2-5.5-5-6" /></svg
									>Pesan Rame-Rame & Acara</a
								>
							</li>
							<li>
								<a
									class="inline-flex min-h-9 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-white"
									href="/feedback"
									><svg
										class="h-4 w-4 shrink-0"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										aria-hidden="true"
										><path
											d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1L3 21l2-5.3A8.5 8.5 0 1 1 21 11.5Z"
										/></svg
									>Feedback Pengunjung</a
								>
							</li>
						</ul>
					</nav>
					<div class="flex items-center justify-start sm:justify-end sm:pl-8">
						<img
							src={zcup}
							alt="Simbol Z resmi Zatiaras Juice"
							class="h-28 w-auto brightness-0 invert sm:h-32"
						/>
					</div>
				</div>
				<div class="mt-8 pt-4">
					<div
						class="flex flex-col gap-3 text-xs text-white/85 sm:flex-row sm:items-center sm:justify-between"
					>
						<p>© {new Date().getFullYear()} Zatiaras Juice. Semua hak dilindungi.</p>
						<nav class="flex flex-wrap gap-x-4 gap-y-2" aria-label="Kebijakan website">
							<a href="/privacy" class="underline underline-offset-4 hover:text-white">Privasi</a>
							<a href="/terms" class="underline underline-offset-4 hover:text-white"
								>Syarat & Ketentuan</a
							>
						</nav>
						<p>Pickup-first · Tanpa Wajib Akun · Samarinda · Berau · Balikpapan</p>
					</div>
				</div>
			</div>
		</footer>
	{/if}
</div>
