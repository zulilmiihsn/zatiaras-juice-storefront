import { describe, expect, it } from 'vitest';
import {
	nextOutletAction,
	canFail,
	setLoad,
	canTakeOrders,
	setAvail,
	getAvail
} from './outlet-logic';

describe('outlet-logic', () => {
	it('aksi utama berurutan', () => {
		expect(nextOutletAction('PAID')?.to).toBe('CONFIRMED');
		expect(nextOutletAction('CONFIRMED')?.to).toBe('PREPARING');
		expect(nextOutletAction('PREPARING')?.to).toBe('READY');
		expect(nextOutletAction('READY')?.to).toBe('COMPLETED');
		expect(nextOutletAction('COMPLETED')).toBe(null);
	});

	it('gagal hanya PAID/CONFIRMED', () => {
		expect(canFail('PAID')).toBe(true);
		expect(canFail('PREPARING')).toBe(false);
	});

	it('pause blokir order baru', () => {
		const m = setLoad({}, 'juanda', 'PAUSED');
		expect(canTakeOrders(m['juanda'])).toBe(false);
		expect(canTakeOrders('NORMAL')).toBe(true);
	});

	it('availability per outlet+menu', () => {
		const m = setAvail({}, 'juanda', 'jus-mangga', 'SOLD_OUT');
		expect(getAvail(m, 'juanda', 'jus-mangga')).toBe('SOLD_OUT');
		expect(getAvail(m, 'slamet-riyadi', 'jus-mangga')).toBe('AVAILABLE');
	});
});
