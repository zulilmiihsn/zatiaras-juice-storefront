import { describe, expect, it } from 'vitest';
import { canTransition, assertTransition } from './order-machine';

describe('order-machine', () => {
	it('normal lifecycle lolos', () => {
		expect(canTransition('DRAFT', 'PENDING_PAYMENT')).toBe(true);
		expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
		expect(canTransition('PAID', 'CONFIRMED')).toBe(true);
		expect(canTransition('CONFIRMED', 'PREPARING')).toBe(true);
		expect(canTransition('PREPARING', 'READY')).toBe(true);
		expect(canTransition('READY', 'COMPLETED')).toBe(true);
	});

	it('expiry + fulfillment failure lolos', () => {
		expect(canTransition('PENDING_PAYMENT', 'EXPIRED')).toBe(true);
		expect(canTransition('PAID', 'FULFILLMENT_FAILED')).toBe(true);
		expect(canTransition('CONFIRMED', 'FULFILLMENT_FAILED')).toBe(true);
	});

	it('ilegal ditolak', () => {
		expect(canTransition('DRAFT', 'PAID')).toBe(false);
		expect(() => assertTransition('READY', 'PAID')).toThrow();
	});
});
