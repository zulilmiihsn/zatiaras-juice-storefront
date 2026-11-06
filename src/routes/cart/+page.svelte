<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { cart } from '$lib/stores/cart.svelte';
	import { AVAILABILITY_VERIFIED, MENU_VERIFIED } from '$lib/data/menu';
	import { isValidOutletId, getOutlet } from '$lib/core/outlets';
	import CartRevalidationDialog from '$lib/components/CartRevalidationDialog.svelte';
	import { revalidateForOutlet, type RevalidationResult } from '$lib/stores/cart-logic';
	import type { OutletId } from '$lib/core/contracts';
	import { track } from '$lib/analytics/events';
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { CITIES, OUTLETS } from '$lib/core/outlets';
	import { KERN_MAP } from '$lib/kern';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	const title = 'Keranjang Pesanan | Zatiaras Juice';

	const cartOutletName = $derived(getOutlet(cart.outletId)?.name ?? cart.outletId);
	let pendingOutletId = $state<OutletId | null>(null);
	const emptyRevalidation: RevalidationResult = {
		lines: [],
		removed: [],
		priceChanged: [],
		unchanged: []
	};
	const outletPreview = $derived(
		pendingOutletId ? revalidateForOutlet(cart.lines, pendingOutletId) : emptyRevalidation
	);

	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Keranjang', url: canonical('/cart') }
		])
	);

	onMount(() => {
		track('cart_view', {
			outlet: cart.outletId,
			...(MENU_VERIFIED && AVAILABILITY_VERIFIED ? { value: cart.subtotal } : {})
		});
	});

	function dec(menuItemId: string, qty: number): void {
		cart.qty(menuItemId, qty - 1);
		track('remove_from_cart', { menu: menuItemId, outlet: cart.outletId });
	}

	function inc(menuItemId: string, qty: number): void {
		cart.qty(menuItemId, qty + 1);
	}

	function handleOutletChange(newOutlet: string): void {
		if (newOutlet === cart.outletId || !isValidOutletId(newOutlet)) return;
		pendingOutletId = newOutlet;
	}

	function confirmOutletSwitch(): void {
		if (!pendingOutletId) return;
		const target = pendingOutletId;
		track('cart_revalidation_started', { from: cart.outletId, to: target });
		const result = cart.switchOutletWithRevalidation(target);
		track('cart_revalidation_completed', {
			to: target,
			kept: result.lines.length,
			removed: result.removed.length
		});
		if (result.priceChanged.length > 0) track('cart_price_changed_after_switch', { to: target });
		if (result.removed.length > 0) track('cart_item_unavailable_after_switch', { to: target });
		track('outlet_changed', { to: target });
		track('outlet_selected', { outlet: target, source: 'cart' });
		pendingOutletId = null;
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
	<title>{title}</title>
	<link rel="canonical" href={canonical('/cart')} />
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-4xl px-4 sm:px-6">
		<!-- HEADER -->
		<div class="flex items-center justify-between border-b border-black/[0.06] pb-6">
			<div>
				<div
					class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs font-bold text-neutral-600 shadow-xs"
				>
					<span class="h-2 w-2 rounded-full bg-brand"></span>
					SELF-ORDER PICKUP
				</div>
				<h1
					class="mt-2.5 font-display text-3xl leading-tight font-extrabold text-ink sm:text-4xl"
					aria-label="Keranjang Belanja"
				>
					{@render kerned('Keranjang Pesanan')}
				</h1>
				<div class="cup-lip-bar mt-3 w-12"></div>
				<p class="mt-2 text-xs text-neutral-500 sm:text-sm">
					Pickup mandiri di outlet · Tanpa antre kasir · Tanpa biaya kemasan tambahan
				</p>
			</div>
			{#if !cart.empty}
				<span class="rounded-full bg-brand-soft px-4 py-1.5 text-xs font-bold text-brand shadow-xs">
					{cart.count} Cup
				</span>
			{/if}
		</div>

		{#if cart.empty}
			<!-- EMPTY STATE -->
			<div
				class="mt-10 rounded-3xl border border-black/[0.08] bg-white p-10 text-center shadow-xs sm:p-16"
			>
				<div
					class="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-brand/10 bg-brand-soft/40"
				>
					<img src={zcup} alt="" aria-hidden="true" class="h-14 w-auto opacity-50 grayscale" />
				</div>
				<h2
					class="mt-6 font-display text-2xl font-bold text-ink"
					aria-label="Keranjang Masih Kosong"
				>
					{@render kerned('Keranjang Masih Kosong')}
				</h2>
				<p class="mx-auto mt-2 max-w-md text-xs leading-relaxed text-neutral-500 sm:text-sm">
					Belum ada jus yang kamu pilih. Pilih varian jus buah kental favoritmu untuk memulai
					pesanan pickup.
				</p>
				<div class="mt-8">
					<a
						href="/menu"
						class="tap-scale inline-flex items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
					>
						<span>Buka Daftar Menu</span>
						<svg
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path d="M5 12h14M12 5l7 7-7 7" />
						</svg>
					</a>
				</div>
			</div>
		{:else}
			<!-- OUTLET NOTICE & SELECTOR -->
			<div class="mt-8 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full bg-green-500"></span>
						<span class="text-xs font-bold tracking-wider text-neutral-500 uppercase"
							>Lokasi Pickup:</span
						>
						<span class="text-sm font-bold text-ink">
							Outlet {cartOutletName}
						</span>
					</div>

					<div class="flex items-center gap-2 text-xs">
						<label for="cart-outlet" class="text-neutral-500">Ganti outlet:</label>
						<select
							id="cart-outlet"
							value={cart.outletId}
							onchange={(e) => handleOutletChange((e.target as HTMLSelectElement).value)}
							class="rounded-lg bg-neutral-100 px-2 py-1.5 font-bold text-neutral-700"
						>
							{#each CITIES as c}
								<optgroup label={c.name}>
									{#each OUTLETS.filter((o) => o.cityId === c.id) as o}
										<option value={o.id}>{o.name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>
				</div>
				<p class="mt-2 text-[11px] text-neutral-500">
					* Satu pesanan diproses khusus untuk satu outlet pickup terpilih.
				</p>
			</div>

			<!-- CART ITEMS LIST -->
			<div class="mt-6 space-y-3">
				{#each cart.lines as line}
					<div
						class="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition sm:p-5"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-cream"
							>
								<img src={zcup} alt="" aria-hidden="true" class="h-12 w-auto" />
							</div>

							<div>
								<h3
									class="font-display text-lg font-bold text-ink sm:text-xl"
									aria-label={line.name}
								>
									{@render kerned(line.name)}
								</h3>
								{#if MENU_VERIFIED && AVAILABILITY_VERIFIED}
									<p class="text-xs font-semibold text-neutral-500">
										Rp{line.price.toLocaleString('id-ID')} / cup
									</p>
								{/if}
							</div>
						</div>

						<div class="flex items-center gap-4 sm:gap-6">
							<!-- STEPPER -->
							<div class="flex items-center rounded-xl border border-black/15 bg-neutral-50 p-1">
								<button
									type="button"
									onclick={() => dec(line.menuItemId, line.qty)}
									class="tap-scale flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-ink shadow-xs hover:bg-neutral-100"
									aria-label="Kurangi"
								>
									-
								</button>
								<span class="w-9 text-center text-xs font-bold text-ink">{line.qty}</span>
								<button
									type="button"
									onclick={() => inc(line.menuItemId, line.qty)}
									class="tap-scale flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-ink shadow-xs hover:bg-neutral-100"
									aria-label="Tambah"
								>
									+
								</button>
							</div>

							<!-- LINE TOTAL -->
							<div class="w-24 text-right">
								{#if MENU_VERIFIED && AVAILABILITY_VERIFIED}
									<span class="text-sm font-bold text-ink sm:text-base">
										Rp{(line.price * line.qty).toLocaleString('id-ID')}
									</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- SUMMARY CARD -->
			<div class="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
				<h2 class="text-base font-bold text-ink">Ringkasan Pesanan</h2>

				{#if MENU_VERIFIED && AVAILABILITY_VERIFIED}
					<div class="mt-4 space-y-2.5 text-sm">
						<div class="flex justify-between text-neutral-600">
							<span>Subtotal ({cart.count} cup)</span>
							<span class="font-semibold text-ink">Rp{cart.subtotal.toLocaleString('id-ID')}</span>
						</div>
						<div class="border-t border-black/10 pt-3">
							<div class="flex items-baseline justify-between">
								<span class="text-base font-bold text-ink">Total Pembayaran</span>
								<span class="text-2xl font-extrabold text-brand">
									Rp{cart.subtotal.toLocaleString('id-ID')}
								</span>
							</div>
						</div>
					</div>
				{:else}
					<p class="mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-neutral-700">
						Harga dan ketersediaan menu outlet belum dikonfirmasi. Checkout online belum tersedia
						untuk item ini.
					</p>
				{/if}

				<div class="mt-8 flex flex-col gap-3 sm:flex-row">
					{#if dev && MENU_VERIFIED && AVAILABILITY_VERIFIED}
						<a
							href="/checkout"
							class="tap-scale flex-1 rounded-full bg-brand px-8 py-4 text-center font-bold text-white shadow-xl shadow-brand/25 transition hover:bg-brand-dark"
						>
							Lanjut ke Checkout Tamu →
						</a>
					{:else}
						<button
							type="button"
							disabled
							class="flex-1 cursor-not-allowed rounded-full bg-neutral-200 px-8 py-4 text-center font-bold text-neutral-500"
						>
							Checkout belum tersedia
						</button>
					{/if}
					<a
						href="/menu"
						class="tap-scale rounded-full border border-black/15 bg-white px-6 py-4 text-center font-bold text-neutral-700 transition hover:bg-neutral-50"
					>
						+ Tambah Menu Lain
					</a>
				</div>

				<div
					class="mt-4 flex items-center justify-center gap-2 text-center text-xs text-neutral-500"
				>
					<svg
						class="h-4 w-4 text-emerald-600"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
					</svg>
					<span>Guest Checkout: Pesan langsung tanpa perlu registrasi akun atau password.</span>
				</div>
			</div>
		{/if}
		{#if pendingOutletId}
			<CartRevalidationDialog
				open={true}
				fromOutletId={cart.outletId}
				toOutletId={pendingOutletId}
				preview={outletPreview}
				onconfirm={confirmOutletSwitch}
				oncancel={() => (pendingOutletId = null)}
			/>
		{/if}
	</div>
</div>
