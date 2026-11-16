import { describe, expect, it } from 'vitest';
import { createDraft, makeOrderCode } from './orders';

const line = {
	menuItemId: 'jus-alpukat',
	name: 'Jus Alpukat',
	price: 22000,
	qty: 1,
	outletId: 'juanda',
	availability: 'AVAILABLE' as const
};

describe('orders hardening', () => {
	it('kode ZT- ramah-manusia tanpa karakter mirip', () => {
		const code = makeOrderCode();
		expect(code).toMatch(/^ZT-[A-Z2-9]{6}$/);
		expect(code).not.toMatch(/[01IL]/);
	});

	it('100 kode unik + hindari daftar existing', () => {
		const existing = ['ZT-AAAAAA'];
		const codes = new Set<string>();
		for (let i = 0; i < 100; i++) {
			const c = makeOrderCode([...existing, ...codes]);
			expect(c).not.toBe('ZT-AAAAAA');
			codes.add(c);
		}
		expect(codes.size).toBe(100);
	});

	it('draft pakai kode unik', () => {
		const o = createDraft({
			outletId: 'juanda',
			name: 'T',
			whatsapp: '+6281',
			slotId: 's',
			lines: [line],
			existingIds: []
		});
		expect(o.id).toMatch(/^ZT-/);
		expect(o.state).toBe('PENDING_PAYMENT');
	});

	it('draft jalur kasir: AWAITING_CASHIER, opsi cup ikut tersimpan', () => {
		const o = createDraft({
			outletId: 'juanda',
			name: 'T',
			whatsapp: '',
			slotId: 'juanda-now',
			paymentMode: 'CASHIER',
			pickupNote: '15 menit lagi (sekitar 11.15 WITA)',
			note: ' tanpa sedotan ',
			lines: [{ ...line, price: 30000, size: 'JUMBO', sweet: 'LESS', ice: 'NONE' }],
			existingIds: []
		});
		expect(o.state).toBe('AWAITING_CASHIER');
		expect(o.paymentMode).toBe('CASHIER');
		expect(o.note).toBe('tanpa sedotan');
		expect(o.total).toBe(30000);
		expect(o.items[0]).toMatchObject({ size: 'JUMBO', sweet: 'LESS', ice: 'NONE' });
	});
});
