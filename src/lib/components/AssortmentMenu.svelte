<script lang="ts">
	import { MENU } from '$lib/data/menu';
	import { track } from '$lib/analytics/events';

	const artwork = [
		{
			slug: 'jus-alpukat',
			image: 'avocado',
			width: 960,
			height: 778,
			blob: 'pistachio',
			blobHeight: 545,
			description: 'Alpukat asli yang creamy dan lembut.'
		},
		{
			slug: 'hero-signature',
			image: 'avocado-chocolate',
			width: 960,
			height: 1088,
			blob: 'peach',
			blobHeight: 527,
			description: 'Alpukat kocok, manisnya pas.'
		},
		{
			slug: 'jus-mangga',
			image: 'mango',
			width: 960,
			height: 988,
			blob: 'pink',
			blobHeight: 519,
			description: 'Mangga manis yang menyegarkan.'
		}
	];
	// Discovery uses the menu master for names/routes, never seeded price or stock.
	const products = artwork.flatMap((visual) => {
		const item = MENU.find((menu) => menu.slug === visual.slug);
		return item ? [{ ...visual, name: item.name }] : [];
	});
</script>

{#snippet arrow()}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M5 12h14m-6-6 6 6-6 6" />
	</svg>
{/snippet}

<section
	id="jus-apa-aja"
	class="assortment"
	aria-labelledby="assortment-title"
	data-video-background-region
>
	<div class="assortment-inner">
		<div class="assortment-heading">
			<div>
				<h2 id="assortment-title" class="font-display">Jus Apa Aja <span>Ada</span></h2>
				<p class="assortment-intro">
					Buah asli, diblender saat dipesan. Dari alpukat sampai mangga, pilih favoritmu.
				</p>
			</div>
			<a
				class="all-menu"
				href="/menu"
				onclick={() => track('menu_preview_clicked', { source: 'assortment' })}
			>
				Lihat semua menu {@render arrow()}
			</a>
		</div>

		<div class="showcase">
			<img
				class="shared-marble"
				src="/images/assortment/marble.webp"
				width="1920"
				height="481"
				alt=""
				loading="lazy"
				decoding="async"
				aria-hidden="true"
			/>
			<div class="assortment-grid">
				{#each products as product (product.slug)}
					<article class="assortment-product">
						<div class="product-scene">
							<img
								class="product-blob"
								src={`/images/assortment/${product.blob}-blob.webp`}
								width="720"
								height={product.blobHeight}
								alt=""
								loading="lazy"
								decoding="async"
								aria-hidden="true"
							/>
							<img
								class="mobile-marble"
								src="/images/assortment/marble.webp"
								width="1920"
								height="481"
								alt=""
								loading="lazy"
								decoding="async"
								aria-hidden="true"
							/>
							<img
								class="product-photo"
								class:product-photo--avocado={product.image === 'avocado'}
								src={`/images/assortment/${product.image}-480.webp`}
								srcset={`/images/assortment/${product.image}-480.webp 480w, /images/assortment/${product.image}-960.webp 960w`}
								sizes="(min-width: 768px) 360px, (min-width: 440px) 370px, 90vw"
								width={product.width}
								height={product.height}
								alt={`${product.name} Zatiaras dengan buah dan bahan pelengkap`}
								loading="lazy"
								decoding="async"
							/>
						</div>
						<div class="product-copy">
							<h3 class="font-display">{product.name}</h3>
							<p id={`assortment-copy-${product.slug}`}>{product.description}</p>
							<a
								class="menu-link"
								href={`/menu/${product.slug}`}
								aria-label={`Lihat menu ${product.name}`}
								aria-describedby={`assortment-copy-${product.slug}`}
								onclick={() =>
									track('product_clicked', { menu: product.slug, source: 'assortment' })}
							>
								Lihat menu {@render arrow()}
							</a>
						</div>
					</article>
				{:else}
					<p>Menu sedang disiapkan. Silakan lihat halaman menu.</p>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.assortment {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		scroll-margin-top: 96px;
	}
	.assortment-inner {
		max-width: 1152px;
		margin: 0 auto;
		padding: var(--home-section-space) 16px;
	}
	.assortment-heading {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 20px;
	}
	h2 {
		font-size: clamp(2.25rem, 5vw, 4rem);
		line-height: 1.08;
		font-weight: 800;
		color: var(--color-ink);
	}
	h2 span {
		color: var(--color-brand);
	}
	.assortment-intro {
		max-width: 800px;
		margin-top: 12px;
		font-size: 14px;
		line-height: 1.7;
		color: var(--color-copy-muted);
	}
	.all-menu,
	.menu-link {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		gap: 12px;
		font-size: 15px;
		font-weight: 600;
		transition:
			color 180ms ease,
			background-color 180ms ease,
			scale 180ms ease;
	}
	.all-menu {
		flex-shrink: 0;
		padding: 12px 24px;
		border-radius: 999px;
		background: var(--color-brand);
		color: white;
	}
	.all-menu:hover {
		background: var(--color-brand-dark);
	}
	.all-menu:active,
	.menu-link:active {
		scale: 0.98;
	}
	a:focus-visible {
		outline: 2px solid var(--color-brand-dark);
		outline-offset: 5px;
	}
	svg {
		width: 22px;
		height: 22px;
		flex-shrink: 0;
	}
	.showcase {
		--scene-height: clamp(220px, 70vw, 300px);
		--floor-height: 96px;

		/* Paint order: cream transition (-1), blobs (0), marble (1), products and labels (2). */
		position: relative;
		isolation: isolate;
		margin-top: var(--home-section-gap);
	}
	.showcase::before {
		content: '';
		position: absolute;
		z-index: -1;
		pointer-events: none;
		top: calc(var(--scene-height) - 52px - var(--floor-height) * 0.5);
		left: 50%;
		transform: translateX(-50%);
		width: 112vw;
		height: 100%;
		min-height: 100dvh;
		/* Ease into opaque cream behind the marble, then retain it below. */
		background: linear-gradient(
			to bottom,
			transparent,
			color-mix(in srgb, var(--color-cream) 16%, transparent) calc(var(--floor-height) * 0.35),
			color-mix(in srgb, var(--color-cream) 50%, transparent) calc(var(--floor-height) * 0.75),
			color-mix(in srgb, var(--color-cream) 84%, transparent) calc(var(--floor-height) * 1.15),
			var(--color-cream) calc(var(--floor-height) * 1.5)
		);
	}
	.shared-marble {
		display: none;
		z-index: 1;
	}
	.assortment-grid {
		position: relative;
		display: grid;
		gap: 36px;
	}
	.assortment-product {
		min-width: 0;
	}
	.product-scene {
		position: relative;
		height: var(--scene-height);
		max-width: 400px;
		margin: 0 auto;
	}
	.product-blob {
		position: absolute;
		inset: 12px 0 0;
		width: 100%;
		height: calc(100% - 12px);
		object-fit: contain;
		z-index: 0;
	}
	.mobile-marble {
		position: absolute;
		bottom: -44px;
		left: 50%;
		transform: translateX(-50%);
		/* Bleed past the section to crop the artwork's slanted ends. */
		width: 112vw;
		max-width: none;
		height: 96px;
		z-index: 1;
		mask-image: linear-gradient(to bottom, transparent, black 10px, black 50%, transparent);
	}
	.product-photo {
		position: absolute;
		z-index: 2;
		bottom: 0;
		left: 50%;
		width: auto;
		height: 100%;
		max-width: none;
		object-fit: contain;
		transform: translateX(-50%);
	}
	/* Optical balance for the wider avocado artwork; keep it centered in the scene. */
	.product-photo--avocado {
		bottom: 3%;
		height: 94%;
	}
	.product-copy {
		position: relative;
		z-index: 2;
		margin-top: 32px;
	}
	h3 {
		font-size: 28px;
		font-weight: 800;
		line-height: 1.2;
	}
	.product-copy p {
		margin-top: 8px;
		font-size: 14px;
		line-height: 1.7;
		color: var(--color-copy-muted);
	}
	.menu-link {
		margin-top: 12px;
		color: var(--color-brand-dark);
	}
	.menu-link:hover {
		color: var(--color-brand);
	}
	@media (min-width: 640px) {
		.assortment-inner {
			padding-inline: 24px;
		}
		.assortment-intro {
			font-size: 16px;
		}
	}
	@media (min-width: 768px) {
		.assortment-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 28px;
		}
		.showcase {
			--scene-height: clamp(200px, 24vw, 288px);
			--floor-height: 144px;
		}
		.showcase::before {
			top: calc(var(--scene-height) - 44px - var(--floor-height) * 0.5);
		}
		.mobile-marble {
			display: none;
		}
		.shared-marble {
			display: block;
			position: absolute;
			top: calc(var(--scene-height) - 44px);
			left: 50%;
			transform: translateX(-50%);
			/* Bleed past the section to crop the artwork's slanted ends. */
			width: 112vw;
			max-width: none;
			height: var(--floor-height);
			object-fit: cover;
			mask-image: linear-gradient(to bottom, transparent, black 10px, black 45%, transparent 100%);
		}
		.product-copy {
			margin-top: 40px;
		}
		h3 {
			font-size: clamp(22px, 2.5vw, 32px);
		}
	}
	@media (min-width: 1024px) {
		.assortment-heading {
			flex-direction: row;
			align-items: center;
			gap: 32px;
			justify-content: space-between;
		}
		.assortment-inner {
			/* Reserve the existing 96px scroll clearance for the storefront header. */
			height: max(504px, calc(100dvh - 96px));
			display: flex;
			flex-direction: column;
			padding-block: clamp(24px, 3dvh, 32px);
			padding-inline: 32px;
		}
		h2 {
			font-size: clamp(2.25rem, 7dvh, 4rem);
		}
		.assortment-intro {
			margin-top: 8px;
		}
		.assortment-heading {
			flex-shrink: 0;
		}
		.showcase {
			--floor-height: clamp(88px, 16dvh, 144px);
			--copy-gap: clamp(24px, 4dvh, 40px);

			flex: 1;
			min-height: 0;
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			grid-template-rows: minmax(0, 1fr) auto;
			column-gap: 28px;
			margin-top: 16px;
		}
		.assortment-grid {
			display: contents;
		}
		.assortment-product {
			display: grid;
			grid-row: 1 / span 2;
			grid-template-rows: subgrid;
		}
		.product-scene {
			width: 100%;
			height: 100%;
			max-height: min(28vw, 360px);
			align-self: end;
		}
		.showcase::before {
			grid-column: 1 / -1;
			grid-row: 1 / 2;
			top: calc(100% - 44px - var(--floor-height) * 0.5);
		}
		.shared-marble {
			grid-column: 1 / -1;
			grid-row: 1 / 2;
			top: auto;
			bottom: calc(44px - var(--floor-height));
		}
		.product-copy {
			margin-top: var(--copy-gap);
			/* Keep the cup row stable while moving its labels closer. */
			padding-bottom: calc(var(--floor-height) - 36px - var(--copy-gap));
		}
		h3 {
			font-size: clamp(22px, 3dvh, 32px);
		}
		.assortment-intro,
		.product-copy p {
			font-size: clamp(14px, 1.8dvh, 16px);
		}
		.menu-link {
			margin-top: 8px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.all-menu,
		.menu-link {
			transition: none;
		}
	}
</style>
