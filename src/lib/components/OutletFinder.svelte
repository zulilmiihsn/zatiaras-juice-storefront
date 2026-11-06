<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		CITIES,
		OUTLETS,
		canAcceptWebOrders,
		formatOutletHours,
		outletPath,
		suggestCityFromLabel
	} from '$lib/core/outlets';
	import { readRememberedOutlet } from '$lib/location/suggest';
	import { outletMapPoint } from '$lib/location/map';
	import { track } from '$lib/analytics/events';
	import OutletMap from './OutletMap.svelte';
	import SelectMenu from './SelectMenu.svelte';
	import KernedText from './KernedText.svelte';

	let section: HTMLElement;
	let header: HTMLDivElement;
	let dock: HTMLDivElement;
	let frame: HTMLDivElement;
	let cityId = $state(CITIES[0]?.id ?? '');
	let outletId = $state<string>('');
	let frameBox = $state({ width: 0, height: 0, clip: '', outer: '', middle: '', band: 14 });
	let overlayPadding = $state({ top: 64, bottom: 230, left: 340, right: 64 });
	const city = $derived(CITIES.find((item) => item.id === cityId));
	const outlets = $derived(OUTLETS.filter((item) => item.cityId === cityId));
	const selected = $derived(outlets.find((item) => item.id === outletId) ?? outlets[0]);
	const point = $derived(selected ? outletMapPoint(selected) : null);
	// An overview has no selected pin to protect behind the city panel: keep it balanced.
	const cameraPadding = $derived({ ...overlayPadding, left: point ? overlayPadding.left : 64 });
	const directions = $derived(
		point ? `https://www.google.com/maps/dir/?api=1&destination=${point[1]},${point[0]}` : undefined
	);

	// Crest line of the card's wavy top edge, traced from the design reference (frame 1171px wide,
	// y measured from its highest point): [x, y] knots between the two corner arcs.
	const WAVE: [number, number][] = [
		[76, 2],
		[120, 0],
		[210, 5],
		[300, 15],
		[390, 23],
		[465, 25],
		[540, 22],
		[630, 13],
		[720, 8],
		[795, 6],
		[870, 9],
		[930, 12],
		[975, 14],
		[1020, 13],
		[1065, 9],
		[1119, 5]
	];
	const WAVE_X0 = WAVE[0][0];
	const WAVE_SPAN = WAVE[WAVE.length - 1][0] - WAVE_X0;
	const FRAME_W = 1171;
	const CORNER = 64;
	const BAND = 12;

	// The map sits in a rounded card with that wavy top edge. Two pink bands wrap the card (pale
	// outside, lighter inside); every outline is the same wave nudged inward by `inset`, so the
	// bands keep an even width and the map is clipped by the innermost one without a seam.
	function frameShapes(w: number, h: number) {
		const n = (value: number) => +value.toFixed(1);
		const k = Math.min(1.25, Math.max(0.5, w / FRAME_W));
		const band = Math.round(BAND * k);
		const radius = CORNER * k;
		const outline = (inset: number) => {
			const r = radius - inset;
			const x0 = inset;
			const x1 = w - inset;
			const span = x1 - r - (x0 + r);
			const knots = WAVE.map(([x, y]): [number, number] => [
				x0 + r + ((x - WAVE_X0) / WAVE_SPAN) * span,
				y * k + inset
			]);
			const first = knots[0];
			const last = knots[knots.length - 1];
			const at = (i: number) => knots[Math.min(knots.length - 1, Math.max(0, i))];
			const flat = (p: [number, number], side: number): [number, number] => [
				p[0] + side * span * 0.05,
				p[1]
			];
			const curve = knots
				.slice(0, -1)
				.map((p, i) => {
					const before = i === 0 ? flat(first, -1) : at(i - 1);
					const after = i + 2 > knots.length - 1 ? flat(last, 1) : at(i + 2);
					const q = knots[i + 1];
					const c1 = [p[0] + (q[0] - before[0]) / 6, p[1] + (q[1] - before[1]) / 6];
					const c2 = [q[0] - (after[0] - p[0]) / 6, q[1] - (after[1] - p[1]) / 6];
					return `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(q[0])} ${n(q[1])}`;
				})
				.join(' ');
			return [
				`M${n(x0)} ${n(h - r)} L${n(x0)} ${n(first[1] + r)}`,
				`A${n(r)} ${n(r)} 0 0 1 ${n(first[0])} ${n(first[1])}`,
				curve,
				`A${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(last[1] + r)} L${n(x1)} ${n(h - r)}`,
				`A${n(r)} ${n(r)} 0 0 1 ${n(x1 - r)} ${n(h)} L${n(x0 + r)} ${n(h)}`,
				`A${n(r)} ${n(r)} 0 0 1 ${n(x0)} ${n(h - r)} Z`
			].join(' ');
		};
		const [outer, middle, inner] = [0, band * 0.45, band].map(outline);
		return { outer: `${outer} ${middle}`, middle: `${middle} ${inner}`, clip: inner, band };
	}
	const hasAddress = (address: string) => !address.startsWith('VERIFY');

	function chooseCity(id: string) {
		if (!CITIES.some((item) => item.id === id)) return;
		cityId = id;
		outletId = '';
	}
	function chooseOutlet(id: string) {
		if (outlets.some((item) => item.id === id)) outletId = id;
	}
	onMount(() => {
		const remembered = readRememberedOutlet().outlet;
		if (remembered) {
			cityId = remembered.cityId;
			outletId = remembered.id;
		} else {
			const suggested = suggestCityFromLabel(page.data.cfCity);
			if (suggested) {
				cityId = suggested.id;
			}
		}
		const resize = new ResizeObserver(() => {
			const stage = frame.getBoundingClientRect();
			if (!stage.width || !stage.height) return;
			const heading = header.getBoundingClientRect();
			const shelf = dock.getBoundingClientRect();
			const phone = section.clientWidth < 768;
			const w = Math.round(stage.width);
			const h = Math.round(stage.height);
			if (w !== frameBox.width || h !== frameBox.height)
				frameBox = { width: w, height: h, ...frameShapes(w, h) };
			overlayPadding = {
				top: phone ? heading.bottom - stage.top + 40 : 96,
				bottom: Math.max(72, stage.bottom - shelf.top + 24),
				left: phone ? 64 : Math.min(heading.right - stage.left + 36, stage.width * 0.4),
				right: 64
			};
		});
		for (const element of [section, header, dock, frame]) resize.observe(element);
		return () => resize.disconnect();
	});
