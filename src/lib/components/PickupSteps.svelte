<script lang="ts">
	import KernedText from '$lib/components/KernedText.svelte';
	import { track } from '$lib/analytics/events';

	function reveal(node: HTMLElement) {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				node.classList.add('is-visible');
				observer.disconnect();
			},
			{ threshold: 0.12 }
		);
		node.classList.add('will-enter');
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
</script>

<section class="pickup" aria-labelledby="pickup-title" use:reveal>
	<div class="pickup-layout">
		<div class="pickup-intro">
			<h2 id="pickup-title" class="font-display">
				<span><KernedText text="Pesan dulu" /></span>
				<span class="pickup-title-accent"><KernedText text="Tinggal ambil" /></span>
			</h2>
			<p class="pickup-description">
				Pilih minumanmu dari mana saja. Datang ke outlet setelah pesanan siap.
			</p>
			<a
				href="/menu"
				class="pickup-cta"
				onclick={() => track('hero_order_clicked', { source: 'pickup_steps' })}
			>
				<span>Pesan Sekarang</span>
				<span class="pickup-cta-arrow" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M5 12h14m-6-6 6 6-6 6" />
					</svg>
				</span>
			</a>
			<div class="pickup-footnote">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z" />
					<circle cx="12" cy="9" r="2.5" />
				</svg>
				Diambil di outlet pilihanmu
			</div>
		</div>

		<ol class="pickup-steps" aria-label="Tiga langkah pemesanan pickup">
			<li class="pickup-step">
				<div class="pickup-step-copy">
					<h3>Pilih outlet & menu</h3>
					<p>Tentukan tempat ambil pesanan, lalu pilih minuman yang kamu mau.</p>
				</div>
				<svg
					class="pickup-step-icon"
					viewBox="0 0 48 48"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M9 20h30l-4-10H13L9 20Z" />
					<path
						d="M9 20v3a5 5 0 0 0 10 0 5 5 0 0 0 10 0 5 5 0 0 0 10 0v-3M12 28v10h24V28M20 38V28h8v10M19 10l-2 10m12-10 2 10"
					/>
				</svg>
			</li>
			<li class="pickup-step">
				<div class="pickup-step-copy">
					<h3>Bayar online</h3>
					<p>Selesaikan pembayaran. Tanpa perlu bikin akun.</p>
				</div>
				<svg
					class="pickup-step-icon"
					viewBox="0 0 48 48"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect x="8" y="12" width="32" height="24" rx="4" />
					<path d="M8 20h32M14 29h7m5 0h3" />
				</svg>
			</li>
			<li class="pickup-step pickup-step-final">
				<div class="pickup-step-copy">
					<h3>Siap? Tinggal ambil.</h3>
					<p>Cek status pesanan. Setelah siap, tunjukkan kode pesanan di outlet.</p>
				</div>
				<svg
					class="pickup-step-icon"
					viewBox="0 0 48 48"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M11 16h26l2 24H9l2-24ZM18 16v-5a6 6 0 0 1 12 0v5" />
					<path d="m19 28 4 4 7-8" />
				</svg>
			</li>
		</ol>
	</div>
</section>

