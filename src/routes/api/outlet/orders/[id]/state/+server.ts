import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ORDER_STATES, type OrderState } from '$lib/core/contracts';
import { moveState } from '$lib/server/orders-db';
import { COOKIE, verifySession, type ServerEnv } from '$lib/server/staff-session';

export const POST: RequestHandler = async ({ params, request, platform, cookies }) => {
	const env = platform?.env as unknown as ServerEnv | undefined;
	if (!env?.DB || !env.STAFF_SESSION_SECRET) return json({ error: 'orders_unavailable' }, { status: 503 });
	const outletId = await verifySession(env.STAFF_SESSION_SECRET, cookies.get(COOKIE), Date.now());
	if (!outletId) return json({ error: 'unauthorized' }, { status: 401 });
	let to: string;
	try {
		to = String((await request.json()).to ?? '');
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}
	if (!(ORDER_STATES as readonly string[]).includes(to)) return json({ error: 'bad_request' }, { status: 400 });
	const r = await moveState(env.DB, params.id, outletId, to as OrderState, Date.now());
	if (r === 'not_found') return json({ error: 'not_found' }, { status: 404 });
	if (r === 'illegal') return json({ error: 'illegal_transition' }, { status: 409 });
	return json({ ok: true });
};
