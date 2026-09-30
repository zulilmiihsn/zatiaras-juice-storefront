<!-- OutletSelector: manual city/outlet selection. Selalu tersedia, cepat, plain Indonesian.
Props: open, onselect(outletId), onclose. Akses: dialog modal, Escape tutup, fokus restore. -->
<script lang="ts">
	import { CITIES, OUTLETS, getCity, formatOutletHours } from '$lib/core/outlets';
	import { track } from '$lib/analytics/events';

	interface Props {
		open: boolean;
		selectedId?: string;
		suggestedCityId?: string | null;
		onselect?: (outletId: string) => void;
		onclose?: () => void;
	}

	const { open, selectedId, suggestedCityId, onselect, onclose }: Props = $props();

	let cityId = $state('samarinda');
	let panel: HTMLElement | null = $state(null);

	const suggestedCity = $derived(suggestedCityId ? getCity(suggestedCityId) : undefined);

	function pick(id: string): void {
		onselect?.(id);
	}

	function onkeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose?.();
		}
	}

	$effect(() => {
		if (open) {
			if (suggestedCityId) cityId = suggestedCityId;
			track('outlet_selector_opened', {
				suggested_city: suggestedCity?.name ?? 'none'
			});
			if (suggestedCity) {
				track('location_suggested', { city: suggestedCity.name, source: 'ip' });
			}
			requestAnimationFrame(() => panel?.querySelector<HTMLElement>('button')?.focus());
		}
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50"
		role="dialog"
		aria-modal="true"
		aria-label="Pilih outlet"
		tabindex="-1"
		{onkeydown}
	>
		<button
			type="button"
			class="absolute inset-0 bg-ink/40"
			aria-label="Tutup pemilih outlet"
			onclick={onclose}
			tabindex="-1"
		></button>
		<div
			bind:this={panel}
			class="absolute right-0 bottom-0 left-0 mx-auto max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-6"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs font-bold tracking-wider text-neutral-500 uppercase">
						Pilih outlet pickup
					</p>
					<h2 class="font-display text-2xl font-bold text-ink">Mau ambil di mana?</h2>
				</div>
				<button
					type="button"
					onclick={onclose}
					aria-label="Tutup"
					class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white font-bold"
				>
					✕
				</button>
			</div>

			<div class="mt-4 flex gap-2" role="group" aria-label="Pilih kota">
				{#each CITIES as c (c.id)}
					<button
						type="button"
						aria-pressed={cityId === c.id}
						onclick={() => (cityId = c.id)}
						class="min-h-11 flex-1 rounded-full px-3 py-2.5 text-xs font-bold transition {cityId ===
						c.id
							? 'bg-ink text-white'
							: 'border border-black/10 bg-white text-neutral-600'}"
					>
						{c.name}
					</button>
				{/each}
			</div>

			{#if suggestedCity}
				<p class="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-500">
					Saran berdasarkan lokasimu: <strong class="text-ink">{suggestedCity.name}</strong>. Bisa
					salah — silakan pilih manual.
				</p>
			{/if}

			<ul class="mt-4 space-y-2.5">
				{#each OUTLETS.filter((o) => o.cityId === cityId) as o (o.id)}
					<li>
						<button
							type="button"
							onclick={() => pick(o.id)}
							aria-current={selectedId === o.id ? 'true' : undefined}
							class="flex w-full items-center justify-between rounded-2xl border p-4 text-left transition {selectedId ===
							o.id
								? 'border-brand bg-white shadow-sm'
								: 'border-black/10 bg-white hover:border-brand/40'}"
						>
							<span>
								<span class="block text-sm font-bold text-ink">Zatiaras {o.name}</span>
								<span class="block text-xs text-neutral-500">
									{o.city}{#if o.hours && !o.hours.startsWith('VERIFY')}
										· {formatOutletHours(o.hours)}{/if}
								</span>
							</span>
							<span
								class="rounded-full px-3 py-1.5 text-xs font-bold {selectedId === o.id
									? 'bg-brand text-white'
									: 'bg-ink text-white'}"
							>
								{selectedId === o.id ? 'Dipilih' : 'Pilih'}
							</span>
						</button>
					</li>
				{/each}
			</ul>

			<p class="mt-4 text-center text-xs text-neutral-500">
				Satu pesanan untuk satu outlet. Harga/ketersediaan ikut outlet yang dipilih.
			</p>
		</div>
	</div>
{/if}
