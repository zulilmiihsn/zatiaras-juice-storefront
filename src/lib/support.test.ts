import { describe, expect, it } from 'vitest';
import { STATUS_LABEL, buildWaMessage, isSupportConfigured, statusLabel, waLink } from './support';
import { ORDER_STATES } from './core/contracts';

describe('support', () => {
	it('semua state ada label polos', () => {
		for (const s of ORDER_STATES) expect(statusLabel(s).length).toBeGreaterThan(0);
		expect(STATUS_LABEL['PENDING_PAYMENT']).toBe('Menunggu pembayaran');
	});

	it('WA link bawa konteks aman, tanpa secret', () => {
		const msg = buildWaMessage(
			{ id: 'o-1', outletId: 'juanda', state: 'FULFILLMENT_FAILED', total: 50000 } as never,
			'Habis'
		);
		expect(msg).toContain('o-1');
		expect(msg).toContain('juanda');
		expect(msg).toContain('50000');
		expect(msg.toLowerCase()).not.toContain('secret');
		expect(msg.toLowerCase()).not.toContain('signature');
	});

	it('fail-closed: placeholder -> null, bukan link nyasar', () => {
		const url = waLink(
			{ id: 'o-1', outletId: 'juanda', state: 'FULFILLMENT_FAILED', total: 50000 } as never,
			'Habis'
		);
		if (isSupportConfigured()) {
			expect(url).toContain('https://wa.me/');
		} else {
			expect(url).toBeNull();
		}
	});
});
