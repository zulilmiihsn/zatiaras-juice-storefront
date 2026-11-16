import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { priceOrder, type OrderRequest } from '$lib/core/order-pricing';
import { createOrder } from '$lib/server/orders-db';
import { getLiveMenu } from '$lib/server/pos-menu';
import type { ServerEnv } from '$lib/server/staff-session';

// Pelanggan membuat pesanan. Harga dihitung ulang di server; id dibuat server.
export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env as unknown as ServerEnv | undefined;
	if (!env?.DB) return json({ error: 'orders_unavailable' }, { status: 503 });

	let body: OrderRequest;
	try {
		body = (await request.json()) as OrderRequest;
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}
	const now = new Date();
	const live = await getLiveMenu(env, String(body?.outletId ?? ''));
	const priced = priceOrder(body, now, live);
	if (!priced.ok) {
		return json(
			{ error: priced.error },
			{ status: priced.error === 'ordering_closed' ? 503 : 400 }
		);
	}
	const made = await createOrder(
		env.DB,
		{
			outletId: String(body.outletId),
			name: priced.name,
			pickupNote: priced.pickupNote,
			note: priced.note,
			total: priced.total,
			items: priced.items
		},
		now.getTime()
	);
	if (!made.ok) return json({ error: made.error }, { status: made.error === 'busy' ? 503 : 429 });
	return json({
		id: made.id,
		total: priced.total,
		uniqueCode: made.uniqueCode,
		payTotal: made.payTotal,
		expiresAt: made.expiresAt,
		items: priced.items,
		pickupNote: priced.pickupNote,
		note: priced.note ?? null,
		name: priced.name
	});
};
