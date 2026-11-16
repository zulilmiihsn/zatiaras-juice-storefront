<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { cart } from '$lib/stores/cart.svelte';
	import { MENU_VERIFIED } from '$lib/data/menu';
	import { liveMenu } from '$lib/stores/live-menu.svelte';
	import { getOutlet } from '$lib/core/outlets';
	import { outlet } from '$lib/stores/outlet.svelte';
	import { validateCheckout } from '$lib/core/checkout';
	import { checkoutGate } from '$lib/core/checkout-gate';
	import { optionSummary } from '$lib/core/options';
	import { lineKey } from '$lib/stores/cart-logic';
	import { PICKUP_CHOICES, pickupText, rupiah, witaClock } from '$lib/core/whatsapp-order';
	import { createDraft, listOrders, saveOrder } from '$lib/stores/orders';
	import { track } from '$lib/analytics/events';
	import { canonical } from '$lib/seo';
	import { KERN_MAP } from '$lib/kern';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	let name = $state('');
	let pickupId = $state('now');
	let note = $state('');
	let errors = $state<string[]>([]);
	let isSubmitting = $state(false);
	let now = $state(new Date());

	const currentOutlet = $derived(getOutlet(cart.outletId));

	$effect(() => {
		void liveMenu.ensure(cart.outletId);
	});
	const gate = $derived(
		checkoutGate({
			menuVerified: MENU_VERIFIED,
			availabilityVerified: liveMenu.verified(cart.outletId),
			hasQris: Boolean(currentOutlet?.qrisImage)
		})
	);
	const checkoutAvailable = $derived(gate.open);

	onMount(() => {
		now = new Date();
		if (!cart.empty && checkoutAvailable) {
			track('checkout_started', { outlet: cart.outletId, value: cart.subtotal });
		}
	});

	function getErrorMessage(code: string): string {
		switch (code) {
			case 'name_required':
				return 'Nama pemesan wajib diisi.';
			case 'slot_required':
				return 'Silakan pilih perkiraan waktu ambil.';
			case 'cart_empty':
				return 'Keranjang pesanan masih kosong.';
			case 'single_outlet_only':
			case 'outlet_mismatch':
				return 'Pesanan harus berasal dari satu outlet yang sama.';
			case 'soldout_blocked':
				return 'Ada item yang stoknya habis di outlet ini.';
			case 'outlet_paused':
				return 'Outlet sedang jeda menerima pesanan saat ini.';
			default:
				return 'Mohon periksa kembali data pesanan.';
		}
	}

	let sendError = $state('');

	// Satu ketukan: server mencatat pesanan, menghitung harga, dan memberi kode unik QRIS.
	// Pelanggan lalu membayar nominal persis itu lewat QRIS outlet; kasir mencocokkan uang masuk.
	// Tanpa server pesanan, kode unik tidak bisa dibuat, jadi pesanan tidak dikirim.
	async function submit(): Promise<void> {
		if (cart.empty || !checkoutAvailable || isSubmitting) return;
		sendError = '';
		isSubmitting = true;

		const base = getOutlet(cart.outletId);
		if (!base) {
			isSubmitting = false;
			return;
		}
		const live = { ...base, load: outlet.getLoad(base.id), acceptsWebOrders: true };
		const choice = PICKUP_CHOICES.find((c) => c.id === pickupId) ?? PICKUP_CHOICES[0];
		const slotId = `${live.id}-${choice.id}`;

		errors = validateCheckout({
			name: name.trim(),
			whatsapp: '',
			outlet: live,
			pickupSlotId: slotId,
			paymentMode: 'CASHIER',
			cart: cart.lines.map((l) => ({
				menuItemId: l.menuItemId,
				qty: l.qty,
				outletId: l.outletId,
				availability: l.availability,
				price: l.price
			}))
		});
		if (errors.length > 0) {
			isSubmitting = false;
			return;
		}

		const label = pickupText(choice, new Date());
		const draft = createDraft({
			outletId: live.id,
			name: name.trim(),
			whatsapp: '',
			slotId,
			lines: cart.lines,
			paymentMode: 'CASHIER',
			pickupNote: label,
			note,
			existingIds: listOrders().map((o) => o.id)
		});

		try {
			const res = await fetch('/api/orders', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					outletId: live.id,
					name: name.trim(),
					pickupChoiceId: choice.id,
					note,
					items: cart.lines.map((l) => ({
						slug: l.menuItemId,
						qty: l.qty,
						size: l.size,
						sweet: l.sweet,
						ice: l.ice
					}))
				})
			});
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				sendError =
					res.status === 429
						? 'Terlalu banyak pesanan sekaligus. Coba lagi sebentar lagi.'
						: res.status === 503
							? 'Pemesanan online sedang tidak tersedia. Coba lagi sebentar atau pesan langsung di outlet.'
							: e.error === 'item_sold_out'
								? 'Ada item yang habis di outlet ini. Periksa keranjang.'
								: 'Pesanan belum bisa dikirim. Periksa data lalu coba lagi.';
				isSubmitting = false;
				return;
			}
			// Pakai kode, harga, dan nominal QRIS dari server.
			const s = await res.json();
			saveOrder({
				...draft,
				id: s.id,
				total: s.total,
				items: s.items,
				pickupNote: s.pickupNote,
				state: 'AWAITING_CASHIER',
				uniqueCode: s.uniqueCode,
				payTotal: s.payTotal,
				expiresAt: s.expiresAt
			});
			track('order_placed_qris', { outlet: live.id, value: s.total, pickup: choice.id });
			cart.clear();
			goto(`/order/${s.id}`);
		} catch {
			sendError = 'Tidak ada koneksi ke server pesanan. Periksa internet lalu coba lagi.';
			isSubmitting = false;
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
	<title>Checkout Tamu | Zatiaras Juice</title>
	<link rel="canonical" href={canonical('/checkout')} />
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-5xl px-4 sm:px-6">
		<div class="mb-8 border-b border-black/[0.06] pb-6">
			<a
				href="/cart"
				class="tap-scale inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 transition-colors hover:text-brand"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
				<span>Kembali ke Keranjang</span>
			</a>
			<h1
				class="mt-3 font-display text-3xl leading-tight font-extrabold text-ink sm:text-4xl"
				aria-label="Checkout Tamu"
			>
				{@render kerned('Checkout Pesanan')}
			</h1>
			<div class="cup-lip-bar mt-3 w-12"></div>
			<p class="mt-2 text-xs text-neutral-500 sm:text-sm">
				Guest checkout cepat · Tanpa kewajiban registrasi atau login password
			</p>
			<nav
				class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold"
				aria-label="Kebijakan checkout"
			>
				<a class="text-brand underline underline-offset-4" href="/privacy">Kebijakan Privasi</a>
				<a class="text-brand underline underline-offset-4" href="/terms">Syarat & Ketentuan</a>
			</nav>
		</div>

		{#if cart.empty}
			<div class="rounded-3xl border border-black/[0.08] bg-white p-12 text-center shadow-xs">
				<p class="text-base font-bold text-ink">Keranjangmu kosong.</p>
				<p class="mt-1 text-xs text-neutral-500">
					Pilih jus segar terlebih dahulu sebelum checkout.
				</p>
				<a
					href="/menu"
					class="tap-scale mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-xs font-bold text-white shadow-md shadow-brand/25"
				>
					<span>Buka Menu</span>
					<svg
						class="h-3.5 w-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<path d="M5 12h14M12 5l7 7-7 7" />
					</svg>
				</a>
			</div>
		{:else if !checkoutAvailable}
			<section
				class="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8"
				role="status"
			>
				<span class="eyebrow">Checkout sementara belum tersedia</span>
				<h2 class="mt-2 font-display text-2xl font-bold text-ink">Pemesanan online belum aktif</h2>
				<p class="mt-2 text-sm leading-relaxed text-neutral-600">
					{#if gate.reason === 'no_whatsapp_number'}
						Menu tetap bisa dijelajahi. Nomor WhatsApp pesanan outlet ini belum tersambung.
					{:else}
						Menu tetap bisa dijelajahi. Checkout dibuka setelah harga dan ketersediaan outlet
						terverifikasi.
					{/if}
				</p>
				<a
					href="/menu"
					class="mt-5 inline-flex min-h-11 items-center rounded-full bg-brand px-6 py-3 text-sm font-bold text-white"
				>
					Kembali ke menu
				</a>
			</section>
		{:else}
			<div class="grid gap-8 lg:grid-cols-12">
				<!-- FORM SECTION -->
				<div class="space-y-6 lg:col-span-7">
					<!-- STEP 1: CONTACT INFO -->
					<div class="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-7">
						<div class="flex items-center gap-3">
							<span
								class="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-xs"
							>
								1
							</span>
							<h2 class="text-base font-bold text-ink">Nama pemesan</h2>
						</div>

						<div class="mt-5 space-y-4">
							<div>
								<label
									for="cust-name"
									class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
								>
									Nama atau panggilan <span class="text-brand">*</span>
								</label>
								<input
									id="cust-name"
									bind:value={name}
									type="text"
									placeholder="Contoh: Budi Santoso"
									class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
								/>
								<p class="mt-1 text-[11px] text-neutral-500">
									Untuk dipanggil kasir saat jus sudah siap.
								</p>
							</div>
						</div>
					</div>

					<!-- STEP 2: PICKUP SLOT -->
					<div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-7">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<span
									class="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
								>
									2
								</span>
								<h2 class="text-base font-bold text-ink">Diambil kapan</h2>
							</div>
						</div>

						<p class="mt-2 text-xs text-neutral-600">
							Pilih perkiraan kedatanganmu di outlet <strong class="text-ink"
								>{currentOutlet?.name ?? 'Juanda'}</strong
							>:
						</p>

						<div class="mt-4 grid grid-cols-2 gap-2.5">
							{#each PICKUP_CHOICES as c}
								<button
									type="button"
									aria-pressed={pickupId === c.id}
									onclick={() => {
										pickupId = c.id;
										track('pickup_slot_selected', { outlet: cart.outletId, slot: c.id });
									}}
									class="tap-scale min-h-14 rounded-2xl border p-3.5 text-left transition {pickupId ===
									c.id
										? 'border-brand bg-brand-soft/40 shadow-xs'
										: 'border-black/10 bg-white hover:border-black/20'}"
								>
									<p class="text-xs font-bold text-ink">{c.label}</p>
									<p class="text-[11px] text-neutral-500">
										{c.minutes
											? `sekitar ${witaClock(now, c.minutes)} WITA`
											: 'Jam siap dikonfirmasi kasir'}
									</p>
								</button>
							{/each}
						</div>
					</div>

					<!-- CATATAN + PEMBAYARAN -->
					<div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-7">
						<label
							for="cust-note"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							Catatan (boleh kosong)
						</label>
						<input
							id="cust-note"
							bind:value={note}
							type="text"
							maxlength="120"
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink focus:border-brand focus:bg-white"
						/>
						<div class="mt-5 rounded-2xl bg-neutral-50 p-4">
							<p class="text-xs font-bold text-ink">Pembayaran</p>
							<p class="mt-1 text-xs leading-relaxed text-neutral-600">
								Bayar lewat QRIS setelah pesanan dibuat. Nominalnya ditambah kode unik beberapa
								rupiah agar kasir bisa mencocokkan pembayaranmu. Tidak perlu kirim bukti bayar.
							</p>
						</div>
					</div>

					{#if sendError}
						<p
							role="alert"
							class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700"
						>
							{sendError}
						</p>
					{/if}

					<!-- VALIDATION ERRORS -->
					{#if errors.length > 0}
						<div
							class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700"
						>
							<p class="font-bold">Mohon perbaiki data sebelum melanjutkan:</p>
							<ul class="mt-2 list-inside list-disc space-y-1">
								{#each errors as err}
									<li>{getErrorMessage(err)}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<!-- SUMMARY SIDEBAR -->
				<div class="lg:col-span-5">
					<div
						class="sticky top-24 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-7"
					>
						<h2 class="text-base font-bold text-ink">Ringkasan Pesanan</h2>

						<!-- OUTLET DETAIL -->
						<div
							class="mt-4 flex items-center gap-2.5 rounded-2xl border border-black/5 bg-neutral-50 p-3 text-xs"
						>
							<span class="h-2 w-2 rounded-full bg-green-500"></span>
							<div class="flex-1">
								<p class="font-bold text-ink">Outlet {currentOutlet?.name ?? 'Samarinda'}</p>
								<p class="text-[11px] text-neutral-500">
									Alamat: {currentOutlet?.address ?? 'Samarinda'}
								</p>
							</div>
						</div>

						<!-- ITEMS LIST -->
						<div class="mt-4 max-h-56 divide-y divide-black/5 overflow-y-auto pr-1 text-xs">
							{#each cart.lines as line (lineKey(line))}
								<div class="flex items-center justify-between py-2.5">
									<div class="flex items-center gap-2">
										<img src={zcup} alt="" class="h-7 w-auto" />
										<div>
											<p class="font-bold text-ink">{line.name}</p>
											{#if optionSummary(line)}
												<p class="text-[11px] text-neutral-500">{optionSummary(line)}</p>
											{/if}
											<p class="text-[11px] text-neutral-500">
												{line.qty} × Rp{line.price.toLocaleString('id-ID')}
											</p>
										</div>
									</div>
									<span class="font-bold text-ink">
										Rp{(line.price * line.qty).toLocaleString('id-ID')}
									</span>
								</div>
							{/each}
						</div>

						<!-- PRICE BREAKDOWN -->
						<div class="mt-4 space-y-2 border-t border-black/10 pt-4 text-xs">
							<div class="flex justify-between text-neutral-600">
								<span>Subtotal Item</span>
								<span class="font-semibold text-ink">Rp{cart.subtotal.toLocaleString('id-ID')}</span
								>
							</div>
							<div
								class="flex justify-between border-t border-black/10 pt-3 text-sm font-extrabold text-ink"
							>
								<span>Total</span>
								<span class="text-xl text-brand">Rp{cart.subtotal.toLocaleString('id-ID')}</span>
							</div>
						</div>

						<!-- SUBMIT BUTTON -->
						<button
							type="button"
							onclick={submit}
							disabled={isSubmitting}
							class="tap-scale mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-center text-sm font-bold text-white shadow-xl shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-50"
						>
							{#if isSubmitting}
								<span>Memproses Pesanan...</span>
							{:else}
								<span>Buat pesanan · {rupiah(cart.subtotal)}</span>
							{/if}
						</button>

						<div class="mt-4 space-y-1.5 text-center text-[11px] text-neutral-500">
							<p>Setelah pesanan dibuat, kamu mendapat nominal QRIS yang persis.</p>
							<p>Kasir memproses pesananmu begitu pembayaran QRIS masuk.</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
