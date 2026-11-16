import { describe, expect, it, vi } from 'vitest';

// Ketersediaan statis BELUM terverifikasi: pemesanan hanya boleh terbuka lewat menu hidup POS.
vi.mock('$lib/data/menu', async (orig) => {
	const m = await orig<typeof import('$lib/data/menu')>();
	return { ...m, MENU_VERIFIED: true, AVAILABILITY_VERIFIED: false };
});

import { priceOrder, type OrderRequest } from './order-pricing';
import { menuKey, type LiveMenu, type PosMenuItem } from './live-menu';

const now = new Date('2026-11-16T03:00:00Z');
const req: OrderRequest = {
	outletId: 'juanda',
	name: 'Iil',
	pickupChoiceId: '15',
	items: [{ slug: 'jus-alpukat', qty: 2 }]
};
const live = (entries: Array<PosMenuItem | null>, names = ['Jus Alpukat']): LiveMenu => ({
	outletId: 'juanda',
	fetchedAt: 0,
	items: new Map(entries.map((e, i) => [menuKey(e?.name ?? names[i]), e]))
});
const item = (over: Partial<PosMenuItem> = {}): PosMenuItem => ({
	name: 'Jus  Alpukat', // spasi ganda di POS tetap cocok
	price: 24000,
	jumboPrice: null,
	available: true,
	...over
});

describe('priceOrder dengan menu hidup POS', () => {
	it('tetap tertutup tanpa menu hidup (perilaku lama)', () => {
		expect(priceOrder(req, now)).toEqual({ ok: false, error: 'ordering_closed' });
		expect(priceOrder(req, now, null)).toEqual({ ok: false, error: 'ordering_closed' });
	});

	it('memakai harga POS, bukan harga file menu web', () => {
		const r = priceOrder(req, now, live([item()]));
		expect(r.ok && r.items[0].unitPrice).toBe(24000);
		expect(r.ok && r.total).toBe(48000);
	});

	it('Jumbo: harga jumbo POS bila ada, selisih standar bila tidak', () => {
		const jumbo: OrderRequest = { ...req, items: [{ slug: 'jus-alpukat', qty: 1, size: 'JUMBO' }] };
		const withPos = priceOrder(jumbo, now, live([item({ jumboPrice: 31000 })]));
		expect(withPos.ok && withPos.total).toBe(31000);
		const fallback = priceOrder(jumbo, now, live([item()]));
		expect(fallback.ok && fallback.total).toBe(32000);
	});

	it('menu habis, nonaktif (tidak ada di POS), atau ambigu ditolak', () => {
		expect(priceOrder(req, now, live([item({ available: false })]))).toEqual({
			ok: false,
			error: 'item_sold_out'
		});
		expect(priceOrder(req, now, live([]))).toEqual({ ok: false, error: 'item_sold_out' });
		expect(priceOrder(req, now, live([null]))).toEqual({ ok: false, error: 'item_sold_out' });
	});
});
