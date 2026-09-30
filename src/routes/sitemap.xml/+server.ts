import { MENU } from '$lib/data/menu';
import { SITE_URL } from '$lib/seo';

const STATIC_PATHS = [
	'/',
	'/menu',
	'/locations',
	'/samarinda',
	'/samarinda/juanda',
	'/samarinda/slamet-riyadi',
	'/berau',
	'/berau/merah-delima',
	'/balikpapan',
	'/balikpapan/kutilang',
	'/balikpapan/gatot-subroto',
	'/about',
	'/group',
	'/feedback'
];

export function GET(): Response {
	const urls = [...STATIC_PATHS, ...MENU.map((m) => `/menu/${m.slug}`)];
	const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${SITE_URL}${u}</loc></url>`).join('')}</urlset>`;
	return new Response(body, { headers: { 'content-type': 'application/xml' } });
}
