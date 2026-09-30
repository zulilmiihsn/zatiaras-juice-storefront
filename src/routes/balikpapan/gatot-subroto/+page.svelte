<script lang="ts">
	import { onMount } from 'svelte';
	import { canonical, localBusinessJsonLd, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { track } from '$lib/analytics/events';
	import { cart } from '$lib/stores/cart.svelte';
	import { goto } from '$app/navigation';
	import { formatOutletHours, getOutlet } from '$lib/core/outlets';

	const outlet = getOutlet('gatot-subroto')!;
	const url = canonical('/balikpapan/gatot-subroto');

	const ldBusiness = jsonLdTag(
		localBusinessJsonLd({
			name: 'Gatot Subroto Balikpapan',
			url,
			hours: outlet.hours,
			city: 'Balikpapan',
			address: outlet.address
		})
	);
	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Balikpapan', url: canonical('/balikpapan') },
			{ name: 'Gatot Subroto', url }
		])
	);
	onMount(() => track('outlet_view', { outlet: 'gatot-subroto', city: 'Balikpapan' }));

	function orderHere() {
		cart.setOutlet('gatot-subroto');
		track('outlet_selected', {
			outlet: 'gatot-subroto',
			city: 'Balikpapan',
			source: 'outlet-page'
		});
		goto('/menu');
	}
</script>

<svelte:head>
	<title>Zatiaras Juice Gatot Subroto Balikpapan | Order Pickup</title>
	<meta
		name="description"
		content="Zatiaras Juice Outlet Gatot Subroto Balikpapan. Order pickup praktis tanpa antre."
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
			<a href="/balikpapan" class="transition-colors hover:text-brand">Balikpapan</a>
			<span class="text-neutral-300">/</span>
			<span class="font-bold text-ink">Gatot Subroto</span>
		</nav>
		<div class="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-10">
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
			>
				ALAMAT OUTLET SEDANG DIVERIFIKASI
			</span>
			<h1 class="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
				Zatiaras Outlet Gatot Subroto
			</h1>
			<p class="mt-2 text-xs font-bold tracking-wider text-brand uppercase">
				Balikpapan, Kalimantan Timur
			</p>
			<p class="mt-3 text-sm leading-relaxed text-neutral-600">
				Alamat jalan dan pin Maps akan ditambahkan setelah verifikasi. Jam operasional: {formatOutletHours(
					outlet.hours
				)}.
			</p>
			<div class="mt-6 flex flex-wrap gap-3">
				<button
					type="button"
					onclick={orderHere}
					class="tap-scale rounded-full bg-brand px-7 py-3.5 text-xs font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
				>
					Pesan Pickup di Gatot Subroto →
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
