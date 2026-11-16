<script lang="ts">
	// Panel kasir: masuk dengan PIN outlet, lihat pesanan web yang masuk, ubah statusnya.
	// Status disimpan di server (D1) sehingga pelanggan melihat perubahannya di halaman pesanan.
	import { onMount } from 'svelte';
	import { OUTLETS } from '$lib/core/outlets';
	import { ICE_LABEL, SWEET_LABEL, SIZE_LABEL } from '$lib/core/options';
	import { rupiah } from '$lib/core/whatsapp-order';
	import type { OrderItem, OrderState } from '$lib/core/contracts';
	import { statusLabel } from '$lib/support';

	interface Row {
		id: string;
		outletId: string;
		state: OrderState;
		name: string;
		pickupNote: string | null;
		note: string | null;
		total: number;
		items: OrderItem[];
		createdAt: number;
	}

	let outletId = $state(OUTLETS[0].id as string);
	let pin = $state('');
	let authed = $state<string | null>(null);
	let rows = $state<Row[]>([]);
	let msg = $state('');
	let sound = $state(true);
	let known = new Set<string>();
	let first = true;

	// Aksi berikutnya per status. Pembayaran tunai atau QRIS terjadi saat Selesai (serah terima).
	const NEXT: Partial<Record<OrderState, { to: OrderState; label: string }[]>> = {
		AWAITING_CASHIER: [
			{ to: 'CONFIRMED', label: 'Terima' },
			{ to: 'CANCELLED', label: 'Batalkan' }
		],
		CONFIRMED: [{ to: 'PREPARING', label: 'Mulai racik' }],
		PREPARING: [{ to: 'READY', label: 'Siap diambil' }],
		READY: [{ to: 'COMPLETED', label: 'Sudah dibayar dan diambil' }]
	};

	function beep(): void {
		if (!sound) return;
		try {
			const ctx = new AudioContext();
			[880, 1175].forEach((f, i) => {
				const o = ctx.createOscillator();
				const g = ctx.createGain();
				o.frequency.value = f;
				g.gain.value = 0.15;
				o.connect(g).connect(ctx.destination);
				o.start(ctx.currentTime + i * 0.18);
				o.stop(ctx.currentTime + i * 0.18 + 0.15);
			});
		} catch {
			/* browser tanpa audio: abaikan */
		}
	}

	async function load(): Promise<void> {
		const res = await fetch('/api/outlet/orders', { cache: 'no-store' });
		if (res.status === 401) {
			authed = null;
			return;
		}
		if (!res.ok) {
			msg = 'Server pesanan belum aktif.';
			return;
		}
		const d = (await res.json()) as { outletId: string; orders: Row[] };
		authed = d.outletId;
		msg = '';
		const fresh = d.orders.filter((o) => o.state === 'AWAITING_CASHIER' && !known.has(o.id));
		d.orders.forEach((o) => known.add(o.id));
		if (!first && fresh.length) beep();
		first = false;
		rows = d.orders;
	}

	async function login(e: Event): Promise<void> {
		e.preventDefault();
		msg = '';
		const res = await fetch('/api/outlet/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ outletId, pin })
		});
		pin = '';
		if (res.status === 503) {
			msg = 'Panel kasir belum dikonfigurasi di server.';
			return;
		}
		if (!res.ok) {
			msg = 'PIN salah.';
			return;
		}
		first = true;
		known = new Set();
		await load();
	}

	async function move(id: string, to: OrderState): Promise<void> {
		const res = await fetch(`/api/outlet/orders/${id}/state`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ to })
		});
		msg = res.ok ? '' : res.status === 409 ? 'Status sudah berubah, daftar disegarkan.' : 'Gagal mengubah status.';
		await load();
	}

	function clock(ms: number): string {
		const t = new Date(ms + 8 * 3600e3);
		return `${String(t.getUTCHours()).padStart(2, '0')}.${String(t.getUTCMinutes()).padStart(2, '0')}`;
	}

	onMount(() => {
		void load();
		const t = setInterval(() => authed && load(), 15000);
		return () => clearInterval(t);
	});
