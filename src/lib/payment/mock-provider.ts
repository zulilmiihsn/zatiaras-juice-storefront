// Stub payment. Provider OPEN. Browser bukan otoritas. FR-PAYMENT.
import { browser } from '$app/environment';
import { verifyServerPayment, type WebhookEvent } from '$lib/core/payment';

// Menit. Configurable, tuning soft launch.
export const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

export function isExpired(createdAt: number, now: number, timeout = PAYMENT_TIMEOUT_MS): boolean {
	return now - createdAt >= timeout;
}

export interface PayMeta {
	paymentId: string;
	createdAt: number;
}

const META_KEY = 'z-pay-meta';
const SEEN_KEY = 'z-pay-seen';

function readJSON(key: string, fallback: Record<string, unknown>): Record<string, unknown> {
	if (!browser) return fallback;
	try {
		return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
	} catch {
		return fallback;
	}
}

export function createMockPayment(orderId: string): PayMeta {
	const meta = { paymentId: `mock-${orderId}`, createdAt: Date.now() };
	if (browser) {
		const all = readJSON(META_KEY, {});
		all[orderId] = meta;
		localStorage.setItem(META_KEY, JSON.stringify(all));
	}
	return meta;
}

export function getMockMeta(orderId: string): PayMeta | undefined {
	return readJSON(META_KEY, {})[orderId] as PayMeta | undefined;
}

// Simulasi webhook provider. Server wajib verifikasi ulang + idempotent.
export function mockWebhook(args: {
	orderId: string;
	amount: number;
	ok: boolean;
}): 'applied' | 'duplicate' | 'rejected' {
	const seen = new Set<string>(
		JSON.parse(browser ? (localStorage.getItem(SEEN_KEY) ?? '[]') : '[]')
	);
	const evt: WebhookEvent = {
		providerEventId: `mock-${args.orderId}-${args.ok ? 'paid' : 'failed'}`,
		orderId: args.orderId,
		amount: args.amount,
		state: args.ok ? 'PAID' : 'FAILED',
		signatureValid: true
	};
	const r = verifyServerPayment({
		expectedAmount: args.amount,
		expectedOrderId: args.orderId,
		evt,
		seenEventIds: seen
	});
	if (browser) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
	return r;
}
