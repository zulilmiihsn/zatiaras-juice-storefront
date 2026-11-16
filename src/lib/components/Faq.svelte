<script lang="ts">
	import { FAQ } from '$lib/data/faq';
	import { faqJsonLd, jsonLdTag } from '$lib/seo';

	const ld = jsonLdTag(faqJsonLd(FAQ));
</script>

<svelte:head>
	{@html ld}
</svelte:head>

<section class="faq" aria-labelledby="faq-title">
	<h2 id="faq-title" class="font-display">Yang sering ditanya</h2>
	<p class="faq-lead">Jawaban singkat untuk yang paling sering ditanyakan di kasir</p>
	<div class="faq-list">
		{#each FAQ as item}
			<details class="faq-item">
				<summary>
					<span>{item.q}</span>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
						<path d="m6 9 6 6 6-6" />
					</svg>
				</summary>
				<p>{item.a}</p>
			</details>
		{/each}
	</div>
</section>

<style>
	.faq {
		max-width: 48rem;
		margin-inline: auto;
		padding: var(--home-section-space) 1rem;
	}
	h2 {
		margin: 0;
		color: var(--color-ink);
		font-size: clamp(2rem, 3.6vw, 3rem);
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: -0.005em;
	}
	.faq-lead {
		margin-top: 0.75rem;
		color: var(--color-copy-muted);
		font-size: 0.9375rem;
		line-height: 1.7;
	}
	.faq-list {
		margin-top: 2rem;
		border-top: 1px solid rgb(0 0 0 / 0.1);
	}
	.faq-item {
		border-bottom: 1px solid rgb(0 0 0 / 0.1);
	}
	summary {
		display: flex;
		min-height: 3.5rem;
		cursor: pointer;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		color: var(--color-ink);
		font-size: 1rem;
		font-weight: 700;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
		border-radius: 0.5rem;
	}
	summary svg {
		width: 1.25rem;
		height: 1.25rem;
		flex: none;
		color: var(--color-brand);
		transition: transform 200ms ease;
	}
	.faq-item[open] summary svg {
		transform: rotate(180deg);
	}
	.faq-item p {
		margin: 0 0 1.25rem;
		max-width: 38rem;
		color: var(--color-copy-muted);
		font-size: 0.9375rem;
		line-height: 1.8;
	}
	@media (prefers-reduced-motion: reduce) {
		summary svg {
			transition: none;
		}
	}
</style>
