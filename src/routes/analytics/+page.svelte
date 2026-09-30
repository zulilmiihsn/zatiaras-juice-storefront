<script lang="ts">
	import { onMount } from 'svelte';
	import { clearEvents, listEvents, type BufferedEvent } from '$lib/analytics/events';
	import { getOutlet } from '$lib/core/outlets';

	let events = $state<BufferedEvent[]>([]);
	const latestFirst = $derived([...events].reverse());

	onMount(() => {
		events = listEvents();
	});

	function clear(): void {
		clearEvents();
		events = [];
	}

	function dimensions(event: BufferedEvent): string {
		const city = event.params.city;
		const outletId = event.params.outlet_id ?? event.params.outlet;
		const outlet = typeof outletId === 'string' ? getOutlet(outletId) : undefined;
		const labels = [typeof city === 'string' ? city : undefined, outlet?.name];
		return labels.filter(Boolean).join(' · ') || 'Dimensi belum tersedia';
	}
</script>

<svelte:head>
	<title>Analytics Lokal | Zatiaras Juice</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="min-h-[calc(100dvh-4rem)] bg-cream px-4 py-8 sm:px-6 sm:py-12">
	<div class="mx-auto max-w-5xl">
		<header
			class="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between"
		>
			<div>
				<p class="eyebrow">Ruang operasional · debug</p>
				<h1 class="page-heading mt-2 text-ink">Analytics lokal</h1>
				<p class="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
					Buffer 200 event terbaru dari browser ini. Bukan data server, laporan seluruh outlet, atau
					kebenaran accounting.
				</p>
			</div>
			<button
				type="button"
				disabled={events.length === 0}
				onclick={clear}
				class="min-h-11 self-start rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-bold text-ink hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-45 sm:self-auto"
			>
				Hapus buffer
			</button>
		</header>

		<div class="mt-6 flex flex-wrap items-center gap-3" aria-live="polite">
			<span class="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand">
				{events.length} / 200 event
			</span>
			<span class="text-xs text-neutral-500">Disimpan lokal di perangkat ini</span>
		</div>

		{#if events.length === 0}
			<div class="surface-card mt-5 px-6 py-14 text-center sm:px-10">
				<div
					class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"
					aria-hidden="true"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						class="h-7 w-7"
					>
						<path d="M4 19V5m0 14h16M8 15v-3m4 3V7m4 8V9m4 6V5" />
					</svg>
				</div>
				<h2 class="mt-4 font-display text-xl font-bold text-ink">Belum ada event</h2>
				<p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
					Jelajahi halaman atau aksi demo. Event yang memenuhi aturan privasi akan muncul di sini.
				</p>
			</div>
		{:else}
			<ol class="mt-5 space-y-3" aria-label="Event terbaru">
				{#each latestFirst as event, index (`${event.at}-${event.name}-${index}`)}
					<li class="surface-card p-4 sm:p-5">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span class="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand"
										>{event.name}</span
									>
									<span class="text-xs text-neutral-500">{dimensions(event)}</span>
								</div>
								<time class="mt-1 block text-xs text-neutral-500" datetime={event.at}>
									{new Date(event.at).toLocaleString('id-ID')}
								</time>
							</div>
							<details class="shrink-0 text-xs">
								<summary
									class="min-h-11 cursor-pointer content-center font-semibold text-ink hover:text-brand"
									>Lihat dimensi</summary
								>
								<pre
									class="mt-2 max-w-full overflow-x-auto rounded-xl bg-neutral-50 p-3 text-[11px] leading-relaxed text-neutral-700">{JSON.stringify(
										event.params,
										null,
										2
									)}</pre>
							</details>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>
