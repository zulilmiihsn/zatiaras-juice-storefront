<script lang="ts">
	import './layout.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { track } from '$lib/analytics/events';
	import { cart } from '$lib/stores/cart.svelte';
	import { AVAILABILITY_VERIFIED, MENU_VERIFIED } from '$lib/data/menu';
	import { getOutlet } from '$lib/core/outlets';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import lockup from '$lib/assets/brand/ZJ_LOGO_PRIMARY_LOCKUP_MAGENTA_FILLED_v01.svg';
	import lockupFooter from '$lib/assets/brand/ZJ_LOGO_PRIMARY_LOCKUP_MAGENTA_TRANSPARENT_v01_2026-09-04.svg';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	let { children } = $props();

	let menuOpen = $state(false);
	let compact = $state(false);
	let headerHidden = $state(false);
	let heroCtaVisible = $state(true);
	let footerVisible = $state(false);
	let lastY = 0;
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
	const showBottomCta = $derived(!menuOpen && isHome && !heroCtaVisible && !footerVisible);
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

	onMount(() => {
		setupHeroObserver();
		setupFooterObserver();
		let raf = 0;
		const isMobile = () =>
			typeof matchMedia !== 'undefined' && matchMedia('(max-width: 639px)').matches;
		const onScroll = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const y = window.scrollY;
				compact = y > 8;
				const focusInHeader = !!headerEl?.contains(document.activeElement);
				if (menuOpen || focusInHeader || y < 64) {
					headerHidden = false;
				} else if (isMobile()) {
					// Histeresis: butuh gerak bermakna, bukan tiap piksel.
					if (y > lastY + 8 && y > 140) headerHidden = true;
					else if (y < lastY - 4) headerHidden = false;
				} else {
					headerHidden = false;
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
		};
	});

	afterNavigate(() => {
		track('page_view', { path: page.url.pathname });
		menuOpen = false;
		headerHidden = false;
		tick().then(() => {
			setupHeroObserver();
			setupFooterObserver();
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={zcup} />
	<link
		rel="preload"
		href="/fonts/ZatiarasDisplayV1-SemiBold-V1.2-RC4.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	<link
		rel="preload"
		href="/fonts/ZatiarasDisplayV1-Bold-V1.2-RC4.woff2"
		as="font"
		type="font/woff2"
		crossorigin="anonymous"
	/>
	<link
		rel="preload"
		href="/fonts/ZatiarasDisplayV1-ExtraBold-V1.2-RC4.woff2"
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
			class="sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200 motion-reduce:transition-none {compact
				? 'border-white/30 bg-cream/50 shadow-[0_1px_12px_rgba(0,0,0,0.06)] backdrop-blur-[6px]'
				: 'border-transparent bg-transparent'} {headerHidden
				? 'max-sm:-translate-y-full'
				: ''} max-sm:transition-transform max-sm:duration-200"
		>
			<div class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3.5 sm:px-6">
				<a
					href="/"
					aria-label="Zatiaras Juice"
					class="tap-scale flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-95"
				>
					<img src={lockup} alt="Zatiaras Juice" class="h-8 w-auto sm:h-9" />
				</a>

				<nav
					class="hidden items-center gap-9 font-sans text-[15px] font-semibold sm:flex"
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

					<!-- Slot CTA mengembang: 0fr → 1fr, tombol meluncur halus -->
					<span
						class="hidden transition-all delay-75 duration-300 motion-reduce:transition-none sm:grid {showNavCta
							? 'grid-cols-[1fr] opacity-100'
							: 'grid-cols-[0fr] opacity-0'}"
						aria-hidden={!showNavCta}
					>
						<span class="min-w-0 overflow-hidden">
							<a
								href="/menu"
								tabindex={showNavCta ? 0 : -1}
								aria-hidden={!showNavCta}
								class="tap-scale inline-flex w-[172px] items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-bold whitespace-nowrap text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark"
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
					</span>

					<!-- Pemicu drawer mobile -->
					<button
						type="button"
						class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white sm:hidden"
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
	<main id="konten" class="flex-1 {isHome && !isInternal && !minimal ? 'pb-36 sm:pb-0' : ''}">
		{@render children()}
	</main>

	{#if !minimal && !isInternal}
		<!-- CTA BAWAH KONTEKSTUAL MOBILE -->
		{#if showBottomCta}
			<aside
				class="mobile-cta pointer-events-none fixed right-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] left-0 z-30 px-4 sm:hidden"
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

	<!-- PUBLIC FOOTER: internal/checkout flows stay enclosed and focused. -->
	{#if !isInternal && !minimal}
		<footer id="footer-public" class="border-t border-black/[0.08] bg-ink text-white">
			<div class="mx-auto grid max-w-6xl gap-8 px-4 pt-14 pb-12 sm:px-6">
				<div class="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-12 md:gap-10">
					<!-- Brand Column -->
					<div class="col-span-2 space-y-4 md:col-span-5">
						<img src={lockupFooter} alt="Zatiaras Juice" class="h-8 w-auto brightness-0 invert" />
						<div class="cup-lip-bar w-12"></div>
						<p class="max-w-sm text-sm leading-relaxed text-white/70">
							Jus Apa Aja Ada. Kentalnya Beneran.<br />
							Self-order web pickup resmi Samarinda · Berau · Balikpapan.
						</p>
					</div>

					<!-- Outlet Column -->
					<div class="text-sm md:col-span-4">
						<p class="text-xs font-bold tracking-wider text-white/40 uppercase">Outlet</p>
						<ul class="mt-4 space-y-2 text-white/80">
							<li>
								<a class="transition-colors hover:text-brand" href="/samarinda"
									>Samarinda — Juanda · Slamet Riyadi</a
								>
							</li>
							<li>
								<a class="transition-colors hover:text-brand" href="/berau">Berau — Merah Delima</a>
							</li>
							<li>
								<a class="transition-colors hover:text-brand" href="/balikpapan"
									>Balikpapan — Kutilang · Gatot Subroto</a
								>
							</li>
							<li>
								<a class="transition-colors hover:text-brand" href="/locations">Semua Outlet</a>
							</li>
						</ul>
					</div>

					<!-- Links Column -->
					<div class="text-sm md:col-span-3">
						<p class="text-xs font-bold tracking-wider text-white/40 uppercase">
							Bantuan & Layanan
						</p>
						<ul class="mt-4 space-y-2.5 text-white/80">
							<li>
								<a class="transition-colors hover:text-brand" href="/track">Lacak Status Pesanan</a>
							</li>
							<li>
								<a class="transition-colors hover:text-brand" href="/group"
									>Pesan Rame-Rame & Acara</a
								>
							</li>
							<li>
								<a class="transition-colors hover:text-brand" href="/feedback"
									>Feedback Pengunjung</a
								>
							</li>
							<li><a class="transition-colors hover:text-brand" href="/about">Tentang Kami</a></li>
						</ul>
						<a
							href="/menu"
							class="tap-scale mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand/20 transition hover:bg-brand-dark"
						>
							<span>Pesan Sekarang</span>
							<svg
								class="h-3 w-3"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								aria-hidden="true"
							>
								<path d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</a>
					</div>
				</div>

				<div class="mt-12 border-t border-white/10 pt-6">
					<div class="flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
						<p>© Zatiaras Juice. Self-Order Pickup · Tanpa Wajib Akun.</p>
						<p class="text-white/40">Pickup-first · Guest order</p>
					</div>
				</div>
			</div>
		</footer>
	{/if}
</div>
