import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MENU } from '$lib/data/menu';
import { isValidOutletId } from '$lib/core/outlets';
import { getLiveMenu, menuKey } from '$lib/server/pos-menu';
import type { ServerEnv } from '$lib/server/staff-session';

// Harga dan ketersediaan hidup per outlet untuk tampilan keranjang. Sumbernya POS (lewat cache server).
// live=false berarti POS belum tersambung atau tak terjangkau: tampilan memakai data statis dan
// pemesanan tetap tertutup oleh server.
export const GET: RequestHandler = async ({ url, platform }) => {
	const outlet = url.searchParams.get('outlet') ?? '';
	if (!isValidOutletId(outlet)) return json({ error: 'outlet_invalid' }, { status: 400 });
	const env = platform?.env as unknown as ServerEnv | undefined;
	const live = await getLiveMenu(env, outlet);
	const headers = { 'cache-control': 'public, max-age=30' };
	if (!live) return json({ live: false, items: [] }, { headers });
	const items = MENU.map((menu) => {
		const pos = live.items.get(menuKey(menu.name));
		return {
			slug: menu.slug,
			available: Boolean(pos?.available),
			price: pos?.price ?? null,
			jumboPrice: pos?.jumboPrice ?? null
		};
	});
	return json({ live: true, items }, { headers });
};
