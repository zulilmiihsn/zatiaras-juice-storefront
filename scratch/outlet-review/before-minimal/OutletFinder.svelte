<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { gsap } from 'gsap';
	import {
		CITIES,
		OUTLETS,
		formatOutletHours,
		outletPath,
		suggestCityFromLabel
	} from '$lib/core/outlets';
	import { readRememberedOutlet } from '$lib/location/suggest';
	import { outletMapPoint } from '$lib/location/map';
	import { track } from '$lib/analytics/events';
	import OutletMap from './OutletMap.svelte';

	let cityId = $state(CITIES[0]?.id ?? '');
	let outletId = $state<string>('');
	let suggestion = $state('');
	let wide = $state(false);
	let cameraPadding = $state({ top: 240, bottom: 340, left: 48, right: 48 });
	const city = $derived(CITIES.find((item) => item.id === cityId));
	const outlets = $derived(OUTLETS.filter((item) => item.cityId === cityId));
	const selected = $derived(outlets.find((item) => item.id === outletId) ?? outlets[0]);
	const point = $derived(selected ? outletMapPoint(selected) : null);
	const directions = $derived(
		point ? `https://www.google.com/maps/dir/?api=1&destination=${point[1]},${point[0]}` : undefined
	);

	function chooseCity(id: string) {
		if (!CITIES.some((item) => item.id === id)) return;
		cityId = id;
		outletId = '';
		suggestion = '';
	}
	function chooseOutlet(id: string) {
		if (outlets.some((item) => item.id === id)) outletId = id;
	}
	function frame(node: HTMLElement) {
		const heading = node.querySelector<HTMLElement>('.finder-heading')!;
		const dock = node.querySelector<HTMLElement>('.finder-dock')!;
		const measure = () => {
			const bounds = node.getBoundingClientRect();
			cameraPadding = {
				top:
					bounds.width >= 768
						? 128
						: Math.ceil(heading.getBoundingClientRect().bottom - bounds.top + 24),
				bottom: Math.ceil(bounds.bottom - dock.getBoundingClientRect().top + 24),
				left: bounds.width >= 768 ? Math.round(bounds.width * 0.35) : 32,
				right: bounds.width >= 768 ? 96 : 32
			};
		};
		const resize = new ResizeObserver(measure);
		[node, heading, dock].forEach((element) => resize.observe(element));
		measure();
		return { destroy: () => resize.disconnect() };
	}
	function animateDetail(node: HTMLElement, _id: string) {
		let tween: gsap.core.Tween | undefined;
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		function enter() {
			tween?.kill();
			if (motion.matches) gsap.set(node, { clearProps: 'opacity,transform' });
			else
				tween = gsap.fromTo(
					node,
					{ opacity: 0, y: 6 },
					{ opacity: 1, y: 0, duration: 0.32, ease: 'power3.out', clearProps: 'opacity,transform' }
				);
		}
		void _id;
		enter();
		motion.addEventListener('change', enter);
		return {
			update: enter,
			destroy: () => {
				tween?.kill();
				motion.removeEventListener('change', enter);
			}
		};
	}
	onMount(() => {
		const screen = matchMedia('(min-width: 768px)');
		const sync = () => {
			wide = screen.matches;
		};
		sync();
		screen.addEventListener('change', sync);
		const remembered = readRememberedOutlet().outlet;
		if (remembered) {
			cityId = remembered.cityId;
			outletId = remembered.id;
		} else {
			const suggested = suggestCityFromLabel(page.data.cfCity);
			if (suggested) {
				cityId = suggested.id;
				suggestion = `Saran kota: ${suggested.name}. Kamu bisa pilih kota lain.`;
			}
		}
		return () => screen.removeEventListener('change', sync);
	});
</script>

