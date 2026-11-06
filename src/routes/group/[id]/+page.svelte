<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { getGroup, advanceGroup, totalCups, type GroupRequest } from '$lib/group/logic';
	import { getOutlet } from '$lib/core/outlets';
	import { getMenuItem } from '$lib/data/menu';
	import { KERN_MAP } from '$lib/kern';

	const { data } = $props();
	let g = $state<GroupRequest | undefined>(undefined);
	let msg = $state('');
	let loaded = $state(false);

	onMount(() => {
		g = getGroup(data.id);
		loaded = true;
	});

	function go(to: Parameters<typeof advanceGroup>[1]): void {
		try {
			g = advanceGroup(data.id, to);
		} catch {
			msg = 'Transisi alur tidak valid.';
		}
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
	<title>Status Group Order #{data.id} | Zatiaras Juice</title>
</svelte:head>

<div class="bg-cream/40 py-8 sm:py-14">
	<div class="mx-auto max-w-2xl px-4 sm:px-6">
		{#if !loaded}
			<p role="status" class="text-sm text-neutral-600">Memuat permintaan di browser ini...</p>
		{:else if !g}
			<div class="rounded-3xl border border-black/10 bg-white p-12 text-center shadow-sm">
				<h1 class="font-display text-2xl text-ink" aria-label="Permintaan Tidak Ditemukan">
					{@render kerned('Permintaan Tidak Ditemukan')}
				</h1>
				<p class="mt-2 text-xs text-neutral-600">
					ID group order #{data.id} tidak tercatat di browser ini.
				</p>
				<a
					href="/group"
					class="tap-scale mt-6 inline-block rounded-full bg-brand px-6 py-2.5 text-xs font-bold text-white"
				>
					Buat Permintaan Baru
				</a>
			</div>
		{:else}
			<div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
				<p
					role="status"
					class="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"
				>
					Draf tersimpan di browser ini dan belum dikirim ke outlet. Hubungi outlet langsung untuk
					memastikan menu, jumlah, dan waktu pengambilan.
					<a href="/locations" class="font-semibold underline">Lihat lokasi outlet</a>.
				</p>
				<div
					class="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-5"
				>
					<div>
						<span class="font-mono text-xs font-bold text-neutral-500">#{g.id}</span>
						<h1 class="mt-1 font-display text-2xl text-ink" aria-label="Group Order">
							{@render kerned(`Group Order Outlet ${getOutlet(g.outletId)?.name ?? g.outletId}`)}
						</h1>
					</div>
					<span class="rounded-full bg-brand-soft px-3.5 py-1 text-xs font-bold text-brand">
						{totalCups(g.lines)} Cup
					</span>
				</div>

				<div class="mt-5 space-y-2 text-xs leading-relaxed text-neutral-600">
					<p><strong>Penanggung Jawab:</strong> {g.name} ({g.whatsapp})</p>
					<p><strong>Jadwal Pengambilan:</strong> {g.schedule}</p>
					<p>
						<strong>Status:</strong>
						<span class="rounded-md bg-neutral-100 px-2 py-0.5 font-bold text-ink"
							>Draf tersimpan</span
						>
					</p>
				</div>

				<!-- ITEMS -->
				<div class="mt-6 border-t border-black/10 pt-4">
					<h2 class="text-xs font-bold tracking-wider text-neutral-500 uppercase">Daftar Menu</h2>
					<div class="mt-2 divide-y divide-black/5 text-xs">
						{#each g.lines as l}
							<div class="flex items-center justify-between py-2">
								<span class="font-medium text-ink"
									>{getMenuItem(l.menuItemId)?.name ?? l.menuItemId}</span
								>
								<span class="font-bold text-ink">{l.qty} cup</span>
							</div>
						{/each}
					</div>
				</div>

				{#if dev && g.note}
					<div
						class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
					>
						<strong>Catatan Outlet:</strong>
						{g.note}
					</div>
				{/if}

				{#if msg}
					<div class="mt-4 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
						{msg}
					</div>
				{/if}

				<!-- WORKFLOW CONTROLS -->
				{#if dev}
					<div class="mt-6 border-t border-black/10 pt-4">
						<p class="text-xs font-bold text-neutral-500 uppercase">
							Simulasi Group Order: {g.state}
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							{#if g.state === 'APPROVED'}
								<button
									onclick={() => go('PENDING_PAYMENT')}
									class="tap-scale rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-dark"
								>
									Lanjut ke Pembayaran →
								</button>
							{/if}
							{#if dev && g.state === 'PENDING_PAYMENT'}
								<button
									onclick={() => go('CONFIRMED')}
									class="tap-scale rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
								>
									Simulasi Bayar Sah (Mock)
								</button>
							{/if}
							{#if g.state === 'CONFIRMED'}
								<button
									onclick={() => go('SCHEDULED_PREPARATION')}
									class="tap-scale rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
								>
									Jadwalkan Penyiapan Kru Outlet
								</button>
							{/if}
							{#if g.state === 'SCHEDULED_PREPARATION'}
								<button
									onclick={() => go('READY')}
									class="tap-scale rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
								>
									Tandai Siap Diambil
								</button>
							{/if}
							{#if g.state === 'READY'}
								<button
									onclick={() => go('COMPLETED')}
									class="tap-scale rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-white hover:bg-brand"
								>
									Selesaikan Order (Ambil Selesai)
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
