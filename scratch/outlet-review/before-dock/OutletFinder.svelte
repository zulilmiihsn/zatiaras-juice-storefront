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
	import type { OutletId } from '$lib/core/contracts';
	import { readRememberedOutlet } from '$lib/location/suggest';
	import { outletMapPoint } from '$lib/location/map';
	import { track } from '$lib/analytics/events';
	import OutletMap from './OutletMap.svelte';

	let cityId = $state(CITIES[0]?.id ?? '');
	let outletId = $state<string>('');
	let desktop = $state(false);
	let mapOpen = $state(false);
	let suggestion = $state('');
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
	function chooseOutlet(id: OutletId) {
		if (outlets.some((item) => item.id === id)) outletId = id;
	}
	function cityKeys(event: KeyboardEvent, index: number) {
		let target: number;
		if (event.key === 'ArrowRight') target = (index + 1) % CITIES.length;
		else if (event.key === 'ArrowLeft') target = (index - 1 + CITIES.length) % CITIES.length;
		else if (event.key === 'Home') target = 0;
		else if (event.key === 'End') target = CITIES.length - 1;
		else return;
		event.preventDefault();
		chooseCity(CITIES[target].id);
		const tabs = (
			event.currentTarget as HTMLElement
		).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
		tabs?.[target]?.focus();
	}
	function animateDetail(node: HTMLElement, _id: string) {
		let tween: gsap.core.Tween | undefined;
		function enter() {
			tween?.kill();
			if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
				gsap.set(node, { clearProps: 'opacity,transform' });
				return;
			}
			tween = gsap.fromTo(
				node,
				{ opacity: 0, y: 8 },
				{ opacity: 1, y: 0, duration: 0.32, ease: 'power3.out', clearProps: 'opacity,transform' }
			);
		}
		void _id;
		enter();
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			if (motion.matches) {
				tween?.kill();
				gsap.set(node, { clearProps: 'opacity,transform' });
			}
		};
		motion.addEventListener('change', sync);
		return {
			update: enter,
			destroy: () => {
				tween?.kill();
				motion.removeEventListener('change', sync);
			}
		};
	}
	onMount(() => {
		const screen = matchMedia('(min-width: 1024px)');
		const sync = () => {
			desktop = screen.matches;
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

<section id="temukan-zatiaras" class="finder" aria-labelledby="finder-title">
	<div class="finder-heading">
		<div>
			<h2 id="finder-title" class="font-display">TEMUKAN ZATIARAS</h2>
			<p>Pilih outlet di kotamu untuk melihat menu dan mengambil pesanan.</p>
		</div>
		<a class="all-locations" href="/locations">Semua outlet {@render arrow()}</a>
	</div>

	<div class="city-tabs" role="tablist" aria-label="Pilih kota outlet">
		{#each CITIES as item, index}
			<button
				id={`city-tab-${item.id}`}
				role="tab"
				type="button"
				aria-selected={cityId === item.id}
				aria-controls="outlet-city-panel"
				tabindex={cityId === item.id ? 0 : -1}
				onclick={() => chooseCity(item.id)}
				onkeydown={(event) => cityKeys(event, index)}
			>
				<span>{item.name}</span><span class="city-count" aria-hidden="true"
					>{OUTLETS.filter((outlet) => outlet.cityId === item.id).length}</span
				>
			</button>
		{/each}
	</div>
	{#if suggestion}<p class="city-suggestion">{suggestion}</p>{/if}

	<div
		id="outlet-city-panel"
		class="finder-layout"
		role="tabpanel"
		aria-labelledby={`city-tab-${cityId}`}
	>
		<div class="outlet-sidebar">
			<div class="outlet-list-heading">
				<span>Pilih cabang</span><span>{outlets.length} outlet</span>
			</div>
			<ul class="branch-list" aria-label={`Cabang di ${city?.name ?? 'kotamu'}`}>
				{#each outlets as item}
					<li>
						<button
							type="button"
							class="branch-option"
							aria-pressed={selected?.id === item.id}
							aria-controls="selected-outlet-detail"
							onclick={() => chooseOutlet(item.id)}
						>
							<span class="branch-option-copy"
								><span class="branch-name font-display">{item.name}</span><span class="branch-hours"
									>{formatOutletHours(item.hours)}</span
								></span
							>
							<span class="branch-arrow">{@render arrow()}</span>
						</button>
					</li>
				{/each}
			</ul>
			{#if selected}
				<div id="selected-outlet-detail" class="selected-detail" use:animateDetail={selected.id}>
					<span class="detail-label">Tempat ambil pesananmu</span>
					<h3 class="font-display">Zatiaras {selected.name}</h3>
					<p class="detail-address">
						{selected.address.startsWith('VERIFY')
							? 'Alamat lengkap dikonfirmasi outlet.'
							: selected.address}
					</p>
					<p class="detail-hours">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
						>{formatOutletHours(selected.hours)}{selected.hours.includes('WITA') ? '' : ' WITA'}
					</p>
					<div class="detail-actions">
						<a
							class="outlet-cta"
							href={outletPath(selected)}
							onclick={() =>
								track('outlet_select_clicked', {
									outlet: selected.id,
									city: selected.cityId,
									source: 'home'
								})}>Lihat Outlet {@render arrow()}</a
						>
						{#if directions}<a
								class="directions-link"
								href={directions}
								target="_blank"
								rel="noopener noreferrer">Petunjuk arah <span aria-hidden="true">↗</span></a
							>{/if}
					</div>
				</div>
				<span class="sr-only" aria-live="polite"
					>Outlet pilihan: {selected.name}, {selected.city}.</span
				>
			{:else}
				<p class="empty-outlets">Outlet belum tersedia di kota ini. Pilih kota lain.</p>
			{/if}
			{#if city}<a class="city-page-link" href={`/${city.id}`}
					>Jelajahi {city.name} <span aria-hidden="true">↗</span></a
				>{/if}
		</div>

		<div id="outlet-map-mobile" class="map-panel" class:map-panel-open={mapOpen}>
			{#if desktop || mapOpen}
				<OutletMap
					{cityId}
					cityName={city?.name ?? ''}
					{outlets}
					selectedOutletId={selected?.id ?? ''}
					onselect={chooseOutlet}
				/>
			{/if}
		</div>
		<button
			class="mobile-map-toggle"
			type="button"
			aria-expanded={mapOpen}
			aria-controls="outlet-map-mobile"
			onclick={() => {
				mapOpen = !mapOpen;
			}}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15m6-12v15" /></svg
			>
			{mapOpen ? 'Tutup Peta' : 'Lihat Peta'}
		</button>
	</div>
	<noscript>
		<div class="no-script-outlets">
			<p>Pilih outlet untuk membuka halaman cabang:</p>
			{#each OUTLETS as item}<a href={outletPath(item)}>{item.city} — {item.name}</a>{/each}
		</div>
	</noscript>
</section>

<style>
	.finder {
		max-width: 72rem;
		margin-inline: auto;
		padding: 5rem 1rem;
		scroll-margin-top: 4rem;
	}
	.finder-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1.5rem;
	}
	.finder h2 {
		font-size: clamp(2.25rem, 5.5vw, 4rem);
		font-weight: 800;
		line-height: 1.03;
		letter-spacing: -0.01em;
	}
	.finder-heading p {
		max-width: 28rem;
		margin-top: 1.25rem;
		font-size: 0.9375rem;
		line-height: 1.8;
		color: var(--color-copy-muted);
	}
	.all-locations {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 44px;
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-brand-dark);
	}
	.all-locations svg,
	.outlet-cta svg,
	.branch-arrow svg,
	.mobile-map-toggle svg {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}
	.city-tabs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
		margin-top: 2.5rem;
		border-bottom: 1px solid var(--color-line);
	}
	.city-tabs button {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 0.375rem;
		position: relative;
		min-height: 52px;
		padding: 0.75rem 0;
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--color-copy-muted);
		transition:
			color 200ms ease,
			transform 200ms ease-out;
	}
	.city-tabs button::after {
		position: absolute;
		content: '';
		bottom: -1px;
		left: 0;
		right: 0;
		height: 3px;
		border-radius: 2px;
		background: var(--color-brand);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.city-tabs button[aria-selected='true'] {
		color: var(--color-ink);
	}
	.city-tabs button[aria-selected='true']::after {
		transform: scaleX(1);
	}
	.city-count {
		font-size: 0.625rem;
		color: var(--color-copy-muted);
		align-self: flex-start;
		margin-top: 0.25rem;
	}
	.city-suggestion {
		font-size: 0.75rem;
		margin-top: 1rem;
		color: var(--color-copy-muted);
	}
	.finder-layout {
		display: grid;
		gap: 1.5rem;
		margin-top: 2rem;
	}
	.outlet-sidebar {
		min-width: 0;
	}
	.outlet-list-heading {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--color-copy-muted);
	}
	.branch-list {
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--color-line);
	}
	.branch-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		width: 100%;
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--color-line);
		text-align: left;
		transition: transform 180ms ease-out;
	}
	.branch-option-copy {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 0.5rem;
	}
	.branch-name {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-ink);
		transition: color 180ms ease;
	}
	.branch-hours {
		color: var(--color-copy-muted);
		font-size: 0.75rem;
		line-height: 1.7;
	}
	.branch-arrow {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid var(--color-line);
		color: var(--color-copy-muted);
		transition:
			background-color 180ms ease,
			color 180ms ease;
	}
	.branch-option[aria-pressed='true'] .branch-name {
		color: var(--color-brand-dark);
	}
	.branch-option[aria-pressed='true'] .branch-arrow {
		background: var(--color-brand);
		color: white;
		border-color: var(--color-brand);
	}
	.branch-option:active,
	.city-tabs button:active,
	.mobile-map-toggle:active,
	.outlet-cta:active {
		transform: scale(0.98);
	}
	.selected-detail {
		margin-top: 2rem;
	}
	.detail-label {
		font-size: 0.625rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-copy-muted);
		font-weight: 700;
	}
	.selected-detail h3 {
		font-size: 1.5rem;
		line-height: 1.2;
		font-weight: 700;
		margin-top: 0.75rem;
	}
	.detail-address {
		font-size: 0.8125rem;
		color: var(--color-copy-muted);
		line-height: 1.8;
		margin-top: 0.75rem;
		max-width: 26rem;
	}
	.detail-hours {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		margin-top: 1rem;
		font-size: 0.75rem;
		color: var(--color-copy-muted);
		line-height: 1.8;
	}
	.detail-hours svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		margin-top: 0.15rem;
	}
	.detail-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
		margin-top: 1.5rem;
	}
	.outlet-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		min-height: 52px;
		padding: 0.75rem 1.5rem;
		border-radius: 999px;
		background: var(--color-brand);
		color: white;
		font-size: 19px;
		font-weight: 700;
		transition:
			background-color 180ms ease,
			transform 180ms ease-out;
	}
	.directions-link {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-ink);
	}
	.city-page-link {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 44px;
		margin-top: 1rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--color-copy-muted);
	}
	.map-panel {
		display: none;
		min-width: 0;
	}
	.map-panel-open {
		display: block;
	}
	.mobile-map-toggle {
		grid-row: 2;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		min-height: 48px;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		color: var(--color-ink);
		font-size: 0.875rem;
		font-weight: 700;
		transition: transform 180ms ease-out;
	}
	.no-script-outlets {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;
		font-size: 0.875rem;
	}
	.no-script-outlets a {
		text-decoration: underline;
		min-height: 44px;
	}
	.empty-outlets {
		padding: 1rem 0;
		color: var(--color-copy-muted);
	}
	@media (hover: hover) {
		.outlet-cta:hover {
			background: var(--color-brand-dark);
		}
		.branch-option:hover .branch-name {
			color: var(--color-brand-dark);
		}
		.directions-link:hover,
		.city-page-link:hover {
			color: var(--color-brand-dark);
		}
	}
	@media (min-width: 640px) {
		.finder {
			padding: 6rem 1.5rem;
		}
		.city-tabs {
			display: flex;
			gap: 2.5rem;
			margin-top: 3rem;
		}
		.city-tabs button {
			font-size: 1.125rem;
			gap: 0.625rem;
			padding-inline: 0.125rem;
		}
		.city-count {
			font-size: 0.6875rem;
		}
		.finder-layout {
			margin-top: 2.5rem;
		}
	}
	@media (min-width: 1024px) {
		.finder-layout {
			grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.3fr);
			gap: 3rem;
			align-items: stretch;
		}
		.map-panel {
			display: block;
			min-height: 34rem;
			background: #fff8ec;
			border-radius: 1.5rem;
		}
		.mobile-map-toggle {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.finder *,
		.finder *::after {
			transition: none;
		}
	}
</style>
