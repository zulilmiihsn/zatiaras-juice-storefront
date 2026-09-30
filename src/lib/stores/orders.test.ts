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
});
