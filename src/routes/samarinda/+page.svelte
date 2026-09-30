<script lang="ts">
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { getCity, getOutletsByCity } from '$lib/core/outlets';

	const city = getCity('samarinda')!;
	const outlets = getOutletsByCity('samarinda');
	const url = canonical('/samarinda');

	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Samarinda', url }
		])
	);
</script>

<svelte:head>
	<title>Zatiaras Juice Samarinda | Juanda + Slamet Riyadi</title>
	<meta
		name="description"
		content="Zatiaras Juice Samarinda: outlet Juanda dan Slamet Riyadi. Order pickup, menu, jam buka."
	/>
	<link rel="canonical" href={url} />
	{@html ldCrumb}
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
	<p class="text-xs font-bold tracking-wider text-neutral-500 uppercase">Kota · {city.name}</p>
	<h1 class="mt-2 font-display text-4xl font-extrabold text-ink">Zatiaras Juice Samarinda</h1>
	<p class="mt-2 text-sm text-neutral-600">
		2 outlet aktif: Juanda · Slamet Riyadi. Pilih outlet untuk order pickup.
	</p>
	<ul class="mt-6 grid gap-4 sm:grid-cols-2">
		{#each outlets as o}
			<li class="rounded-3xl border border-black/10 bg-white p-6">
				<p class="text-xs font-bold text-brand uppercase">{o.city}</p>
				<h2 class="mt-1 font-display text-2xl font-bold text-ink">Zatiaras {o.name}</h2>
				<p class="mt-1 text-xs text-neutral-500">{o.hours}</p>
				<a
					href="/samarinda/{o.id}"
					class="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-white hover:bg-brand"
				>
					Detail {o.name} →
				</a>
			</li>
		{/each}
	</ul>
</div>
