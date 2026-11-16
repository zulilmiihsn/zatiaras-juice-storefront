import { describe, expect, it } from 'vitest';
import { addLine, lineKey, setQty, upsizeGain, upsizeLine, type Line } from './cart-logic';

const base: Line = {
	menuItemId: 'jus-alpukat',
	name: 'Jus Alpukat',
	price: 22000,
	basePrice: 22000,
	qty: 1,
	outletId: 'juanda',
	availability: 'AVAILABLE',
	category: 'buah-sayur',
	size: 'REG',
	sweet: 'NORMAL',
	ice: 'NORMAL'
};

describe('cart varian', () => {
	it('opsi berbeda = baris berbeda, opsi sama = digabung', () => {
		let l = addLine([], base);
		l = addLine(l, { ...base, sweet: 'LESS' });
		expect(l).toHaveLength(2);
		l = addLine(l, base);
		expect(l).toHaveLength(2);
		expect(l[0].qty).toBe(2);
	});

	it('baris tanpa opsi tetap memakai menuItemId sebagai kunci', () => {
		const plain: Line = { ...base, size: undefined, sweet: undefined, ice: undefined };
		expect(lineKey(plain)).toBe('jus-alpukat');
		expect(setQty([plain], 'jus-alpukat', 0)).toEqual([]);
	});

	it('upsize menaikkan harga satuan Rp8.000 dan menjaga jumlah', () => {
		const out = upsizeLine([{ ...base, qty: 2 }], lineKey(base));
		expect(out[0].size).toBe('JUMBO');
		expect(out[0].price).toBe(30000);
		expect(out[0].qty).toBe(2);
		expect(upsizeGain({ ...base, qty: 2 })).toBe(16000);
	});

	it('upsize digabung bila Jumbo dengan opsi sama sudah ada', () => {
		const jumbo = { ...base, size: 'JUMBO' as const, price: 30000 };
		const out = upsizeLine([base, jumbo], lineKey(base));
		expect(out).toHaveLength(1);
		expect(out[0].qty).toBe(2);
		expect(out[0].size).toBe('JUMBO');
	});

	it('upsize ditolak untuk kategori tanpa Jumbo', () => {
		const baby = { ...base, category: 'baby' as const };
		expect(upsizeLine([baby], lineKey(baby))).toEqual([baby]);
		expect(upsizeGain(baby)).toBe(0);
	});
});
