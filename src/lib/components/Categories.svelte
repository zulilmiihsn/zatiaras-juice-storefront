<script lang="ts">
	import { onMount } from 'svelte';
	import { CATEGORIES, MENU, type CategorySlug } from '$lib/data/menu';
	import { track } from '$lib/analytics/events';
	import KernedText from '$lib/components/KernedText.svelte';
	import { CUP_D, CUP_TRANSFORM, CUP_VIEWBOX } from '$lib/assets/brand/cupPath';

	// Warna rasa per kategori: bidang datar + nada pekat untuk teks. Aksen produk saja.
	const look: Record<CategorySlug, { field: string; tone: string }> = {
		'buah-sayur': { field: '#cde48d', tone: '#33570c' },
		'mix-jus': { field: '#f7bcd2', tone: '#9a0b52' },
		kocok: { field: '#efcbb0', tone: '#6b3a1f' },
		baby: { field: '#bfe0f2', tone: '#1c5776' },
		'non-jus': { field: '#ffd56b', tone: '#8a4a05' }
	};

	// Contoh menu hanya dari data yang ada; kategori tanpa menu terdata tidak menampilkan contoh.
	// Foto cup per kategori menyusul: sementara siluet cup resmi (`.cat-cup`) jadi penanda.
	// Maksimal 5 contoh (urutan MENU = yang paling esensial); sisanya "dan lainnya".
	const SAMPLE_LIMIT = 5;
	const panels = CATEGORIES.map((category) => {
		const items = MENU.filter((item) => item.category === category.slug);
		return {
			...category,
			...look[category.slug],
			samples: items.slice(0, SAMPLE_LIMIT).map((item) => item.name),
			more: items.length > SAMPLE_LIMIT
		};
	});

	let active = $state(0);
	let ready = $state(false);
	let seen = $state(false);
	let section: HTMLElement | undefined = $state();
	let intent: ReturnType<typeof setTimeout> | undefined;
	const reveal = $derived(ready ? (seen ? 'in' : 'hidden') : 'off');

	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches || !section) return;
		// Entrance hanya aktif setelah JS jalan; tanpa JS semua langsung terlihat.
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
		return () => {
			observer.disconnect();
			clearTimeout(intent);
		};
	});

	// Hover mouse membuka panel setelah jeda singkat (tidak terpicu saat kursor sekadar lewat).
	function hover(event: PointerEvent, index: number) {
		// Hanya layout panel berdampingan (>=1024px); akordeon mobile hanya buka lewat klik.
		if (event.pointerType !== 'mouse' || !matchMedia('(min-width: 1024px)').matches) return;
		clearTimeout(intent);
		intent = setTimeout(() => (active = index), 90);
	}

	// Parallax cup: kursor menggeser cup dan lingkaran latar sedikit (mouse, laptop, tanpa reduced motion).
	let canMove = false;
	onMount(() => {
		canMove =
			matchMedia('(min-width: 1024px)').matches &&
			!matchMedia('(prefers-reduced-motion: reduce)').matches;
	});
	function move(event: PointerEvent) {
		if (!canMove || event.pointerType !== 'mouse') return;
		const el = event.currentTarget as HTMLElement;
		if (!el.classList.contains('open')) return;
		const box = el.getBoundingClientRect();
		el.style.setProperty('--px', String(((event.clientX - box.left) / box.width) * 2 - 1));
		el.style.setProperty('--py', String(((event.clientY - box.top) / box.height) * 2 - 1));
	}
	function rest(event: PointerEvent) {
		const el = event.currentTarget as HTMLElement;
		el.style.removeProperty('--px');
		el.style.removeProperty('--py');
	}
</script>

<section
	id="jus-apa-aja"
	bind:this={section}
	class="cats-section mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
	class:reveal-ready={ready}
	class:reveal-in={seen}
	aria-labelledby="cats-title"
