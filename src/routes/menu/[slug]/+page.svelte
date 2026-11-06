<script lang="ts">
	import { onMount } from 'svelte';
	import { canonical, productJsonLd, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { cart } from '$lib/stores/cart.svelte';
	import { track } from '$lib/analytics/events';
	import { AVAILABILITY_VERIFIED, MENU_VERIFIED, availabilityFor, priceFor } from '$lib/data/menu';
	import { CITIES, OUTLETS, getOutlet, isValidOutletId } from '$lib/core/outlets';
	import type { OutletId } from '$lib/core/contracts';
	import { KERN_MAP } from '$lib/kern';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';
	import CartRevalidationDialog from '$lib/components/CartRevalidationDialog.svelte';
	import { revalidateForOutlet, type RevalidationResult } from '$lib/stores/cart-logic';

	const { data } = $props();
	const item = $derived(data.item);

	const initialOutlet: OutletId = isValidOutletId(cart.outletId)
		? (cart.outletId as OutletId)
		: 'juanda';
	let outlet = $state<OutletId>(initialOutlet);
	let qty = $state(1);
	let added = $state(false);
	let confirmOutletSwitch = $state(false);

	const url = $derived(canonical(`/menu/${item.slug}`));
	const avail = $derived(availabilityFor(item, outlet) === 'SOLD_OUT' ? 'OutOfStock' : 'InStock');

	const currentStatus = $derived(availabilityFor(item, outlet));
	const isSoldOut = $derived(AVAILABILITY_VERIFIED && currentStatus === 'SOLD_OUT');
	const canOrder = $derived(MENU_VERIFIED && AVAILABILITY_VERIFIED && !isSoldOut);
	const badge = $derived(getStatusBadge(currentStatus));
	const unitPrice = $derived(priceFor(item, outlet));
	const emptyRevalidation: RevalidationResult = {
		lines: [],
		removed: [],
		priceChanged: [],
		unchanged: []
	};
	const outletPreview = $derived(
		confirmOutletSwitch ? revalidateForOutlet(cart.lines, outlet) : emptyRevalidation
	);

	const ldProduct = $derived(
		MENU_VERIFIED
			? jsonLdTag(
					productJsonLd({
						name: item.name,
						description: item.description,
						url,
						price: unitPrice,
						availability: avail
					})
				)
			: null
	);
	const ldCrumb = $derived(
		jsonLdTag(
			breadcrumbJsonLd([
				{ name: 'Home', url: canonical('/') },
				{ name: 'Menu', url: canonical('/menu') },
				{ name: item.name, url }
			])
		)
	);

	onMount(() => {
		track('product_view', { menu: item.slug, outlet });
	});

	function add(): void {
		if (!canOrder) return;
		if (!cart.empty && cart.outletId !== outlet) {
			confirmOutletSwitch = true;
			return;
		}
		addToCart();
	}

	function addToCart(): void {
		cart.setOutlet(outlet);
		cart.add({
			menuItemId: item.slug,
			name: item.name,
			price: unitPrice,
			qty,
			outletId: outlet,
			availability: currentStatus
		});
		added = true;
		track('add_to_cart', { menu: item.slug, outlet, qty, value: unitPrice * qty });
	}

	function confirmSwitchAndAdd(): void {
		const previousOutletId = cart.outletId;
		track('cart_revalidation_started', { from: previousOutletId, to: outlet });
		const result = cart.switchOutletWithRevalidation(outlet);
		track('cart_revalidation_completed', {
			to: outlet,
			kept: result.lines.length,
			removed: result.removed.length
		});
		if (result.priceChanged.length > 0) track('cart_price_changed_after_switch', { to: outlet });
		if (result.removed.length > 0) track('cart_item_unavailable_after_switch', { to: outlet });
		track('outlet_changed', { from: previousOutletId, to: outlet });
		confirmOutletSwitch = false;
		addToCart();
	}

	function getStatusBadge(st: string) {
		if (!AVAILABILITY_VERIFIED) {
			return {
				label: 'Cek ketersediaan di outlet',
				class: 'border-neutral-200 bg-neutral-50 text-neutral-600'
			};
		}
		switch (st) {
			case 'AVAILABLE':
				return {
					label: 'Tersedia di Outlet Ini',
					class: 'bg-emerald-50 text-emerald-700 border-emerald-200'
				};
			case 'LIMITED':
				return { label: 'Stok Terbatas', class: 'bg-amber-50 text-amber-700 border-amber-200' };
			case 'SOLD_OUT':
			default:
				return { label: 'Habis Hari Ini', class: 'bg-rose-50 text-rose-700 border-rose-200' };
		}
	}

	function getProductBg(slug: string) {
		if (slug.includes('alpukat')) return 'bg-lime-50/80 border-lime-100';
		if (slug.includes('mangga')) return 'bg-amber-50/80 border-amber-100';
		if (slug.includes('naga')) return 'bg-pink-50/80 border-pink-100';
		return 'bg-cream border-black/5';
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
	<title>{item.name} | Zatiaras Juice</title>
	<meta name="description" content={item.description} />
	<link rel="canonical" href={url} />
	{@html ldProduct}
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- BREADCRUMBS -->
		<nav
			class="mb-8 flex items-center gap-2 text-xs font-semibold text-neutral-500"
			aria-label="Breadcrumb"
		>
			<a href="/" class="transition-colors hover:text-brand">Home</a>
			<span class="text-neutral-300">/</span>
			<a href="/menu" class="transition-colors hover:text-brand">Menu</a>
			<span class="text-neutral-300">/</span>
			<span class="font-bold text-ink">{item.name}</span>
		</nav>

		<!-- 50/50 DETAIL GRID -->
		<div class="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
			<!-- LEFT: CUP SHOWCASE (5 cols) -->
			<div
				class="relative overflow-hidden rounded-[2.5rem] border border-black/[0.08] p-8 sm:p-10 lg:col-span-5 {getProductBg(
					item.slug
				)} shadow-sm"
			>
				<div
					class="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/40"
				></div>

				<div class="flex items-center justify-between">
					{#if item.hero}
						<span
							class="inline-block rounded-full bg-brand px-3.5 py-1 text-xs font-bold tracking-wider text-white shadow-xs"
						>
							MENU ANDALAN
						</span>
					{:else}
						<span
							class="inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-neutral-600"
						>
							MENU PILIHAN
						</span>
					{/if}

					<span class="rounded-full border px-3 py-1 text-xs font-bold {badge.class}">
						{badge.label}
					</span>
				</div>

				<div class="my-10 flex items-center justify-center">
					<img
						src={zcup}
						alt=""
						aria-hidden="true"
						class="animate-float h-64 w-auto drop-shadow-2xl sm:h-76 {isSoldOut
							? 'opacity-75 grayscale'
							: ''}"
					/>
				</div>

				<div
					class="flex items-center justify-between rounded-2xl border border-black/[0.05] bg-white p-4"
				>
					<div>
						<p class="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
							Ukuran Cup
						</p>
						<p class="text-sm font-bold text-ink">Standard 22 oz</p>
					</div>
					<div class="text-right">
						<p class="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">Tekstur</p>
						<p class="text-sm font-bold text-brand">Kental & Buah Asli</p>
					</div>
				</div>
			</div>

			<!-- RIGHT: DETAILS & ACTIONS (7 cols) -->
			<div class="flex flex-col justify-between lg:col-span-7">
				<div>
					<div
						class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-bold tracking-wider text-neutral-600 shadow-xs"
					>
						<span class="h-2 w-2 rounded-full bg-brand"></span>
						MENU ZATIARAS JUICE
					</div>

					<h1
						class="mt-3 font-display text-4xl leading-tight font-extrabold text-ink sm:text-5xl"
						aria-label={item.name}
					>
						{@render kerned(item.name)}
					</h1>

					<div class="cup-lip-bar mt-3.5 w-14"></div>

					<p class="mt-4 font-display text-xl font-extrabold text-brand sm:text-3xl">
						{MENU_VERIFIED ? `Rp${unitPrice.toLocaleString('id-ID')}` : 'Harga dikonfirmasi outlet'}
					</p>

					<p class="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
						{item.description}
					</p>

					<div class="my-6 border-t border-black/[0.08]"></div>

					<!-- OUTLET SELECTION: 5 outlet -->
					<div>
						<label
							for="outlet-select"
							class="block text-xs font-bold tracking-wider text-neutral-500 uppercase"
						>
							Pilih Outlet Pengambilan
						</label>
						<select
							id="outlet-select"
							value={outlet}
							onchange={(e) => (outlet = (e.target as HTMLSelectElement).value as OutletId)}
							class="mt-2.5 w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm font-bold text-ink"
						>
							{#each CITIES as c}
								<optgroup label={c.name}>
									{#each OUTLETS.filter((o) => o.cityId === c.id) as o}
										<option value={o.id}>
											Zatiaras {o.name} — {AVAILABILITY_VERIFIED
												? availabilityFor(item, o.id) === 'SOLD_OUT'
													? 'Habis'
													: 'Tersedia'
												: 'Cek di outlet'}
										</option>
									{/each}
								</optgroup>
							{/each}
						</select>
						<p class="mt-2 text-xs text-neutral-500">
							Outlet: Zatiaras {getOutlet(outlet)?.name ?? outlet} ({getOutlet(outlet)?.city ?? ''})
						</p>
					</div>

					<!-- QUANTITY SELECTOR -->
					{#if canOrder}
						<div class="mt-6">
							<span class="block text-xs font-bold tracking-wider text-neutral-500 uppercase"
								>Jumlah Cup</span
							>
							<div class="mt-2 flex items-center gap-3">
								<div
									class="flex items-center rounded-2xl border border-black/15 bg-white p-1 shadow-sm"
								>
									<button
										type="button"
										onclick={() => qty > 1 && (qty -= 1)}
										class="tap-scale flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 font-bold text-ink transition hover:bg-neutral-200"
										aria-label="Kurangi jumlah"
									>
										-
									</button>
									<span class="w-12 text-center text-sm font-bold text-ink">{qty}</span>
									<button
										type="button"
										onclick={() => (qty += 1)}
										class="tap-scale flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 font-bold text-ink transition hover:bg-neutral-200"
										aria-label="Tambah jumlah"
									>
										+
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- ACTIONS -->
				<div class="mt-8 pt-4">
					{#if isSoldOut}
						<div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
							<p class="text-sm font-bold text-rose-700">
								Maaf, menu ini habis hari ini di outlet pilihan.
							</p>
							<p class="mt-1 text-xs text-rose-600">
								Silakan pilih outlet lain atau coba varian menu kami yang lain.
							</p>
						</div>
					{:else if !canOrder}
						<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
							<p class="text-sm font-bold text-ink">Order online segera hadir untuk menu ini.</p>
							<p class="mt-1 text-xs leading-relaxed text-neutral-600">
								Harga dan ketersediaan outlet masih menunggu konfirmasi operasional. Kamu tetap bisa
								menjelajahi menu dan memilih outlet.
							</p>
						</div>
					{:else}
						<div class="flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onclick={add}
								class="tap-scale flex-1 rounded-full bg-brand px-8 py-4 text-center font-bold text-white shadow-xl shadow-brand/25 transition hover:bg-brand-dark"
							>
								Tambah ke Keranjang • Rp{(unitPrice * qty).toLocaleString('id-ID')}
							</button>
							<a
								href="/menu"
								class="tap-scale rounded-full border-2 border-black/15 bg-white px-6 py-4 text-center font-bold text-ink transition hover:bg-neutral-50"
							>
								Menu Lain
							</a>
						</div>
					{/if}

					<!-- ADDED SUCCESS NOTICE -->
					{#if added}
						<div
							class="mt-4 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
						>
							<div class="flex items-center gap-2 text-sm font-semibold">
								<svg
									class="h-5 w-5 text-emerald-600"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
								<span>{qty} {item.name} berhasil masuk keranjang!</span>
							</div>
							<a
								href="/cart"
								class="tap-scale rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-brand"
							>
								Buka Keranjang →
							</a>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

{#if confirmOutletSwitch}
	<CartRevalidationDialog
		open={true}
		fromOutletId={cart.outletId}
		toOutletId={outlet}
		preview={outletPreview}
		onconfirm={confirmSwitchAndAdd}
		oncancel={() => (confirmOutletSwitch = false)}
	/>
{/if}
