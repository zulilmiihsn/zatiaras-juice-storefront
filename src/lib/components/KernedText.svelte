<script lang="ts">
	import { KERN_MAP, KERN_PAIRS } from '$lib/kern';

	// Koreksi alas per huruf untuk Zatiaras Display ExtraBold (lihat $lib/kern).
	// Dekoratif: beri aria-label pada heading induknya.
	// `reveal` (opsional): huruf muncul berjenjang; 'hidden' menyembunyikan sampai induk
	// mengubahnya ke 'in'.
	let {
		text,
		reveal = 'off',
		base = 0,
		play = false
	}: {
		text: string;
		reveal?: 'off' | 'hidden' | 'in';
		base?: number;
		// Huruf membesar membal saat disentuh; alas tetap lurus.
		play?: boolean;
	} = $props();

	const words = $derived.by(() => {
		let index = 0;
		return text.split(' ').map((word) => {
			let prev = '';
			return [...word].map((ch) => {
				const letter = { ch, index, pair: KERN_PAIRS[prev]?.[ch] ?? 0 };
				prev = ch;
				index += 1;
				return letter;
			});
		});
	});
</script>

{#each words as word, wi}
	{#if wi > 0}
		{' '}
	{/if}<span class="whitespace-nowrap" aria-hidden="true"
		>{#each word as letter (letter.index)}<span
				class="kl inline-block"
				data-letter={letter.ch}
				class:kl-hidden={reveal === 'hidden'}
				class:kl-in={reveal === 'in'}
				class:kl-play={play}
				style:transform={`translateY(${KERN_MAP[letter.ch] ?? 0}em)`}
				style:margin-left={letter.pair ? `${letter.pair}em` : undefined}
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
		/* backwards, not both: the end state equals the defaults, and holding it would block
		   parents that drive translate/opacity afterwards (hero scroll exit). */
		animation: kl-rise 700ms cubic-bezier(0.34, 1.4, 0.64, 1) backwards;
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
	.kl-play {
		transition: scale 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.kl-play:hover {
		scale: 1.1;
	}
	@media (prefers-reduced-motion: reduce) {
		.kl-in {
			animation: none;
		}
		.kl-play:hover {
			scale: 1;
		}
	}
</style>
