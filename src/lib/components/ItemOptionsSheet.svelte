<script lang="ts">
	// Lembar pilihan cup: ukuran, manis, es, jumlah. Harga total selalu terlihat.
	// Pilihan terakhir diingat di perangkat supaya pesan berikutnya cukup satu ketukan.
	import { browser } from '$app/environment';
	import type { PublicMenuItem } from '$lib/data/menu';
	import {
		DEFAULT_OPTIONS,
		ICE,
		ICE_LABEL,
		JUMBO_UPCHARGE,
		SIZE_LABEL,
		SIZES,
		SWEET_LABEL,
		SWEETNESS,
		jumboEligible,
		unitPrice,
		type ItemOptions
	} from '$lib/core/options';
	import { rupiah } from '$lib/core/whatsapp-order';

	interface Props {
		item: PublicMenuItem | null;
		basePrice: number;
		onadd: (opts: ItemOptions, qty: number, unit: number) => void;
		onclose: () => void;
	}
	let { item, basePrice, onadd, onclose }: Props = $props();

	const PREF_KEY = 'z-item-pref';
	let dialog: HTMLDialogElement | undefined = $state();
	let opts = $state<ItemOptions>({ ...DEFAULT_OPTIONS });
	let qty = $state(1);

	const canJumbo = $derived(jumboEligible(item?.category));
	const unit = $derived(unitPrice(basePrice, canJumbo ? opts.size : 'REG'));

	function loadPref(): ItemOptions {
		if (!browser) return { ...DEFAULT_OPTIONS };
		try {
			const raw = JSON.parse(localStorage.getItem(PREF_KEY) ?? 'null');
			if (!raw) return { ...DEFAULT_OPTIONS };
			return {
				size: SIZES.includes(raw.size) ? raw.size : 'REG',
				sweet: SWEETNESS.includes(raw.sweet) ? raw.sweet : 'NORMAL',
				ice: ICE.includes(raw.ice) ? raw.ice : 'NORMAL'
			};
		} catch {
			return { ...DEFAULT_OPTIONS };
		}
	}

	$effect(() => {
		if (item && dialog && !dialog.open) {
			opts = loadPref();
			if (!jumboEligible(item.category)) opts.size = 'REG';
			qty = 1;
			dialog.showModal();
		}
		if (!item && dialog?.open) dialog.close();
	});

	function add() {
		const final: ItemOptions = { ...opts, size: canJumbo ? opts.size : 'REG' };
		try {
			localStorage.setItem(PREF_KEY, JSON.stringify(final));
		} catch {
			/* abaikan: penyimpanan tidak wajib */
		}
		onadd(final, qty, unit);
	}
</script>

<dialog
	bind:this={dialog}
	onclose={onclose}
	aria-labelledby="opt-title"
	class="m-auto w-[min(28rem,calc(100vw-1.5rem))] rounded-3xl border-0 bg-cream p-0 text-ink shadow-2xl backdrop:bg-black/45"
>
	{#if item}
		<form method="dialog" class="flex flex-col gap-5 p-6" onsubmit={(e) => e.preventDefault()}>
			<div class="flex items-start justify-between gap-3">
				<h2 id="opt-title" class="font-display text-2xl leading-tight font-extrabold">
					{item.name}
				</h2>
				<button
					type="button"
					class="-mt-1 -mr-2 min-h-11 min-w-11 text-3xl leading-none text-neutral-500"
					aria-label="Tutup"
					onclick={onclose}>×</button
				>
			</div>

			{#if canJumbo}
				<fieldset>
					<legend class="mb-2 text-xs font-bold text-neutral-600">Ukuran</legend>
					<div class="flex flex-wrap gap-2">
						{#each SIZES as s}
							<button
								type="button"
								aria-pressed={opts.size === s}
								onclick={() => (opts.size = s)}
								class="tap-scale min-h-11 rounded-xl px-4 text-sm font-bold ring-1 transition {opts.size ===
								s
									? 'bg-ink text-white ring-ink'
									: 'bg-white text-ink ring-black/15'}"
							>
								{SIZE_LABEL[s]} · {rupiah(unitPrice(basePrice, s))}
								{#if s === 'JUMBO'}<span class="text-xs font-semibold opacity-80">
										(+{rupiah(JUMBO_UPCHARGE)})</span
									>{/if}
							</button>
						{/each}
					</div>
				</fieldset>
			{/if}

			<fieldset>
				<legend class="mb-2 text-xs font-bold text-neutral-600">Manisnya</legend>
				<div class="flex flex-wrap gap-2">
					{#each SWEETNESS as s}
						<button
							type="button"
							aria-pressed={opts.sweet === s}
							onclick={() => (opts.sweet = s)}
							class="tap-scale min-h-11 rounded-xl px-4 text-sm font-bold ring-1 transition {opts.sweet ===
							s
								? 'bg-ink text-white ring-ink'
								: 'bg-white text-ink ring-black/15'}">{SWEET_LABEL[s]}</button
						>
					{/each}
				</div>
			</fieldset>

			<fieldset>
				<legend class="mb-2 text-xs font-bold text-neutral-600">Es</legend>
				<div class="flex flex-wrap gap-2">
					{#each ICE as s}
						<button
							type="button"
							aria-pressed={opts.ice === s}
							onclick={() => (opts.ice = s)}
							class="tap-scale min-h-11 rounded-xl px-4 text-sm font-bold ring-1 transition {opts.ice ===
							s
								? 'bg-ink text-white ring-ink'
								: 'bg-white text-ink ring-black/15'}">{ICE_LABEL[s]}</button
						>
					{/each}
				</div>
			</fieldset>

			<div class="flex items-center gap-4">
				<span class="text-xs font-bold text-neutral-600">Jumlah</span>
				<div class="inline-flex items-center rounded-xl bg-white ring-1 ring-black/15">
					<button
						type="button"
						class="min-h-11 min-w-11 text-xl"
						aria-label="Kurangi"
						onclick={() => (qty = Math.max(1, qty - 1))}>−</button
					>
					<b class="min-w-8 text-center">{qty}</b>
					<button
						type="button"
						class="min-h-11 min-w-11 text-xl"
						aria-label="Tambah"
						onclick={() => (qty = Math.min(20, qty + 1))}>+</button
					>
				</div>
			</div>

			<button
				type="button"
				onclick={add}
				class="tap-scale flex min-h-14 items-center justify-center gap-2 rounded-full bg-brand text-base font-bold text-white shadow-lg shadow-brand/25"
			>
				Tambah · {rupiah(unit * qty)}
			</button>
		</form>
	{/if}
</dialog>
