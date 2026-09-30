<script lang="ts">
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { cart } from '$lib/stores/cart.svelte';
	import { goto } from '$app/navigation';
	import { CITIES, OUTLETS, getCity, formatOutletHours } from '$lib/core/outlets';
	import { nearestCityFromCoords } from '$lib/location/suggest';
	import { track } from '$lib/analytics/events';

	const title = 'Lokasi Outlet Zatiaras Juice | Samarinda · Berau · Balikpapan';
	const desc =
		'Lima outlet resmi Zatiaras Juice: Juanda + Slamet Riyadi (Samarinda), Merah Delima (Berau), Kutilang + Gatot Subroto (Balikpapan). Pesan online pickup mandiri.';

	function selectAndOrder(outletId: string) {
		cart.setOutlet(outletId);
		track('outlet_selected', { outlet: outletId, source: 'locations' });
		goto('/menu');
	}

	let geoState = $state<'idle' | 'asking' | 'done' | 'denied'>('idle');
	let geoCityId = $state<string | null>(null);

	function useMyLocation(): void {
		if (!('geolocation' in navigator)) {
			geoState = 'denied';
			return;
		}
		track('browser_location_requested', {});
		geoState = 'asking';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				track('browser_location_granted', {});
				const found = nearestCityFromCoords(pos.coords.latitude, pos.coords.longitude);
				geoCityId = found?.id ?? null;
				geoState = 'done';
			},
			() => {
				track('browser_location_denied', {});
				geoState = 'denied';
			},
			{ timeout: 10000, maximumAge: 300000 }
		);
	}
	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Lokasi Outlet', url: canonical('/locations') }
		])
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical('/locations')} />
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-5xl px-4 sm:px-6">
		<div class="text-left sm:text-center">
			<div
				class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-bold text-neutral-600 shadow-xs"
			>
				<span class="h-2 w-2 rounded-full bg-brand"></span>
				SAMARINDA · BERAU · BALIKPAPAN
			</div>
			<h1 class="mt-3 font-display text-3xl leading-tight font-extrabold text-ink sm:text-5xl">
				Temukan Zatiaras
			</h1>
			<div class="cup-lip-bar mt-3 w-12 sm:mx-auto"></div>
			<p class="mt-3 max-w-md text-xs leading-relaxed text-neutral-600 sm:mx-auto sm:text-sm">
				Lima outlet aktif. Pilih kota, lalu outlet pickup terdekat — satu pesanan untuk satu outlet.
			</p>
			<div class="mt-4 flex flex-col items-center gap-2">
				<button
					type="button"
					onclick={useMyLocation}
					disabled={geoState === 'asking'}
					class="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-xs font-bold text-ink shadow-xs hover:border-brand/40 disabled:opacity-60"
				>
					{geoState === 'asking' ? 'Mencari lokasimu…' : 'Gunakan Lokasi Saya'}
				</button>
				{#if geoState === 'done'}
					<p class="text-xs text-neutral-600" role="status">
						{#if geoCityId && getCity(geoCityId)}
							Kota terdekat: <a href="/{geoCityId}" class="font-bold text-brand hover:underline"
								>{getCity(geoCityId)?.name}</a
							> — saran kasar, silakan pilih outlet manual di bawah.
						{:else}
							Kamu di luar jangkauan 3 kota — silakan pilih outlet manual di bawah.
						{/if}
					</p>
				{:else if geoState === 'denied'}
					<p class="text-xs text-neutral-500" role="status">
						Lokasi tidak tersedia — pilih kota dan outlet manual di bawah, tetap bisa order.
					</p>
				{/if}
			</div>
		</div>

		{#each CITIES as c}
			<section aria-label="Outlet {c.name}" class="mt-10">
				<div class="flex items-baseline justify-between border-b border-black/[0.06] pb-3">
					<h2 class="font-display text-2xl font-bold text-ink">{c.name}</h2>
					<a href="/{c.id}" class="text-xs font-bold text-brand hover:text-brand-dark">
						Halaman {c.name} →
					</a>
				</div>
				<div class="mt-5 grid gap-5 md:grid-cols-2">
					{#each OUTLETS.filter((o) => o.cityId === c.id) as o}
						<div
							class="tap-scale flex flex-col justify-between rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs transition hover:border-brand/40 sm:p-7"
						>
							<div>
								<div class="flex items-center justify-between">
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
									>
										<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
										OUTLET AKTIF
									</span>
									<span class="text-xs font-bold text-neutral-400">{o.city}</span>
								</div>
								<h3 class="mt-4 font-display text-2xl text-ink">Outlet {o.name}</h3>
								<p class="mt-2 text-xs text-neutral-500">
									{o.hours.startsWith('VERIFY')
										? 'Jam operasional dikonfirmasi outlet'
										: formatOutletHours(o.hours)}
								</p>
							</div>
							<div class="mt-6 flex flex-col gap-2.5 sm:flex-row">
								<button
									type="button"
									onclick={() => selectAndOrder(o.id)}
									class="tap-scale flex-1 rounded-full bg-brand px-6 py-3.5 text-center text-xs font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark"
								>
									Order Pickup di {o.name} →
								</button>
								<a
									href="/{o.cityId}/{o.id}"
									class="tap-scale rounded-full border border-black/15 bg-white px-5 py-3.5 text-center text-xs font-bold text-ink transition hover:bg-neutral-50"
								>
									Detail Outlet
								</a>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/each}

		<div
			class="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl bg-brand p-6 text-white sm:flex-row sm:p-8"
		>
			<div>
				<h3 class="font-display text-2xl">Mau pesan untuk kantor atau acara?</h3>
				<p class="mt-1 text-xs text-white/80">
					Layanan group order dengan penyiapan slot waktu khusus dari outlet.
				</p>
			</div>
			<a
				href="/group"
				class="tap-scale shrink-0 rounded-full bg-white px-6 py-3 text-xs font-bold text-brand shadow-sm transition hover:bg-ink hover:text-white"
			>
				Pesan Group Order →
			</a>
		</div>
	</div>
</div>
