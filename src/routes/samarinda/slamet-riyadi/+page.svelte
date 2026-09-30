<script lang="ts">
	import { onMount } from 'svelte';
	import { canonical, localBusinessJsonLd, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { track } from '$lib/analytics/events';
	import { cart } from '$lib/stores/cart.svelte';
	import { goto } from '$app/navigation';
	import { KERN_MAP } from '$lib/kern';

	const url = canonical('/samarinda/slamet-riyadi');

	const ldBusiness = jsonLdTag(
		localBusinessJsonLd({
			name: 'Zatiaras Juice Slamet Riyadi Samarinda',
			url,
			hours: 'Mo-Sa 07:00-22:00'
		})
	);
	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Outlet', url: canonical('/locations') },
			{ name: 'Slamet Riyadi Samarinda', url }
		])
	);
	onMount(() => track('outlet_view', { outlet: 'slamet-riyadi' }));

	function orderHere() {
		cart.setOutlet('slamet-riyadi');
		goto('/menu');
	}
</script>

{#snippet kerned(text: string)}
	{#each text.split(' ') as word, wi}
		{#if wi > 0}{' '}{/if}<span class="whitespace-nowrap" aria-hidden="true"
			>{#each [...word] as ch}<span
					class="inline-block"
					style:transform={`translateY(${KERN_MAP[ch] ?? 0}em)`}>{ch}</span
				>{/each}</span
		>
	{/each}
{/snippet}

<svelte:head>
	<title>Zatiaras Juice Slamet Riyadi Samarinda | Order Pickup</title>
	<meta
		name="description"
		content="Zatiaras Juice Outlet Slamet Riyadi Samarinda. Buka Senin–Sabtu 07:00–22:00 WITA. Pesan jus segar pickup cepat tanpa ribet."
	/>
	<link rel="canonical" href={url} />
	{@html ldBusiness}
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-4xl px-4 sm:px-6">
		<nav
			class="mb-6 flex items-center gap-2 text-xs font-semibold text-neutral-500"
			aria-label="Breadcrumb"
		>
			<a href="/" class="transition-colors hover:text-brand">Home</a>
			<span class="text-neutral-300">/</span>
			<a href="/locations" class="transition-colors hover:text-brand">Outlet</a>
			<span class="text-neutral-300">/</span>
			<span class="font-bold text-ink">Slamet Riyadi</span>
		</nav>

		<div class="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-10">
			<div
				class="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-6"
			>
				<div>
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
					>
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						JAM OPERASIONAL · 07:00–22:00 WITA · MINGGU LIBUR
					</span>
					<h1
						class="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl"
						aria-label="Zatiaras Outlet Slamet Riyadi"
					>
						{@render kerned('Zatiaras Outlet Slamet Riyadi')}
					</h1>
					<div class="cup-lip-bar mt-2 w-12"></div>
					<p class="mt-2 text-xs font-bold tracking-wider text-brand uppercase">
						Samarinda, Kalimantan Timur
					</p>
				</div>

				<button
					type="button"
					onclick={orderHere}
					class="tap-scale rounded-full bg-brand px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
				>
					Pesan Pickup di Slamet Riyadi →
				</button>
			</div>

			<div class="mt-8 grid gap-6 sm:grid-cols-2">
				<div class="space-y-4">
					<h2 class="text-sm font-bold tracking-wider text-neutral-500 uppercase">
						Informasi Gerai
					</h2>
					<div class="space-y-3 text-xs leading-relaxed text-neutral-700">
						<p>
							<strong>Alamat:</strong> Detail alamat via Google Maps Zatiaras Juice Slamet Riyadi.
						</p>
						<p><strong>Hari Operasional:</strong> Senin – Sabtu (Minggu tutup).</p>
						<p><strong>Waktu Penyiapan:</strong> Dikonfirmasi outlet setelah pesanan diterima.</p>
						<p><strong>Layanan:</strong> Pickup mandiri via web, tunjukkan nomor pesanan.</p>
					</div>
				</div>

				<div class="rounded-2xl border border-black/5 bg-cream p-5">
					<h2 class="text-sm font-bold text-ink">Catatan Pelanggan</h2>
					<ul class="mt-3 space-y-2 text-xs text-neutral-600">
						<li>✓ Hari Minggu outlet Slamet Riyadi libur, silakan pesan via Outlet Juanda.</li>
						<li>✓ Cek stok menu terkini sebelum checkout.</li>
						<li>✓ Segar, dibuat langsung dari buah asli saat pesanan masuk.</li>
					</ul>
				</div>
			</div>

			<div class="mt-8 border-t border-black/10 pt-6">
				<div class="flex flex-wrap gap-3">
					<button
						type="button"
						onclick={orderHere}
						class="tap-scale rounded-full bg-ink px-6 py-3 text-xs font-bold text-white hover:bg-brand"
					>
						Buka Menu Slamet Riyadi
					</button>
					<a
						href="/locations"
						class="tap-scale rounded-full border border-black/15 bg-white px-6 py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
					>
						Lihat Outlet Lain
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
