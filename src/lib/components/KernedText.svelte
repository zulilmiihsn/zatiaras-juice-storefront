<script lang="ts">
	import { KERN_MAP } from '$lib/kern';

	// Koreksi alas per huruf untuk Zatiaras Display ExtraBold (lihat $lib/kern).
	// Dekoratif: beri aria-label pada heading induknya.
	// `reveal` (opsional): huruf muncul berjenjang; 'hidden' menyembunyikan sampai induk
	// mengubahnya ke 'in'.
	let {
		text,
		reveal = 'off',
		base = 0
	}: {
		text: string;
		reveal?: 'off' | 'hidden' | 'in';
		base?: number;
	} = $props();

	const words = $derived.by(() => {
		let index = 0;
		return text.split(' ').map((word) =>
			[...word].map((ch) => {
				const letter = { ch, index };
				index += 1;
				return letter;
			})
		);
	});
</script>

{#each words as word, wi}
	{#if wi > 0}
		{' '}
	{/if}<span class="whitespace-nowrap" aria-hidden="true"
		>{#each word as letter (letter.index)}<span
				class="kl inline-block"
				class:kl-hidden={reveal === 'hidden'}
				class:kl-in={reveal === 'in'}
				style:transform={`translateY(${KERN_MAP[letter.ch] ?? 0}em)`}
				style:--k={letter.index}
				style:--base={`${base}ms`}>{letter.ch}</span
			>{/each}</span
	>
{/each}

<style>
	.kl-hidden {
		opacity: 0;
	}
	.kl-in {
		animation: kl-rise 700ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
		animation-delay: calc(var(--k) * 32ms + var(--base));
	}
	@keyframes kl-rise {
		from {
			opacity: 0;
			translate: 0 0.45em;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.kl-in {
			animation: none;
		}
	}
</style>
