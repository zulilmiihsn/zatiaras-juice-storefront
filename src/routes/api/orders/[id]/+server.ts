import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicOrder } from '$lib/server/orders-db';
import type { ServerEnv } from '$lib/server/staff-session';

// Status publik berdasarkan kode pesanan. Tanpa nama dan catatan.
export const GET: RequestHandler = async ({ params, platform }) => {
	const env = platform?.env as unknown as ServerEnv | undefined;
	if (!env?.DB) return json({ error: 'orders_unavailable' }, { status: 503 });
	if (!/^ZT-[A-Z2-9]{6}$/.test(params.id)) return json({ error: 'not_found' }, { status: 404 });
	const o = await getPublicOrder(env.DB, params.id);
	if (!o) return json({ error: 'not_found' }, { status: 404 });
	return json(o, { headers: { 'cache-control': 'no-store' } });
};
