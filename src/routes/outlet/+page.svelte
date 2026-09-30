<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { MENU } from '$lib/data/menu';
	import { outlet } from '$lib/stores/outlet.svelte';
	import { listOrders, moveOrder, failOrder, failReason, seedDemo } from '$lib/stores/orders';
	import { FAIL_REASONS, canFail, nextOutletAction } from '$lib/stores/outlet-logic';
	import { listGroups, reviewGroup, totalCups, type GroupRequest } from '$lib/group/logic';
	import { track } from '$lib/analytics/events';
	import { KERN_MAP } from '$lib/kern';
	import type { Order, OutletLoad } from '$lib/core/contracts';
	import { OUTLETS, getOutlet } from '$lib/core/outlets';

	let tab = $state<string>('juanda');
	let orders = $state<Order[]>([]);
	let reason = $state<Record<string, string>>({});
	let groups = $state<GroupRequest[]>([]);

	const loads: { id: OutletLoad; label: string; desc: string; color: string }[] = [
		{
			id: 'NORMAL',
			label: 'Normal',
			desc: 'Antrean lancar',
			color: 'border-emerald-300 bg-emerald-50 text-emerald-800'
		},
		{
			id: 'BUSY',
			label: 'Ramai',
			desc: 'Antrean meningkat',
			color: 'border-amber-300 bg-amber-50 text-amber-800'
		},
		{
			id: 'VERY_BUSY',
			label: 'Sangat Ramai',
			desc: 'Antrean sangat padat',
			color: 'border-orange-300 bg-orange-50 text-orange-800'
		},
		{
			id: 'PAUSED',
			label: 'Jeda Order',
			desc: 'Tutup order web',
			color: 'border-rose-400 bg-rose-100 text-rose-900'
		}
	];

	function refresh(): void {
		orders = listOrders().filter((o) => o.outletId === tab);
		groups = listGroups().filter((g) => g.outletId === tab);
	}

	function ensureSeed(): void {
		seedDemo();
		refresh();
	}

	function act(id: string, to: Parameters<typeof moveOrder>[1]): void {
		moveOrder(id, to);
		const o = getOrderLite(id);
		if (to === 'PREPARING') track('order_preparing', { outlet: tab });
		if (to === 'READY') track('order_ready', { outlet: tab });
		if (to === 'COMPLETED') track('order_completed', { outlet: tab, value: o?.total ?? 0 });
		refresh();
	}

	function getOrderLite(id: string): { total: number } | undefined {
		return orders.find((o) => o.id === id);
	}

	function fail(id: string): void {
		const selectedReason = reason[id] ?? FAIL_REASONS[0];
		failOrder(id, selectedReason);
		track('fulfillment_failed', { outlet: tab, reason: selectedReason });
		refresh();
	}

	const currentLoad = $derived(outlet.getLoad(tab));
	const baru = $derived(orders.filter((o) => o.state === 'PAID' || o.state === 'CONFIRMED'));
	const proses = $derived(orders.filter((o) => o.state === 'PREPARING'));
	const siap = $derived(orders.filter((o) => o.state === 'READY'));
	const selesai = $derived(orders.filter((o) => o.state === 'COMPLETED'));
	const kendala = $derived(orders.filter((o) => o.state === 'FULFILLMENT_FAILED'));

	onMount(refresh);
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
	<title>Panel Kru Outlet | Zatiaras Juice</title>
</svelte:head>

