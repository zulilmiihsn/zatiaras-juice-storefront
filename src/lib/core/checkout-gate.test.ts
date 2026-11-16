import { describe, expect, it } from 'vitest';
import { checkoutGate } from './checkout-gate';

describe('checkoutGate', () => {
	it('terbuka hanya bila menu, ketersediaan, dan QRIS outlet semuanya siap', () => {
		expect(checkoutGate({ menuVerified: true, availabilityVerified: true, hasQris: true }).open).toBe(true);
		expect(checkoutGate({ menuVerified: true, availabilityVerified: false, hasQris: true })).toEqual({
			open: false,
			reason: 'availability_unverified'
		});
		expect(checkoutGate({ menuVerified: true, availabilityVerified: true, hasQris: false }).reason).toBe('no_qris');
		expect(checkoutGate({ menuVerified: false, availabilityVerified: true, hasQris: true }).reason).toBe(
			'menu_unverified'
		);
	});
});
