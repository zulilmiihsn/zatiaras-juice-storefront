import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OUTLETS } from '$lib/core/outlets';
import { listAwaiting } from '$lib/server/orders-db';
import type { ServerEnv } from '$lib/server/staff-session';
import { posAuthorized } from '../_auth';

// Antrean POS membaca pesanan web yang menunggu cek QRIS: GET /api/pos/orders?outlet=juanda
export const GET: RequestHandler = async ({ request, url, platform }) => {
	const env = platform?.env as unknown as ServerEnv | undefined;
	if (!posAuthorized(request, env)) return json({ error: 'unauthorized' }, { status: 401 });
	if (!env?.DB) return json({ error: 'orders_unavailable' }, { status: 503 });
	const outlet = url.searchParams.get('outlet') ?? '';
	if (!OUTLETS.some((o) => o.id === outlet)) return json({ error: 'unknown_outlet' }, { status: 400 });
	const orders = await listAwaiting(env.DB, outlet, Date.now());
	return json({ outletId: outlet, orders }, { headers: { 'cache-control': 'no-store' } });
};