<div class="min-h-[100dvh] bg-neutral-100 py-6 sm:py-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6">
		<!-- HEADER DASHBOARD -->
		<div
			class="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between"
		>
			<div>
				<div class="flex items-center gap-2">
					<span class="h-3 w-3 animate-pulse rounded-full bg-emerald-500"></span>
					<span class="text-xs font-bold tracking-wider text-neutral-500 uppercase"
						>Pratinjau antrean outlet</span
					>
				</div>
				<h1 class="mt-1 font-display text-3xl text-ink sm:text-4xl" aria-label="Panel Kru Outlet">
					{@render kerned(`Gerai ${getOutlet(tab)?.name ?? tab}`)}
				</h1>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<div class="flex flex-wrap gap-1 rounded-2xl border border-black/15 bg-neutral-100 p-1">
					{#each OUTLETS as o}
						<button
							type="button"
							onclick={() => {
								tab = o.id;
								refresh();
							}}
							class="tap-scale rounded-xl px-4 py-2.5 text-xs font-bold transition {tab === o.id
								? 'bg-ink text-white shadow-xs'
								: 'text-neutral-700 hover:bg-neutral-200'}"
						>
							{o.name}
						</button>
					{/each}
				</div>

				{#if dev}
					<button
						type="button"
						onclick={ensureSeed}
						class="tap-scale rounded-2xl border border-black/15 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50"
					>
						+ Isi Data Demo
					</button>
				{/if}
			</div>
		</div>

		<div
			class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950"
			role="status"
		>
			<strong>Mode pratinjau lokal.</strong> Pesanan dan perubahan menu hanya tersimpan di browser ini;
			panel belum terhubung ke server/POS dan bukan antrean operasional langsung.
		</div>

		<!-- STATUS BEBAN OUTLET (LOAD CONTROLLER) -->
		<div class="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-sm font-bold text-ink">Status beban outlet (pratinjau)</h2>
					<p class="text-xs text-neutral-500">
						Status demo tersimpan di browser ini. Perubahan belum membatasi checkout di server.
					</p>
				</div>
				<span
					class="rounded-full px-3 py-1 text-xs font-bold {loads.find((l) => l.id === currentLoad)
						?.color}"
				>
					Mode: {loads.find((l) => l.id === currentLoad)?.label}
				</span>
			</div>

			<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each loads as l}
					<button
						type="button"
						onclick={() => outlet.setLoad(tab, l.id)}
						class="tap-scale flex flex-col rounded-2xl border-2 p-3.5 text-left transition {currentLoad ===
						l.id
							? 'border-ink bg-ink text-white shadow-md'
							: 'border-black/10 bg-white hover:border-black/30'}"
					>
						<span class="text-sm font-bold">{l.label}</span>
						<span class="text-[11px] {currentLoad === l.id ? 'text-white/70' : 'text-neutral-500'}"
							>{l.desc}</span
						>
					</button>
				{/each}
			</div>

			{#if currentLoad === 'PAUSED'}
				<div
					class="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-xs font-bold text-rose-800"
				>
					Perhatian: Pesanan web untuk outlet {getOutlet(tab)?.name ?? tab} sedang DIJEDA. Pelanggan baru
					tidak dapat melakukan checkout.
				</div>
			{/if}
		</div>

		<!-- KANBAN BOARD ANTRIAN PESANAN -->
		<div class="mt-8">
			<h2 class="text-base font-bold text-ink">Antrean Pesanan Masuk ({orders.length} Total)</h2>

			<div class="mt-4 grid gap-6 md:grid-cols-3">
				<!-- KOLOM 1: PESANAN BARU (MASUK) -->
				<div class="flex flex-col rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between border-b border-black/10 pb-3">
						<div class="flex items-center gap-2">
							<span class="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
							<h3 class="text-sm font-bold text-ink">1. Pesanan Baru Masuk</h3>
						</div>
						<span class="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
							{baru.length}
						</span>
					</div>

					<div class="mt-4 space-y-3">
						{#if baru.length === 0}
							<p class="py-6 text-center text-xs text-neutral-400">Tidak ada pesanan baru</p>
						{/if}

						{#each baru as o}
							{@const next = nextOutletAction(o.state)}
							<div class="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4 shadow-xs">
								<div class="flex items-center justify-between">
									<span class="font-mono text-xs font-bold text-blue-900">#{o.id}</span>
									<span class="text-xs font-extrabold text-ink"
										>Rp{o.total.toLocaleString('id-ID')}</span
									>
								</div>
								<p class="mt-1 text-sm font-bold text-ink">{o.contact.name}</p>
								<p class="text-xs text-neutral-500">Slot: {o.pickupSlotId}</p>

								<div class="mt-3 divide-y divide-black/5 text-xs">
									{#each o.items as item}
										<div class="flex justify-between py-1 text-neutral-700">
											<span>{item.menuItemId}</span>
											<strong>×{item.qty}</strong>
										</div>
									{/each}
								</div>

								<div class="mt-4 flex flex-col gap-2">
									{#if next}
										<button
											type="button"
											onclick={() => act(o.id, next.to)}
											class="tap-scale w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
										>
											{next.label} →
										</button>
									{/if}

									{#if canFail(o.state)}
										<div class="flex gap-1.5 pt-1">
											<select
												bind:value={reason[o.id]}
												class="w-full rounded-xl border border-black/15 bg-white px-2 py-2 text-[11px] text-neutral-700"
											>
												{#each FAIL_REASONS as r}
													<option value={r}>{r}</option>
												{/each}
											</select>
											<button
												type="button"
												onclick={() => fail(o.id)}
												class="tap-scale shrink-0 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
											>
												Kendala
											</button>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- KOLOM 2: SEDANG DIRACIK (DAPUR) -->
				<div class="flex flex-col rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between border-b border-black/10 pb-3">
						<div class="flex items-center gap-2">
							<span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
							<h3 class="text-sm font-bold text-ink">2. Sedang Diracik Dapur</h3>
						</div>
						<span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
							{proses.length}
						</span>
					</div>

					<div class="mt-4 space-y-3">
						{#if proses.length === 0}
							<p class="py-6 text-center text-xs text-neutral-400">Dapur sedang santai</p>
						{/if}

						{#each proses as o}
							<div class="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-4 shadow-xs">
								<div class="flex items-center justify-between">
									<span class="font-mono text-xs font-bold text-amber-900">#{o.id}</span>
									<span class="text-xs font-extrabold text-ink"
										>Rp{o.total.toLocaleString('id-ID')}</span
									>
								</div>
								<p class="mt-1 text-sm font-bold text-ink">{o.contact.name}</p>

								<div class="mt-3 divide-y divide-black/5 text-xs">
									{#each o.items as item}
										<div class="flex justify-between py-1 text-neutral-700">
											<span>{item.menuItemId}</span>
											<strong>×{item.qty}</strong>
										</div>
									{/each}
								</div>

								<button
									type="button"
									onclick={() => act(o.id, 'READY')}
									class="tap-scale mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
								>
									✓ Selesai Diracik (Siap Ambil)
								</button>
							</div>
						{/each}
					</div>
				</div>

				<!-- KOLOM 3: SIAP DIAMBIL (MEJA DISPLAY) -->
				<div class="flex flex-col rounded-3xl border border-black/10 bg-white p-5 shadow-sm">
					<div class="flex items-center justify-between border-b border-black/10 pb-3">
						<div class="flex items-center gap-2">
							<span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
							<h3 class="text-sm font-bold text-ink">3. Siap Diambil Pelanggan</h3>
						</div>
						<span
							class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800"
						>
							{siap.length}
						</span>
					</div>

					<div class="mt-4 space-y-3">
						{#if siap.length === 0}
							<p class="py-6 text-center text-xs text-neutral-400">
								Belum ada pesanan di meja pickup
							</p>
						{/if}

						{#each siap as o}
							<div class="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 shadow-xs">
								<div class="flex items-center justify-between">
									<span class="font-mono text-xs font-bold text-emerald-900">#{o.id}</span>
									<span class="text-xs font-bold text-emerald-800">SIAP DIAMBIL</span>
								</div>
								<p class="mt-1 text-sm font-bold text-ink">{o.contact.name}</p>
								<p class="text-xs text-neutral-500">Total: Rp{o.total.toLocaleString('id-ID')}</p>

								<button
									type="button"
									onclick={() => act(o.id, 'COMPLETED')}
									class="tap-scale mt-4 w-full rounded-xl bg-ink py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800"
								>
									Telah Diambil Pelanggan (Selesai)
								</button>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- SECTION: PENGATURAN STOK MENU OUTLET -->
		<div class="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
			<h2 class="text-base font-bold text-ink">
				Kendali Ketersediaan Stok Menu (Outlet {getOutlet(tab)?.name ?? tab})
			</h2>
			<p class="text-xs text-neutral-500">
				Tekan tombol untuk mengubah status stok jika buah habis mendadak.
			</p>

			<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{#each MENU as m}
					{@const cur = outlet.getAvail(tab, m.slug)}
					<div class="rounded-2xl border border-black/10 bg-neutral-50 p-4">
						<div class="flex items-center justify-between">
							<span class="text-sm font-bold text-ink">{m.name}</span>
							<span
								class="rounded-md px-2 py-0.5 text-[10px] font-bold {cur === 'AVAILABLE'
									? 'bg-emerald-100 text-emerald-800'
									: cur === 'LIMITED'
										? 'bg-amber-100 text-amber-800'
										: 'bg-rose-100 text-rose-800'}"
							>
								{cur}
							</span>
						</div>

						<div class="mt-3 grid grid-cols-3 gap-1 text-[11px] font-bold">
							<button
								type="button"
								onclick={() => outlet.setAvail(tab, m.slug, 'AVAILABLE')}
								class="tap-scale rounded-lg py-2 transition {cur === 'AVAILABLE'
									? 'bg-emerald-600 text-white'
									: 'border border-black/10 bg-white text-neutral-700'}"
							>
								Tersedia
							</button>
							<button
								type="button"
								onclick={() => outlet.setAvail(tab, m.slug, 'LIMITED')}
								class="tap-scale rounded-lg py-2 transition {cur === 'LIMITED'
									? 'bg-amber-500 text-white'
									: 'border border-black/10 bg-white text-neutral-700'}"
							>
								Terbatas
							</button>
							<button
								type="button"
								onclick={() => outlet.setAvail(tab, m.slug, 'SOLD_OUT')}
								class="tap-scale rounded-lg py-2 transition {cur === 'SOLD_OUT'
									? 'bg-rose-600 text-white'
									: 'border border-black/10 bg-white text-neutral-700'}"
							>
								Habis
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- SECTION: GROUP ORDERS & APPROVAL -->
		<div class="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 class="text-base font-bold text-ink">
						Persetujuan Group Order ({groups.filter((g) => g.state === 'REVIEWING').length} Menunggu)
					</h2>
					<p class="text-xs text-neutral-500">
						Konfirmasi kapasitas dapur sebelum pelanggan membayar.
					</p>
				</div>
				<span class="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
					Batas persetujuan belum dikonfigurasi
				</span>
			</div>

			<div class="mt-4 space-y-3">
				{#if groups.length === 0}
					<p class="py-6 text-center text-xs text-neutral-400">Tidak ada permintaan group order</p>
				{/if}

				{#each groups as g}
					<div
						class="flex flex-col justify-between gap-3 rounded-2xl border border-black/10 bg-neutral-50/60 p-4 sm:flex-row sm:items-center"
					>
						<div>
							<div class="flex items-center gap-2">
								<span class="font-mono text-xs font-bold text-ink">#{g.id}</span>
								<span
									class="rounded-md bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700"
									>{g.state}</span
								>
							</div>
							<p class="mt-1 text-sm font-bold text-ink">{g.name} ({g.whatsapp})</p>
							<p class="text-xs text-neutral-600">
								Jadwal: {g.schedule} · Total: {totalCups(g.lines)} cup
							</p>
						</div>

						{#if g.state === 'REVIEWING'}
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => {
										reviewGroup(g.id, true);
										track('group_order_approved', { outlet: tab, cups: totalCups(g.lines) });
										refresh();
									}}
									class="tap-scale rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
								>
									✓ Terima Pesanan
								</button>
								<button
									type="button"
									onclick={() => {
										reviewGroup(g.id, false, 'Kapasitas penuh');
										track('group_order_rejected', { outlet: tab });
										refresh();
									}}
									class="tap-scale rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
								>
									Tolak
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- SECTION: CATATAN KENDALA & SELESAI -->
		<div class="mt-8 grid gap-6 sm:grid-cols-2">
			<!-- KENDALA STOK -->
			<div class="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
				<h3 class="text-sm font-bold text-rose-900">Pesanan Terkendala ({kendala.length})</h3>
				<p class="text-xs text-neutral-500">
					Staf wajib segera menghubungi pelanggan via WhatsApp untuk solusi atau refund.
				</p>

				<div class="mt-3 space-y-2 text-xs">
					{#if kendala.length === 0}
						<p class="py-4 text-center text-neutral-400">Tidak ada pesanan bermasalah.</p>
					{/if}
					{#each kendala as o}
						<div class="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
							<p class="font-bold text-ink">#{o.id} — {o.contact.name}</p>
							<p class="text-rose-700">Kendala: {failReason(o.id)}</p>
							<p class="text-neutral-500">WA: {o.contact.whatsapp}</p>
						</div>
					{/each}
				</div>
			</div>

			<!-- SELESAI -->
			<div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
				<h3 class="text-sm font-bold text-ink">Riwayat Selesai Hari Ini ({selesai.length})</h3>
				<p class="text-xs text-neutral-500">Pesanan yang telah sukses diserahkan ke pelanggan.</p>

				<div class="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
					{#if selesai.length === 0}
						<p class="py-4 text-center text-neutral-400">Belum ada pesanan selesai.</p>
					{/if}
					{#each selesai as o}
						<div
							class="flex items-center justify-between rounded-xl border border-black/5 bg-neutral-50 p-2.5"
						>
							<div>
								<span class="font-mono font-bold text-neutral-700">#{o.id}</span>
								<span class="ml-1.5 text-neutral-500">{o.contact.name}</span>
							</div>
							<span class="font-bold text-emerald-700">Rp{o.total.toLocaleString('id-ID')}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
