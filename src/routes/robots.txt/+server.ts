import { SITE_URL } from '$lib/seo';

export function GET(): Response {
	const body = `User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /checkout\nDisallow: /order/\nDisallow: /track\nDisallow: /group/\nDisallow: /outlet\nDisallow: /analytics\nDisallow: /qa\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`;
	return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
