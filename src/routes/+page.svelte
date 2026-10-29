<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import { canonical, orgJsonLd, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { track } from '$lib/analytics/events';
	import KernedText from '$lib/components/KernedText.svelte';
	import PickupSteps from '$lib/components/PickupSteps.svelte';
	import OutletFinder from '$lib/components/OutletFinder.svelte';
	import BestSellers from '$lib/components/BestSellers.svelte';
	import Categories from '$lib/components/Categories.svelte';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	let videoEl = $state<HTMLVideoElement | null>(null);

	onMount(() => {
		if (!browser || !videoEl) return;
		const v = videoEl;
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		const connection = (
			navigator as Navigator & {
				connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
			}
		).connection;
		const visibleRegions = new SvelteSet<Element>();
		let sourcesLoaded = false;
		let drawerOpen = false;

		const dataSaverEnabled = () =>
			connection?.saveData === true ||
			connection?.effectiveType === 'slow-2g' ||
			connection?.effectiveType === '2g';
		const loadSources = () => {
			if (sourcesLoaded) return;
			for (const source of v.querySelectorAll<HTMLSourceElement>('source[data-src]')) {
				const src = source.dataset.src;
				if (src) source.src = src;
			}
			sourcesLoaded = true;
			v.load();
		};
		const syncPlayback = () => {
			const shouldPlay =
				!mq.matches &&
				!dataSaverEnabled() &&
				!document.hidden &&
				!drawerOpen &&
				visibleRegions.size > 0;
			if (!shouldPlay) {
				v.pause();
				return;
			}
			loadSources();
			if (v.paused) void v.play().catch(() => {});
		};

		const regionObserver = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visibleRegions.add(entry.target);
					else visibleRegions.delete(entry.target);
				}
				syncPlayback();
			},
			{ threshold: 0 }
		);
		for (const region of document.querySelectorAll('[data-video-background-region]')) {
			regionObserver.observe(region);
		}

		const onPreferenceChange = () => syncPlayback();
		const onDrawerChange = (event: Event) => {
			drawerOpen = (event as CustomEvent<boolean>).detail;
			syncPlayback();
		};
		window.addEventListener('zatiaras:mobile-drawer', onDrawerChange);
		mq.addEventListener?.('change', onPreferenceChange);
		connection?.addEventListener('change', onPreferenceChange);
		document.addEventListener('visibilitychange', onPreferenceChange);
		syncPlayback();

		return () => {
			v.pause();
			regionObserver.disconnect();
			window.removeEventListener('zatiaras:mobile-drawer', onDrawerChange);
			mq.removeEventListener?.('change', onPreferenceChange);
			connection?.removeEventListener('change', onPreferenceChange);
			document.removeEventListener('visibilitychange', onPreferenceChange);
		};
	});

	const title = 'Zatiaras Juice | Pesan Jus & Minuman Buah';
	const desc =
		'Zatiaras Juice. Jus buah segar dengan rasa asli buah pilihan. Pesan online, ambil di outlet terdekat di Samarinda, Berau, dan Balikpapan.';

	const ldOrg = jsonLdTag(orgJsonLd());
	const ldCrumb = jsonLdTag(breadcrumbJsonLd([{ name: 'Home', url: canonical('/') }]));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical('/')} />
	{@html ldOrg}
	{@html ldCrumb}
</svelte:head>