{#snippet arrow()}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"
		><path d="M5 12h14m-6-6 6 6-6 6" /></svg
	>
{/snippet}

<section id="temukan-zatiaras" class="finder" aria-labelledby="finder-title" use:frame>
	<div class="map-backdrop">
		<OutletMap
			{cityId}
			cityName={city?.name ?? ''}
			{outlets}
			selectedOutletId={selected?.id ?? ''}
			onselect={chooseOutlet}
			{cameraPadding}
		/>
	</div>
	<div class="finder-heading">
		<p class="coverage">Samarinda · Berau · Balikpapan</p>
		<h2 id="finder-title" class="font-display">TEMUKAN<br /><span>ZATIARAS</span></h2>
		<p class="finder-intro">
			Pilih tempat ambil pesananmu.<br />Lihat menu, lalu pesan dari mana saja.
		</p>
		<a class="all-locations" href="/locations">Semua outlet {@render arrow()}</a>
	</div>
	<div class="finder-dock">
		<div class="dock-selectors">
			<label class="dock-field" for="finder-city"
				><span>Kota</span><select
					id="finder-city"
					value={cityId}
					onchange={(event) => chooseCity(event.currentTarget.value)}
					>{#each CITIES as item}<option value={item.id}>{item.name}</option>{/each}</select
				></label
			>
			<label class="dock-field" for="finder-outlet"
				><span>Tempat ambil pesanan</span><select
					id="finder-outlet"
					value={selected?.id ?? ''}
					onchange={(event) => chooseOutlet(event.currentTarget.value)}
					disabled={!outlets.length}
					>{#each outlets as item}<option value={item.id}>Zatiaras {item.name}</option
						>{/each}</select
				></label
			>
		</div>
		{#if suggestion}<p class="city-suggestion">{suggestion}</p>{/if}
		{#if selected}
			<div id="selected-outlet-detail" class="dock-detail" use:animateDetail={selected.id}>
				<div class="detail-copy">
					<h3 class="selected-name font-display">Zatiaras {selected.name}</h3>
					<p class="detail-hours">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
						>{formatOutletHours(selected.hours)}{selected.hours.includes('WITA') ? '' : ' WITA'}
					</p>
					<details class="address-detail" open={wide}>
						<summary>Alamat &amp; petunjuk arah <span aria-hidden="true">+</span></summary>
						<p class="detail-address">
							{selected.address.startsWith('VERIFY')
								? 'Alamat lengkap dikonfirmasi outlet.'
								: selected.address}
						</p>
						{#if directions}<a
								class="directions-link"
								href={directions}
								target="_blank"
								rel="noopener noreferrer">Petunjuk arah {@render arrow()}</a
							>{/if}
					</details>
					{#if !point}<p class="map-note">
							Peta area {city?.name}. Titik outlet sedang dikonfirmasi.
						</p>{/if}
				</div>
				<a
					class="outlet-cta"
					href={outletPath(selected)}
					onclick={() =>
						track('outlet_select_clicked', {
							outlet: selected.id,
							city: selected.cityId,
							source: 'home'
						})}>Lihat outlet {@render arrow()}</a
				>
			</div>
			<span class="sr-only" aria-live="polite"
				>Outlet pilihan: Zatiaras {selected.name}, {selected.city}.</span
			>
		{:else}<p class="empty-outlets">Outlet belum tersedia di kota ini. Pilih kota lain.</p>{/if}
	</div>
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
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 100dvh;
		padding: 104px clamp(24px, 5.5vw, 96px) 72px;
		gap: 32px;
		scroll-margin-top: -5rem;
		background: #fff8ec;
	}
	.map-backdrop {
		position: absolute;
		inset: 0;
		z-index: -2;
	}
	.finder-heading {
		pointer-events: none;
		width: fit-content;
		max-width: 100%;
	}
	.coverage {
		font-size: 11px;
		font-weight: 700;
		color: #65595e;
		margin-bottom: 16px;
	}
	.finder h2 {
		font-size: clamp(40px, 5.8vw, 84px);
		font-weight: 800;
		line-height: 0.97;
		letter-spacing: -0.01em;
	}
	.finder h2 span {
		color: var(--color-brand);
	}
	.finder-intro {
		color: #65595e;
		font-size: 14px;
		line-height: 1.8;
		margin-top: 20px;
	}
	.all-locations {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 16px;
		min-height: 44px;
		font-size: 12px;
		font-weight: 700;
		margin-top: 8px;
	}
	.finder svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}
	.finder-dock {
		grid-row: 3;
		width: 100%;
		max-width: 1104px;
		justify-self: center;
		padding: 24px 28px;
		border: 1px solid rgb(36 26 32 / 10%);
		border-radius: 24px;
		background: rgb(255 253 249 / 98%);
		box-shadow: 0 16px 56px rgb(36 26 32 / 10%);
	}
	.dock-selectors {
		display: grid;
		grid-template-columns: 0.75fr 1.25fr;
		gap: 24px;
	}
	.dock-field {
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	.dock-field > span {
		color: #65595e;
		font-size: 11px;
		font-weight: 600;
	}
	.dock-field select {
		width: 100%;
		min-width: 0;
		min-height: 48px;
		padding: 10px 36px 10px 14px;
		border: 1px solid #ddd5d4;
		border-radius: 10px;
		background-color: #fffdf9;
		color: var(--color-ink);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}
	.dock-detail {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px;
		margin-top: 20px;
		padding-top: 20px;
		border-top: 1px solid #e8e1dd;
	}
	.detail-copy {
		min-width: 0;
	}
	.selected-name {
		font-size: 24px;
		font-weight: 700;
		line-height: 1.3;
	}
	.detail-hours {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		font-size: 12px;
		line-height: 1.7;
		color: #65595e;
		margin-top: 6px;
	}
	.detail-hours svg {
		width: 16px;
		height: 18px;
	}
	.address-detail {
		margin-top: 4px;
	}
	.address-detail summary {
		display: none;
	}
	.address-detail:not([open]) > :global(:not(summary)) {
		display: revert;
	}
	.detail-address {
		max-width: 680px;
		font-size: 12px;
		line-height: 1.7;
		color: #65595e;
	}
	.directions-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		font-size: 12px;
		font-weight: 700;
	}
	.directions-link svg {
		width: 14px;
		height: 14px;
		transform: rotate(-40deg);
	}
	.outlet-cta {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 32px;
		flex-shrink: 0;
		min-height: 56px;
		padding: 14px 24px;
		border-radius: 999px;
		background: var(--color-brand);
		color: white;
		font-size: 14px;
		font-weight: 700;
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			background-color 220ms ease-out;
	}
	.outlet-cta:active,
	.all-locations:active,
	.directions-link:active {
		transform: scale(0.98);
	}
	.map-note,
	.city-suggestion,
	.empty-outlets {
		font-size: 11px;
		color: #65595e;
		line-height: 1.6;
		margin-top: 8px;
	}
	.finder :is(a, select, summary):focus-visible {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 4px;
	}
	.no-script-outlets {
		position: relative;
		grid-row: 4;
		display: grid;
		gap: 8px;
		background: #fffdf9;
		padding: 16px;
		border-radius: 16px;
	}
	.no-script-outlets a {
		min-height: 44px;
		text-decoration: underline;
	}
	@media (hover: hover) {
		.outlet-cta:hover {
			background: var(--color-brand-dark);
		}
		.all-locations:hover,
		.directions-link:hover {
			color: var(--color-brand-dark);
		}
	}
	@media (min-width: 768px) and (max-height: 850px) {
		.finder {
			padding-top: 88px;
			padding-bottom: 64px;
			gap: 24px;
		}
		.finder h2 {
			font-size: clamp(40px, 5.4vw, 64px);
		}
		.coverage {
			margin-bottom: 12px;
		}
		.finder-intro {
			margin-top: 16px;
			font-size: 13px;
		}
		.all-locations {
			margin-top: 4px;
		}
		.finder-dock {
			padding: 20px 24px;
		}
		.dock-detail {
			margin-top: 16px;
			padding-top: 16px;
		}
		.selected-name {
			font-size: 22px;
		}
	}
	@media (max-width: 767px) {
		.finder {
			padding: 80px 16px 64px;
			gap: 24px;
		}
		.coverage {
			font-size: 10px;
			margin-bottom: 12px;
		}
		.finder h2 {
			font-size: clamp(36px, 10.4vw, 56px);
		}
		.finder-intro {
			font-size: 12px;
			margin-top: 12px;
			line-height: 1.6;
		}
		.all-locations {
			margin-top: 0;
			min-height: 44px;
			font-size: 11px;
		}
		.finder-dock {
			padding: 16px;
			border-radius: 20px;
		}
		.dock-selectors {
			grid-template-columns: minmax(0, 1fr);
			gap: 8px;
		}
		.dock-field {
			grid-template-columns: 72px minmax(0, 1fr);
			align-items: center;
			gap: 8px;
		}
		.dock-field > span {
			font-size: 10px;
			line-height: 1.5;
		}
		.dock-field select {
			min-height: 44px;
			font-size: 12px;
			padding-left: 10px;
			padding-right: 22px;
		}
		.dock-detail {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 10px;
			margin-top: 12px;
			padding-top: 10px;
		}
		.selected-name {
			display: none;
		}
		.detail-hours {
			font-size: 11px;
			margin-top: 0;
			gap: 6px;
		}
		.address-detail {
			margin-top: 0;
		}
		.address-detail summary {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			min-height: 44px;
			font-size: 11px;
			font-weight: 700;
			cursor: pointer;
			list-style: none;
		}
		.address-detail summary::-webkit-details-marker {
			display: none;
		}
		.address-detail summary span {
			font-size: 20px;
			font-weight: 400;
		}
		.address-detail[open] summary span {
			transform: rotate(45deg);
		}
		.address-detail:not([open]) > :global(:not(summary)) {
			display: none;
		}
		.detail-address {
			font-size: 11px;
		}
		.outlet-cta {
			min-height: 48px;
			width: 100%;
			font-size: 14px;
			padding: 12px 18px;
		}
		.map-note,
		.city-suggestion {
			font-size: 10px;
			margin-top: 4px;
		}
	}
	@media (min-width: 375px) and (max-width: 767px) {
		.dock-field select {
			font-size: 14px;
		}
		.dock-field > span {
			font-size: 11px;
		}
		.address-detail summary {
			font-size: 12px;
		}
	}
	@media (max-width: 767px) and (max-height: 700px) {
		.finder {
			padding-top: 72px;
			gap: 12px;
		}
		.finder h2 {
			font-size: 32px;
		}
		.coverage {
			margin-bottom: 8px;
		}
		.finder-intro {
			display: none;
		}
		.all-locations {
			display: none;
		}
		.finder-dock {
			padding: 12px;
		}
		.dock-detail {
			margin-top: 8px;
			padding-top: 8px;
			gap: 4px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.finder *,
		.finder *::after {
			transition: none;
		}
	}
</style>
