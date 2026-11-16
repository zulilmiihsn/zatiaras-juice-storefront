import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listActive } from '$lib/server/orders-db';
import { COOKIE, verifySession, type ServerEnv } from '$lib/server/staff-session';

export const GET: RequestHandler = async ({ platform, cookies }) => {
	const env = platform?.env as unknown as ServerEnv | undefined;
	if (!env?.DB || !env.STAFF_SESSION_SECRET) return json({ error: 'orders_unavailable' }, { status: 503 });
	const outletId = await verifySession(env.STAFF_SESSION_SECRET, cookies.get(COOKIE), Date.now());
	if (!outletId) return json({ error: 'unauthorized' }, { status: 401 });
	const orders = await listActive(env.DB, outletId, Date.now());
	return json({ outletId, orders }, { headers: { 'cache-control': 'no-store' } });
};
