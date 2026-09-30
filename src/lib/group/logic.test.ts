import { describe, expect, it } from 'vitest';
import {
	totalCups,
	advanceGroupPure,
	makeGroupCode,
	submitGroupPure,
	reviewGroupPure
} from './logic';

describe('group', () => {
	it('hitung total cup request', () => {
		expect(
			totalCups([
				{ menuItemId: 'a', qty: 7 },
				{ menuItemId: 'b', qty: 2 }
			])
		).toBe(9);
	});

	it('lifecycle kunci di luar alur', () => {
		let all = submitGroupPure([], {
			outletId: 'juanda',
			name: 'T',
			whatsapp: '+6281',
			schedule: 'x',
			lines: []
		});
		expect(all[0].state).toBe('REVIEWING');
		expect(() => advanceGroupPure(all, all[0].id, 'READY')).toThrow();
		all = reviewGroupPure(all, all[0].id, true);
		expect(all[0].state).toBe('APPROVED');
		all = advanceGroupPure(all, all[0].id, 'PENDING_PAYMENT');
		expect(all[0].state).toBe('PENDING_PAYMENT');
	});

	it('kode group GR- unik per submit', () => {
		expect(makeGroupCode()).toMatch(/^GR-[A-Z2-9]{6}$/);
		const a = submitGroupPure([], {
			outletId: 'juanda',
			name: 'A',
			whatsapp: '+6281',
			schedule: 'x',
			lines: []
		});
		const b = submitGroupPure(a, {
			outletId: 'juanda',
			name: 'B',
			whatsapp: '+6282',
			schedule: 'y',
			lines: []
		});
		expect(b[0].id).not.toBe(b[1].id);
	});
});
