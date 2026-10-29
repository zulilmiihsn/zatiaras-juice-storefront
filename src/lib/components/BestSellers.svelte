<script lang="ts">
	import { onMount } from 'svelte';
	import { MENU } from '$lib/data/menu';
	import { track } from '$lib/analytics/events';
	import KernedText from '$lib/components/KernedText.svelte';

	// Urutan = peringkat penjualan dari pemilik: Jus Alpukat, Alpukat Kocok, Jus Mangga.
	// Foto produk resmi (static/images/assortment). `field` = bidang warna rasa, aksen produk
	// saja, bukan palet brand baru. `word` (hanya kartu terlaris) = kata besar tone-on-tone di belakang cup.
	const ranking = [
		{
			slug: 'jus-alpukat',
			image: 'avocado',
			width: 960,
			height: 778,
			field: '#cde48d',
			tone: '#33570c',
			word: 'ALPUKAT',
			alt: 'Jus Alpukat Zatiaras dengan alpukat belah dan potongan alpukat segar',
			copy: 'Alpukat asli diblender lembut, creamy, buahnya terasa.'
		},
		{
			slug: 'hero-signature',
			image: 'avocado-chocolate',
			width: 960,
			height: 1088,
			field: '#efcbb0',
			tone: '#6b3a1f',
			alt: 'Alpukat Kocok Zatiaras dengan saus dan bubuk cokelat, alpukat, dan cokelat batang',
			copy: 'Alpukat kental dikocok, manisnya pas.'
		},
		{
			slug: 'jus-mangga',
			image: 'mango',
			width: 960,
			height: 988,
			field: '#ffd56b',
			tone: '#b83c0a',
			alt: 'Jus Mangga Zatiaras dengan mangga utuh dan potongan mangga segar',
			copy: 'Mangga manis, segar dan wangi.'
		}
	];

	const items = ranking.flatMap((entry) => {
		const menu = MENU.find((item) => item.slug === entry.slug);
		if (!menu) return [];
		// Kata terakhir nama adalah kata rasa (ALPUKAT, KOCOK, MANGGA); itu yang diberi warna.
		const cut = menu.name.lastIndexOf(' ');
		return [
			{
				...entry,
				name: menu.name,
				lead: menu.name.slice(0, cut).toUpperCase(),
				flavour: menu.name.slice(cut + 1).toUpperCase()
			}
		];
	});

	let ready = $state(false);
	let seen = $state(false);
	let section: HTMLElement | undefined = $state();
	// Cup mengikuti kursor hanya di perangkat dengan pointer halus dan tanpa reduced motion.
	let canTilt = $state(false);
	let tilt = $state<{ index: number; x: number; y: number } | null>(null);
	const reveal = $derived(ready ? (seen ? 'in' : 'hidden') : 'off');

	onMount(() => {
		const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
		canTilt = !calm && matchMedia('(hover: hover) and (pointer: fine)').matches;
		if (calm || !section) return;
		// Entrance berjenjang hanya aktif setelah JS jalan; tanpa JS kartu langsung terlihat.
		ready = true;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					seen = true;
					observer.disconnect();
				}
			},
			{ rootMargin: '0px 0px -12% 0px' }
		);
		observer.observe(section);
		return () => observer.disconnect();
	});

	function follow(event: PointerEvent, index: number) {
		if (!canTilt) return;
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		tilt = {
			index,
			x: ((event.clientX - box.left) / box.width) * 2 - 1,
			y: ((event.clientY - box.top) / box.height) * 2 - 1
		};
	}
</script>

<section
	id="terlaris"
	bind:this={section}
	class="best mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
	class:reveal-ready={ready}
	class:reveal-in={seen}
	aria-labelledby="best-title"
