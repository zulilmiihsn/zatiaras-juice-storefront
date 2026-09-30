<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { getOutlet } from '$lib/core/outlets';
	import type { OutletId } from '$lib/core/contracts';
	import type { RevalidationResult } from '$lib/stores/cart-logic';
	import { AVAILABILITY_VERIFIED, MENU_VERIFIED } from '$lib/data/menu';

	interface Props {
		open: boolean;
		fromOutletId: string;
		toOutletId: OutletId;
		preview: RevalidationResult;
		onconfirm: () => void;
		oncancel: () => void;
	}

	const { open, fromOutletId, toOutletId, preview, onconfirm, oncancel }: Props = $props();

	let panel: HTMLElement | null = $state(null);
	let previousFocus: HTMLElement | null = null;

	const fromOutlet = $derived(getOutlet(fromOutletId));
	const toOutlet = $derived(getOutlet(toOutletId));
	const changedDataVerified = $derived(MENU_VERIFIED && AVAILABILITY_VERIFIED);

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			oncancel();
			return;
		}
		if (event.key !== 'Tab' || !panel) return;
		const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled])')];
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		if (open) {
			previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			document.body.style.overflow = 'hidden';
			void tick().then(() => panel?.querySelector<HTMLElement>('button')?.focus());
		} else {
			document.body.style.overflow = '';
			previousFocus?.focus();
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

	onDestroy(() => {
		document.body.style.overflow = '';
		previousFocus?.focus();
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
		role="presentation"
	>
		<button
			type="button"
			class="absolute inset-0 bg-ink/55"
			aria-label="Batalkan perubahan outlet"
			tabindex="-1"
			onclick={oncancel}
		></button>
		<div
			bind:this={panel}
			role="dialog"
			aria-modal="true"
			aria-labelledby="revalidate-title"
			aria-describedby="revalidate-description"
			tabindex="-1"
			onkeydown={handleKeydown}
			class="relative z-10 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-7"
		>
			<p class="eyebrow">Pindah outlet</p>
			<h2 id="revalidate-title" class="mt-1 font-display text-2xl font-bold text-ink">
				Periksa ulang pesananmu
			</h2>
			<p id="revalidate-description" class="mt-2 text-sm leading-relaxed text-neutral-600">
				Keranjangmu dibuat untuk <strong class="text-ink">{fromOutlet?.name ?? fromOutletId}</strong
				>. Harga atau ketersediaan bisa berbeda di
				<strong class="text-ink">{toOutlet?.name ?? toOutletId}</strong>.
			</p>

			{#if !changedDataVerified}
				<div
					class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-neutral-700"
				>
					Data harga dan ketersediaan outlet belum terverifikasi. Item keranjang tetap ditampilkan;
					konfirmasi harga sebelum pembayaran.
				</div>
			{:else}
				<ul class="mt-4 space-y-2 text-sm">
					{#each preview.unchanged as line (line.menuItemId)}
						<li
							class="flex items-center justify-between rounded-xl border border-black/5 bg-white px-3 py-2.5"
						>
							<span class="font-medium text-ink">{line.name} × {line.qty}</span>
							<span class="text-xs font-semibold text-emerald-700">Tetap tersedia</span>
						</li>
					{/each}
					{#each preview.priceChanged as line (line.menuItemId)}
						<li class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
							<p class="font-semibold text-ink">{line.name} × {line.qty}</p>
							<p class="mt-0.5 text-xs text-amber-900">
								Harga berubah: Rp{line.oldPrice?.toLocaleString('id-ID')} → Rp{line.price.toLocaleString(
									'id-ID'
								)}
							</p>
						</li>
					{/each}
					{#each preview.removed as line (line.menuItemId)}
						<li
							class="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5"
						>
							<span class="font-medium text-ink">{line.name} × {line.qty}</span>
							<span class="text-xs font-semibold text-rose-700">Tidak tersedia</span>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					onclick={oncancel}
					class="min-h-11 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-bold text-ink hover:border-brand/40"
				>
					Tetap di outlet ini
				</button>
				<button
					type="button"
					onclick={onconfirm}
					class="min-h-11 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
				>
					Ganti ke {toOutlet?.name ?? toOutletId}
				</button>
			</div>
		</div>
	</div>
{/if}