<div class="homepage relative min-h-[100dvh] overflow-x-clip">
	<!-- PERSISTENT FIXED CINEMATIC BACKGROUND VIDEO: Stays pinned in place while user scrolls -->
	<div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
		<video
			bind:this={videoEl}
			class="h-full w-full object-cover"
			muted
			loop
			playsinline
			disablepictureinpicture
			disableremoteplayback
			preload="none"
			poster="/videos/hero-poster.jpg"
			tabindex="-1"
			data-hero-video
		>
			<source data-src="/videos/hero.webm" type="video/webm" />
			<source data-src="/videos/hero.mp4" type="video/mp4" />
		</video>
		<!-- Atmospheric warm Fruit Cream veil across the entire scroll -->
		<div
			class="absolute inset-0 bg-gradient-to-b from-[#FFFDF9]/12 via-[#FFFDF9]/22 to-[#FFFDF9]/34"
		></div>
	</div>

	<!-- 01 HERO: JUS ALPUKAT -->
	<section
		class="home-hero relative z-10 flex items-center overflow-hidden"
		aria-label="Jus Alpukat Zatiaras"
		data-video-background-region
	>
		<!-- Editorial warm gradient scrim to ensure text legibility while dissolving like mist at the bottom -->
		<div
			class="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#FFFDF9]/30 via-[#FFFDF9]/4 to-transparent [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)] max-lg:from-[#FFFDF9]/44 max-lg:via-[#FFFDF9]/14 max-lg:to-transparent max-lg:[mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
			aria-hidden="true"
		></div>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 z-[1] h-20 bg-gradient-to-b from-[#FFFDF9]/35 to-transparent"
			aria-hidden="true"
		></div>

		<div class="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<!-- Hero headline & actions -->
			<div class="relative z-10 max-w-3xl">
				<h1
					class="font-display text-[clamp(3.5rem,19vw,9rem)] leading-[0.9] font-extrabold text-brand [-webkit-text-stroke:0.04em_currentColor]"
					aria-label="Jus Alpukat"
				>
					<span class="block"><KernedText text="JUS" /></span>
					<span class="block"><KernedText text="ALPUKAT" /></span>
				</h1>

				<p class="mt-6 max-w-lg text-sm leading-relaxed text-ink/80 sm:text-base">
					Jus buah segar dengan rasa asli buah pilihan.<br />
					Pesan online, ambil di outlet terdekat.
				</p>

				<div class="mt-6 flex flex-wrap items-center gap-3">
					<a
						id="hero-order"
						href="/menu"
						onclick={() => track('hero_order_clicked', { source: 'hero' })}
						class="tap-scale inline-flex min-h-13 items-center justify-center gap-2.5 rounded-full bg-brand px-4 py-3 text-[19px] font-bold text-white transition-colors duration-200 hover:bg-brand-dark sm:px-6 sm:text-xl"
					>
						<span>Pesan Sekarang</span>
						<svg
							class="h-5 w-5 shrink-0"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12h14M13 6l6 6-6 6" />
						</svg>
					</a>
					<a
						href="/locations"
						class="tap-scale inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-ink/10 bg-white/90 px-4 py-3 text-sm font-bold text-ink transition-colors duration-200 hover:border-brand/40 hover:text-brand sm:px-6 sm:text-base"
					>
						<svg
							class="h-4 w-4 shrink-0 text-brand"
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
						Pilih Outlet
					</a>
				</div>

				<div class="mt-4 inline-flex items-center gap-2 text-xs text-copy-muted sm:text-sm">
					<svg
						class="h-4 w-4 shrink-0 text-brand"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
						<circle cx="12" cy="10" r="3" />
					</svg>
					<span>Samarinda · Berau · Balikpapan</span>
				</div>
			</div>
		</div>
	</section>

	<div class="relative z-10">
		<!-- CALM CANVAS: near-white cream backdrop for transactional & operational clarity -->
		<div class="relative z-10 bg-[#FFFDF9]">
			<!-- Top smooth gradient feathering the hero into the calm canvas -->
			<div
				class="pointer-events-none absolute inset-x-0 -top-20 h-20 bg-gradient-to-b from-transparent to-[#FFFDF9]/94 sm:-top-28 sm:h-28"
				aria-hidden="true"
			></div>

			<!-- 02 PALING LARIS -->
			<BestSellers />

			<!-- 03 JUS APA AJA ADA: kategori jualan -->
			<Categories />

			<!-- Section Divider Line -->
			<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div
					class="h-px w-full bg-gradient-to-r from-transparent via-ink/[0.08] to-transparent"
				></div>
			</div>

			<!-- 04 PESAN DULU TINGGAL AMBIL -->
			<PickupSteps />
		</div>

		<!-- 05 TEMUKAN ZATIARAS: solid cream background, no video -->
		<OutletFinder />

		<div class="relative z-10 bg-[#FFFDF9]">
			<!-- 06 PESAN RAME-RAME -->
			<section
				class="home-section mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
				aria-label="Pesan rame-rame"
			>
				<div
					class="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#ff1081] via-[#e50b73] to-[#990448] p-6 text-white shadow-[0_24px_60px_-15px_rgba(255,16,129,0.35)] sm:p-10 lg:p-12"
				>
					<!-- Subtle watermark decoration -->
					<div
						class="pointer-events-none absolute -right-12 -bottom-16 h-80 w-80 opacity-20 transition-transform duration-700 hover:scale-105"
						aria-hidden="true"
					>
						<img src={zcup} alt="" class="h-full w-full object-contain" />
					</div>

					<!-- Ambient soft glow inside banner -->
					<div
						class="pointer-events-none absolute top-0 right-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
						aria-hidden="true"
					></div>

					<div class="relative z-10 max-w-2xl">
						<h2 class="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
							Pesan Rame-Rame
						</h2>
						<p class="mt-3 text-sm leading-relaxed font-medium text-white/90 sm:text-base">
							Group order tetap outlet-aware. Pesanan besar disetujui outlet sebelum bayar.
						</p>

						<div class="mt-8">
							<a
								href="/group"
								onclick={() => track('group_order_clicked', { source: 'home' })}
								class="tap-scale inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-brand shadow-[0_12px_28px_rgba(0,0,0,0.15)] transition-all duration-200 hover:bg-cream hover:shadow-[0_16px_36px_rgba(0,0,0,0.22)] active:scale-[0.98]"
							>
								<span>Pesan Rame-Rame →</span>
							</a>
						</div>
					</div>
				</div>
			</section>

			<!-- Bottom smooth gradient feathering from calm canvas back into sensory video -->
			<div
				class="pointer-events-none absolute inset-x-0 -bottom-28 h-28 bg-gradient-to-b from-[#FFFDF9]/94 via-[#FFFDF9]/55 to-transparent"
				aria-hidden="true"
			></div>
		</div>

		<!-- 07 PRODUCT PROOF: Expansive cinematic video scene -->
		<section
			class="home-section mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
			aria-label="Bukti produk"
			data-video-background-region
		>
			<h2
				class="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl"
			>
				Kentalnya Beneran
			</h2>

			<div class="home-section-content grid gap-4 md:grid-cols-3 lg:gap-6">
				<!-- Proof 1 -->
				<div
					class="relative flex flex-col justify-between rounded-[2rem] border border-white/80 bg-white/92 p-8 shadow-[0_20px_45px_rgba(36,26,32,0.06)] transition-all duration-300 hover:border-brand/35 hover:bg-white/95 hover:shadow-md"
				>
					<div>
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-100 text-lime-700 shadow-2xs"
						>
							<svg
								class="h-6 w-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path
									d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
								/>
								<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
							</svg>
						</div>
						<p class="mt-6 font-display text-xl font-bold text-ink">Buah asli</p>
						<p class="mt-2 text-xs leading-relaxed text-neutral-600 sm:text-sm">
							Diblender saat pesanan terverifikasi. Tanpa klaim kesehatan berlebihan.
						</p>
					</div>
				</div>

				<!-- Proof 2 -->
				<div
					class="relative flex flex-col justify-between rounded-[2rem] border border-white/80 bg-white/92 p-8 shadow-[0_20px_45px_rgba(36,26,32,0.06)] transition-all duration-300 hover:border-brand/35 hover:bg-white/95 hover:shadow-md"
				>
					<div>
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-2xs"
						>
							<svg
								class="h-6 w-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M17 8h1a4 4 0 1 1 0 8h-1" />
								<path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
								<line x1="6" y1="2" x2="6" y2="4" />
								<line x1="10" y1="2" x2="10" y2="4" />
								<line x1="14" y1="2" x2="14" y2="4" />
							</svg>
						</div>
						<p class="mt-6 font-display text-xl font-bold text-ink">Ukuran produk</p>
						<p class="mt-2 text-xs leading-relaxed text-neutral-600 sm:text-sm">
							Ukuran dan detail tiap menu mengikuti informasi outlet terpilih.
						</p>
					</div>
				</div>

				<!-- Proof 3 -->
				<div
					class="relative flex flex-col justify-between rounded-[2rem] border border-white/80 bg-white/92 p-8 shadow-[0_20px_45px_rgba(36,26,32,0.06)] transition-all duration-300 hover:border-brand/35 hover:bg-white/95 hover:shadow-md"
				>
					<div>
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shadow-2xs"
						>
							<svg
								class="h-6 w-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
								<polyline points="9 22 9 12 15 12 15 22" />
							</svg>
						</div>
						<p class="mt-6 font-display text-xl font-bold text-ink">Dibuat di outlet</p>
						<p class="mt-2 text-xs leading-relaxed text-neutral-600 sm:text-sm">
							Diracik kru outlet yang memproses pesananmu.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- 08 CLOSING COMMERCE CTA: High-impact conversion & human support bridge (inspired by reference) -->
		<section
			class="home-closing relative z-10 border-t border-ink/[0.06] bg-cream pb-12 sm:pb-16 lg:pb-20"
			aria-label="Pesan sekarang"
		>
			<!-- Top smooth gradient feathering from sensory video into solid cream canvas -->
			<div
				class="pointer-events-none absolute inset-x-0 -top-28 h-28 bg-gradient-to-b from-transparent via-cream/60 to-cream"
				data-video-background-region
				aria-hidden="true"
			></div>

			<div class="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
				<!-- Bold Punchy Headline (matching reference "Craving Something Different? Pull Up") -->
				<h2
					class="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl"
				>
					Haus? Pesan Dulu,<br class="hidden sm:inline" /> Tinggal Ambil di Outlet
				</h2>

				<p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
					Buahnya berasa, kentalnya beneran. Diracik segar saat dipesan, siap diambil tanpa antre
					dalam cup 22 oz.
				</p>

				<!-- Primary Commerce CTA Button (matching reference "Order Now") -->
				<div class="mt-8 flex flex-wrap items-center justify-center gap-4 sm:mt-10">
					<a
						href="/menu"
						onclick={() => track('hero_order_clicked', { source: 'bottom_cta' })}
						class="tap-scale group inline-flex items-center gap-2.5 rounded-full bg-brand px-9 py-4 text-base font-bold text-white shadow-[0_12px_28px_rgba(255,16,129,0.32)] transition-all duration-200 hover:bg-brand-dark hover:shadow-[0_16px_36px_rgba(255,16,129,0.42)] active:scale-[0.98]"
					>
						<span>PESAN SEKARANG</span>
						<span class="transition-transform duration-200 group-hover:translate-x-1">→</span>
					</a>
				</div>

				<!-- Location indicator (matching reference "📍 1722 W Belmont Ave, Chicago") -->
				<div
					class="mt-6 flex items-center justify-center gap-2 text-xs font-bold tracking-wider text-copy-muted uppercase sm:text-sm"
				>
					<svg
						class="h-4 w-4 text-brand"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
						<circle cx="12" cy="10" r="3" />
					</svg>
					<span>Samarinda · Berau · Balikpapan (5 Outlet Aktif)</span>
				</div>

				<!-- Secondary Support Concierge Pill (Preserving all support routes & WhatsApp promises) -->
				<div
					class="mt-10 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-ink/8 bg-white/80 px-5 py-3 text-xs text-neutral-600 shadow-2xs backdrop-blur-xs"
				>
					<span class="flex items-center gap-1.5 font-semibold text-ink">
						<svg
							class="h-3.5 w-3.5 text-brand"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path
								d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
							/>
						</svg>
						Ada kendala pesanan?
					</span>
					<span class="hidden text-neutral-300 sm:inline">|</span>
					<a href="/track" class="font-bold text-ink underline transition hover:text-brand"
						>Lacak Pesanan</a
					>
					<span class="text-neutral-300">·</span>
					<a href="/feedback" class="font-bold text-ink underline transition hover:text-brand"
						>Bantuan WhatsApp & Feedback</a
					>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.homepage {
		--home-section-space: 3rem;
		--home-section-gap: 2rem;

		/* Section laptop "satu layar" (BestSellers, Categories): tinggi = viewport dikurangi header,
		   dengan batas bawah supaya layar pendek tetap bisa digulir. */
		--home-header: 96px;
		--home-stage-height: max(560px, calc(100dvh - var(--home-header)));
		--home-stage-pad: clamp(16px, 3dvh, 32px);
		--home-stage-gap: clamp(32px, 7dvh, 64px);
	}
	@media (min-width: 640px) {
		.homepage {
			--home-section-space: 4rem;
			--home-section-gap: 2.5rem;
		}
	}
	@media (min-width: 1024px) {
		.homepage {
			--home-section-space: 5rem;
			--home-section-gap: 3rem;
		}
	}
	@media (min-width: 1280px) {
		.homepage {
			--home-section-space: 6rem;
		}
	}
	.home-hero {
		min-height: 100dvh;
	}
	.home-section {
		padding-block: var(--home-section-space);
	}
	.home-section-content {
		margin-top: var(--home-section-gap);
	}
	.home-closing {
		padding-top: var(--home-section-space);
	}
	.homepage :global(p:not(.font-display)) {
		font-weight: 600;
	}
</style>
