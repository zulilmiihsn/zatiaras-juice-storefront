import { describe, expect, it } from 'vitest';
import { isExpired, PAYMENT_TIMEOUT_MS } from './mock-provider';
import { verifyServerPayment } from '../core/payment';

describe('payment stub', () => {
	it('expiry ikut timeout', () => {
		expect(isExpired(0, PAYMENT_TIMEOUT_MS)).toBe(true);
		expect(isExpired(Date.now(), Date.now())).toBe(false);
	});

	it('webhook tolak amount beda + duplikat aman', () => {
		const seen = new Set<string>();
		const evt = {
			providerEventId: 'e1',
			orderId: 'o1',
			amount: 100,
			state: 'PAID' as const,
			signatureValid: true
		};
		expect(
			verifyServerPayment({ expectedAmount: 100, expectedOrderId: 'o1', evt, seenEventIds: seen })
		).toBe('applied');
		expect(
			verifyServerPayment({ expectedAmount: 100, expectedOrderId: 'o1', evt, seenEventIds: seen })
		).toBe('duplicate');
		expect(
			verifyServerPayment({
				expectedAmount: 1,
				expectedOrderId: 'o1',
				evt: { ...evt, providerEventId: 'e2' },
				seenEventIds: seen
			})
		).toBe('rejected');
	});
});
