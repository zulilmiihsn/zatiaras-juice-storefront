import { describe, expect, it } from 'vitest';
import { verifyServerPayment } from './payment';

describe('payment verify', () => {
	it('terap sekali, duplikat idempotent', () => {
		const seen = new Set<string>();
		const evt = {
			providerEventId: 'evt-1',
			orderId: 'o-1',
			amount: 50000,
			state: 'PAID' as const,
			signatureValid: true
		};
		expect(
			verifyServerPayment({
				expectedAmount: 50000,
				expectedOrderId: 'o-1',
				evt,
				seenEventIds: seen
			})
		).toBe('applied');
		expect(
			verifyServerPayment({
				expectedAmount: 50000,
				expectedOrderId: 'o-1',
				evt,
				seenEventIds: seen
			})
		).toBe('duplicate');
	});

	it('tolak signature/amount/order salah', () => {
		const seen = new Set<string>();
		const base = {
			providerEventId: 'e2',
			orderId: 'o-1',
			amount: 50000,
			state: 'PAID' as const,
			signatureValid: true
		};
		expect(
			verifyServerPayment({
				expectedAmount: 50000,
				expectedOrderId: 'o-1',
				evt: { ...base, signatureValid: false },
				seenEventIds: seen
			})
		).toBe('rejected');
		expect(
			verifyServerPayment({
				expectedAmount: 999,
				expectedOrderId: 'o-1',
				evt: base,
				seenEventIds: seen
			})
		).toBe('rejected');
		expect(
			verifyServerPayment({
				expectedAmount: 50000,
				expectedOrderId: 'o-X',
				evt: base,
				seenEventIds: seen
			})
		).toBe('rejected');
	});
});