</script>

{#snippet arrow()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"
		><path d="M5 12h14m-6-6 6 6-6 6" /></svg
	>
{/snippet}
{#snippet clock()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"
		><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
	>
{/snippet}
{#snippet store()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"
		><path
			d="m3 9 1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12.5V20h14v-7.5M10 20v-4h4v4"
		/></svg
	>
{/snippet}
{#snippet pin()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"
		><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle
			cx="12"
			cy="10"
			r="2.5"
		/></svg
	>
{/snippet}

<section
	bind:this={section}
	id="temukan-zatiaras"
	class="finder"
	aria-labelledby="finder-title"
	data-city={cityId}
	data-selected-outlet={selected?.id ?? ''}
	data-outlet-count={outlets.length}
>
	<div class="finder-header" bind:this={header}>
		<span class="title-pin" aria-hidden="true">{@render pin()}</span>
		<h2 id="finder-title" class="font-display" aria-label="Temukan Zatiaras Dekat Kamu">
			<span class="title-head"
				><KernedText text="Temukan" />
				<span class="title-hot"><KernedText text="Zatiaras" /></span>
			</span>
			<span class="title-tail"><KernedText text="Dekat Kamu" /></span>
		</h2>
		<SelectMenu
			id="finder-city"
			label="Pilih kota"
			options={CITIES.map((item) => ({ value: item.id, label: item.name }))}
			value={cityId}
			onchange={chooseCity}
		/>
	</div>

	<div class="finder-dock" bind:this={dock}>
		<div class="results-header">
			<div class="results-heading">
				{@render pin()}
				<p class="results-copy">
					<strong>{outlets.length} outlet</strong> ditemukan <span>di {city?.name}</span>
				</p>
				<div class="mobile-outlet-picker">
					<SelectMenu
						id="finder-outlet"
						label="Pilih outlet di {city?.name}"
						options={outlets.map((item) => ({ value: item.id, label: item.name }))}
						value={selected?.id ?? ''}
						onchange={chooseOutlet}
						placement="top"
					/>
				</div>
			</div>
		</div>
		<fieldset class="outlet-choices">
			<legend class="sr-only">Pilih outlet di {city?.name}</legend>
			<div class="outlet-cards">
				{#each outlets as item (item.id)}
					<article
						class="outlet-card"
						class:active={selected?.id === item.id}
						data-outlet={item.id}
					>
						<label class="outlet-choice">
							<input
								class="choice-input"
								type="radio"
								name="finder-outlet-card"
								value={item.id}
								aria-label={`Pilih outlet ${item.name}`}
								checked={selected?.id === item.id}
								onchange={() => chooseOutlet(item.id)}
							/>
							<span class="card-photo" aria-hidden="true">{@render store()}</span>
							<span class="card-body">
								<span class="card-name"
									><span class="choice-dot" aria-hidden="true"></span>{item.name}</span
								>
								<span class="selected-address" class:detail-address={selected?.id === item.id}
									>{@render pin()}{hasAddress(item.address) ? item.address : item.city}</span
								>
								<span class="selected-hours" class:detail-hours={selected?.id === item.id}
									>{@render clock()}<span
										>{formatOutletHours(item.hours).replace(/\s*WITA$/, '')}
										<small>WITA</small></span
									></span
								>
							</span>
						</label>
						{#if selected?.id === item.id}
							<div class="outlet-actions">
								<a
									class="outlet-cta"
									href={canAcceptWebOrders(item) ? `/menu?outlet=${item.id}` : outletPath(item)}
									onclick={() =>
										track('outlet_select_clicked', {
											outlet: item.id,
											city: item.cityId,
											source: 'home'
										})}
								>
									{canAcceptWebOrders(item) ? 'Pesan Sekarang' : 'Lihat outlet'}
									{@render arrow()}
								</a>
								{#if directions}<a
										class="quick-directions"
										href={directions}
										target="_blank"
										rel="noopener noreferrer"
										aria-label={`Petunjuk arah ke ${item.name}`}>Petunjuk arah</a
									>{/if}
							</div>
						{:else}<button
								class="preview-outlet"
								type="button"
								onclick={() => chooseOutlet(item.id)}
								aria-label={`Pilih outlet ${item.name}`}>Pilih outlet {@render arrow()}</button
							>{/if}
					</article>
				{:else}<p class="empty-outlets">
						Outlet belum tersedia di kota ini. Pilih kota lain.
					</p>{/each}
			</div>
		</fieldset>
		<span class="sr-only" aria-live="polite"
			>Outlet pilihan: Zatiaras {selected?.name ?? ''}, {selected?.city ?? ''}.</span
		>
	</div>

	<div
		class="map-backdrop"
		bind:this={frame}
		style:clip-path={frameBox.clip ? `path('${frameBox.clip}')` : undefined}
		style:--map-edge="{frameBox.band}px"
	>
		<OutletMap
			{cityId}
			cityName={city?.name ?? ''}
			{outlets}
			selectedOutletId={selected?.id ?? ''}
			onselect={chooseOutlet}
			{cameraPadding}
		/>
	</div>
	{#if frameBox.clip}
		<svg
			class="frame-layers"
			viewBox="0 0 {frameBox.width} {frameBox.height}"
			aria-hidden="true"
			focusable="false"
		>
			<path class="band-outer" d={frameBox.outer} fill-rule="evenodd" />
			<path class="band-inner" d={frameBox.middle} fill-rule="evenodd" />
		</svg>
	{/if}
	<img
		class="berry berry-left"
		src="/images/outlet-finder/strawberry-corner-v1.webp"
		alt=""
		width="720"
		height="720"
		loading="lazy"
		decoding="async"
		aria-hidden="true"
	/>
	<img
		class="berry berry-right"
		src="/images/outlet-finder/strawberry-corner-v1.webp"
		alt=""
		width="720"
		height="720"
		loading="lazy"
		decoding="async"
		aria-hidden="true"
	/>
	<img
		class="decor decor-leaf"
		src="/images/outlet-finder/decor-leaf-single.webp"
		alt=""
		width="520"
		height="498"
		loading="lazy"
		decoding="async"
		aria-hidden="true"
	/>
	<img
		class="decor decor-strawberry"
		src="/images/outlet-finder/decor-strawberry-whole.webp"
		alt=""
		width="520"
		height="514"
		loading="lazy"
		decoding="async"
		aria-hidden="true"
	/>
	<noscript
		><div class="no-script-outlets">
			<p>Pilih outlet untuk membuka halaman cabang:</p>
			{#each OUTLETS as item}<a href={outletPath(item)}>{item.city} — {item.name}</a>{/each}
		</div></noscript
	>
</section>

<style>
	.finder {
		position: relative;
		isolation: isolate;
		height: 100dvh;
		min-height: max(100dvh, 520px);
		scroll-margin-top: -5rem;
		/* Frame berhenti melebar di 1400px dan berpusat; semua tepi lain mengikuti --frame-x. */
		--frame-x: max(24px, calc((100% - 1400px) / 2));
		--frame-top: 5rem;
		--frame-bottom: 24px;
		color: var(--color-ink);
		background: #fffdf9;
		overflow: clip;
	}
	.map-backdrop {
		position: absolute;
		inset: var(--frame-top) var(--frame-x) var(--frame-bottom);
		z-index: 0;
		background: var(--color-cream);
		overflow: hidden;
	}
	.finder .frame-layers {
		position: absolute;
		inset: var(--frame-top) var(--frame-x) var(--frame-bottom);
		z-index: 1;
		width: calc(100% - 2 * var(--frame-x));
		height: calc(100% - var(--frame-top) - var(--frame-bottom));
		overflow: visible;
		pointer-events: none;
	}
	.frame-layers .band-outer {
		fill: #fddee5;
		filter: drop-shadow(0 6px 10px rgb(255 16 129 / 14%));
	}
	.frame-layers .band-inner {
		fill: #fee8ee;
	}
	.berry {
		position: absolute;
		z-index: 3;
		bottom: 12px;
		width: clamp(150px, 17vw, 250px);
		height: auto;
		pointer-events: none;
		user-select: none;
		filter: drop-shadow(0 4px 8px rgb(120 10 60 / 22%));
		animation: berry-float 7s ease-in-out infinite;
	}
	.decor {
		position: absolute;
		z-index: -1;
		height: auto;
		pointer-events: none;
		user-select: none;
		filter: drop-shadow(0 6px 10px rgb(60 20 40 / 22%));
	}
	.decor-leaf {
		left: calc(var(--frame-x) - 40px);
		top: calc(var(--frame-top) - 0.25rem);
		width: clamp(96px, 9vw, 170px);
		rotate: -45deg;
	}
	.decor-strawberry {
		right: calc(var(--frame-x) - 3.5rem);
		top: calc(var(--frame-top) - 0.5rem);
		width: clamp(96px, 8.5vw, 150px);
		rotate: 8deg;
	}
	.berry-left {
		left: calc(var(--frame-x) - 42px);
	}
	.berry-right {
		right: calc(var(--frame-x) - 42px);
		scale: -1 1;
		animation-delay: -3.5s;
	}
	@keyframes berry-float {
		50% {
			translate: 0 -6px;
			rotate: 1.5deg;
		}
	}
	.finder-header {
		position: absolute;
		z-index: 4;
		top: calc(var(--frame-top) + 0.5rem);
		left: calc(var(--frame-x) + 16px);
		display: flex;
		align-items: center;
		gap: 16px;
		width: max-content;
		max-width: calc(100% - 2 * var(--frame-x) - 32px);
		padding: 14px 16px;
		border-radius: 28px;
		background: #fff;
		box-shadow: 0 10px 28px rgb(255 16 129 / 12%);
	}
	.title-pin {
		display: grid;
		flex: 0 0 56px;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--color-brand-soft);
		color: var(--color-brand);
	}
	.finder .title-pin > svg {
		width: 26px;
		height: 26px;
	}
	.finder h2 {
		flex: none;
		font-family: var(--font-display);
		/* Sama dengan judul section lain di home: Zatiaras Display 800, rapat, kerning per huruf. */
		font-size: 30px;
		font-weight: 800;
		line-height: 0.92;
		letter-spacing: -0.005em;
		color: var(--color-ink);
	}
	.finder h2 > .title-head {
		display: block;
	}
	.finder .title-hot {
		color: var(--color-brand);
	}
	.finder h2 > .title-tail {
		display: block;
		color: var(--color-ink);
	}
	.finder-header :global(.select) {
		flex: none;
		width: 220px;
	}
	.finder-dock {
		position: absolute;
		z-index: 4;
		bottom: calc(var(--frame-bottom) - 0.5rem);
		left: 50%;
		width: min(1240px, calc(100% - 2 * var(--frame-x) - 32px));
		transform: translateX(-50%);
		padding: 14px;
		border-radius: 28px;
		background: #fff;
		box-shadow: 0 -4px 28px rgb(255 16 129 / 12%);
	}
	.finder[data-outlet-count='1'] .finder-dock {
		width: min(660px, calc(100% - 2 * var(--frame-x) - 32px));
	}
	.results-header,
	.results-heading {
		display: flex;
		align-items: center;
	}
	.results-header {
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}
	.results-heading {
		gap: 8px;
		min-width: 0;
		min-height: 20px;
	}
	.results-heading > svg {
		color: var(--color-brand-dark);
	}
	.results-copy {
		font-size: 14px;
		color: var(--color-ink);
	}
	.results-copy strong {
		font-weight: 800;
		color: var(--color-brand);
	}
	.mobile-outlet-picker {
		display: none;
	}
	.outlet-choices {
		min-width: 0;
	}
	.outlet-cards {
		display: flex;
		gap: 12px;
		align-items: stretch;
	}
	.outlet-card {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 14px 16px;
		border: 2px solid var(--color-line);
		border-radius: 20px;
		background: #fff;
		transition:
			border-color 220ms ease-out,
			background-color 220ms ease-out;
	}
	.outlet-card.active {
		border-color: var(--color-brand);
		background: var(--color-brand-soft);
		box-shadow: 0 6px 18px rgb(255 16 129 / 14%);
	}
	.outlet-choice {
		position: relative;
		display: flex;
		align-items: stretch;
		gap: 14px;
		margin-bottom: 14px;
		cursor: pointer;
	}
	.choice-input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.choice-dot {
		width: 14px;
		height: 14px;
		flex: 0 0 14px;
		border: 1px solid #9c8e93;
		border-radius: 50%;
	}
	.card-photo {
		display: grid;
		flex: 0 0 64px;
		align-self: center;
		place-items: center;
		width: 64px;
		height: 64px;
		border: 0;
		border-radius: 20px;
		background: color-mix(in srgb, var(--color-brand) 12%, #fff);
		color: var(--color-brand);
	}
	.finder .card-photo > svg {
		width: 28px;
		height: 28px;
		opacity: 0.85;
	}
	.active .card-photo {
		background: #fff;
	}
	.active .choice-dot {
		border-color: var(--color-brand-dark);
		background: var(--color-brand-dark);
		box-shadow: inset 0 0 0 3px #fffdf9;
	}
	.card-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
		justify-content: center;
		gap: 6px;
	}
	.card-name {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 17px;
		font-weight: 800;
		line-height: 1.3;
		letter-spacing: -0.02em;
	}
	.selected-address {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-copy-muted);
	}
	.selected-hours {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		line-height: 1.45;
		color: var(--color-copy-muted);
	}
	.selected-hours small {
		font-size: 13px;
		white-space: nowrap;
	}
	.outlet-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: auto;
	}
	.outlet-cta,
	.quick-directions,
	.preview-outlet {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		min-height: 48px;
		padding: 10px 20px;
		border-radius: 999px;
		font-size: 14px;
		font-weight: 700;
		white-space: nowrap;
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			background-color 220ms ease-out;
	}
	.outlet-cta {
		flex: 1;
		background: var(--color-brand);
		color: #fff;
	}
	.quick-directions {
		border: 1px solid var(--color-line);
	}
	.preview-outlet {
		width: 100%;
		margin-top: auto;
		background: var(--color-brand-soft);
		color: var(--color-brand-dark);
	}
	.selected-address > svg,
	.selected-hours > svg {
		margin-top: 2px;
		width: 14px;
		height: 14px;
		color: var(--color-brand-dark);
	}
	.selected-hours > svg {
		margin-top: 0;
	}
	.finder svg {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
	}
	.empty-outlets {
		margin-top: 6px;
		padding: 6px 10px;
		width: fit-content;
		max-width: 100%;
		border-radius: 8px;
		background: #fffdf9;
		font-size: 10px;
		line-height: 1.4;
		color: #71656a;
	}
	.finder :is(a, button):focus-visible,
	.outlet-card:has(input:focus-visible) {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 3px;
	}
	.finder :is(a, button):active {
		transform: scale(0.98);
	}
	.no-script-outlets {
		display: grid;
		gap: 8px;
	}
	.no-script-outlets a {
		display: flex;
		align-items: center;
		min-height: 44px;
		text-decoration: underline;
	}
	.finder:has(.no-script-outlets) {
		height: auto;
		min-height: 100dvh;
		display: grid;
		gap: 16px;
		padding: 88px 16px 24px;
	}
	.finder:has(.no-script-outlets) :is(.map-backdrop, .frame-layers) {
		display: none;
	}
	.finder:has(.no-script-outlets) :is(.finder-header, .finder-dock) {
		position: relative;
		inset: auto;
		width: 100%;
		max-width: none;
		transform: none;
	}
	@media (hover: hover) {
		.outlet-cta:hover {
			background: var(--color-brand-dark);
		}
		.quick-directions:hover,
		.preview-outlet:hover {
			background: var(--color-brand-soft);
		}
	}
	@media (min-width: 768px) and (max-width: 1023px) {
		.finder {
			--frame-x: 16px;
		}
		.finder-header {
			left: 32px;
			max-width: calc(100% - 64px);
		}
		.finder-dock,
		.finder[data-outlet-count='1'] .finder-dock {
			width: calc(100% - 64px);
		}
	}
	@media (max-width: 767px) {
		.berry,
		.decor {
			display: none;
		}
		.finder {
			--frame-x: 8px;
			--frame-bottom: 16px;
		}
		.finder-header {
			top: calc(var(--frame-top) + 0.5rem);
			left: 16px;
			right: 16px;
			width: auto;
			padding: 8px 8px 8px 18px;
			border-radius: 24px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 10px;
		}
		.finder h2 {
			flex: none;
			margin: 0;
			font-size: 18px;
			white-space: nowrap;
		}
		.finder h2 > .title-head {
			display: inline;
		}
		.title-pin,
		.finder h2 > .title-tail {
			display: none;
		}
		.finder-header {
			width: auto;
			max-width: none;
		}
		.finder-header :global(.select) {
			flex: 1 1 0;
			width: auto;
		}
		.finder-header :global(.select-button > svg:first-child) {
			display: none;
		}
		.finder-header :global(.select-button),
		.mobile-outlet-picker :global(.select-button) {
			min-height: 44px;
			font-size: 14px;
		}
		.finder-header :global(.select-button) {
			padding: 0 12px;
			font-size: 13px;
		}
		.results-heading > svg {
			display: none;
		}
		.finder-dock,
		.finder[data-outlet-count='1'] .finder-dock {
			width: calc(100% - 32px);
			padding: 12px;
			border-radius: 24px;
		}
		.results-header {
			gap: 8px;
			margin-bottom: 6px;
		}
		.results-heading {
			gap: 6px;
			flex: 1;
			min-height: 32px;
		}
		.results-copy {
			display: none;
		}
		.mobile-outlet-picker {
			display: block;
			min-width: 0;
			flex: 1;
		}
		.outlet-card {
			padding: 12px;
			border-radius: 16px;
		}
		.finder .outlet-card:not(.active) {
			display: none;
		}
		.outlet-choice {
			flex-direction: row;
			align-items: stretch;
			gap: 12px;
			margin-bottom: 0;
		}
		.card-photo {
			flex: 0 0 56px;
			width: 56px;
			height: 56px;
			border-radius: 18px;
		}
		.card-photo > svg {
			width: 26px;
			height: 26px;
		}
		.card-name {
			font-size: 15px;
		}
		.selected-address,
		.selected-hours {
			font-size: 12px;
		}
		.outlet-actions {
			margin-top: 12px;
		}
		.preview-outlet {
			margin-top: 12px;
		}
		.outlet-cta,
		.quick-directions {
			padding: 10px 14px;
			gap: 6px;
			font-size: 13px;
		}
		.outlet-cta {
			flex: 1;
			min-width: 0;
			justify-content: center;
		}
		.outlet-cta svg {
			display: none;
		}
	}
	@media (min-width: 1200px) {
		.outlet-card {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 184px;
			align-items: stretch;
			column-gap: 16px;
		}
		.outlet-choice {
			margin-bottom: 0;
		}
		.outlet-actions {
			align-self: center;
			flex-direction: column;
			align-items: stretch;
			margin-top: 0;
		}
		.preview-outlet {
			align-self: center;
			margin-top: 0;
		}
	}
	@media (max-width: 360px) {
		.finder h2 {
			font-size: 15px;
		}
		.finder-header :global(.select-button) {
			font-size: 12px;
		}
	}
	@media (max-width: 767px) and (max-height: 640px) {
		.card-photo {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.berry {
			animation: none;
		}
		.finder :is(a, button) {
			transition: none;
		}
	}
</style>
