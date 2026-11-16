import { describe, expect, it } from 'vitest';
import type { Order } from './contracts';
import {
	PICKUP_CHOICES,
	buildOrderMessage,
	normalizeWaNumber,
	pickupText,
	resolveOrderNumber,
	rupiah,
	waOrderLink,
	witaClock
} from './whatsapp-order';

const order: Order = {
	id: 'ZT-K7M2QA',
	outletId: 'juanda',
	contact: { name: 'Iil', whatsapp: '6281234567890' },
	items: [
		{
			menuItemId: 'jus-alpukat',
			name: 'Jus Alpukat',
			qty: 2,
			unitPrice: 30000,
			size: 'JUMBO',
			sweet: 'LESS',
			ice: 'NORMAL'
		},
		{ menuItemId: 'sop-buah', name: 'Sop Buah', qty: 1, unitPrice: 15000 }
	],
	pickupSlotId: 'juanda-sekarang',
	state: 'AWAITING_CASHIER',
	total: 75000,
	paymentMode: 'CASHIER'
};

describe('whatsapp-order', () => {
	it('witaClock memakai UTC+8 dan melewati tengah malam', () => {
		expect(witaClock(new Date('2026-11-16T03:00:00Z'))).toBe('11.00');
		expect(witaClock(new Date('2026-11-16T03:50:00Z'), 15)).toBe('12.05');
		expect(witaClock(new Date('2026-11-16T15:50:00Z'), 15)).toBe('00.05');
	});

	it('pickupText: secepatnya tanpa jam, lainnya dengan perkiraan WITA', () => {
		const now = new Date('2026-11-16T03:00:00Z');
		expect(pickupText(PICKUP_CHOICES[0], now)).toBe('Secepatnya');
		expect(pickupText(PICKUP_CHOICES[2], now)).toBe('30 menit lagi (sekitar 11.30 WITA)');
	});

	it('rupiah memakai titik ribuan', () => {
		expect(rupiah(8000)).toBe('Rp8.000');
		expect(rupiah(1250000)).toBe('Rp1.250.000');
	});

	it('normalizeWaNumber menerima 08, +62, dan spasi', () => {
		expect(normalizeWaNumber('0813-4988 2015')).toBe('6281349882015');
		expect(normalizeWaNumber('+62 813 4988 2015')).toBe('6281349882015');
	});

	it('resolveOrderNumber: telepon outlet menang, fallback tertutup bila belum dikonfigurasi', () => {
		const off = { number: '6280000000000', configured: false };
		const on = { number: '6285000000000', configured: true };
		expect(resolveOrderNumber({ phone: '+62813-4988-2015' }, off)).toBe('6281349882015');
		expect(resolveOrderNumber({}, off)).toBeNull();
		expect(resolveOrderNumber({}, on)).toBe('6285000000000');
	});

	it('buildOrderMessage: satu baris per item, opsi di baris bawahnya, total dan cara bayar', () => {
		const msg = buildOrderMessage({
			order,
			outletName: 'Juanda',
			city: 'Samarinda',
			pickupLabel: '15 menit lagi (sekitar 11.15 WITA)',
			note: 'jangan pakai sedotan'
		});
		expect(msg).toContain('Kode: ZT-K7M2QA');
		expect(msg).toContain('Outlet: Juanda (Samarinda)');
		expect(msg).toContain('1. Jus Alpukat, Jumbo 22 oz x2 = Rp60.000');
		expect(msg).toContain('   Manis: Kurang manis, Es: Normal');
		expect(msg).toContain('2. Sop Buah x1 = Rp15.000');
		expect(msg).toContain('Total: Rp75.000');
		expect(msg).toContain('Bayar: saat ambil di kasir, tunai atau QRIS');
		expect(msg).toContain('Catatan: jangan pakai sedotan');
	});

	it('waOrderLink meng-encode pesan', () => {
		const url = waOrderLink('6281349882015', 'Halo\nZatiaras');
		expect(url).toBe('https://wa.me/6281349882015?text=Halo%0AZatiaras');
	});
});