>
	<div class="cats-head reveal" style="--i: 0">
		<h2 id="cats-title" class="font-display" aria-label="Jus Apa Aja Ada">
			<KernedText text="Jus Apa Aja" {reveal} />
			<span class="cats-hot"><KernedText text="Ada" {reveal} base={330} /></span>
		</h2>
		<div class="cats-aside">
			<p>Dari jus buah dan sayur sampai kocok dan baby. Pilih kategori, lihat isinya.</p>
			<a
				class="cats-all"
				href="/menu"
				onclick={() => track('menu_preview_clicked', { source: 'kategori' })}
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

	<ul class="cats" role="list">
		{#each panels as panel, index (panel.slug)}
			{@const open = active === index}
			<li
				class="cat"
				class:open
				style="--field: {panel.field}; --tone: {panel.tone}; --i: {index}"
				onpointerenter={(event) => hover(event, index)}
				onpointermove={move}
				onpointerleave={rest}
			>
				<h3 class="cat-h">
					<button
						type="button"
						class="cat-head"
						aria-expanded={open}
						aria-controls={`cat-body-${panel.slug}`}
						onclick={() => (active = index)}
						onfocus={() => (active = index)}
					>
						<span class="cat-name font-display">{panel.name}</span>
						<span class="cat-plus" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
								<path d="M12 5v14M5 12h14" />
							</svg>
						</span>
					</button>
				</h3>
				<div class="cat-body" id={`cat-body-${panel.slug}`} inert={!open}>
					<div class="cat-inner">
						<div class="cat-text">
							<p class="cat-big font-display" aria-hidden="true">
								<KernedText text={panel.name} />
							</p>
							<p class="cat-blurb">{panel.blurb}</p>
							{#if panel.samples.length}
								<ul class="cat-samples" role="list">
									{#each panel.samples as sample, n (sample)}
										<li style="--n: {n}">{sample}</li>
									{/each}
									{#if panel.more}
										<li class="more" style="--n: {panel.samples.length}">dan lainnya</li>
									{/if}
								</ul>
							{/if}
							<div class="cat-foot">
								<a
									class="cat-cta"
									href={`/menu?kategori=${panel.slug}`}
									onclick={() =>
										track('menu_preview_clicked', { source: 'kategori', category: panel.slug })}
								>
									<span>Lihat {panel.name}</span><svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg
									>
								</a>
							</div>
						</div>
						<div class="cat-visual" aria-hidden="true">
							<div class="cat-float">
								<svg class="cat-cup" viewBox={CUP_VIEWBOX}>
									<path d={CUP_D} transform={CUP_TRANSFORM} fill="currentColor" />
								</svg>
							</div>
						</div>
					</div>
				</div>
			</li>
		{/each}
	</ul>

	<noscript>
		<ul class="cats-nojs" role="list">
			{#each panels as panel (panel.slug)}
				<li><a href={`/menu?kategori=${panel.slug}`}>{panel.name}</a></li>
			{/each}
		</ul>
	</noscript>
</section>

<style>
	.cats-section {
		padding-block: var(--home-section-space);
		scroll-margin-top: var(--home-header);
	}

	/* Kepala: judul merek satu baris di kiri, kalimat + tautan menu di kanan. */
	.cats-head {
		display: grid;
		gap: 16px;
		align-items: end;
	}
	.cats-head h2 {
		font-size: clamp(2rem, 9.5vw, 3.25rem);
		font-weight: 800;
		line-height: 0.92;
		letter-spacing: -0.005em;
		color: var(--color-ink);
	}
	.cats-hot {
		color: var(--color-brand);
	}
	.cats-aside p {
		max-width: 20rem;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--color-ink);
	}
	.cats-all {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--color-brand-dark);
		transition: color 180ms ease;
	}
	.cats-all svg {
		width: 1.125rem;
		height: 1.125rem;
		transition: translate 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.cats-all:hover {
		color: var(--color-brand);
	}
	.cats-all:hover svg {
		translate: 4px 0;
	}
	.cats-all:focus-visible,
	.cat-cta:focus-visible,
	.cat-head:focus-visible {
		outline: 3px solid var(--color-brand-dark);
		outline-offset: 3px;
	}

	/* Mobile: akordeon vertikal; baris judul selalu terlihat, isi membuka ke bawah. */
	.cats {
		display: grid;
		gap: 10px;
		margin: var(--home-section-gap) 0 0;
		padding: 0;
		list-style: none;
	}
	.cat {
		--pad: clamp(1.25rem, 3dvh, 1.75rem);

		position: relative;
		overflow: hidden;
		border-radius: 1.75rem;
		background: var(--field);
	}
	.cat-h {
		margin: 0;
	}
	.cat-head {
		display: flex;
		width: 100%;
		min-height: 4.5rem;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0 1.25rem;
		text-align: left;
		cursor: pointer;
		border-radius: inherit;
	}
	.cat-name {
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.005em;
		color: var(--tone);
	}
	.cat-plus {
		display: grid;
		flex-shrink: 0;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		background: var(--tone);
		color: var(--field);
		transition:
			transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 200ms ease;
	}
	.cat-plus svg {
		width: 1.125rem;
		height: 1.125rem;
	}
	.open .cat-plus {
		transform: rotate(45deg);
	}

	.cat-body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 450ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.open .cat-body {
		grid-template-rows: 1fr;
	}
	.cat-inner {
		display: grid;
		grid-template-columns: 1fr 6rem;
		align-items: end;
		gap: 0.5rem;
		min-height: 0;
		overflow: hidden;
	}
	.cat-text {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0 0 1.25rem 1.25rem;
	}
	.cat-big {
		display: none;
	}
	.cat-blurb {
		font-size: 0.9375rem;
		line-height: 1.5;
		color: var(--color-ink);
	}
	.cat-samples {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.75rem 0 0;
		padding: 0;
		list-style: none;
	}
	.cat-samples li {
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		background: color-mix(in srgb, #fff 55%, var(--field));
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-ink);
	}
	.cat-samples .more {
		background: transparent;
		padding-inline: 0.25rem;
		font-weight: 600;
		color: var(--tone);
	}
	.cat-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		margin-top: 1rem;
	}
	.cat-cta {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1.25rem;
		border-radius: 999px;
		background: var(--color-ink);
		color: #fff;
		font-size: 0.875rem;
		font-weight: 700;
		transition: background-color 220ms ease-out;
	}
	.cat-cta svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		transition: translate 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.cat-cta:hover {
		background: var(--color-brand);
	}
	.cat-cta:hover svg {
		translate: 3px 0;
	}
	.cat-visual {
		position: relative;
		align-self: stretch;
		z-index: 0;
		translate: calc(var(--px, 0) * -14px) calc(var(--py, 0) * -10px);
		transition: translate 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* Lingkaran latar nada-di-nada + cincin tipis: memberi panggung pada cup. */
	.cat-visual::before,
	.cat-visual::after {
		content: '';
		position: absolute;
		right: -3rem;
		bottom: -3rem;
		width: 11rem;
		aspect-ratio: 1;
		border-radius: 50%;
	}
	.cat-visual::before {
		background: color-mix(in srgb, var(--tone) 9%, var(--field));
	}
	.cat-visual::after {
		scale: 1.18;
		border: 1.5px solid color-mix(in srgb, var(--tone) 18%, transparent);
	}
	.cat-float {
		position: absolute;
		inset: 0;
	}
	/* Siluet cup resmi nada-di-nada; diganti foto cup begitu tersedia. */
	.cat-cup {
		position: absolute;
		right: -0.5rem;
		bottom: -0.25rem;
		width: 6.5rem;
		height: auto;
		color: color-mix(in srgb, var(--tone) 22%, var(--field));
		transform: rotate(-6deg);
	}

	/* Saat panel terbuka: lingkaran mekar, cup memantul masuk lalu melayang, isi muncul berurutan. */
	.open .cat-visual::before,
	.open .cat-visual::after {
		animation: stage-in 700ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
	}
	.open .cat-cup {
		animation: cat-cup-in 850ms cubic-bezier(0.34, 1.35, 0.64, 1) 220ms both;
	}
	.open .cat-float {
		animation: cat-float 7s ease-in-out 1.2s infinite;
	}
	.open .cat-blurb,
	.open .cat-samples li,
	.open .cat-foot {
		animation: item-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.open .cat-blurb {
		animation-delay: 160ms;
	}
	.open .cat-samples li {
		animation-delay: calc(240ms + var(--n) * 55ms);
	}
	.open .cat-foot {
		animation-delay: 560ms;
	}
	@keyframes stage-in {
		from {
			opacity: 0;
			scale: 0.55;
		}
	}
	@keyframes cat-cup-in {
		from {
			opacity: 0;
			translate: 0 48px;
			scale: 0.82;
		}
	}
	@keyframes cat-float {
		50% {
			translate: 0 -8px;
		}
	}
	@keyframes item-in {
		from {
			opacity: 0;
			translate: 0 12px;
		}
	}

	.cats-nojs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1rem 0 0;
		padding: 0;
		list-style: none;
	}
	.cats-nojs a {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		padding: 0 1rem;
		border-radius: 999px;
		background: var(--color-brand-soft);
		font-weight: 700;
		color: var(--color-brand-dark);
	}

	@media (min-width: 768px) {
		.cats-head {
			grid-template-columns: 1fr auto;
			column-gap: 32px;
		}
		.cats-head h2 {
			font-size: clamp(2rem, 4.6vw, 4rem);
		}
	}

	/* Laptop: panel berdampingan, satu terbuka (flex-grow); seluruh section muat satu viewport
	   (--home-stage-height di +page.svelte). Isi panel punya lebar tetap supaya tidak
	   bergeser selagi panel melebar. */
	@media (min-width: 1024px) {
		.cats-section {
			display: flex;
			flex-direction: column;
			height: var(--home-stage-height);
			padding-block: var(--home-stage-pad);
			/* Ruang napas dari section Paling Laris; tidak mengurangi tinggi section. */
			margin-top: var(--home-stage-gap);
		}
		.cats-head {
			flex-shrink: 0;
		}
		.cats-head h2 {
			font-size: clamp(2rem, min(8dvh, 4.6vw), 4rem);
		}
		.cats-aside p {
			font-size: clamp(0.9375rem, 2dvh, 1.0625rem);
		}
		.cats {
			display: flex;
			flex: 1;
			gap: 12px;
			min-height: 0;
			margin-top: clamp(20px, 3dvh, 32px);
			container-type: inline-size;
		}
		.cat {
			flex: 1 1 0;
			min-width: 0;
			border-radius: 2rem;
			transition: flex-grow 650ms cubic-bezier(0.22, 1, 0.36, 1);
		}
		.cat.open {
			flex-grow: 5.2;
		}
		.cat-h {
			position: absolute;
			inset: 0;
			z-index: 2;
		}
		.cat-head {
			height: 100%;
			min-height: 0;
			flex-direction: column-reverse;
			align-items: center;
			padding: 1.25rem 0 1.5rem;
		}
		.open .cat-head {
			pointer-events: none;
		}
		.cat-name {
			writing-mode: vertical-rl;
			transform: rotate(180deg);
			font-size: clamp(1.25rem, 3.6dvh, 1.875rem);
			transition: opacity 200ms ease;
		}
		.open .cat-name,
		.open .cat-plus {
			opacity: 0;
		}
		.open .cat-plus {
			transform: none;
		}
		.cat:not(.open) .cat-head:hover .cat-plus {
			transform: scale(1.12);
		}
		.cat-body {
			position: absolute;
			inset: 0 auto 0 0;
			display: block;
			width: calc((100cqw - 48px) * 0.565);
			opacity: 0;
			pointer-events: none;
			transition: opacity 200ms ease;
		}
		.open .cat-body {
			opacity: 1;
			pointer-events: auto;
			transition: opacity 300ms ease 280ms;
		}
		.cat-inner {
			height: 100%;
			grid-template-columns: 1.1fr 1fr;
			align-items: stretch;
			gap: 0;
			overflow: visible;
		}
		.cat-text {
			padding: var(--pad);
		}
		.cat-big {
			display: block;
			font-size: clamp(1.75rem, 5.4dvh, 3rem);
			font-weight: 800;
			line-height: 0.95;
			letter-spacing: -0.005em;
			color: var(--tone);
		}
		.cat-blurb {
			margin-top: 0.75rem;
			font-size: clamp(0.875rem, 2dvh, 1rem);
		}
		.cat-foot {
			margin-top: auto;
		}
		.cat-cup {
			right: -6%;
			bottom: -4%;
			width: 100%;
			max-height: 92%;
		}
		.cat-visual::before,
		.cat-visual::after {
			right: -22%;
			bottom: -18%;
			width: 118%;
		}
		/* Panel tertutup: wash cerah saat dihover; panel terbuka: bayangan lembut seirama nadanya. */
		.cat:not(.open):hover {
			background: color-mix(in srgb, #fff 18%, var(--field));
		}
		.cat {
			transition:
				flex-grow 650ms cubic-bezier(0.22, 1, 0.36, 1),
				background-color 240ms ease,
				box-shadow 500ms ease;
		}
		.cat.open {
			box-shadow: none;
		}
	}

	/* Entrance: panel naik berjenjang setelah JS siap; judul dan huruf menyusul. */
	.reveal-ready .reveal {
		opacity: 0;
		transform: translateY(24px);
	}
	.reveal-ready.reveal-in .reveal {
		opacity: 1;
		transform: none;
		transition:
			opacity 600ms cubic-bezier(0.22, 1, 0.36, 1),
			transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.reveal-ready:not(.reveal-in) .cat {
		opacity: 0;
	}
	.reveal-ready.reveal-in .cat {
		animation: cat-in 800ms cubic-bezier(0.22, 1, 0.36, 1) both;
		animation-delay: calc(var(--i) * 80ms + 150ms);
	}
	@keyframes cat-in {
		from {
			opacity: 0;
			translate: 0 36px;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cat-visual,
		.cat-visual::before,
		.cat-visual::after,
		.open .cat-visual::before,
		.open .cat-visual::after,
		.open .cat-cup,
		.open .cat-float,
		.open .cat-blurb,
		.open .cat-samples li,
		.open .cat-foot {
			animation: none;
			transition: none;
		}
		.cat,
		.cat-body,
		.cat-plus,
		.cat-cta svg,
		.cats-all svg {
			transition: none;
		}
	}
</style>
