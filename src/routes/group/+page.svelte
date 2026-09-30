<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { MENU } from '$lib/data/menu';
	import { track } from '$lib/analytics/events';
	import { submitGroup, type GroupLine } from '$lib/group/logic';
	import { CITIES, OUTLETS } from '$lib/core/outlets';
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { KERN_MAP } from '$lib/kern';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	let outletId = $state<string>('juanda');
	let name = $state('');
	let whatsapp = $state('');
	let schedule = $state('');
	let qty = $state<Record<string, number>>({});

	const lines = $derived(
		Object.entries(qty)
			.filter(([, q]) => q > 0)
			.map(([menuItemId, q]) => ({ menuItemId, qty: q }) as GroupLine)
	);
	const cups = $derived(lines.reduce((s, l) => s + l.qty, 0));

	onMount(() => track('group_order_started', { outlet: outletId }));

	function submit(): void {
		if (!name || !whatsapp || lines.length === 0) return;
		const g = submitGroup({ outletId, name, whatsapp, schedule, lines });
		track('group_order_submitted', { outlet: outletId, cups });
		goto(`/group/${g.id}`);
	}

	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Group Order', url: canonical('/group') }
		])
	);
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
	<title>Group Order & Pesanan Jumlah Banyak | Zatiaras Juice</title>
	<meta
		name="description"
		content="Pesan jus Zatiaras untuk rapat, syukuran, atau acara kantor di Samarinda, Berau, Balikpapan. Slot waktu penyiapan khusus."
	/>
	<link rel="canonical" href={canonical('/group')} />
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-4xl px-4 sm:px-6">
		<div class="text-left sm:text-center">
			<div
				class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-bold text-neutral-600 shadow-xs"
			>
				<span class="h-2 w-2 rounded-full bg-brand"></span>
				PESANAN ACARA & KANTOR
			</div>
			<h1
				class="mt-3 font-display text-3xl leading-tight font-extrabold text-ink sm:text-4xl"
				aria-label="Group Order"
			>
				{@render kerned('Group Order & Acara')}
			</h1>
			<div class="cup-lip-bar mt-3 w-12 sm:mx-auto"></div>
			<p class="mt-3 max-w-md text-xs leading-relaxed text-neutral-600 sm:mx-auto sm:text-sm">
				Pemesanan dalam jumlah besar disiapkan khusus oleh kru outlet dengan slot waktu terjadwal
				agar kesegaran buah asli tetap terjaga.
			</p>
		</div>

		<div class="mt-8 rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-8">
			<form
				onsubmit={(e) => {
					e.preventDefault();
					submit();
				}}
				class="space-y-6"
			>
				<!-- OUTLET & DATA -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label
							for="grp-outlet"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							Pilih Outlet Penyiapan <span class="text-brand">*</span>
						</label>
						<select
							id="grp-outlet"
							bind:value={outletId}
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink focus:border-brand focus:bg-white"
						>
							{#each CITIES as c}
								<optgroup label={c.name}>
									{#each OUTLETS.filter((o) => o.cityId === c.id) as o}
										<option value={o.id}>Outlet {o.name} ({o.city})</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="grp-name"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							Nama Penanggung Jawab <span class="text-brand">*</span>
						</label>
						<input
							id="grp-name"
							bind:value={name}
							type="text"
							required
							placeholder="Nama pemesan / instansi"
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
						/>
					</div>

					<div>
						<label
							for="grp-wa"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							Nomor WhatsApp Aktif <span class="text-brand">*</span>
						</label>
						<input
							id="grp-wa"
							bind:value={whatsapp}
							type="tel"
							required
							placeholder="08123456789 atau +628..."
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
						/>
					</div>

					<div>
						<label
							for="grp-schedule"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							Waktu Pengambilan Acara <span class="text-brand">*</span>
						</label>
						<input
							id="grp-schedule"
							bind:value={schedule}
							type="text"
							required
							placeholder="Contoh: Besok jam 14:00 WITA"
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
						/>
					</div>
				</div>

				<!-- MENU QUANTITY SELECTOR -->
				<div class="border-t border-black/10 pt-6">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-sm font-bold text-ink">Pilih Menu & Tentukan Jumlah Cup</h2>
							<p class="text-xs text-neutral-500">
								Kombinasikan varian jus sesuai kebutuhan peserta acara.
							</p>
						</div>
						<span class="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
							Total: {cups} Cup
						</span>
					</div>

					<div class="mt-4 grid gap-3 sm:grid-cols-2">
						{#each MENU as m}
							<div
								class="flex items-center justify-between rounded-2xl border border-black/10 bg-neutral-50/50 p-3.5 transition hover:border-black/20"
							>
								<div class="flex items-center gap-3">
									<img src={zcup} alt="" class="h-8 w-auto" />
									<div>
										<p class="text-xs font-bold text-ink">{m.name}</p>
										<p class="text-[11px] text-neutral-500">Harga dikonfirmasi outlet</p>
									</div>
								</div>

								<div class="flex items-center gap-2">
									<input
										type="number"
										min="0"
										value={qty[m.slug] ?? 0}
										onchange={(e) =>
											(qty[m.slug] = Math.max(0, Number((e.target as HTMLInputElement).value)))}
										class="w-16 rounded-xl border border-black/15 bg-white py-1.5 text-center text-xs font-bold text-ink focus:border-brand"
									/>
									<span class="text-xs text-neutral-500">cup</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-amber-900">
					<div class="flex items-start gap-2 text-xs leading-relaxed font-semibold">
						<span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500"></span>
						<span>
							Outlet akan meninjau jumlah dan kapasitas sebelum pembayaran. Waktu dan ketersediaan
							akan dikonfirmasi oleh kru.
						</span>
					</div>
				</div>

				<button
					type="submit"
					disabled={cups === 0 || !name || !whatsapp}
					class="tap-scale w-full rounded-full bg-brand py-4 text-center text-xs font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark disabled:opacity-40"
				>
					Kirim Permintaan Group Order ({cups} Cup) →
				</button>
			</form>
		</div>
	</div>
</div>
