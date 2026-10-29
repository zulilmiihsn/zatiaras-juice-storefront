<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		CATEGORIES,
		MENU,
		MENU_VERIFIED,
		AVAILABILITY_VERIFIED,
		priceFor,
		availabilityFor,
		type PublicMenuItem
	} from '$lib/data/menu';
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { track } from '$lib/analytics/events';
	import { cart } from '$lib/stores/cart.svelte';
	import { getCity, getOutlet, isValidOutletId, suggestCityFromLabel } from '$lib/core/outlets';
	import OutletSelector from '$lib/components/OutletSelector.svelte';
	import CartRevalidationDialog from '$lib/components/CartRevalidationDialog.svelte';
	import type { OutletId } from '$lib/core/contracts';
	import { revalidateForOutlet, type RevalidationResult } from '$lib/stores/cart-logic';
	import { scrollStagger } from '$lib/motion/scroll';
	import { KERN_MAP } from '$lib/kern';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	const title = 'Menu Zatiaras Juice | Samarinda · Berau · Balikpapan';
	const desc =
		'Pilihan jus segar Zatiaras: Alpukat Kocok, Jus Alpukat, Jus Mangga, Jus Naga. Pilih outlet pickup, order pickup cepat.';

	const initial = isValidOutletId(cart.outletId) ? (cart.outletId as OutletId) : 'juanda';
	let activeOutlet = $state<OutletId>(initial as OutletId);
	let selectorOpen = $state(false);
	let pendingOutletId = $state<OutletId | null>(null);
	let toastMessage = $state<string | null>(null);
	let toastTimeout: ReturnType<typeof setTimeout> | undefined;

	// Filter kategori lewat ?kategori= (tautan dari beranda "Jus Apa Aja Ada"); slug tak dikenal = semua.
	const category = $derived(
		CATEGORIES.find((entry) => entry.slug === page.url.searchParams.get('kategori'))
	);
	const visibleMenu = $derived(category ? MENU.filter((m) => m.category === category.slug) : MENU);

	const activeOutletInfo = $derived(getOutlet(activeOutlet));
	const emptyRevalidation: RevalidationResult = {
		lines: [],
		removed: [],
		priceChanged: [],
		unchanged: []
	};
	const outletPreview = $derived(
		pendingOutletId ? revalidateForOutlet(cart.lines, pendingOutletId) : emptyRevalidation
	);

	// Saran kota just-in-time (hint di dalam selector, bukan interupsi global).
	// Prioritas: override QA ?simcity= > IP Cloudflare. Bukan pengunci outlet.
	const suggestedCityId = $derived.by(() => {
		try {
			const q = page.url.searchParams.get('simcity');
			if (q && getCity(q)) return q;
		} catch {
			/* abaikan */
		}
		return (
			suggestCityFromLabel(page.data.cfCity as string | null)?.id ??
			suggestCityFromLabel(page.data.cfRegion as string | null)?.id ??
			null
		);
	});

	onMount(() => {
		const requestedOutlet = page.url.searchParams.get('outlet');
		if (requestedOutlet) handleOutletChange(requestedOutlet);
		track('menu_view', { outlet: activeOutlet, city: activeOutletInfo?.city ?? '' });
	});

	function handleOutletChange(targetOutlet: string) {
		if (activeOutlet === targetOutlet || !isValidOutletId(targetOutlet)) return;
		if (!cart.empty && cart.outletId !== targetOutlet) {
			pendingOutletId = targetOutlet as OutletId;
			return;
		}
		activeOutlet = targetOutlet as OutletId;
		cart.setOutlet(targetOutlet);
		track('outlet_selected', { outlet: targetOutlet, source: 'menu' });
		trackLocationChoice(targetOutlet as OutletId);
		showToast(`Outlet beralih ke ${getOutlet(targetOutlet)?.name ?? targetOutlet}`);
	}

	function trackLocationChoice(targetOutlet: OutletId): void {
		if (!suggestedCityId) return;
		const chosen = getOutlet(targetOutlet);
		if (!chosen) return;
		if (chosen.cityId === suggestedCityId) {
			track('location_suggestion_accepted', { city: chosen.city });
		} else {
			track('location_suggestion_changed', {
				from: getCity(suggestedCityId)?.name ?? suggestedCityId,
				to: chosen.city
			});
		}
	}

	function confirmOutletSwitch(): void {
		if (!pendingOutletId) return;
		const targetOutlet = pendingOutletId;
		track('cart_revalidation_started', { from: cart.outletId, to: targetOutlet });
		const result = cart.switchOutletWithRevalidation(targetOutlet);
		track('cart_revalidation_completed', {
			to: targetOutlet,
			kept: result.lines.length,
			removed: result.removed.length
		});
		if (result.priceChanged.length > 0)
			track('cart_price_changed_after_switch', { to: targetOutlet });
		if (result.removed.length > 0)
			track('cart_item_unavailable_after_switch', { to: targetOutlet });
		track('outlet_changed', { from: activeOutlet, to: targetOutlet });
		track('outlet_selected', { outlet: targetOutlet, source: 'menu' });
		trackLocationChoice(targetOutlet);
		activeOutlet = targetOutlet;
		pendingOutletId = null;
		showToast(`Outlet beralih ke ${getOutlet(targetOutlet)?.name ?? targetOutlet}`);
	}

	function quickAdd(item: PublicMenuItem) {
		if (!MENU_VERIFIED || !AVAILABILITY_VERIFIED) return;
		const status = availabilityFor(item, activeOutlet);
		if (status === 'SOLD_OUT') return;

		cart.setOutlet(activeOutlet);
		cart.add({
			menuItemId: item.slug,
			name: item.name,
			price: priceFor(item, activeOutlet),
			qty: 1,
			outletId: activeOutlet,
			availability: status
		});

		track('add_to_cart', {
			menu: item.slug,
			outlet: activeOutlet,
			qty: 1,
			value: priceFor(item, activeOutlet)
		});
		showToast(`${item.name} berhasil ditambah ke keranjang`);
	}

	function showToast(msg: string) {
		toastMessage = msg;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastMessage = null;
		}, 2500);
	}

	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Menu', url: canonical('/menu') }
		])
	);

	function getStatusBadge(status: string) {
		if (!AVAILABILITY_VERIFIED) {
			return {
				label: 'Cek di outlet',
				class: 'border-neutral-200 bg-neutral-50 text-neutral-600'
			};
		}
		switch (status) {
			case 'AVAILABLE':
				return { label: 'Tersedia', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
			case 'LIMITED':
				return { label: 'Stok Terbatas', class: 'bg-amber-50 text-amber-700 border-amber-200' };
			case 'SOLD_OUT':
			default:
				return { label: 'Habis Hari Ini', class: 'bg-rose-50 text-rose-700 border-rose-200' };
		}
	}

	function getProductBg(slug: string) {
		if (slug.includes('alpukat')) return 'bg-lime-50/70 border-lime-100';
		if (slug.includes('mangga')) return 'bg-amber-50/70 border-amber-100';
		if (slug.includes('naga')) return 'bg-pink-50/70 border-pink-100';
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
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical('/menu')} />
	{@html ldCrumb}
</svelte:head>

<!-- TOAST ALERT -->
{#if toastMessage}
	<div
		class="fixed top-20 right-4 z-50 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-ink px-4 py-3 text-xs font-bold text-white shadow-2xl transition-all"
		role="alert"
	>
		<span class="h-2 w-2 animate-pulse rounded-full bg-brand"></span>
		<span>{toastMessage}</span>
	</div>
{/if}

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-6xl px-4 sm:px-6">
		<!-- HEADER SECTION -->
		<div
			class="flex flex-col justify-between gap-6 border-b border-black/[0.06] pb-8 md:flex-row md:items-end"
		>
			<div>
				<div
					class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-bold tracking-wider text-ink/80 uppercase shadow-xs"
				>
					<span class="h-2 w-2 rounded-full bg-brand"></span>
					MENU RESMI 3 KOTA
				</div>
				<h1
					class="mt-3 font-display text-4xl leading-tight font-extrabold text-ink sm:text-5xl"
					aria-label="Menu Zatiaras Juice"
				>
					{@render kerned('Menu Jus Segar')}
				</h1>
				<div class="cup-lip-bar mt-3.5 w-14"></div>
				<p class="mt-3 max-w-lg text-sm text-neutral-600 sm:text-base">
					Pilih outlet pickup terdekat. Seluruh pesanan diracik langsung dari buah segar berkualitas
					saat pesanan terverifikasi.
				</p>
			</div>

			<!-- OUTLET SWITCHER: modal kota/outlet -->
			<div class="shrink-0 rounded-2xl border border-black/[0.08] bg-white p-3 shadow-xs">
				<p class="px-1 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
					Outlet pickup · {activeOutletInfo?.city ?? ''}
				</p>
				<button
					type="button"
					onclick={() => (selectorOpen = true)}
					class="mt-1.5 flex w-full items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 text-left text-sm font-bold text-ink hover:bg-neutral-100"
					aria-haspopup="dialog"
				>
					<span>Zatiaras {activeOutletInfo?.name ?? activeOutlet}</span>
					<span class="text-xs font-semibold text-brand">Ganti →</span>
				</button>
			</div>
		</div>

		<OutletSelector
			open={selectorOpen}
			selectedId={activeOutlet}
			{suggestedCityId}
			onselect={(id) => {
				selectorOpen = false;
				handleOutletChange(id);
			}}
			onclose={() => (selectorOpen = false)}
		/>
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

		<!-- OPERATIONAL NOTICE -->
		<div
			class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4 text-xs font-medium text-neutral-600 sm:text-sm"
		>
			<div class="flex items-center gap-2">
				<svg
					class="h-4 w-4 text-brand"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<span>
					Menu untuk <strong class="text-ink"
						>Zatiaras {activeOutletInfo?.name ?? activeOutlet}</strong
					>.
					{#if MENU_VERIFIED && AVAILABILITY_VERIFIED}
						Pickup setelah pembayaran tervalidasi.
					{:else}
						Harga dan ketersediaan dikonfirmasi sebelum order tersedia.
					{/if}
				</span>
			</div>
			{#if MENU_VERIFIED && AVAILABILITY_VERIFIED}
				<span class="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600"
					>Data menu outlet terverifikasi</span
				>
			{/if}
		</div>

		<!-- KATEGORI -->
		<nav aria-label="Kategori menu" class="mt-6 flex flex-wrap gap-2">
			<a
				href="/menu"
				aria-current={category ? undefined : 'page'}
				class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors {category
					? 'border-black/10 bg-white text-ink hover:border-brand hover:text-brand'
					: 'border-ink bg-ink text-white'}">Semua</a
			>
			{#each CATEGORIES as entry (entry.slug)}
				<a
					href={`/menu?kategori=${entry.slug}`}
					aria-current={category?.slug === entry.slug ? 'page' : undefined}
					class="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors {category?.slug ===
					entry.slug
						? 'border-ink bg-ink text-white'
						: 'border-black/10 bg-white text-ink hover:border-brand hover:text-brand'}"
					>{entry.name}</a
				>
			{/each}
		</nav>

		<!-- MENU GRID -->
		<div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each visibleMenu as item}
				{@const status = availabilityFor(item, activeOutlet)}
				{@const badge = getStatusBadge(status)}
				{@const isSoldOut = AVAILABILITY_VERIFIED && status === 'SOLD_OUT'}

				<div
					class="group flex flex-col justify-between overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl"
				>
					<div>
						<!-- IMAGE CONTAINER -->
						<div
							class="relative flex items-center justify-center p-8 {getProductBg(
								item.slug
							)} border-b"
						>
							{#if item.hero}
								<span
									class="absolute top-4 left-4 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wider text-white shadow-sm"
								>
									ANDALAN
								</span>
							{/if}

							<span
								class="absolute top-4 right-4 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide {badge.class}"
							>
								{badge.label}
							</span>

							<a href={`/menu/${item.slug}`} class="block" aria-label={`Detail ${item.name}`}>
								<img
									src={zcup}
									alt=""
									aria-hidden="true"
									class="h-44 w-auto drop-shadow-md transition duration-300 group-hover:scale-105 {isSoldOut
										? 'opacity-60 grayscale'
										: ''}"
									loading="lazy"
								/>
							</a>
						</div>

						<!-- CARD CONTENT -->
						<div class="p-5">
							<a href={`/menu/${item.slug}`} class="block hover:text-brand">
								<h2 class="font-display text-2xl leading-tight" aria-label={item.name}>
									{@render kerned(item.name)}
								</h2>
							</a>
							<p class="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-600">
								{item.description}
							</p>
						</div>
					</div>

					<!-- CARD FOOTER -->
					<div class="border-t border-black/5 p-5 pt-3">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<span class="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase"
									>Harga</span
								>
								<p class="text-sm font-bold text-ink sm:text-lg">
									{MENU_VERIFIED
										? `Rp${priceFor(item, activeOutlet).toLocaleString('id-ID')}`
										: 'Belum dikonfirmasi'}
								</p>
							</div>

							{#if isSoldOut}
								<button
									disabled
									class="cursor-not-allowed rounded-full bg-neutral-100 px-4 py-2.5 text-xs font-bold text-neutral-400"
								>
									Habis
								</button>
							{:else if !MENU_VERIFIED || !AVAILABILITY_VERIFIED}
								<a
									href={`/menu/${item.slug}`}
									class="tap-scale rounded-full border border-black/15 bg-white px-3 py-2.5 text-xs font-bold text-ink transition hover:border-brand/40 hover:text-brand"
								>
									Lihat detail
								</a>
							{:else}
								<div class="flex items-center gap-2">
									<a
										href={`/menu/${item.slug}`}
										class="tap-scale rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-neutral-50"
										aria-label={`Detail ${item.name}`}
									>
										Detail
									</a>
									<button
										onclick={() => quickAdd(item)}
										class="tap-scale flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-brand"
										aria-label={`Tambah ${item.name} ke cart`}
									>
										<span>+ Order</span>
									</button>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else}
				<p class="col-span-full rounded-3xl bg-brand-soft p-6 text-sm text-ink sm:text-base">
					Menu {category?.name ?? 'ini'} sedang disiapkan.
					<a
						class="inline-flex min-h-11 items-center font-bold text-brand-dark underline"
						href="/menu">Lihat semua menu</a
					>
				</p>
			{/each}
		</div>

		<!-- BOTTOM CONTEXT INFO -->
		<div class="mt-12 rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
			<div
				use:scrollStagger={{ childSelector: ':scope > div', y: 25, stagger: 0.1 }}
				class="grid gap-6 sm:grid-cols-3"
			>
				<div class="flex gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-bold text-brand"
					>
						1
					</div>
					<div>
						<h3 class="font-bold text-ink">Buahnya Berasa</h3>
						<p class="mt-1 text-xs leading-relaxed text-neutral-600">
							Tekstur kental dengan porsi buah asli tanpa perisa buatan.
						</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-bold text-brand"
					>
						2
					</div>
					<div>
						<h3 class="font-bold text-ink">Pilih waktu pickup</h3>
						<p class="mt-1 text-xs leading-relaxed text-neutral-600">
							Pilihan waktu mengikuti outlet yang kamu pilih dan dikonfirmasi sebelum pembayaran.
						</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-bold text-brand"
					>
						3
					</div>
					<div>
						<h3 class="font-bold text-ink">Guest Order Bebas Ribet</h3>
						<p class="mt-1 text-xs leading-relaxed text-neutral-600">
							Langsung pesan tanpa wajib install aplikasi atau registrasi password.
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
