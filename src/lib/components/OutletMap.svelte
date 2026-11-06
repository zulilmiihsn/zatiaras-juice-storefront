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
		onselect,
		cameraPadding = { top: 96, bottom: 64, left: 80, right: 80 }
	}: {
		cityId: string;
		cityName: string;
		outlets: Outlet[];
		selectedOutletId: string;
		onselect: (id: OutletId) => void;
		cameraPadding?: { top: number; bottom: number; left: number; right: number };
	} = $props();
	let container: HTMLDivElement;
	let status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let reducedMotion = $state(false);
	let viewport = $state({ width: 0, height: 0 });
	let map: LibreMap | undefined;
	let library: typeof import('maplibre-gl') | undefined;
	let disposed = false;
	let starting = false;
	let startupTimer: ReturnType<typeof setTimeout> | undefined;
	let creditsInitialized = false;
	let previousCity = '';
	// MapLibre owns marker updates; this lifecycle registry must not retrigger Svelte effects.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const markers = new Map<OutletId, { marker: Marker; button: HTMLButtonElement }>();
	const selected = $derived(outlets.find((outlet) => outlet.id === selectedOutletId));
	const cameraEase = (t: number) => 1 - (1 - t) ** 3;

	function clearMap() {
		clearTimeout(startupTimer);
		creditsInitialized = false;
		for (const { marker } of markers.values()) marker.remove();
		markers.clear();
		map?.remove();
		map = undefined;
		previousCity = '';
	}
	function compactCredits() {
		if (creditsInitialized) return;
		const credits = container.querySelector<HTMLDetailsElement>('.maplibregl-ctrl-attrib');
		// The native control gains its content asynchronously from the active sources.
		if (!credits?.classList.contains('maplibregl-compact')) return;
		credits.open = false;
		credits.classList.remove('maplibregl-compact-show');
		creditsInitialized = true;
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
				center: initialPoint ?? view.center,
				zoom: initialPoint ? 14.8 : 12,
				minZoom: 6,
				maxZoom: 18,
				pitch: 0,
				maxPitch: 0,
				bearing: 0,
				cooperativeGestures: true,
				scrollZoom: false,
				dragRotate: false,
				touchPitch: false,
				attributionControl: false,
				locale: {
					'NavigationControl.ZoomIn': 'Perbesar peta',
					'NavigationControl.ZoomOut': 'Perkecil peta',
					'CooperativeGesturesHandler.MobileHelpText': 'Gunakan dua jari untuk menggeser peta',
					'CooperativeGesturesHandler.WindowsHelpText':
						'Gunakan tombol + dan − untuk memperbesar peta',
					'CooperativeGesturesHandler.MacHelpText': 'Gunakan tombol + dan − untuk memperbesar peta',
					'AttributionControl.ToggleAttribution': 'Informasi sumber peta'
				},
				canvasContextAttributes: { preserveDrawingBuffer: false }
			});
			map.setPadding(cameraPadding);
			map.touchZoomRotate.disableRotation();
			map.addControl(new engine.NavigationControl({ showCompass: false }), 'top-right');
			map.addControl(new engine.AttributionControl({ compact: true }), 'bottom-right');
			map.on('sourcedata', compactCredits);
			map.on('styledata', compactCredits);
			map
				.getCanvas()
				.setAttribute('aria-label', `Peta ${cityName}. Gunakan tombol zoom atau geser peta.`);
			map.once('load', () => {
				if (disposed) return;
				clearTimeout(startupTimer);
				status = 'ready';
				compactCredits();
			});
			map.on('error', () => {
				// Defer removal until MapLibre's event dispatch has completed.
				if (status === 'loading')
					queueMicrotask(() => {
						if (status === 'loading') fail();
					});
			});
			startupTimer = setTimeout(fail, 20000);
			map.setStyle('/maps/zatiaras.json', {
				// MapLibre requires absolute sprite URLs; keep the checked-in style host-independent.
				transformStyle: (_, style) => ({
					...style,
					sprite: Array.isArray(style.sprite)
						? style.sprite.map((sprite) => ({
								...sprite,
								url: new URL(sprite.url, location.origin).href
							}))
						: style.sprite
				})
			});
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
			map.flyTo({
				...view,
				pitch: 0,
				padding: cameraPadding,
				bearing: 0,
				duration: reducedMotion ? 0 : 800,
				essential: false,
				easing: cameraEase
			});
		}
	}

	$effect(() => {
		const city = cityId;
		const items = outlets;
		const id = selectedOutletId;
		const instant = reducedMotion;
		const padding = cameraPadding;
		if (status !== 'ready' || !map || !library || viewport.height === 0) return;
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
				const label = document.createElement('span');
				label.className = 'marker-name';
				const name = document.createElement('span');
				name.textContent = `Zatiaras ${outlet.name}`;
				const state = document.createElement('span');
				state.className = 'marker-state';
				state.textContent = 'Outlet pilihan';
				label.appendChild(name);
				label.appendChild(state);
				button.appendChild(label);
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
			map.flyTo({
				center: point,
				zoom: 14.8,
				padding,
				pitch: 0,
				bearing: 0,
				duration: instant ? 0 : 850,
				easing: cameraEase,
				essential: false
			});
		} else if (view) {
			map.flyTo({
				...view,
				zoom: 12,
				padding,
				pitch: 0,
				bearing: 0,
				duration: instant || previousCity === city ? 0 : 850,
				easing: cameraEase,
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
		const closeCredits = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			const credits = (event.target as HTMLElement | null)?.closest(
				'.maplibregl-ctrl-attrib.maplibregl-compact-show'
			);
			const toggle = credits?.querySelector<HTMLElement>('summary');
			if (!toggle) return;
			event.preventDefault();
			toggle.click();
			toggle.focus();
		};
		container.addEventListener('keydown', closeCredits);
		const resize = new ResizeObserver(([entry]) => {
			viewport = { width: entry.contentRect.width, height: entry.contentRect.height };
			map?.resize();
		});
		resize.observe(container);
		return () => {
			disposed = true;
			observer.disconnect();
			container.removeEventListener('keydown', closeCredits);
			resize.disconnect();
			motion.removeEventListener('change', syncMotion);
			clearMap();
		};
	});
</script>

<div
	class="outlet-map"
	data-map-state={status}
	data-map-mode="2d"
	data-map-compact={viewport.height - cameraPadding.top - cameraPadding.bottom < 180}
	style={`--map-safe-top: ${cameraPadding.top}px; --map-safe-bottom: ${cameraPadding.bottom}px;`}
>
	<div bind:this={container} class="map-canvas"></div>
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
		<div class="map-actions">
			<button
				class="map-overview"
				type="button"
				aria-label="Lihat area kota"
				title="Lihat area kota"
				onclick={overview}
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"
					><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /><circle cx="12" cy="12" r="3" /></svg
				>
			</button>
		</div>
	{/if}
</div>

<style>
	.outlet-map {
		container-type: size;
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: var(--color-cream);
		/* Satu kolom kontrol di kanan atas: zoom, lihat area kota, lalu kredit peta. */
		--ctrl-size: 36px;
		--ctrl-gap: 8px;
		--ctrl-top: 36px;
		--overview-top: calc(var(--ctrl-top) + var(--ctrl-size) * 2 + var(--ctrl-gap));
		--credits-top: calc(var(--overview-top) + var(--ctrl-size) + var(--ctrl-gap));
	}
	.map-canvas {
		position: absolute;
		inset: 0;
	}
	.map-loading,
	.map-error {
		position: absolute;
		z-index: 3;
		top: var(--map-safe-top);
		bottom: var(--map-safe-bottom);
		left: 16px;
		right: 16px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		text-align: center;
		font-size: 12px;
		color: #71656a;
	}
	.map-error {
		padding: 20px;
		border-radius: 16px;
		background: rgb(255 253 249 / 96%);
		max-width: 320px;
		margin-inline: auto;
	}
	.map-error strong {
		color: var(--color-ink);
		font-size: 14px;
	}
	.map-error svg {
		width: 24px;
		height: 24px;
	}
	.map-error button,
	.map-overview {
		display: grid;
		place-items: center;
		min-height: 44px;
		padding: 10px 16px;
		border: 1px solid #e6ded8;
		border-radius: 999px;
		background: #fffdf9;
		color: var(--color-ink);
		font-size: 11px;
		font-weight: 700;
		transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.map-error button:active,
	.map-overview:active {
		transform: scale(0.98);
	}
	.map-actions {
		position: absolute;
		z-index: 3;
		top: var(--overview-top);
		right: calc(var(--map-edge, 0px) + 12px);
	}
	.map-overview {
		width: 36px;
		height: 36px;
		min-height: 36px;
		padding: 0;
		border-radius: 50%;
		background: #fffdf9;
		box-shadow: 0 2px 8px rgb(36 26 32 / 4%);
	}
	.map-overview svg {
		width: 16px;
		height: 16px;
	}
	.map-skeleton {
		height: 6px;
		width: 100px;
		border-radius: 999px;
		background: #e6ded8;
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
	.outlet-map :global(.maplibregl-ctrl-top-right) {
		top: var(--ctrl-top);
		right: calc(var(--map-edge, 0px) + 12px);
	}
	.outlet-map :global(.maplibregl-ctrl-top-right .maplibregl-ctrl) {
		margin: 0;
	}
	.outlet-map :global(.maplibregl-ctrl-bottom-right) {
		top: var(--credits-top);
		bottom: auto;
		right: calc(var(--map-edge, 0px) + 12px);
		max-width: calc(100% - 24px - var(--map-edge, 0px));
	}
	.outlet-map :global(.maplibregl-desktop-message),
	.outlet-map :global(.maplibregl-mobile-message) {
		font-family: var(--font-sans);
	}
	.outlet-map :global(.maplibregl-ctrl-attrib.maplibregl-compact) {
		box-sizing: border-box;
		width: 36px;
		height: 36px;
		min-height: 36px;
		max-width: calc(100cqw - 24px - var(--map-edge, 0px));
		padding: 0;
		margin: 0;
		overflow: hidden;
		border: 1px solid rgb(82 34 55 / 12%);
		border-radius: 18px;
		background: #fffdf9;
		color: var(--color-ink);
		box-shadow: 0 2px 8px rgb(36 26 32 / 6%);
		font-family: var(--font-sans);
		font-size: 10px;
		transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.outlet-map :global(.maplibregl-ctrl-attrib.maplibregl-compact-show) {
		width: 340px;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-inner) {
		position: absolute;
		top: 50%;
		left: 12px;
		width: calc(min(340px, 100cqw - 24px - var(--map-edge, 0px)) - 52px);
		transform: translateY(-50%);
		white-space: normal;
		line-height: 14px;
	}
	.outlet-map :global(.maplibregl-compact-show .maplibregl-ctrl-attrib-inner) {
		animation: credit-reveal 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes credit-reveal {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-button) {
		top: -1px;
		right: -1px;
		left: auto;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background-color: #fffdf9;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%23241a20' stroke-width='1.7' stroke-linecap='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 11v6m0-10v.01'/%3E%3C/svg%3E");
		background-position: center;
		background-size: 16px;
		background-repeat: no-repeat;
		transition:
			background-color 180ms ease-out,
			scale 180ms ease-out;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-button:hover) {
		background-color: #f9deeb;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-button:active) {
		scale: 0.98;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-button:focus) {
		box-shadow: none;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-button:focus-visible) {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: -4px;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-inner a) {
		color: var(--color-ink);
		text-underline-offset: 2px;
	}
	.outlet-map :global(.maplibregl-ctrl-attrib-inner a:focus-visible) {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 1px;
	}
	.outlet-map :global(.maplibregl-ctrl-group) {
		overflow: hidden;
		border: 0;
		border-radius: 18px;
		box-shadow:
			0 0 0 1px #e6ded8,
			0 2px 8px rgb(36 26 32 / 6%);
		background: #fffdf9;
	}
	.outlet-map :global(.maplibregl-ctrl-group button) {
		width: 36px;
		height: 36px;
	}
	.outlet-map :global(.z-outlet-marker) {
		position: relative;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 52px;
		height: 58px;
		border: 2px solid var(--color-brand);
		border-radius: 999px 999px 999px 10px;
		background: #fffdf9;
		box-shadow: 0 4px 16px rgb(36 26 32 / 10%);
		cursor: pointer;
	}
	.outlet-map :global(.z-outlet-marker[aria-pressed='true']) {
		background: #fff4f8;
		box-shadow:
			0 0 0 7px rgb(255 16 129 / 8%),
			0 4px 16px rgb(36 26 32 / 10%);
	}
	.outlet-map :global(.z-outlet-marker img) {
		width: 24px;
		height: 30px;
		object-fit: contain;
		transition: scale 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.outlet-map :global(.z-outlet-marker:active img) {
		scale: 0.98;
	}
	.outlet-map :global(.marker-name) {
		position: absolute;
		top: calc(100% + 12px);
		left: 50%;
		transform: translateX(-50%);
		width: max-content;
		padding: 9px 12px;
		border: 1px solid #e6ded8;
		border-radius: 8px;
		background: #fffdf9;
		color: var(--color-ink);
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
		line-height: 1.2;
		pointer-events: none;
		transition:
			background-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
			color 220ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.outlet-map :global(.marker-name > span) {
		display: block;
	}
	.outlet-map :global(.marker-name .marker-state) {
		display: none;
	}
	.outlet-map :global(.z-outlet-marker[aria-pressed='true'] .marker-name) {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: #fff8ec;
		padding: 10px 14px;
	}
	.outlet-map :global(.z-outlet-marker[aria-pressed='true'] .marker-state) {
		display: block;
		font-size: 9px;
		font-weight: 400;
		margin-top: 4px;
		color: #e4cbd5;
	}
	.outlet-map :global(button:focus-visible) {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 4px;
	}
	@media (max-width: 767px) {
		.outlet-map {
			--ctrl-top: calc(var(--map-safe-top) - 20px);
		}
	}
	.outlet-map[data-map-compact='true'] :global(.marker-name),
	.outlet-map[data-map-compact='true'] .map-actions,
	.outlet-map[data-map-compact='true'] .map-error p,
	.outlet-map[data-map-compact='true'] .map-error svg {
		display: none;
	}
	.outlet-map[data-map-compact='true'] .map-error {
		padding: 6px;
		gap: 4px;
	}
	.outlet-map[data-map-compact='true'] :global(.maplibregl-ctrl-bottom-right) {
		top: calc(var(--ctrl-top) + var(--ctrl-size) * 2 + var(--ctrl-gap));
		bottom: auto;
		right: calc(var(--map-edge, 0px) + 12px);
		left: auto;
	}
	@media (prefers-reduced-motion: reduce) {
		.map-skeleton::after {
			animation: none;
		}
		.map-overview,
		.map-error button,
		.outlet-map :global(.maplibregl-ctrl-attrib.maplibregl-compact),
		.outlet-map :global(.maplibregl-ctrl-attrib-button),
		.outlet-map :global(.marker-name),
		.outlet-map :global(.z-outlet-marker img) {
			transition: none;
		}
		.outlet-map :global(.maplibregl-compact-show .maplibregl-ctrl-attrib-inner) {
			animation: none;
		}
	}
	@container (max-height: 240px) {
		.outlet-map :global(.marker-name) {
			display: none;
		}
		.map-actions {
			display: none;
		}
		.outlet-map :global(.maplibregl-ctrl-top-right) {
			top: 2px;
			right: 2px;
		}
		.outlet-map :global(.maplibregl-ctrl-bottom-right) {
			top: 82px;
			bottom: auto;
			right: 2px;
			left: auto;
		}
		.map-loading,
		.map-error {
			top: 12px;
			bottom: 12px;
			padding: 8px;
			gap: 6px;
			font-size: 11px;
		}
		.map-error svg {
			display: none;
		}
	}
</style>
