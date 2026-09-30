<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { canonical, orgJsonLd, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { MENU, MENU_VERIFIED } from '$lib/data/menu';
	import { CITIES, OUTLETS, formatOutletHours } from '$lib/core/outlets';
	import { track } from '$lib/analytics/events';
	import { KERN_MAP } from '$lib/kern';
	import { scrollStagger } from '$lib/motion/scroll';
	import ZFlowPourFinal from '$lib/components/ZFlowPourFinal.svelte';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	let videoEl = $state<HTMLVideoElement | null>(null);

	onMount(() => {
		if (!browser || !videoEl) return;
		const v = videoEl;
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		const applyMotion = () => {
			if (mq.matches) {
				v.pause();
				v.removeAttribute('autoplay');
			} else {
				v.play().catch(() => {});
			}
		};
		applyMotion();
		mq.addEventListener?.('change', applyMotion);
		const onVis = () => {
			if (document.hidden) v.pause();
			else if (!mq.matches) v.play().catch(() => {});
		};
		document.addEventListener('visibilitychange', onVis);
		return () => {
			document.removeEventListener('visibilitychange', onVis);
			mq.removeEventListener?.('change', applyMotion);
		};
	});

	const title = `${'Zatiaras Juice'} — Jus Alpukat · Samarinda, Berau, Balikpapan`;
	const desc =
		'Zatiaras Juice. Buahnya Berasa. Jus Alpukat andalan, menu jus buah, order pickup Pesan Sekarang di Samarinda, Berau, Balikpapan.';

	const favorites = [
		{ slug: 'jus-alpukat', tint: 'bg-lime-100', desc: 'Alpukat asli yang creamy dan lembut.' },
		{ slug: 'hero-signature', tint: 'bg-amber-100', desc: 'Alpukat kocok, manisnya pas.' },
		{ slug: 'jus-mangga', tint: 'bg-orange-100', desc: 'Mangga manis yang menyegarkan.' }
	];

	const andalan = MENU.slice(0, 4);

	const ldOrg = jsonLdTag(orgJsonLd());
	const ldCrumb = jsonLdTag(breadcrumbJsonLd([{ name: 'Home', url: canonical('/') }]));
</script>

{#snippet kerned(text: string)}
	{#each text.split(' ') as word, wi}
		{#if wi > 0}
			{' '}
		{/if}<span class="whitespace-nowrap" aria-hidden="true"
			>{#each [...word] as ch}<span
					class="inline-block"
					style:transform={`translateY(${KERN_MAP[ch] ?? 0}em)`}>{ch}</span
				>{/each}</span
		>
	{/each}
{/snippet}

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical('/')} />
	{@html ldOrg}
	{@html ldCrumb}
</svelte:head>

<div class="relative overflow-x-clip">
	<video
		bind:this={videoEl}
		class="fixed inset-0 z-0 h-full w-full object-cover"
		autoplay
		muted
		loop
		playsinline
		disablepictureinpicture
		disableremoteplayback
		preload="metadata"
		poster="/videos/hero-poster.jpg"
		aria-hidden="true"
		tabindex="-1"
		data-hero-video
	>
		<source src="/videos/hero.webm" type="video/webm" />
		<source src="/videos/hero.mp4" type="video/mp4" />
	</video>
	<!-- 00 BRAND VEIL: Sangat tipis agar video tetap tajam, nyata & hidup -->
	<div
		class="pointer-events-none fixed inset-0 z-0 bg-gradient-to-r from-[#FFF8EC]/20 via-transparent to-transparent"
		aria-hidden="true"
	></div>
	<div class="relative z-10">
		<!-- 01 HERO: JUS ALPUKAT -->
		<section class="relative overflow-hidden bg-transparent" aria-label="Jus Alpukat Zatiaras">
			<div
				class="relative z-[2] mx-auto grid max-w-6xl items-center gap-10 px-4 pt-28 pb-16 sm:px-6 lg:grid-cols-12 lg:pt-28 lg:pb-28"
			>
				<ZFlowPourFinal />
				<div class="relative z-10 lg:col-span-8">
					<div class="inline-flex items-center gap-2.5">
						<span class="h-2 w-2 rounded-full bg-brand"></span>
						<p class="text-xs font-bold tracking-[0.28em] text-ink uppercase">
							Zatiaras · Jus Alpukat
						</p>
					</div>

					<h1
						class="mt-4 font-display text-6xl leading-[0.9] font-extrabold tracking-tight text-ink sm:text-7xl lg:text-8xl"
						aria-label="Jus Alpukat"
					>
						{@render kerned('JUS')}<br />{@render kerned('ALPUKAT')}
					</h1>

					<p class="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">Buahnya Berasa.</p>

					<p class="mt-3 max-w-md text-sm leading-relaxed font-medium text-ink/85 sm:text-base">
						Alpukat asli diblender kental. Produk nyata, disajikan dingin dalam cup 22 oz.
					</p>

					<div class="mt-8 flex flex-wrap items-center gap-3.5">
						<a
							id="hero-order"
							href="/menu"
							onclick={() => track('hero_order_clicked', { source: 'hero' })}
							class="inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-sm font-bold text-white shadow-lg shadow-brand/30 transition duration-200 hover:bg-brand-dark active:scale-[0.98]"
						>
							<span>PESAN SEKARANG →</span>
						</a>
						<a
							href="/menu"
							class="inline-flex items-center rounded-full border border-ink/20 bg-white px-7 py-4 text-sm font-bold text-ink shadow-xs transition duration-200 hover:border-brand/50 hover:bg-neutral-50 active:scale-[0.98]"
						>
							Lihat Menu
						</a>
					</div>

					<p class="mt-8 text-xs font-bold tracking-[0.2em] text-copy-muted uppercase">
						Samarinda · Berau · Balikpapan
					</p>
				</div>
			</div>
		</section>

		<!-- 02 JUS APA AJA ADA -->
		<section class="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-label="Jus apa aja ada">
			<p class="text-xs font-bold tracking-[0.25em] text-neutral-500 uppercase">02 · Assortment</p>
			<h2 class="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
				JUS APA AJA ADA.
			</h2>
			<p class="mt-2 max-w-lg text-sm text-neutral-600">
				Bukan cuma alpukat. Alpukat kocok, mangga, naga — buah asli diblender saat dipesan.
			</p>
			<div
				use:scrollStagger={{ childSelector: ':scope > a', y: 30, stagger: 0.1 }}
				class="mt-7 grid gap-4 sm:grid-cols-3"
			>
				{#each favorites as f}
					{@const item = MENU.find((m) => m.slug === f.slug)}
					<a
						href={`/menu/${f.slug}`}
						onclick={() => track('product_clicked', { menu: f.slug, source: 'assortment' })}
						class="group rounded-3xl border border-black/[0.07] bg-white p-5 transition hover:border-brand/25 hover:shadow-md"
					>
						<div class="flex items-center justify-center rounded-2xl {f.tint} p-6">
							<img
								src={zcup}
								alt=""
								aria-hidden="true"
								class="h-36 w-auto transition-transform duration-300 group-hover:scale-105"
								loading="lazy"
							/>
						</div>
						<h3 class="mt-4 font-bold text-ink group-hover:text-brand">{item?.name ?? f.slug}</h3>
						<p class="text-xs text-neutral-500">{f.desc}</p>
					</a>
				{/each}
			</div>
			<a
				href="/menu"
				onclick={() => track('menu_preview_clicked', { source: 'assortment' })}
				class="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand"
			>
				Lihat Semua Menu →
			</a>
		</section>

		<!-- 03 MENU ANDALAN -->
		<section
			class="border-y border-black/[0.06] bg-white/75 py-14 backdrop-blur-sm"
			aria-label="Menu andalan"
		>
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<p class="text-xs font-bold tracking-[0.25em] text-neutral-500 uppercase">
					03 · Menu Andalan
				</p>
				<h2 class="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
					Menu Andalan Zatiaras.
				</h2>
				<div class="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{#each andalan as item}
						<div
							class="flex flex-col justify-between rounded-3xl border border-black/10 bg-cream p-5"
						>
							<div>
								<img
									src={zcup}
									alt={`Cup ${item.name}`}
									class="mx-auto h-36 w-auto"
									loading="lazy"
								/>
								<h3 class="mt-4 font-bold text-ink">{item.name}</h3>
								<p class="mt-1 line-clamp-2 text-xs text-neutral-500">{item.description}</p>
							</div>
							<div class="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3">
								<span class="text-xs font-bold text-ink sm:text-sm">
									{MENU_VERIFIED
										? `Rp${item.price.toLocaleString('id-ID')}`
										: 'Harga dikonfirmasi outlet'}
								</span>
								<a
									href={`/menu/${item.slug}`}
									onclick={() => track('product_clicked', { menu: item.slug, source: 'andalan' })}
									class="rounded-full bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-brand"
								>
									Lihat detail
								</a>
							</div>
						</div>
					{/each}
				</div>
				<p class="mt-4 text-xs text-neutral-500">
					{#if MENU_VERIFIED}
						Harga final mengikuti outlet yang dipilih saat order.
					{:else}
						Harga dan ketersediaan menu sedang menunggu konfirmasi operasional.
					{/if}
				</p>
			</div>
		</section>

		<!-- 04 PESAN DULU TINGGAL AMBIL -->
		<section class="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-label="Pesan dulu tinggal ambil">
			<p class="text-xs font-bold tracking-[0.25em] text-neutral-500 uppercase">04 · Pickup V1</p>
			<h2 class="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
				PESAN DULU.<br />TINGGAL AMBIL.
			</h2>
			<div class="mt-7 grid gap-4 sm:grid-cols-3">
				<div class="rounded-2xl border border-black/[0.07] bg-white p-6">
					<p class="font-display text-lg font-bold text-brand">1</p>
					<h3 class="mt-2 font-bold text-ink">Pilih outlet & menu</h3>
					<p class="mt-1 text-xs text-neutral-500">
						Lima outlet di 3 kota. Satu pesanan satu outlet.
					</p>
				</div>
				<div class="rounded-2xl border border-black/[0.07] bg-white p-6">
					<p class="font-display text-lg font-bold text-brand">2</p>
					<h3 class="mt-2 font-bold text-ink">Bayar</h3>
					<p class="mt-1 text-xs text-neutral-500">
						Guest checkout, pembayaran terverifikasi server.
					</p>
				</div>
				<div class="rounded-2xl border border-black/[0.07] bg-white p-6">
					<p class="font-display text-lg font-bold text-brand">3</p>
					<h3 class="mt-2 font-bold text-ink">Ambil saat siap</h3>
					<p class="mt-1 text-xs text-neutral-500">Tunjukkan kode pesanan di outlet.</p>
				</div>
			</div>
			<a
				href="/menu"
				class="mt-6 inline-flex rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark"
			>
				Pesan Sekarang →
			</a>
		</section>

		<!-- 05 TEMUKAN ZATIARAS -->
		<section
			class="border-y border-black/[0.06] bg-white/75 py-14 backdrop-blur-sm"
			aria-label="Temukan Zatiaras"
		>
			<div class="mx-auto max-w-6xl px-4 sm:px-6">
				<p class="text-xs font-bold tracking-[0.25em] text-neutral-500 uppercase">05 · Lokasi</p>
				<h2 class="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
					TEMUKAN ZATIARAS.
				</h2>
				{#each CITIES as c}
					<div class="mt-8">
						<div class="flex items-baseline justify-between">
							<h3 class="text-lg font-bold text-ink">{c.name}</h3>
							<a href="/{c.id}" class="text-xs font-bold text-brand">Halaman {c.name} →</a>
						</div>
						<div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{#each OUTLETS.filter((o) => o.cityId === c.id) as o}
								<a
									href="/{o.cityId}/{o.id}"
									onclick={() => track('outlet_select_clicked', { outlet: o.id, source: 'home' })}
									class="rounded-2xl border border-black/[0.08] bg-cream p-5 transition hover:border-brand/40"
								>
									<p class="text-xs font-bold text-brand uppercase">{o.city}</p>
									<p class="mt-1 font-bold text-ink">Zatiaras {o.name}</p>
									<p class="mt-1 text-xs text-neutral-500">
										{o.hours.startsWith('VERIFY')
											? 'Jam operasional dikonfirmasi outlet'
											: formatOutletHours(o.hours)}
									</p>
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- 06 PESAN RAME-RAME -->
		<section class="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-label="Pesan rame-rame">
			<div
				class="relative overflow-hidden rounded-[2.5rem] bg-brand p-8 text-white shadow-xl sm:p-12"
			>
				<p class="text-xs font-bold tracking-wider text-white/80 uppercase">
					06 · Kantor · Meeting · Acara
				</p>
				<h2 class="mt-2 font-display text-3xl font-extrabold sm:text-4xl">PESAN RAME-RAME.</h2>
				<p class="mt-2 max-w-md text-sm text-white/80">
					Group order tetap outlet-aware. Pesanan besar disetujui outlet sebelum bayar.
				</p>
				<a
					href="/group"
					onclick={() => track('group_order_clicked', { source: 'home' })}
					class="mt-6 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand"
				>
					Pesan Rame-Rame →
				</a>
			</div>
		</section>

		<!-- 07 PRODUCT PROOF -->
		<section class="mx-auto max-w-6xl px-4 pb-14 sm:px-6" aria-label="Bukti produk">
			<p class="text-xs font-bold tracking-[0.25em] text-neutral-500 uppercase">07 · Bukti</p>
			<h2 class="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
				Kentalnya Beneran.
			</h2>
			<div class="mt-6 grid gap-4 sm:grid-cols-3">
				<div class="rounded-3xl border border-black/[0.07] bg-white p-6">
					<p class="font-bold text-ink">Buah asli</p>
					<p class="mt-1 text-xs text-neutral-500">
						Diblender saat pesanan terverifikasi. Tanpa klaim kesehatan berlebihan.
					</p>
				</div>
				<div class="rounded-3xl border border-black/[0.07] bg-white p-6">
					<p class="font-bold text-ink">Ukuran produk</p>
					<p class="mt-1 text-xs text-neutral-500">
						Ukuran dan detail tiap menu mengikuti informasi outlet terpilih.
					</p>
				</div>
				<div class="rounded-3xl border border-black/[0.07] bg-white p-6">
					<p class="font-bold text-ink">Dibuat di outlet</p>
					<p class="mt-1 text-xs text-neutral-500">Diracik kru outlet yang memproses pesananmu.</p>
				</div>
			</div>
		</section>

		<!-- 08 SUPPORT -->
		<section
			class="border-t border-black/[0.06] bg-white/75 py-12 backdrop-blur-sm"
			aria-label="Bantuan"
		>
			<div
				class="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 sm:flex-row sm:items-center sm:px-6"
			>
				<div>
					<h2 class="font-display text-2xl font-bold text-ink">Ada kendala pesanan?</h2>
					<p class="mt-1 text-sm text-neutral-600">
						Pesanan berbayar yang gagal diproses dialihkan ke bantuan manusia via WhatsApp.
					</p>
				</div>
				<div class="flex gap-3">
					<a
						href="/track"
						class="rounded-full border border-black/15 px-6 py-3 text-sm font-bold text-ink"
						>Lacak Pesanan</a
					>
					<a href="/feedback" class="rounded-full bg-ink px-6 py-3 text-sm font-bold text-white"
						>Bantuan / Feedback</a
					>
				</div>
			</div>
		</section>
	</div>
</div>
