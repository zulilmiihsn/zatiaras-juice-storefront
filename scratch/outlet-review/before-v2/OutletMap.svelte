<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LibreMap, Marker } from 'maplibre-gl';
	import type { Outlet, OutletId } from '$lib/core/contracts';
	import { cityMapView, outletMapPoint } from '$lib/location/map';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';
	import 'maplibre-gl/dist/maplibre-gl.css';

	let {
		cityId,
		cityName,
		outlets,
		selectedOutletId,
		onselect
	}: {
		cityId: string;
		cityName: string;
		outlets: Outlet[];
		selectedOutletId: string;
		onselect: (id: OutletId) => void;
	} = $props();
	let container: HTMLDivElement;
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let reducedMotion = $state(false);
	let map: LibreMap | undefined;
	let library: typeof import('maplibre-gl') | undefined;
	let disposed = false;
	let starting = false;
	let startupTimer: ReturnType<typeof setTimeout> | undefined;
	let previousCity = '';
	// MapLibre owns marker updates; this lifecycle registry must not retrigger Svelte effects.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const markers = new Map<OutletId, { marker: Marker; button: HTMLButtonElement }>();
	const selected = $derived(outlets.find((outlet) => outlet.id === selectedOutletId));
	const selectedPoint = $derived(selected ? outletMapPoint(selected) : null);

	function clearMap() {
		clearTimeout(startupTimer);
		for (const { marker } of markers.values()) marker.remove();
		markers.clear();
		map?.remove();
		map = undefined;
		previousCity = '';
	}

	function fail() {
		if (disposed) return;
		clearMap();
		status = 'error';
	}

	async function startMap() {
		if (starting || disposed || status === 'ready') return;
		starting = true;
		clearMap();
		status = 'loading';
		try {
			const [engine, worker] = await Promise.all([
				import('maplibre-gl'),
				import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')
			]);
			if (disposed) return;
			library = engine;
			engine.setWorkerUrl(worker.default);
			const view = cityMapView(cityId);
			if (!view) throw new Error('City map view unavailable');
			const initialPoint = selected ? outletMapPoint(selected) : null;
			map = new engine.Map({
				container,
				style: '/maps/zatiaras.json',
				center: initialPoint ?? view.center,
				zoom: initialPoint ? 13.5 : view.zoom,
				minZoom: 6,
				maxZoom: 17,
				pitch: 0,
				bearing: 0,
				scrollZoom: false,
				dragRotate: false,
				touchPitch: false,
				attributionControl: false,
				canvasContextAttributes: { preserveDrawingBuffer: false }
			});
			map.touchZoomRotate.disableRotation();
			map.addControl(new engine.NavigationControl({ showCompass: false }), 'top-right');
			map.addControl(new engine.AttributionControl({ compact: true }), 'bottom-right');
			map
				.getCanvas()
				.setAttribute('aria-label', `Peta ${cityName}. Gunakan tombol zoom atau geser peta.`);
			map.once('load', () => {
				if (disposed) return;
				clearTimeout(startupTimer);
				status = 'ready';
			});
			map.on('error', () => {
				// Defer removal until MapLibre's event dispatch has completed.
				if (status === 'loading')
					queueMicrotask(() => {
						if (status === 'loading') fail();
					});
			});
			startupTimer = setTimeout(fail, 20000);
		} catch {
			fail();
		} finally {
			starting = false;
		}
	}

	function overview() {
		const view = cityMapView(cityId);
		if (map && view) {
			map.stop();
			map.flyTo({ ...view, duration: reducedMotion ? 0 : 800, essential: false });
		}
	}

	$effect(() => {
		const city = cityId;
		const items = outlets;
		const id = selectedOutletId;
		const instant = reducedMotion;
		if (status !== 'ready' || !map || !library) return;
		map
			.getCanvas()
			.setAttribute('aria-label', `Peta ${cityName}. Gunakan tombol zoom atau geser peta.`);
		const visibleIds = new Set(
			items.filter((outlet) => outletMapPoint(outlet)).map((outlet) => outlet.id)
		);
		for (const [key, record] of markers) {
			if (!visibleIds.has(key)) {
				record.marker.remove();
				markers.delete(key);
			}
		}
		for (const outlet of items) {
			const point = outletMapPoint(outlet);
			if (!point) continue;
			let record = markers.get(outlet.id);
			if (!record) {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'z-outlet-marker';
				button.setAttribute('aria-label', `Pilih outlet Zatiaras ${outlet.name}`);
				button.dataset.outlet = outlet.id;
				const icon = document.createElement('img');
				icon.src = zcup;
				icon.alt = '';
				icon.width = 22;
				icon.height = 28;
				button.appendChild(icon);
				button.addEventListener('click', () => onselect(outlet.id));
				const marker = new library.Marker({ element: button, anchor: 'bottom' })
					.setLngLat(point)
					.addTo(map);
				record = { marker, button };
				markers.set(outlet.id, record);
			}
			record.button.setAttribute('aria-pressed', String(outlet.id === id));
		}
		const current = items.find((outlet) => outlet.id === id);
		const point = current ? outletMapPoint(current) : null;
		const view = cityMapView(city);
		map.stop();
		if (point) {
			map.flyTo({ center: point, zoom: 13.5, duration: instant ? 0 : 850, essential: false });
		} else if (view) {
			map.flyTo({
				...view,
				duration: instant || previousCity === city ? 0 : 850,
				essential: false
			});
		}
		previousCity = city;
	});

	onMount(() => {
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const syncMotion = () => {
			reducedMotion = motion.matches;
			if (motion.matches) map?.stop();
		};
		syncMotion();
		motion.addEventListener('change', syncMotion);
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					observer.disconnect();
					void startMap();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(container);
		const resize = new ResizeObserver(() => map?.resize());
		resize.observe(container);
		return () => {
			disposed = true;
			observer.disconnect();
			resize.disconnect();
			motion.removeEventListener('change', syncMotion);
			clearMap();
		};
	});
