import { describe, expect, it } from 'vitest';
import { addLine, revalidateForOutlet, setQty, subtotal } from './cart-logic';

describe('cart-logic', () => {
	it('tambah + subtotal', () => {
		let lines = addLine([], {
			menuItemId: 'm1',
			name: 'A',
			price: 20000,
			qty: 2,
			outletId: 'juanda',
			availability: 'AVAILABLE'
		});
		lines = addLine(lines, {
			menuItemId: 'm1',
			name: 'A',
			price: 20000,
			qty: 1,
			outletId: 'juanda',
			availability: 'AVAILABLE'
		});
		expect(lines[0].qty).toBe(3);
		expect(subtotal(lines)).toBe(60000);
	});

	it('tolak beda outlet', () => {
		const lines = addLine(
			[
				{
					menuItemId: 'm1',
					name: 'A',
					price: 1,
					qty: 1,
					outletId: 'juanda',
					availability: 'AVAILABLE'
				}
			],
			{
				menuItemId: 'm2',
				name: 'B',
				price: 1,
				qty: 1,
				outletId: 'slamet-riyadi',
				availability: 'AVAILABLE'
			}
		);
		expect(lines.length).toBe(1);
	});

	it('qty 0 hapus', () => {
		const lines = setQty(
			[
				{
					menuItemId: 'm1',
					name: 'A',
					price: 1,
					qty: 1,
					outletId: 'juanda',
					availability: 'AVAILABLE'
				}
			],
			'm1',
			0
		);
		expect(lines.length).toBe(0);
	});

	it('revalidasi pindah outlet: jus-naga SOLD_OUT di juanda tersedia di kutilang', () => {
		const lines = [
			{
				menuItemId: 'jus-naga',
				name: 'Jus Naga',
				price: 20000,
				qty: 1,
				outletId: 'juanda',
				availability: 'SOLD_OUT' as const
			}
		];
		const r = revalidateForOutlet(lines, 'kutilang');
		expect(r.lines.length).toBe(1);
		expect(r.removed.length).toBe(0);
	});

	it('revalidasi mempertahankan item saat offering tujuan belum terverifikasi', () => {
		const lines = [
			{
				menuItemId: 'jus-alpukat',
				name: 'Jus Alpukat',
				price: 22000,
				qty: 1,
				outletId: 'kutilang',
				availability: 'AVAILABLE' as const
			}
		];
		// Offering belum diverifikasi: jangan drop cart item berdasarkan data demo.
		const r = revalidateForOutlet(
			[
				{
					menuItemId: 'tak-ada',
					name: 'X',
					price: 1,
					qty: 1,
					outletId: 'kutilang',
					availability: 'AVAILABLE' as const
				}
			],
			'juanda'
		);
		expect(r.removed.length).toBe(0);
		expect(r.lines[0].menuItemId).toBe('tak-ada');
		expect(r.lines[0].outletId).toBe('juanda');
		expect(lines.length).toBe(1);
	});
});
