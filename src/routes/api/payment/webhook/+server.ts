// Stub webhook. Bentuk adapter final. Tanpa DB + signature riil.
import { json } from '@sveltejs/kit';
import { verifyServerPayment, type WebhookEvent } from '$lib/core/payment';

const seen = new Set<string>();

export async function POST({ request }: { request: Request }): Promise<Response> {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ result: 'rejected', why: 'bad_json' }, { status: 400 });
	}
	const evt = body as unknown as WebhookEvent & {
		expectedAmount?: number;
		expectedOrderId?: string;
	};
	if (!evt.providerEventId || !evt.orderId || typeof evt.amount !== 'number') {
		return json({ result: 'rejected', why: 'bad_shape' }, { status: 400 });
	}
	const result = verifyServerPayment({
		expectedAmount: typeof evt.expectedAmount === 'number' ? evt.expectedAmount : evt.amount,
		expectedOrderId: typeof evt.expectedOrderId === 'string' ? evt.expectedOrderId : evt.orderId,
		evt: {
			providerEventId: evt.providerEventId,
			orderId: evt.orderId,
			amount: evt.amount,
			state: evt.state ?? 'PAID',
			signatureValid: evt.signatureValid ?? false
		},
		seenEventIds: seen
	});
	const status = result === 'applied' ? 200 : result === 'duplicate' ? 200 : 422;
	return json({ result }, { status });
}
