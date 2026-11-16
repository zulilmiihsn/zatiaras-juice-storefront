import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/data/menu', async (orig) => {
	const m = await orig<typeof import('$lib/data/menu')>();
	return { ...m, MENU_VERIFIED: true, AVAILABILITY_VERIFIED: true };
});

import { priceOrder, type OrderRequest } from './order-pricing';

const now = new Date('2026-11-16T03:00:00Z');
const base: OrderRequest = {
	outletId: 'juanda',
	name: ' Iil ',
	pickupChoiceId: '15',
	items: [{ slug: 'jus-alpukat', qty: 2, size: 'JUMBO', sweet: 'LESS', ice: 'NORMAL' }]
};

describe('priceOrder', () => {
	it('menghitung harga dari menu, bukan dari klien (Jumbo +Rp8.000)', () => {
		const r = priceOrder(base, now);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.items[0].unitPrice).toBe(30000);
			expect(r.total).toBe(60000);
			expect(r.name).toBe('Iil');
			expect(r.pickupNote).toBe('15 menit lagi (sekitar 11.15 WITA)');
		}
	});

	it('menolak outlet, menu, jumlah, opsi, dan waktu yang tidak valid', () => {
		const err = (p: Partial<OrderRequest>) => {
			const r = priceOrder({ ...base, ...p }, now);
			return r.ok ? 'ok' : r.error;
		};
		expect(err({ outletId: 'nowhere' })).toBe('outlet_invalid');
		expect(err({ name: '  ' })).toBe('name_required');
		expect(err({ items: [] })).toBe('cart_empty');
		expect(err({ items: [{ slug: 'x', qty: 1 }] })).toBe('item_unknown');
		expect(err({ items: [{ slug: 'jus-alpukat', qty: 0 }] })).toBe('bad_request');
		expect(err({ items: [{ slug: 'jus-alpukat', qty: 1.5 }] })).toBe('bad_request');
		expect(err({ items: [{ slug: 'jus-alpukat', qty: 1, ice: 'X' as never }] })).toBe('option_invalid');
		expect(err({ pickupChoiceId: 'besok' })).toBe('pickup_invalid');
	});

	it('Jumbo ditolak untuk kategori tanpa Jumbo', () => {
		const r = priceOrder(
			{ ...base, items: [{ slug: 'sop-buah', qty: 1, size: 'JUMBO' }] },
			now
		);
		expect(r).toEqual({ ok: false, error: 'option_invalid' });
	});
});
