// SEO_AI_DISCOVERY. Fakta server-readable, bukan slogan only.
// ADR 2026-09-25: multi-city entity hierarchy Samarinda/Berau/Balikpapan.
export const SITE_URL = 'https://zatiarasjuice.id'; // VERIFY domain final
export const SITE_NAME = 'Zatiaras Juice';

export function canonical(path: string): string {
	return `${SITE_URL}${path}`;
}

// Wrap a JSON-LD payload in its script tag. The closing tag is split so the
// literal `</script>` never appears inside .svelte <script> blocks — HTML
// treats `</script>` as the block terminator even inside JS strings.
export function jsonLdTag(json: string): string {
	return `<script type="application/ld+json">${json}</` + 'script>';
}

export function orgJsonLd(): string {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE_NAME,
		url: SITE_URL,
		areaServed: ['Samarinda', 'Berau', 'Balikpapan']
	});
}

export function localBusinessJsonLd(args: {
	name: string;
	url: string;
	hours: string;
	city?: string;
	address?: string;
}): string {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'JuiceBar',
		name: `Zatiaras Juice ${args.name}`,
		url: args.url,
		address: {
			'@type': 'PostalAddress',
			addressLocality: args.city ?? 'Samarinda',
			addressCountry: 'ID',
			streetAddress: args.address && !args.address.startsWith('VERIFY') ? args.address : undefined
		},
		openingHours: args.hours.startsWith('VERIFY') ? undefined : args.hours
	});
}

export function productJsonLd(args: {
	name: string;
	description: string;
	url: string;
	price: number;
	availability: string;
}): string {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: args.name,
		description: args.description,
		url: args.url,
		offers: {
			'@type': 'Offer',
			priceCurrency: 'IDR',
			price: args.price,
			availability: `https://schema.org/${args.availability}`,
			url: args.url
		}
	});
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): string {
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((it, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: it.name,
			item: it.url
		}))
	});
}
