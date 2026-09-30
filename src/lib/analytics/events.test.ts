import { describe, expect, it } from 'vitest';
import { EVENTS, sanitize } from './events';

describe('analytics', () => {
	it('daftar event ikut ANALYTICS.md', () => {
		for (const e of [
			'page_view',
			'add_to_cart',
			'payment_success',
			'fulfillment_failed',
			'feedback_submitted',
			'group_order_submitted',
			'hero_order_clicked',
			'outlet_select_clicked',
			'menu_preview_clicked',
			'product_clicked',
			'group_order_clicked',
			'location_suggested',
			'outlet_selected',
			'outlet_changed',
			'cart_revalidation_started',
			'cart_revalidation_completed',
			'browser_location_denied'
		]) {
			expect(EVENTS).toContain(e);
		}
	});

	it('buang data sensitif', () => {
		const p = sanitize({
			outlet: 'juanda',
			total: 50000,
			whatsapp: '+6281',
			name: 'Budi',
			signature: 'x'
		});
		expect(p).toEqual({ outlet: 'juanda', total: 50000 });
	});
});
