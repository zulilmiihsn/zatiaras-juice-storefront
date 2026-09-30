<script lang="ts">
	import { onMount } from 'svelte';
	import { SECTIONS, progress } from '$lib/qa/checklist';

	const KEY = 'z-qa';
	let done = $state<Record<string, boolean>>({});

	const gates = $derived(SECTIONS.flatMap((section) => section.gates));
	const total = $derived(gates.length);
	const nDone = $derived(gates.filter((gate) => done[gate.id]).length);
	const pct = $derived(progress(total, nDone));

	onMount(() => {
		try {
			done = JSON.parse(localStorage.getItem(KEY) ?? '{}');
		} catch {
			done = {};
		}
	});

	function toggle(id: string): void {
		done = { ...done, [id]: !done[id] };
		try {
			localStorage.setItem(KEY, JSON.stringify(done));
		} catch {
			/* Checklist stays usable when browser storage is unavailable. */
		}
	}

	function reset(): void {
		done = {};
		try {
			localStorage.removeItem(KEY);
		} catch {
			/* abaikan */
		}
	}
</script>

<svelte:head>
	<title>QA Checklist | Zatiaras Juice</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div class="min-h-[calc(100dvh-4rem)] bg-cream px-4 py-8 sm:px-6 sm:py-12">
	<div class="mx-auto max-w-5xl">
		<header
			class="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between"
		>
			<div>
				<p class="eyebrow">Ruang operasional · checklist</p>
				<h1 class="page-heading mt-2 text-ink">QA & UAT</h1>
				<p class="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
					Centang hanya setelah skenario benar-benar diuji. Checklist ini tersimpan di browser ini.
				</p>
			</div>
			<button
				type="button"
				onclick={reset}
				class="min-h-11 self-start rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-bold text-ink hover:border-brand/40 sm:self-auto"
			>
				Reset checklist
			</button>
		</header>

		<section class="surface-card mt-6 p-5 sm:p-6" aria-label="Progres checklist">
			<div class="flex items-end justify-between gap-4">
				<div>
					<p class="eyebrow">Progres verifikasi</p>
					<p class="mt-1 font-display text-3xl font-bold text-ink">
						{nDone} <span class="text-neutral-400">/ {total}</span>
					</p>
				</div>
				<span class="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand"
					>{pct}%</span
				>
			</div>
			<div
				class="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-100"
				role="progressbar"
				aria-label="Progres QA"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={pct}
			>
				<div
					class="h-full rounded-full bg-brand transition-[width] duration-200"
					style:width="{pct}%"
				></div>
			</div>
			<p class="mt-3 text-xs text-neutral-500">
				{pct === 100
					? 'Semua skenario checklist ditandai selesai.'
					: 'Bukti soft launch wajib lengkap; no-go item harus nol.'}
			</p>
		</section>

		<div class="mt-6 grid gap-4 lg:grid-cols-2">
			{#each SECTIONS as section (section.title)}
				<section class="surface-card overflow-hidden" aria-label={section.title}>
					<h2
						class="border-b border-black/[0.06] bg-white px-5 py-4 font-display text-lg font-bold text-ink sm:px-6"
					>
						{section.title}
					</h2>
					<ul class="divide-y divide-black/[0.05] px-5 sm:px-6">
						{#each section.gates as gate (gate.id)}
							<li>
								<label
									class="flex min-h-12 cursor-pointer items-start gap-3 py-3 text-sm leading-relaxed text-neutral-700"
								>
									<input
										type="checkbox"
										checked={!!done[gate.id]}
										onchange={() => toggle(gate.id)}
										class="mt-0.5 h-5 w-5 shrink-0 accent-brand"
									/>
									<span class:line-through={done[gate.id]} class:opacity-55={done[gate.id]}>
										{gate.label}
									</span>
								</label>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	</div>
</div>
