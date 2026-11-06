<script lang="ts">
	import { FEEDBACK_CATS, saveFeedback } from '$lib/support';
	import { track } from '$lib/analytics/events';
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { KERN_MAP } from '$lib/kern';
	import type { SupportCategory } from '$lib/core/contracts';

	let orderId = $state('');
	let category = $state<SupportCategory>('TASTE');
	let note = $state('');
	let done = $state(false);
	let error = $state('');

	function submit(): void {
		if (!note.trim()) {
			error = 'Tulis catatan sebelum menyimpan.';
			return;
		}
		try {
			saveFeedback({
				orderId: orderId.trim(),
				category,
				note: note.trim(),
				at: new Date().toISOString()
			});
			track('feedback_submitted', { category });
			done = true;
			error = '';
		} catch {
			error = 'Catatan tidak dapat disimpan di browser. Coba lagi atau hubungi outlet langsung.';
		}
	}

	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Feedback', url: canonical('/feedback') }
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
	<title>Masukan & Evaluasi Kualitas | Zatiaras Juice</title>
	<link rel="canonical" href={canonical('/feedback')} />
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-xl px-4 sm:px-6">
		<div class="text-left sm:text-center">
			<div
				class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-bold text-neutral-600 shadow-xs"
			>
				<span class="h-2 w-2 rounded-full bg-brand"></span>
				SUARA PELANGGAN
			</div>
			<h1
				class="mt-3 font-display text-3xl leading-tight font-extrabold text-ink sm:text-4xl"
				aria-label="Feedback & Saran"
			>
				{@render kerned('Evaluasi & Saran')}
			</h1>
			<div class="cup-lip-bar mt-3 w-12 sm:mx-auto"></div>
			<p class="mt-3 max-w-md text-xs leading-relaxed text-neutral-600 sm:mx-auto sm:text-sm">
				Bukan jebakan bintang 5. Keluhanmu adalah bahan baku kami menjaga standar kental dan rasa
				buah asli.
			</p>
		</div>

		<div class="mt-8 rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-8">
			{#if done}
				<div class="py-8 text-center">
					<div
						class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
					>
						<svg
							class="h-7 w-7"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</div>
					<h2 class="mt-4 font-display text-2xl text-ink" aria-label="Terima Kasih">
						{@render kerned('Terima Kasih Banyak')}
					</h2>
					<p class="mt-2 text-xs leading-relaxed text-neutral-600">
						Catatan tersimpan di browser ini dan belum dikirim ke tim Zatiaras. Untuk mendapat
						bantuan, hubungi outlet secara langsung.
					</p>
					<a
						href="/locations"
						class="mt-4 block text-xs font-bold text-brand underline underline-offset-4"
					>
						Lihat lokasi outlet
					</a>
					<a
						href="/menu"
						class="tap-scale mt-6 inline-block rounded-full bg-brand px-7 py-3 text-xs font-bold text-white shadow-md shadow-brand/25"
					>
						Kembali ke Menu
					</a>
				</div>
			{:else}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						submit();
					}}
					class="space-y-4"
				>
					<p class="text-xs leading-relaxed text-neutral-600">
						Catatan hanya tersimpan di browser ini dan belum dikirim ke tim Zatiaras. Hubungi
						<a href="/locations" class="font-semibold text-brand underline">outlet langsung</a>
						untuk mendapat bantuan.
					</p>
					<div>
						<label
							for="fb-order-id"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							ID Pesanan (Opsional)
						</label>
						<input
							id="fb-order-id"
							bind:value={orderId}
							type="text"
							placeholder="cth: order_12345"
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
						/>
					</div>

					<div>
						<label
							for="fb-category"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							Kategori Catatan <span class="text-brand">*</span>
						</label>
						<select
							id="fb-category"
							bind:value={category}
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink focus:border-brand focus:bg-white"
						>
							{#each FEEDBACK_CATS as c}
								<option value={c.id}>{c.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="fb-note"
							class="block text-xs font-bold tracking-wider text-neutral-600 uppercase"
						>
							Ceritakan Pengalamanmu <span class="text-brand">*</span>
						</label>
						<textarea
							id="fb-note"
							bind:value={note}
							rows="4"
							required
							placeholder="Ceritakan kendala rasa, porsi, waktu tunggu, atau pelayanan kru..."
							class="mt-1.5 w-full rounded-2xl border border-black/15 bg-neutral-50/50 px-4 py-3 text-sm text-ink placeholder:text-neutral-400 focus:border-brand focus:bg-white"
						></textarea>
					</div>

					{#if error}
						<p role="alert" class="text-xs font-semibold text-rose-700">{error}</p>
					{/if}
					<button
						type="submit"
						class="tap-scale mt-2 w-full rounded-full bg-brand py-3.5 text-center text-xs font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
					>
						Simpan Catatan
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
