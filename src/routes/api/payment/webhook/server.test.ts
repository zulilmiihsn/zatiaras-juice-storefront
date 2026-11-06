import { describe, expect, it } from 'vitest';
import { POST } from './+server';

describe('payment webhook without a provider', () => {
	it('does not accept an unverified payment', async () => {
		const response = POST();
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			result: 'rejected',
			why: 'payment_provider_not_configured'
		});
	});
});