<style>
	@font-face {
		font-family: 'Plus Jakarta Sans Pickup';
		font-style: normal;
		font-weight: 800;
		font-display: swap;
		src: url('@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2')
			format('woff2');
	}

	.pickup {
		max-width: 72rem;
		margin-inline: auto;
		padding: var(--home-section-space) 1rem;
	}
	.pickup-layout {
		display: grid;
		align-items: center;
		gap: var(--home-section-gap);
	}
	.pickup-intro h2 {
		margin: 0;
		font-size: clamp(2.625rem, 4.2vw, 3.75rem);
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.005em;
	}
	.pickup-intro h2 span {
		display: block;
	}
	.pickup-title-accent {
		color: var(--color-brand);
	}
	.pickup-description {
		max-width: 20rem;
		margin-top: 1.5rem;
		color: var(--color-copy-muted);
		font-size: 0.9375rem;
		line-height: 1.8;
	}
	.pickup-cta {
		display: inline-flex;
		min-height: 3.5rem;
		align-items: center;
		gap: 1.5rem;
		margin-top: 2rem;
		padding: 0.5rem 0.5rem 0.5rem 1.5rem;
		border-radius: 999px;
		background: var(--color-brand);
		color: white;
		font-size: 0.875rem;
		font-weight: 700;
		transition:
			background-color 200ms ease,
			transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pickup-cta-arrow {
		display: grid;
		width: 2.5rem;
		height: 2.5rem;
		place-items: center;
		border: 1px solid rgb(255 255 255 / 35%);
		border-radius: 50%;
	}
	.pickup-cta-arrow svg {
		width: 1.25rem;
		height: 1.25rem;
		transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pickup-cta:active {
		transform: scale(0.98);
	}
	.pickup-footnote {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		color: var(--color-copy-muted);
		font-size: 0.8125rem;
	}
	.pickup-footnote svg {
		width: 1rem;
		height: 1rem;
	}
	.pickup-steps {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.pickup-step {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 2.25rem;
		align-items: start;
		gap: 0.875rem;
		padding: 1.75rem 0;
		border-bottom: 0;
	}
	.pickup-step:first-child {
		padding-top: 0;
	}
	.pickup-step-copy h3 {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 700;
		line-height: 1.4;
		letter-spacing: -0.035em;
	}
	.pickup-step-copy p {
		max-width: 19rem;
		margin-top: 0.625rem;
		color: var(--color-copy-muted);
		font-size: 1rem;
		line-height: 1.75;
	}
	.pickup-step-icon {
		width: 2.25rem;
		height: 2.25rem;
		color: var(--color-copy-muted);
		transition: transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pickup-step-final {
		position: relative;
		margin-top: 1.5rem;
		padding: 1.75rem 1rem;
		border: 0;
		border-radius: 0.375rem 0.375rem 1.75rem 0.375rem;
		background: var(--color-ink);
		color: var(--color-cream);
	}
	.pickup-step-final .pickup-step-icon {
		color: #ff84bf;
	}
	.pickup-step-final p {
		color: #d1c8cd;
	}
	@media (hover: hover) {
		.pickup-cta:hover {
			background: var(--color-brand-dark);
		}
		.pickup-cta:hover svg {
			transform: translateX(3px);
		}
		.pickup-step:hover .pickup-step-icon {
			transform: translateY(-3px) rotate(-5deg);
		}
	}
	@media (min-width: 640px) {
		.pickup {
			padding-inline: 1.5rem;
		}
		.pickup-step {
			grid-template-columns: minmax(0, 1fr) 3rem;
			gap: 1.5rem;
			padding-block: 2rem;
		}
		.pickup-step-copy h3 {
			font-size: 1.375rem;
		}
		.pickup-step-copy p {
			font-size: 1rem;
		}
		.pickup-step-icon {
			width: 3rem;
			height: 3rem;
		}
		.pickup-step-final {
			padding-inline: 1.5rem;
		}
	}
	@media (min-width: 1024px) {
		.pickup {
			padding-inline: 2rem;
		}
		.pickup-layout {
			grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
			gap: 4rem;
		}
		.pickup-intro {
			padding-top: 0.5rem;
		}
		.pickup-description {
			margin-top: 2rem;
		}
		.pickup-cta {
			margin-top: 2.5rem;
		}
		.pickup-step-final {
			margin-inline: 0;
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		.pickup:global(.will-enter) .pickup-intro,
		.pickup:global(.will-enter) .pickup-step {
			opacity: 0;
			transform: translateY(18px);
			transition:
				opacity 650ms ease,
				transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
		}
		.pickup:global(.is-visible) .pickup-intro,
		.pickup:global(.is-visible) .pickup-step {
			opacity: 1;
			transform: translateY(0);
		}
		.pickup-step:nth-child(2) {
			transition-delay: 90ms;
		}
		.pickup-step:nth-child(3) {
			transition-delay: 180ms;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pickup *,
		.pickup *::before,
		.pickup *::after {
			transition: none;
		}
	}
</style>
