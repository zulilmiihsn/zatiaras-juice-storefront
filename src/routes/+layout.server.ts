import type { LayoutServerLoad } from './$types';

// Teruskan geolokasi kasar Cloudflare (kota/region) ke layout untuk SARAN saja.
// Tidak pernah mengunci outlet. Lokal (dev): platform undefined -> null.
export const load: LayoutServerLoad = async ({ platform }) => {
	const cf = platform?.cf as { city?: string; region?: string; country?: string } | undefined;
	return {
		cfCity: cf?.city ?? null,
		cfRegion: cf?.region ?? null,
		cfCountry: cf?.country ?? null
	};
};
