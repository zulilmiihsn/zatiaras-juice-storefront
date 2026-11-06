<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
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
	let detailOpen = $state(false);
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
		detailOpen = false;
	}
	function chooseOutlet(id: string) {
		if (outlets.some((item) => item.id === id)) {
			outletId = id;
			detailOpen = false;
		}
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
	onMount(() => {
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
		<p class="finder-intro">Pesan online, ambil di outlet pilihanmu</p>
	</div>
	<div class="finder-dock">
		<div class="dock-controls">
			<label class="dock-field" for="finder-city"
				><span>Kota</span><select
					id="finder-city"
					value={cityId}
					onchange={(event) => chooseCity(event.currentTarget.value)}
					>{#each CITIES as item}<option value={item.id}>{item.name}</option>{/each}</select
				></label
			>
			<label class="dock-field outlet-field" for="finder-outlet"
				><span>Outlet</span><select
					id="finder-outlet"
					value={selected?.id ?? ''}
					onchange={(event) => chooseOutlet(event.currentTarget.value)}
					disabled={!outlets.length}
					>{#each outlets as item}<option value={item.id}>{item.name}</option>{/each}</select
				></label
			>
			{#if selected}<a
					class="outlet-cta"
					href={outletPath(selected)}
					onclick={() =>
						track('outlet_select_clicked', {
							outlet: selected.id,
							city: selected.cityId,
							source: 'home'
						})}>Lihat outlet {@render arrow()}</a
				>{/if}
		</div>
		{#if suggestion}<p class="city-suggestion">{suggestion}</p>{/if}
		{#if selected}
			<div class="dock-meta">
				<details class="address-detail" bind:open={detailOpen}>
					<summary>Detail outlet <span aria-hidden="true">+</span></summary>
					<div id="selected-outlet-detail" class="detail-content">
						<p class="detail-hours">
							{formatOutletHours(selected.hours)}{selected.hours.includes('WITA') ? '' : ' WITA'}
						</p>
						<p class="detail-address">
							{selected.address.startsWith('VERIFY')
								? 'Alamat lengkap dikonfirmasi outlet.'
								: selected.address}
						</p>
						<div class="detail-links">
							{#if directions}<a
									class="directions-link"
									href={directions}
									target="_blank"
									rel="noopener noreferrer">Petunjuk arah {@render arrow()}</a
								>{/if}
							<a class="all-locations" href="/locations">Semua outlet {@render arrow()}</a>
						</div>
					</div>
				</details>
				{#if !point}<p class="map-note">
						Peta area {city?.name} · Titik outlet belum terverifikasi
					</p>{/if}
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
		max-width: calc(100% - 60px);
	}
	.coverage {
		font-size: 11px;
		font-weight: 600;
		color: #65595e;
		margin-bottom: 14px;
	}
	.finder h2 {
		font-size: clamp(36px, 4.4vw, 64px);
		font-weight: 800;
		line-height: 0.98;
		letter-spacing: -0.01em;
	}
	.finder h2 span {
		color: var(--color-brand);
	}
	.finder-intro {
		max-width: 300px;
		color: #65595e;
		font-size: 13px;
		line-height: 1.7;
		margin-top: 16px;
	}
	.finder svg {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}
	.finder-dock {
		grid-row: 3;
		width: 100%;
		max-width: 960px;
		justify-self: center;
		padding: 16px 24px 8px;
		border: 1px solid rgb(36 26 32 / 9%);
		border-radius: 18px;
		background: #fffdf9;
		box-shadow: 0 8px 32px rgb(36 26 32 / 7%);
	}
	.dock-controls {
		display: grid;
		grid-template-columns: 0.75fr 1.25fr auto;
		align-items: end;
		gap: 24px;
	}
	.dock-field {
		display: grid;
		gap: 4px;
		min-width: 0;
	}
	.dock-field > span {
		color: #65595e;
		font-size: 11px;
		font-weight: 500;
		padding-left: 8px;
	}
	.dock-field select {
		width: 100%;
		min-width: 0;
		min-height: 44px;
		padding: 8px 24px 8px 8px;
		border: 0;
		border-radius: 4px;
		background-color: transparent;
		color: var(--color-ink);
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
	}
	.outlet-field {
		border-left: 1px solid #e8e1dd;
		padding-left: 24px;
	}
	.outlet-cta {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		min-height: 48px;
		padding: 12px 20px;
		border-radius: 999px;
		background: var(--color-brand);
		color: white;
		font-size: 13px;
		font-weight: 700;
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			background-color 220ms ease-out;
	}
	.dock-meta {
		display: flex;
		align-items: flex-start;
		gap: 24px;
		margin-top: 6px;
	}
	.address-detail {
		flex: 1;
		min-width: 0;
	}
	.address-detail summary {
		display: flex;
		align-items: center;
		gap: 12px;
		width: fit-content;
		min-height: 44px;
		padding: 8px;
		color: #65595e;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		list-style: none;
	}
	.address-detail summary::-webkit-details-marker {
		display: none;
	}
	.address-detail summary span {
		font-size: 17px;
		font-weight: 400;
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.address-detail[open] summary span {
		transform: rotate(45deg);
	}
	.detail-content {
		padding: 12px 8px 8px;
		border-top: 1px solid #e8e1dd;
	}
	.detail-hours,
	.detail-address {
		font-size: 12px;
		line-height: 1.8;
		color: #65595e;
	}
	.detail-hours {
		font-weight: 600;
		color: var(--color-ink);
		margin-bottom: 4px;
	}
	.detail-links {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		margin-top: 4px;
	}
	.directions-link,
	.all-locations {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		font-size: 12px;
		font-weight: 600;
	}
	.detail-links svg {
		width: 14px;
		height: 14px;
	}
	.directions-link svg {
		transform: rotate(-40deg);
	}
	.map-note {
		max-width: 45%;
		font-size: 11px;
		line-height: 1.6;
		color: #65595e;
		padding: 12px 0;
	}
	.city-suggestion,
	.empty-outlets {
		font-size: 11px;
		color: #65595e;
		line-height: 1.6;
		margin-top: 8px;
	}
	.outlet-cta:active,
	.directions-link:active,
	.all-locations:active,
	summary:active {
		transform: scale(0.98);
	}
	.finder :is(a, select, summary):focus-visible {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 3px;
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
		.directions-link:hover,
		.all-locations:hover,
		summary:hover {
			color: var(--color-brand-dark);
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
			font-size: clamp(32px, 9vw, 48px);
		}
		.finder-intro {
			font-size: 12px;
			margin-top: 12px;
			max-width: 240px;
		}
		.finder-dock {
			padding: 12px 16px 4px;
			border-radius: 16px;
		}
		.dock-controls {
			grid-template-columns: minmax(0, 1fr);
			gap: 8px;
		}
		.dock-field {
			grid-template-columns: 48px minmax(0, 1fr);
			align-items: center;
			gap: 8px;
		}
		.dock-field > span {
			padding-left: 0;
		}
		.dock-field select {
			font-size: 14px;
		}
		.outlet-field {
			border: 0;
			padding: 0;
		}
		.outlet-cta {
			width: 100%;
			font-size: 14px;
		}
		.dock-meta {
			flex-direction: column;
			gap: 0;
			margin-top: 4px;
		}
		.address-detail {
			width: 100%;
		}
		.address-detail summary {
			padding-left: 0;
		}
		.detail-content {
			padding-left: 0;
			padding-right: 0;
		}
		.map-note {
			max-width: none;
			font-size: 10px;
			padding: 0 0 8px;
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
		.finder-intro {
			display: none;
		}
		.coverage {
			margin-bottom: 8px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.finder * {
			transition: none;
		}
	}
</style>
