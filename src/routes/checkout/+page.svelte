<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { cart } from '$lib/stores/cart.svelte';
	import { AVAILABILITY_VERIFIED, MENU_VERIFIED } from '$lib/data/menu';
	import { slotsFor } from '$lib/data/slots';
	import { getOutlet } from '$lib/core/outlets';
	import { outlet } from '$lib/stores/outlet.svelte';
	import { validateCheckout } from '$lib/core/checkout';
	import { createDraft, listOrders, saveOrder } from '$lib/stores/orders';
	import { track } from '$lib/analytics/events';
	import { canonical } from '$lib/seo';
	import { KERN_MAP } from '$lib/kern';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	let name = $state('');
	let whatsapp = $state('');
	let slotId = $state('');
	let errors = $state<string[]>([]);
	let isSubmitting = $state(false);

	const slots = $derived(slotsFor(cart.outletId));
	const currentOutlet = $derived(getOutlet(cart.outletId));
	const checkoutAvailable = MENU_VERIFIED && AVAILABILITY_VERIFIED;

	onMount(() => {
		if (!cart.empty && checkoutAvailable) {
			track('checkout_started', { outlet: cart.outletId, value: cart.subtotal });
		}
		if (slots.length > 0 && !slotId) {
			slotId = slots[0].id;
		}
	});

	function normalizeWhatsapp(raw: string): string {
		let clean = raw.trim().replace(/[\s-]/g, '');
		if (clean.startsWith('08')) {
			clean = '628' + clean.slice(2);
		}
		return clean;
	}

	function getErrorMessage(code: string): string {
		switch (code) {
			case 'name_required':
				return 'Nama pemesan wajib diisi.';
			case 'whatsapp_invalid':
				return 'Nomor WhatsApp tidak valid (Gunakan format 0812... atau +62812...).';
			case 'slot_required':
				return 'Silakan pilih perkiraan waktu pickup.';
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

	function submit(): void {
		if (cart.empty) return;
		if (!checkoutAvailable) return;
		isSubmitting = true;

		const base = getOutlet(cart.outletId);
		if (!base) {
			isSubmitting = false;
			return;
		}

		const formattedWa = normalizeWhatsapp(whatsapp);
		const live = { ...base, load: outlet.getLoad(base.id), acceptsWebOrders: true };

		const input = {
			name: name.trim(),
			whatsapp: formattedWa,
			outlet: live,
			pickupSlotId: slotId,
			cart: cart.lines.map((l) => ({
				menuItemId: l.menuItemId,
				qty: l.qty,
				outletId: l.outletId,
				availability: l.availability,
				price: l.price
			}))
		};

		errors = validateCheckout(input);
		if (errors.length > 0) {
			isSubmitting = false;
			return;
		}

		const order = createDraft({
			outletId: live.id,
			name: name.trim(),
			whatsapp: formattedWa,
			slotId,
			lines: cart.lines,
			existingIds: listOrders().map((o) => o.id)
		});

		saveOrder(order);
		track('payment_created', { outlet: live.id, value: order.total, slot: slotId });
		cart.clear();
		goto(`/order/${order.id}`);
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
				<h2 class="mt-2 font-display text-2xl font-bold text-ink">
					Harga & ketersediaan perlu konfirmasi
				</h2>
				<p class="mt-2 text-sm leading-relaxed text-neutral-600">
					Menu tetap bisa dijelajahi. Kami aktifkan checkout setelah harga dan ketersediaan outlet
					terverifikasi supaya total pembayaranmu akurat.
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
							<h2 class="text-base font-bold text-ink">Informasi Pengambil</h2>
						</div>

						<div class="mt-5 space-y-4">
							<div>
								<label
									for="cust-name"
									class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
								>
									Nama Lengkap / Panggilan <span class="text-brand">*</span>
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

							<div>
								<label
									for="cust-wa"
									class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
								>
									Nomor WhatsApp Aktif <span class="text-brand">*</span>
								</label>
								<input
									id="cust-wa"
									bind:value={whatsapp}
									type="tel"
									placeholder="08123456789 atau +62812..."
									class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
								/>
								<p class="mt-1 text-[11px] text-neutral-500">
									Bukti pesanan & koordinasi staf jika ada kendala buah habis.
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
								<h2 class="text-base font-bold text-ink">Waktu Pengambilan (Slot Pickup)</h2>
							</div>
						</div>

						<p class="mt-2 text-xs text-neutral-600">
							Pilih perkiraan kedatanganmu di outlet <strong class="text-ink"
								>{currentOutlet?.name ?? 'Juanda'}</strong
							>:
						</p>

						<div class="mt-4 grid gap-2.5 sm:grid-cols-2">
							{#each slots as s}
								<button
									type="button"
									onclick={() => {
										slotId = s.id;
										track('pickup_slot_selected', { outlet: cart.outletId, slot: s.id });
									}}
									class="tap-scale flex items-center justify-between rounded-2xl border p-3.5 text-left transition {slotId ===
									s.id
										? 'border-brand bg-brand-soft/40 shadow-xs'
										: 'border-black/10 bg-white hover:border-black/20'}"
								>
									<div>
										<p class="text-xs font-bold text-ink">{s.label}</p>
										<p class="text-[11px] text-neutral-500">Waktu dikonfirmasi outlet</p>
									</div>
									<div
										class="flex h-5 w-5 items-center justify-center rounded-full border {slotId ===
										s.id
											? 'border-brand bg-brand text-white'
											: 'border-neutral-300'}"
									>
										{#if slotId === s.id}
											<div class="h-2 w-2 rounded-full bg-white"></div>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>

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
							{#each cart.lines as line}
								<div class="flex items-center justify-between py-2.5">
									<div class="flex items-center gap-2">
										<img src={zcup} alt="" class="h-7 w-auto" />
										<div>
											<p class="font-bold text-ink">{line.name}</p>
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
								<span>Total Bayar</span>
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
								<span>Buat Pesanan & Bayar →</span>
							{/if}
						</button>

						<div class="mt-4 space-y-1.5 text-center text-[11px] text-neutral-500">
							<p>Verifikasi pembayaran aman via server webhook.</p>
							<p>Pesanan langsung diteruskan ke mesin display outlet.</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
