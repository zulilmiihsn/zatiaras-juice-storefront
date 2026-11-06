import * as $ from 'svelte/internal/server';

function arrow($$renderer) {
	$$renderer.push(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="svelte-1l4bo5v"><path d="M5 12h14m-6-6 6 6-6 6"></path></svg>`);
}

export default function AssortmentMenu($$renderer) {
	const MENU = [
		{ "slug": "hero-signature", "name": "Alpukat Kocok" },
		{ "slug": "jus-alpukat", "name": "Jus Alpukat" },
		{ "slug": "jus-mangga", "name": "Jus Mangga" },
		{ "slug": "jus-naga", "name": "Jus Naga" }
	];

	const track = (...args) => {};

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

	$$renderer.push(`<section id="jus-apa-aja" class="assortment svelte-1l4bo5v" aria-labelledby="assortment-title"><div class="assortment-inner svelte-1l4bo5v"><div class="assortment-heading svelte-1l4bo5v"><div><h2 id="assortment-title" class="font-display svelte-1l4bo5v">JUS APA AJA <span class="svelte-1l4bo5v">ADA.</span></h2> <p class="assortment-intro svelte-1l4bo5v">Buah asli, diblender saat dipesan. Dari alpukat sampai mangga, pilih favoritmu.</p></div> <a class="all-menu svelte-1l4bo5v" href="/menu">Lihat semua menu `);
	arrow($$renderer);
	$$renderer.push(`<!----></a></div> <div class="showcase svelte-1l4bo5v"><img class="shared-marble svelte-1l4bo5v" src="/images/assortment/marble.webp" width="1920" height="481" alt="" loading="lazy" decoding="async" aria-hidden="true"/> <div class="assortment-grid svelte-1l4bo5v">`);

	const each_array = $.ensure_array_like(products);

	if (each_array.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let product = each_array[$$index];

			$$renderer.push(`<article class="assortment-product svelte-1l4bo5v"><div class="product-scene svelte-1l4bo5v"><img class="product-blob svelte-1l4bo5v"${$.attr('src', `/images/assortment/${product.blob}-blob.webp`)} width="720"${$.attr('height', product.blobHeight)} alt="" loading="lazy" decoding="async" aria-hidden="true"/> <img class="mobile-marble svelte-1l4bo5v" src="/images/assortment/marble.webp" width="1920" height="481" alt="" loading="lazy" decoding="async" aria-hidden="true"/> <img class="product-photo svelte-1l4bo5v"${$.attr('src', `/images/assortment/${product.image}-480.webp`)}${$.attr('srcset', `/images/assortment/${product.image}-480.webp 480w, /images/assortment/${product.image}-960.webp 960w`)} sizes="(min-width: 768px) 360px, (min-width: 440px) 370px, 90vw"${$.attr('width', product.width)}${$.attr('height', product.height)}${$.attr('alt', `${product.name} Zatiaras dengan buah dan bahan pelengkap`)} loading="lazy" decoding="async"/></div> <div class="product-copy svelte-1l4bo5v"><h3 class="font-display svelte-1l4bo5v">${$.escape(product.name)}</h3> <p${$.attr('id', `assortment-copy-${product.slug}`)} class="svelte-1l4bo5v">${$.escape(product.description)}</p> <a class="menu-link svelte-1l4bo5v"${$.attr('href', `/menu/${product.slug}`)}${$.attr('aria-label', `Lihat menu ${product.name}`)}${$.attr('aria-describedby', `assortment-copy-${product.slug}`)}>Lihat menu `);
			arrow($$renderer);
			$$renderer.push(`<!----></a></div></article>`);
		}
	} else {
		$$renderer.push(`<!--[!--><p>Menu sedang disiapkan. Silakan lihat halaman menu.</p>`);
	}

	$$renderer.push(`<!--]--></div></div></div></section>`);
}