</script>

<div class="outlet-map" data-map-state={status}>
	<div bind:this={container} class="map-canvas"></div>
	<div class="map-caption" aria-hidden="true">
		<span class="map-caption-label">Jelajahi area</span>
		<span class="map-city font-display">{cityName}</span>
	</div>
	{#if status === 'idle' || status === 'loading'}
		<div class="map-loading" role="status">
			<span class="map-skeleton"></span><span>Memuat peta {cityName}…</span>
		</div>
	{:else if status === 'error'}
		<div class="map-error" role="status">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15m6-12v15" /></svg
			>
			<strong>Peta belum bisa dimuat</strong>
			<p>Kamu tetap bisa memilih outlet dari daftar.</p>
			<button type="button" onclick={() => void startMap()}>Coba lagi</button>
		</div>
	{:else}
		<button class="map-overview" type="button" onclick={overview}
			>Lihat area kota <span aria-hidden="true">↗</span></button
		>
		{#if !selectedPoint}
			<p class="map-note">Peta area {cityName}. Titik outlet ini sedang dikonfirmasi.</p>
		{/if}
	{/if}
</div>

<style>
	.outlet-map {
		position: relative;
		isolation: isolate;
		min-width: 0;
		height: 100%;
		min-height: 31rem;
		overflow: hidden;
		border-radius: 1.5rem;
		background: #fff8ec;
		border: 1px solid var(--color-line);
	}
	.map-canvas {
		position: absolute;
		inset: 0;
	}
	.map-caption {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		display: flex;
		flex-direction: column;
		pointer-events: none;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: rgb(255 248 236 / 94%);
	}
	.map-caption-label {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-copy-muted);
	}
	.map-city {
		font-size: 1.625rem;
		font-weight: 700;
		line-height: 1.3;
	}
	.map-loading,
	.map-error {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		background: #fff8ec;
		padding: 1.5rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-copy-muted);
	}
	.map-error strong {
		color: var(--color-ink);
		font-size: 1rem;
	}
	.map-error svg {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--color-brand-dark);
	}
	.map-error button,
	.map-overview {
		min-height: 44px;
		padding: 0.625rem 1rem;
		border: 1px solid var(--color-line);
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-ink);
		font-size: 0.75rem;
		font-weight: 700;
		transition:
			transform 180ms ease-out,
			background-color 180ms ease-out;
	}
	.map-error button:active,
	.map-overview:active {
		transform: scale(0.98);
	}
	.map-overview {
		position: absolute;
		left: 1.5rem;
		top: 7.25rem;
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
	}
	.map-note {
		position: absolute;
		bottom: 5rem;
		left: 1rem;
		right: 1rem;
		width: fit-content;
		max-width: 24rem;
		border-radius: 0.625rem;
		padding: 0.75rem 1rem;
		background: rgb(255 248 236 / 96%);
		color: var(--color-copy-muted);
		font-size: 0.75rem;
		line-height: 1.6;
		pointer-events: none;
	}
	.map-skeleton {
		height: 0.5rem;
		width: 8rem;
		border-radius: 999px;
		background: var(--color-brand-soft);
		overflow: hidden;
	}
	.map-skeleton::after {
		content: '';
		display: block;
		width: 50%;
		height: 100%;
		border-radius: inherit;
		background: var(--color-brand);
		animation: map-load 1.2s ease-in-out infinite alternate;
	}
	@keyframes map-load {
		to {
			transform: translateX(100%);
		}
	}
	.outlet-map :global(.z-outlet-marker) {
		display: grid;
		place-items: center;
		width: 48px;
		height: 54px;
		border: 2px solid var(--color-brand);
		border-radius: 999px 999px 999px 0.5rem;
		background: var(--color-surface);
		box-shadow: 0 4px 16px rgb(36 26 32 / 12%);
		cursor: pointer;
	}
	.outlet-map :global(.z-outlet-marker[aria-pressed='true']) {
		background: var(--color-brand-soft);
		border-width: 3px;
	}
	.outlet-map :global(.z-outlet-marker img) {
		width: 22px;
		height: 28px;
		object-fit: contain;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib) {
		font-family: var(--font-sans);
		font-size: 11px;
	}
	.outlet-map :global(.maplibregl-ctrl-group) {
		box-shadow: 0 2px 12px rgb(36 26 32 / 8%);
	}
	.outlet-map :global(.maplibregl-ctrl-group button) {
		width: 44px;
		height: 44px;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-button) {
		width: 44px;
		height: 44px;
		background-repeat: no-repeat;
		background-position: center;
	}
	@media (max-width: 1023px) {
		.outlet-map {
			min-height: 23rem;
		}
		.map-caption {
			top: 1rem;
			left: 1rem;
			padding: 0.5rem 0.75rem;
		}
		.map-city {
			font-size: 1.25rem;
		}
		.map-overview {
			left: 1rem;
			top: 6rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.map-skeleton::after {
			animation: none;
		}
		.outlet-map button {
			transition: none;
		}
	}
</style>
