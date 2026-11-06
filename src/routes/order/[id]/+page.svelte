<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { getOrder, failReason, moveOrder } from '$lib/stores/orders';
	import { statusLabel, waLink } from '$lib/support';
	import {
		createMockPayment,
		getMockMeta,
		isExpired,
		mockWebhook
	} from '$lib/payment/mock-provider';
	import { track } from '$lib/analytics/events';
	import { getOutlet } from '$lib/core/outlets';
	import { KERN_MAP } from '$lib/kern';
	import type { Order } from '$lib/core/contracts';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	const { data } = $props();
	let order = $state<Order | undefined>(undefined);
	let reason = $state('');
	let payMsg = $state('');
	let isProcessing = $state(false);
	let loaded = $state(false);

	onMount(() => {
		order = getOrder(data.id);
		if (order) {
			reason = failReason(order.id);
			if (dev && order.state === 'PENDING_PAYMENT' && !getMockMeta(order.id)) {
				createMockPayment(order.id);
			}
		}
		loaded = true;
	});

	const link = $derived(order ? waLink(order, reason || 'kendala') : null);
	const isFail = $derived(order?.state === 'FULFILLMENT_FAILED');
	const isPending = $derived(order?.state === 'PENDING_PAYMENT');
	const isReady = $derived(order?.state === 'READY');
	const isPreparing = $derived(
		order?.state === 'PREPARING' || order?.state === 'CONFIRMED' || order?.state === 'PAID'
	);
	const isCompleted = $derived(order?.state === 'COMPLETED');

	function refresh(): void {
		order = getOrder(data.id);
	}

	function pay(ok: boolean): void {
		if (!order) return;
		isProcessing = true;

		const meta = getMockMeta(order.id);
		if (meta && isExpired(meta.createdAt, Date.now())) {
			moveOrder(order.id, 'EXPIRED');
			payMsg = 'Waktu pembayaran kedaluwarsa. Silakan buat pesanan baru.';
			refresh();
			isProcessing = false;
			return;
		}

		const r = mockWebhook({ orderId: order.id, amount: order.total, ok });
		if (r === 'duplicate') {
			payMsg = 'Pesanan sudah tercatat dibayar.';
			refresh();
			isProcessing = false;
			return;
		}

		if (!ok || r === 'rejected') {
			payMsg = 'Simulasi pembayaran gagal ditolak sistem.';
			track('payment_failed', { outlet: order.outletId, value: order.total });
			isProcessing = false;
			return;
		}

		moveOrder(order.id, 'PAID');
		track('payment_success', { outlet: order.outletId, value: order.total });
		track('order_confirmed', { outlet: order.outletId, value: order.total });
		payMsg = 'Simulasi pembayaran berhasil. Tidak ada pembayaran atau pesanan yang dikirim.';
		refresh();
		isProcessing = false;
	}

	// Simulating staff progress for testing
	function advanceToReady(): void {
		if (!order) return;
		moveOrder(order.id, 'READY');
		refresh();
	}

	function advanceToComplete(): void {
		if (!order) return;
		moveOrder(order.id, 'COMPLETED');
		refresh();
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
	<title>Status Order #{data.id} | Zatiaras Juice</title>
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-3xl px-4 sm:px-6">
		{#if !loaded}
			<p role="status" class="text-sm text-neutral-600">Memuat pesanan di browser ini...</p>
		{:else if !order}
			<div class="rounded-3xl border border-black/[0.08] bg-white p-12 text-center shadow-xs">
				<h1 class="font-display text-2xl font-bold text-ink" aria-label="Pesanan Tidak Ditemukan">
					{@render kerned('Pesanan Tidak Ditemukan')}
				</h1>
				<p class="mt-2 text-xs text-neutral-500 sm:text-sm">
					ID pesanan #{data.id} tidak tercatat pada peramban perangkat ini.
				</p>
				<div class="mt-6 flex justify-center gap-3">
					<a
						href="/track"
						class="tap-scale rounded-full bg-brand px-6 py-3 text-xs font-bold text-white shadow-xs"
					>
						Lacak ID Lain
					</a>
					<a
						href="/menu"
						class="tap-scale rounded-full border border-black/15 bg-white px-6 py-3 text-xs font-bold text-neutral-700"
					>
						Ke Menu
					</a>
				</div>
			</div>
		{:else}
			<!-- ORDER HEADER -->
			<div class="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-8">
				<p
					role="status"
					class="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"
				>
					Data ini tersimpan di browser dan bukan status langsung dari outlet atau bukti pembayaran.
					Hubungi outlet untuk memastikan pesanan.
					<a href="/locations" class="font-semibold underline">Lihat lokasi outlet</a>.
				</p>
				<div
					class="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.08] pb-6"
				>
					<div>
						<div class="flex items-center gap-2">
							<span
								class="rounded-md bg-neutral-100 px-2.5 py-1 font-mono text-xs font-bold text-neutral-700"
							>
								#{order.id}
							</span>
							<span class="text-xs font-semibold text-neutral-500">Self-Order Pickup</span>
						</div>
						<h1
							class="mt-2.5 font-display text-2xl font-extrabold text-ink sm:text-3xl"
							aria-label="Pesanan Zatiaras"
						>
							{@render kerned(`Outlet ${getOutlet(order.outletId)?.name ?? order.outletId}`)}
						</h1>
					</div>

					<div class="text-left sm:text-right">
						<span class="text-[11px] font-bold tracking-wider text-neutral-400 uppercase"
							>Total Pembayaran</span
						>
						<p class="font-display text-2xl font-extrabold text-brand sm:text-3xl">
							Rp{order.total.toLocaleString('id-ID')}
						</p>
					</div>
				</div>

				<!-- PROGRESS STEPPER -->
				<div class="border-b border-black/[0.06] py-6">
					<div class="grid grid-cols-4 gap-2 text-center text-xs">
						<!-- STEP 1 -->
						<div class="flex flex-col items-center">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-bold text-white shadow-xs"
							>
								✓
							</div>
							<span class="mt-2 font-bold text-ink">Pesanan</span>
							<span class="text-[10px] text-neutral-500">Diterima</span>
						</div>

						<!-- STEP 2 -->
						<div class="flex flex-col items-center">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white {isPending
									? 'bg-amber-500 ring-4 ring-amber-100'
									: 'bg-brand'}"
							>
								{isPending ? '2' : '✓'}
							</div>
							<span class="mt-2 font-bold text-ink">Pembayaran</span>
							<span class="text-[10px] text-neutral-500">{isPending ? 'Menunggu' : 'Lunas'}</span>
						</div>

						<!-- STEP 3 -->
						<div class="flex flex-col items-center">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white {isPreparing
									? 'bg-blue-600 ring-4 ring-blue-100'
									: isReady || isCompleted
										? 'bg-brand'
										: 'bg-neutral-200 text-neutral-500'}"
							>
								{isReady || isCompleted ? '✓' : '3'}
							</div>
							<span class="mt-2 font-bold text-ink">Peracikan</span>
							<span class="text-[10px] text-neutral-500">Dapur</span>
						</div>

						<!-- STEP 4 -->
						<div class="flex flex-col items-center">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full font-bold text-white {isReady
									? 'animate-pulse bg-emerald-600 ring-4 ring-emerald-100'
									: isCompleted
										? 'bg-brand'
										: 'bg-neutral-200 text-neutral-500'}"
							>
								{isCompleted ? '✓' : '4'}
							</div>
							<span class="mt-2 font-bold text-ink">Siap Ambil</span>
							<span class="text-[10px] text-neutral-500">Di Outlet</span>
						</div>
					</div>
				</div>

				<!-- STATUS BANNER -->
				<div
					class="rounded-2xl p-4 sm:p-5 {isFail
						? 'border border-rose-200 bg-rose-50 text-rose-800'
						: isReady
							? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
							: isPending
								? 'border border-amber-200 bg-amber-50 text-amber-900'
								: 'border border-black/5 bg-neutral-50 text-ink'}"
				>
					<div class="flex items-center gap-3">
						<span
							class="flex h-3 w-3 rounded-full {isFail
								? 'bg-rose-500'
								: isReady
									? 'bg-emerald-500'
									: isPending
										? 'bg-amber-500'
										: 'bg-blue-500'}"
						></span>
						<p class="text-sm font-bold">
							Status: {statusLabel(order.state)}
						</p>
					</div>

					{#if isReady}
						<p class="mt-2 text-xs leading-relaxed text-emerald-800">
							Jus sudah selesai diracik! Silakan menuju kasir outlet <strong
								>{getOutlet(order.outletId)?.name ?? order.outletId}</strong
							>
							dan sebutkan nomor order <strong>#{order.id}</strong>.
						</p>
					{:else if isPending}
						<p class="mt-2 text-xs leading-relaxed text-amber-800">
							Menunggu konfirmasi pembayaran via sistem verifikasi server.
						</p>
					{:else if isPreparing}
						<p class="mt-2 text-xs leading-relaxed text-blue-800">
							Kru outlet sedang menyiapkan pesananmu. Outlet akan memberi pembaruan saat pesanan
							siap diambil.
						</p>
					{/if}
				</div>

				<!-- FULFILLMENT FAILURE RECOVERY -->
				{#if isFail}
					<div class="mt-6 rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
						<h3 class="font-bold text-rose-900">Ada kendala stok buah di outlet</h3>
						<p class="mt-1 text-xs text-rose-700">
							Pembayaranmu sudah tercatat aman di sistem. Jika buah habis mendadak, staf kami siap
							mengganti varian atau memproses pengembalian dana secepatnya.
						</p>
						{#if link}
							<a
								href={link}
								target="_blank"
								rel="noopener noreferrer"
								onclick={() =>
									order &&
									track('whatsapp_support_clicked', { outlet: order.outletId, value: order.total })}
								class="tap-scale mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
									<path
										d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.92-9.91-9.92z"
									/>
								</svg>
								<span>Chat Bantuan WhatsApp (Staf Manusia) →</span>
							</a>
						{:else if order}
							<div
								class="mt-4 rounded-2xl border border-black/10 bg-white p-4 text-xs text-neutral-600"
								role="status"
							>
								Bantuan WhatsApp belum tersambung. Simpan nomor pesanan
								<strong class="font-mono text-ink">#{order.id}</strong> dan tunjukkan ke kru outlet {getOutlet(
									order.outletId
								)?.name ?? order.outletId}.
							</div>
						{/if}
					</div>
				{/if}

				<!-- MOCK PAYMENT SIMULATOR (dev only, tak tampil produksi) -->
				{#if dev && isPending}
					<div class="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-5">
						<div class="flex items-center justify-between">
							<div>
								<span class="text-[11px] font-bold tracking-wider text-neutral-500 uppercase"
									>Simulasi Pembayaran</span
								>
								<h3 class="text-sm font-bold text-ink">Verifikasi Server Webhook (Sandbox)</h3>
							</div>
							<span class="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand"
								>Demo Mode</span
							>
						</div>
						<p class="mt-1 text-xs text-neutral-600">
							Uji alur webhook verifikasi server resmi sebelum pesanan dikirim ke dapur.
						</p>

						{#if payMsg}
							<div
								class="mt-3 rounded-xl border border-brand/20 bg-brand-soft/50 p-3 text-xs font-semibold text-brand"
							>
								{payMsg}
							</div>
						{/if}

						<div class="mt-4 flex flex-wrap gap-2.5">
							<button
								type="button"
								onclick={() => pay(true)}
								disabled={isProcessing}
								class="tap-scale rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
							>
								{isProcessing ? 'Verifikasi...' : '✓ Simulasi Bayar Berhasil'}
							</button>
							<button
								type="button"
								onclick={() => pay(false)}
								disabled={isProcessing}
								class="tap-scale rounded-xl border border-rose-300 bg-white px-5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
							>
								✕ Simulasi Gagal
							</button>
						</div>
					</div>
				{/if}

				<!-- SIMULASI STATUS CREW (dev only, tak tampil produksi) -->
				{#if dev && isPreparing}
					<div class="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs">
						<p class="font-bold text-blue-900">Alat Simulasi Kru Outlet (Demo):</p>
						<p class="mt-0.5 text-blue-700">
							Simulasikan saat pesanan sudah selesai diracik oleh staf outlet:
						</p>
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								onclick={advanceToReady}
								class="tap-scale rounded-lg bg-blue-700 px-3.5 py-2 font-bold text-white hover:bg-blue-800"
							>
								Ubah Status: Jus Siap Diambil
							</button>
						</div>
					</div>
				{:else if isReady}
					<div class="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
						<p class="font-bold text-emerald-900">Alat Simulasi Kru Outlet (Demo):</p>
						<p class="mt-0.5 text-emerald-700">Tandai pesanan telah diambil pelanggan:</p>
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								onclick={advanceToComplete}
								class="tap-scale rounded-lg bg-emerald-700 px-3.5 py-2 font-bold text-white hover:bg-emerald-800"
							>
								Selesaikan Pengambilan (Completed)
							</button>
						</div>
					</div>
				{/if}

				<!-- ORDER DETAILS -->
				<div class="mt-8 border-t border-black/10 pt-6">
					<h3 class="text-xs font-bold tracking-wider text-neutral-500 uppercase">
						Rincian Item Pesanan
					</h3>
					<div class="mt-3 divide-y divide-black/5">
						{#each order.items as it}
							<div class="flex items-center justify-between py-3">
								<div class="flex items-center gap-3">
									<img src={zcup} alt="" class="h-8 w-auto" />
									<div>
										<p class="text-sm font-bold text-ink">{it.name ?? it.menuItemId}</p>
										<p class="text-xs text-neutral-500">
											{it.qty} cup × Rp{it.unitPrice.toLocaleString('id-ID')}
										</p>
									</div>
								</div>
								<span class="text-sm font-bold text-ink">
									Rp{(it.unitPrice * it.qty).toLocaleString('id-ID')}
								</span>
							</div>
						{/each}
					</div>
				</div>

				<div
					class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 text-xs"
				>
					<div class="text-neutral-500">
						<span>Nama: <strong class="text-ink">{order.contact.name}</strong></span>
						<span class="mx-2">•</span>
						<span>WA: <strong class="text-ink">{order.contact.whatsapp}</strong></span>
					</div>
					<a href="/feedback" class="font-bold text-brand hover:underline">
						Beri Masukan / Feedback →
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