</script>

<svelte:head>
	<title>Kasir | Zatiaras Juice</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-[100dvh] bg-neutral-100 px-4 py-6">
	<div class="mx-auto max-w-3xl">
		<h1 class="font-display text-3xl font-extrabold text-ink">Kasir</h1>

		{#if !authed}
			<form onsubmit={login} class="mt-6 space-y-4 rounded-3xl bg-white p-6 shadow-sm">
				<label class="block text-xs font-bold text-neutral-600">
					Outlet
					<select bind:value={outletId} class="mt-1 w-full rounded-2xl border border-black/15 px-4 py-3 text-sm">
						{#each OUTLETS as o}<option value={o.id}>{o.name} · {o.city}</option>{/each}
					</select>
				</label>
				<label class="block text-xs font-bold text-neutral-600">
					PIN
					<input
						bind:value={pin}
						type="password"
						inputmode="numeric"
						autocomplete="current-password"
						class="mt-1 w-full rounded-2xl border border-black/15 px-4 py-3 text-sm"
					/>
				</label>
				<button class="min-h-12 w-full rounded-full bg-brand text-sm font-bold text-white">Masuk</button>
				{#if msg}<p role="alert" class="text-xs font-semibold text-rose-700">{msg}</p>{/if}
			</form>
		{:else}
			<div class="mt-2 flex items-center justify-between text-xs text-neutral-600">
				<span>Outlet {OUTLETS.find((o) => o.id === authed)?.name} · disegarkan tiap 15 detik</span>
				<label class="flex items-center gap-2 font-bold">
					<input type="checkbox" bind:checked={sound} /> Bunyi pesanan baru
				</label>
			</div>
			{#if msg}<p role="alert" class="mt-3 text-xs font-semibold text-rose-700">{msg}</p>{/if}
			<ul class="mt-4 space-y-3">
				{#each rows as o (o.id)}
					<li class="rounded-3xl bg-white p-5 shadow-sm">
						<div class="flex flex-wrap items-baseline justify-between gap-2">
							<p class="font-mono text-lg font-extrabold text-brand">{o.id}</p>
							<p class="text-xs text-neutral-500">masuk {clock(o.createdAt)} WITA · {statusLabel(o.state)}</p>
						</div>
						<p class="mt-1 text-sm font-bold text-ink">{o.name} · {o.pickupNote ?? 'Secepatnya'}</p>
						<ul class="mt-3 divide-y divide-black/5 text-sm">
							{#each o.items as it}
								<li class="flex justify-between gap-3 py-2">
									<span>
										<b>{it.name} × {it.qty}</b>
										<br /><span class="text-xs text-neutral-500"
											>{it.size ? SIZE_LABEL[it.size] : ''} · Manis: {it.sweet ? SWEET_LABEL[it.sweet] : '-'} · Es: {it.ice ? ICE_LABEL[it.ice] : '-'}</span
										>
									</span>
									<b>{rupiah(it.unitPrice * it.qty)}</b>
								</li>
							{/each}
						</ul>
						{#if o.note}<p class="mt-2 text-xs text-neutral-600">Catatan: {o.note}</p>{/if}
						<div class="mt-3 flex items-center justify-between gap-3">
							<p class="text-sm font-extrabold">Total {rupiah(o.total)}</p>
							<div class="flex flex-wrap gap-2">
								{#each NEXT[o.state] ?? [] as a}
									<button
										type="button"
										onclick={() => move(o.id, a.to)}
										class="min-h-11 rounded-full px-5 text-xs font-bold {a.to === 'CANCELLED'
											? 'bg-white text-rose-700 ring-1 ring-rose-300'
											: 'bg-ink text-white'}">{a.label}</button
									>
								{/each}
							</div>
						</div>
					</li>
				{:else}
					<li class="rounded-3xl bg-white p-8 text-center text-sm text-neutral-500">Belum ada pesanan masuk</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
