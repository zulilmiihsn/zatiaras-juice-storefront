// Stub webhook. Bentuk adapter final. Tanpa DB + signature riil.
import { json } from '@sveltejs/kit';

export function POST(): Response {
	return json({ result: 'rejected', why: 'payment_provider_not_configured' }, { status: 503 });
}
