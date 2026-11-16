import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { OrderState } from '$lib/core/contracts';
import { moveState, STAFF_TARGETS } from '$lib/server/orders-db';
import type { ServerEnv } from '$lib/server/staff-session';
import { posAuthorized } from '../../../_auth';

// POS mengubah status pesanan web: CONFIRMED (Terima, uang QRIS cocok), CANCELLED (Tolak),
// lalu PREPARING / READY / COMPLETED mengikuti antrean POS. Body: { outletId, to }.
export const POST: RequestHandler = async ({ request, params, platform }) => {
	const env = platform?.env as unknown as ServerEnv | undefined;
	if (!posAuthorized(request, env)) return json({ error: 'unauthorized' }, { status: 401 });
	if (!env?.DB) return json({ error: 'orders_unavailable' }, { status: 503 });
	if (!/^ZT-[A-Z2-9]{6}$/.test(params.id)) return json({ error: 'not_found' }, { status: 404 });
	let body: { outletId?: unknown; to?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}
	const to = body.to as OrderState;
	if (typeof body.outletId !== 'string' || !STAFF_TARGETS.includes(to)) {
		return json({ error: 'bad_request' }, { status: 400 });
	}
	const res = await moveState(env.DB, params.id, body.outletId, to, Date.now());
	if (res === 'not_found') return json({ error: 'not_found' }, { status: 404 });
	if (res === 'illegal') return json({ error: 'illegal_transition' }, { status: 409 });
	return json({ ok: true });
};
