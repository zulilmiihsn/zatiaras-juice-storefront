<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { listOrders } from '$lib/stores/orders';
	import { statusLabel } from '$lib/support';
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { getOutlet } from '$lib/core/outlets';
	import { KERN_MAP } from '$lib/kern';
	import type { Order } from '$lib/core/contracts';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	const title = 'Lacak Pesanan | Zatiaras Juice';
	const desc = 'Lihat data pesanan Zatiaras Juice yang tersimpan di perangkat ini.';

	let id = $state('');
	let mine = $state<Order[]>([]);

	onMount(() => {
		mine = listOrders();
	});

	function handleSearch(): void {
		const clean = id.trim().replace(/^#/, '');
		if (clean) {
			void goto(`/order/${encodeURIComponent(clean)}`);
		}
	}

	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Lacak', url: canonical('/track') }
		])
	);

	function getStatusColor(state: string) {
		switch (state) {
			case 'READY':
				return 'bg-emerald-50 text-emerald-700 border-emerald-200';
			case 'PENDING_PAYMENT':
				return 'bg-amber-50 text-amber-700 border-amber-200';
			case 'PREPARING':
			case 'PAID':
			case 'CONFIRMED':
				return 'bg-blue-50 text-blue-700 border-blue-200';
			case 'FULFILLMENT_FAILED':
				return 'bg-rose-50 text-rose-700 border-rose-200';
			default:
				return 'bg-neutral-100 text-neutral-700 border-neutral-200';
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
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical('/track')} />
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-3xl px-4 sm:px-6">
		<div class="text-left sm:text-center">
			<div
				class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-bold text-neutral-600 shadow-xs"
			>
				<span class="h-2 w-2 rounded-full bg-brand"></span>
				STATUS PESANAN
			</div>
			<h1
				class="mt-3 font-display text-3xl leading-tight font-extrabold text-ink sm:text-4xl"
				aria-label="Lacak Pesanan Jus"
			>
				{@render kerned('Lacak Status Pesanan')}
			</h1>
			<div class="cup-lip-bar mt-3 w-12 sm:mx-auto"></div>
			<p class="mt-3 max-w-md text-xs leading-relaxed text-neutral-600 sm:mx-auto sm:text-sm">
				Lihat data pesanan yang tersimpan di browser ini. Pelacakan langsung dari outlet belum
				tersedia; hubungi outlet untuk memastikan status pesanan.
			</p>
		</div>

		<!-- SEARCH BOX CARD -->
		<div class="mt-8 rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-8">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSearch();
				}}
				class="flex flex-col gap-3 sm:flex-row"
			>
				<div class="relative flex-1">
					<span
						class="absolute top-1/2 left-4 -translate-y-1/2 font-mono text-sm font-bold text-neutral-400"
						>#</span
					>
					<input
						bind:value={id}
						type="text"
						aria-label="ID pesanan"
						placeholder="Ketik ID Pesanan (contoh: order_...)"
						class="w-full rounded-2xl border border-black/15 bg-neutral-50/50 py-3.5 pr-4 pl-9 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
					/>
				</div>
				<button
					type="submit"
					class="tap-scale inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-dark"
				>
					<span>Lacak Sekarang</span>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
					>
						<path d="M5 12h14M12 5l7 7-7 7" />
					</svg>
				</button>
			</form>
		</div>

		<!-- RECENT ORDERS IN THIS DEVICE -->
		<div class="mt-10">
			<div class="flex items-center justify-between">
				<h2 class="text-base font-bold text-ink">
					Pesanan di Perangkat Ini ({mine.length})
				</h2>
				{#if mine.length > 0}
					<span class="text-xs text-neutral-500">Tersimpan otomatis di browser</span>
				{/if}
			</div>

			{#if mine.length === 0}
				<div class="mt-4 rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
					<img src={zcup} alt="" class="mx-auto h-12 w-auto opacity-30 grayscale" />
					<p class="mt-4 text-sm font-semibold text-neutral-700">Belum ada riwayat pesanan aktif</p>
					<p class="mt-1 text-xs text-neutral-500">
						Pesanan baru yang kamu buat di browser ini akan muncul di sini.
					</p>
					<a
						href="/menu"
						class="tap-scale mt-5 inline-block rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-white hover:bg-brand"
					>
						Mulai Order Sekarang
					</a>
				</div>
			{:else}
				<div class="mt-4 space-y-3">
					{#each mine as o}
						<a
							href={`/order/${o.id}`}
							class="tap-scale flex flex-col justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:border-brand/40 sm:flex-row sm:items-center sm:p-5"
						>
							<div class="flex items-center gap-3.5">
								<div
									class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-cream"
								>
									<img src={zcup} alt="" class="h-8 w-auto" />
								</div>
								<div>
									<div class="flex items-center gap-2">
										<span class="font-mono text-xs font-bold text-ink">#{o.id}</span>
										<span class="text-xs font-medium text-neutral-500">
											· Outlet {getOutlet(o.outletId)?.name ?? o.outletId}
										</span>
									</div>
									<p class="mt-1 text-xs font-bold text-neutral-700">
										Rp{o.total.toLocaleString('id-ID')} ({o.items.length} item)
									</p>
								</div>
							</div>

							<div class="flex items-center justify-between gap-3 sm:justify-end">
								<span
									class="rounded-full border px-3 py-1 text-xs font-bold {getStatusColor(o.state)}"
								>
									{statusLabel(o.state)}
								</span>
								<span class="text-xs font-bold text-brand hover:underline"> Buka Status → </span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