>
	<div class="best-head reveal" style="--i: 0">
		<h2 id="best-title" class="font-display" aria-label="Paling Laris di Zatiaras">
			<span class="block"
				><KernedText text="PALING" {reveal} />
				<span class="mark"><KernedText text="LARIS" {reveal} base={190} /></span></span
			>
			<span class="block"><KernedText text="DI ZATIARAS" {reveal} base={380} /></span>
		</h2>
		<div class="best-aside">
			<p>Tiga cup yang paling sering dipesan. Pilih satu, ambil di outlet terdekat.</p>
			<a
				class="best-all"
				href="/menu"
				onclick={() => track('menu_preview_clicked', { source: 'terlaris' })}
			>
				Lihat semua menu<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg
				>
			</a>
		</div>
	</div>

	<ol class="best-grid" role="list">
		{#each items as item, index (item.slug)}
			<li
				class="cup-card reveal"
				class:lead={index === 0}
				class:mirror={index === 2}
				class:tilt={tilt?.index === index}
				style="--field: {item.field}; --tone: {item.tone}; --i: {index + 1}; --tx: {tilt?.index ===
				index
					? tilt.x
					: 0}; --ty: {tilt?.index === index ? tilt.y : 0}"
				onpointermove={(event) => follow(event, index)}
				onpointerleave={() => (tilt = null)}
			>
				{#if item.word}<span class="cup-word font-display" aria-hidden="true">{item.word}</span
					>{/if}
				{#if index === 0}
					<svg class="stamp" viewBox="0 0 120 120" aria-hidden="true">
						<circle cx="60" cy="60" r="60" />
						<defs>
							<path id="stamp-ring" d="M60 60m-43 0a43 43 0 1 1 86 0a43 43 0 1 1-86 0" />
						</defs>
						<g class="stamp-spin">
							<text textLength="262" lengthAdjust="spacing">
								<textPath href="#stamp-ring">PILIHAN NOMOR SATU • TERLARIS •</textPath>
							</text>
						</g>
						<text class="stamp-num font-display" x="60" y="77" text-anchor="middle">1</text>
					</svg>
				{/if}
				<img
					class="cup-photo"
					src={`/images/assortment/${item.image}-960.webp`}
					srcset={`/images/assortment/${item.image}-480.webp 480w, /images/assortment/${item.image}-960.webp 960w`}
					sizes={index === 0
						? '(min-width: 1024px) 560px, 90vw'
						: '(min-width: 1024px) 240px, 45vw'}
					width={item.width}
					height={item.height}
					alt={item.alt}
					loading="lazy"
					decoding="async"
				/>
				<div class="cup-copy">
					<h3 class="font-display" aria-label={item.name}>
						<KernedText text={item.lead} />
						<span class="flavour"><KernedText text={item.flavour} /></span>
					</h3>
					<p id={`best-copy-${item.slug}`}>{item.copy}</p>
					<a
						class="cup-order"
						href={`/menu/${item.slug}`}
						aria-label={`Pesan ${item.name}`}
						aria-describedby={`best-copy-${item.slug}`}
						onclick={() => track('product_clicked', { menu: item.slug, source: 'terlaris' })}
					>
						<span>Pesan</span><svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg
						>
					</a>
				</div>
			</li>
		{:else}
			<li class="best-empty">
				Menu sedang disiapkan. <a href="/menu">Lihat halaman menu</a>
			</li>
		{/each}
	</ol>
</section>

<style>
	.best {
		padding-block: var(--home-section-space);
		scroll-margin-top: var(--home-header);
	}

	/* Kepala: judul kapital dua baris di kiri, kalimat + tautan menu di kanan. */
	.best-head {
		display: grid;
		gap: 16px;
		align-items: end;
	}
	.best-head h2 {
		font-size: clamp(1.875rem, 9.5vw, 3.25rem);
		font-weight: 800;
		line-height: 0.92;
		letter-spacing: -0.005em;
		color: var(--color-ink);
	}
	/* "LARIS" sebagai stiker magenta solid (seperti tombol brand), sedikit miring. */
	.mark {
		display: inline-block;
		margin-left: 0.04em;
		padding: 0.05em 0.14em 0.01em;
		border-radius: 0.16em;
		background: var(--color-brand);
		color: #fff;
		transform: rotate(-1.6deg);
	}
	/* Kata rasa berwarna pekat dari rasa kartunya; kata depan tetap ink. */
	.flavour {
		color: var(--tone);
	}
	.best-aside p {
		max-width: 20rem;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--color-ink);
	}
	.best-all {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--color-brand-dark);
		transition: color 180ms ease;
	}
	.best-all svg {
		width: 1.125rem;
		height: 1.125rem;
		transition: translate 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.best-all:hover {
		color: var(--color-brand);
	}
	.best-all:hover svg {
		translate: 4px 0;
	}
	.best-all:focus-visible {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 4px;
		border-radius: 4px;
	}

	/* Bento: kartu terlaris besar, dua lainnya bertumpuk di sisi kanan. */
	.best-grid {
		display: grid;
		gap: 20px;
		margin: var(--home-section-gap) 0 0;
		padding: 0;
		list-style: none;
	}
	.cup-card {
		--pad: clamp(1.25rem, 3dvh, 1.75rem);
		--enter-x: 28px;

		position: relative;
		isolation: isolate;
		container-type: inline-size;
		min-height: 15rem;
		overflow: hidden;
		border-radius: 2rem;
		background: var(--field);
	}
	.cup-card.lead {
		--enter-x: -28px;

		min-height: 27rem;
	}
	/* Kartu ketiga dibalik (cup kiri, teks kanan) supaya irama bento tidak monoton. */
	.cup-card.mirror .cup-photo {
		right: auto;
		left: 3%;
		object-position: bottom left;
	}
	.cup-card.mirror .cup-copy {
		margin-left: auto;
	}
	/* Lapis nada pekat yang muncul saat hover: umpan balik halus tanpa mengubah layout. */
	.cup-card::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: var(--tone);
		opacity: 0;
		transition: opacity 300ms ease;
		pointer-events: none;
	}

	/* Kata besar tone-on-tone di belakang cup: memberi kedalaman tanpa mengganggu teks. */
	.cup-word {
		position: absolute;
		z-index: -1;
		right: 0;
		left: 0;
		top: 34%;
		text-align: center;
		font-size: 17cqi;
		font-weight: 800;
		line-height: 0.8;
		letter-spacing: -0.01em;
		white-space: nowrap;
		color: color-mix(in srgb, var(--field) 84%, var(--tone));
		pointer-events: none;
		transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.cup-photo {
		position: absolute;
		right: 3%;
		bottom: 0;
		width: auto;
		height: 92%;
		max-width: 52%;
		object-fit: contain;
		object-position: bottom right;
		pointer-events: none;
		filter: drop-shadow(0 14px 14px rgb(36 26 32 / 0.2));
		transition: transform 500ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Cup terlaris selebar kartu, tapi tidak pernah menimpa judul dan kalimat di atasnya. */
	.lead .cup-photo {
		right: 0;
		left: 0;
		height: auto;
		width: 100%;
		max-width: none;
		max-height: calc(100% - 10rem);
		margin-inline: auto;
		object-position: bottom center;
	}

	.cup-copy {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		max-width: 50%;
		min-height: inherit;
		padding: var(--pad);
	}
	.cup-copy h3 {
		font-size: clamp(1.25rem, 6vw, 1.625rem);
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.005em;
		color: var(--color-ink);
	}
	.cup-copy p {
		margin-top: 0.625rem;
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--color-ink);
	}
	.lead .cup-copy {
		max-width: none;
	}
	.lead .cup-copy h3 {
		max-width: calc(100% - 5.5rem);
		font-size: clamp(1.75rem, 9vw, 2.25rem);
	}
	.lead .cup-copy p {
		max-width: min(19rem, calc(100% - 5.5rem));
		font-size: 1rem;
	}

	/* Stempel peringkat; cincinnya berputar pelan, angka 1 diam. */
	.stamp {
		position: absolute;
		z-index: 3;
		top: var(--pad);
		right: var(--pad);
		width: clamp(4.25rem, min(12dvh, 20vw), 6.5rem);
		height: auto;
		pointer-events: none;
	}
	.stamp circle {
		fill: var(--color-brand);
	}
	.stamp text {
		fill: #fff;
		font-family: 'Plus Jakarta Sans', sans-serif;
		font-size: 10.5px;
		font-weight: 800;
	}
	.stamp .stamp-num {
		font-family: var(--font-display);
		font-size: 44px;
	}
	.stamp-spin {
		transform-origin: 60px 60px;
		animation: stamp-turn 26s linear infinite;
	}
	@keyframes stamp-turn {
		to {
			transform: rotate(360deg);
		}
	}

	.cup-order {
		display: inline-flex;
		min-height: 3rem;
		align-items: center;
		gap: 0.5rem;
		margin-top: auto;
		padding: 0.75rem 1.25rem;
		border-radius: 999px;
		background: var(--color-ink);
		color: #fff;
		font-size: 0.875rem;
		font-weight: 700;
		transition:
			background-color 220ms ease-out,
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.cup-order svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		transition: translate 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Seluruh kartu jadi target klik; fokus tampil di kartu, bukan di tombol kecil. */
	.cup-order::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 2rem;
	}
	.cup-card:has(.cup-order:focus-visible) {
		outline: 3px solid var(--color-brand-dark);
		outline-offset: 4px;
	}
	.cup-order:focus-visible {
		outline: none;
	}
	.cup-order:active {
		transform: scale(0.98);
	}
	.best-empty {
		font-size: 0.875rem;
		color: var(--color-copy-muted);
	}
	.best-empty a {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		text-decoration: underline;
	}

	@media (min-width: 768px) {
		/* Kalimat pengantar sejajar dengan kolom kanan kartu di bawahnya. */
		.best-head,
		.best-grid {
			grid-template-columns: 1.3fr 1fr;
			column-gap: 24px;
		}
		.best-head h2 {
			font-size: clamp(2.25rem, 5.4vw, 4rem);
		}
		.best-grid {
			grid-template-rows: repeat(2, 1fr);
			row-gap: 24px;
		}
		.cup-card.lead {
			grid-row: 1 / span 2;
			min-height: 36rem;
		}
		.lead .cup-photo {
			max-height: calc(100% - 10.75rem);
		}
		.lead .cup-copy h3 {
			font-size: clamp(2rem, 3.4vw, 2.5rem);
		}
		.lead .cup-copy p {
			max-width: 19rem;
		}
	}

	/* Laptop: seluruh section muat satu tinggi viewport (lihat --home-stage-height di +page.svelte). Ukuran
	   huruf dan celah mengikuti tinggi layar; layar sangat pendek boleh lebih tinggi dari
	   viewport (minimum 560px) daripada memotong isi. */
	@media (min-width: 1024px) {
		.best {
			display: flex;
			flex-direction: column;
			height: var(--home-stage-height);
			padding-block: var(--home-stage-pad);
		}
		.best-head {
			flex-shrink: 0;
		}
		.best-head h2 {
			font-size: clamp(2.25rem, min(8.4dvh, 5.4vw), 4rem);
		}
		.best-aside p {
			font-size: clamp(0.9375rem, 2dvh, 1.0625rem);
		}
		.best-grid {
			flex: 1;
			min-height: 0;
			margin-top: clamp(20px, 3dvh, 32px);
			grid-template-rows: repeat(2, minmax(0, 1fr));
		}
		.cup-card,
		.cup-card.lead {
			min-height: 0;
		}
		.cup-copy {
			height: 100%;
		}
		.cup-copy h3 {
			font-size: clamp(1.125rem, 3.4dvh, 1.625rem);
		}
		.cup-copy p {
			font-size: clamp(0.8125rem, 1.9dvh, 0.9375rem);
		}
		.lead .cup-copy h3 {
			font-size: clamp(1.875rem, 5.4dvh, 2.5rem);
		}
		.lead .cup-copy p {
			font-size: clamp(0.9375rem, 2.1dvh, 1.0625rem);
		}
		.lead .cup-photo {
			max-height: calc(100% - clamp(7.5rem, 19dvh, 10rem));
		}
		.cup-order {
			min-height: 2.75rem;
			padding-block: 0.5rem;
		}
	}

	/* Entrance: judul lalu kartu (selang 90ms); cup naik dengan pegas, kata besar menyusul. */
	.reveal-ready .reveal {
		opacity: 0;
		transform: translateY(24px);
	}
	/* Kartu masuk dari samping: terlaris dari kiri, dua lainnya dari kanan. */
	.reveal-ready .cup-card.reveal {
		transform: translate(var(--enter-x), 24px);
	}
	.reveal-ready.reveal-in .reveal {
		opacity: 1;
		transform: none;
		transition:
			opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 90ms),
			transform 600ms cubic-bezier(0.22, 1, 0.36, 1) calc(var(--i) * 90ms);
	}
	.reveal-ready:not(.reveal-in) :is(.cup-photo, .cup-word) {
		opacity: 0;
	}
	.reveal-ready.reveal-in .cup-photo {
		animation:
			cup-rise 900ms cubic-bezier(0.34, 1.35, 0.64, 1) both,
			cup-float 7s ease-in-out infinite;
		animation-delay: calc(var(--i) * 90ms + 220ms), calc(var(--i) * 90ms + 1300ms);
	}
	.reveal-ready.reveal-in .cup-word {
		animation: word-slide 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
		animation-delay: calc(var(--i) * 90ms + 120ms);
	}
	/* Melayang pelan saat diam; fase tiap cup berbeda lewat delay. */
	@keyframes cup-float {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -7px;
		}
	}
	@keyframes cup-rise {
		from {
			opacity: 0;
			translate: 0 56px;
			scale: 0.9;
		}
		to {
			opacity: 1;
			translate: 0 0;
			scale: 1;
		}
	}
	@keyframes word-slide {
		from {
			opacity: 0;
			translate: -32px 0;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}

	/* Cup mengikuti kursor dan kata besar bergeser berlawanan: kedalaman ala parallax. */
	.cup-card.tilt .cup-photo {
		transition: transform 120ms linear;
		transform: translate3d(calc(var(--tx) * 12px), calc(var(--ty) * 8px - 6px), 0)
			rotate(calc(var(--tx) * 3deg)) scale(1.03);
	}
	.cup-card.tilt .cup-word {
		transition: transform 120ms linear;
		transform: translate3d(calc(var(--tx) * -16px), calc(var(--ty) * -8px), 0);
	}
	@media (hover: hover) {
		.cup-card:hover::before {
			opacity: 0.1;
		}
		.cup-card:hover .cup-order {
			background: var(--color-brand);
		}
		.cup-card:hover .cup-order svg {
			translate: 3px 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.stamp-spin {
			animation: none;
		}
		.cup-photo,
		.cup-word,
		.cup-order,
		.cup-order svg,
		.best-all svg {
			transition: none;
		}
	}
</style>
