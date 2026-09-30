import { describe, expect, it } from 'vitest';
import { validateCheckout } from './checkout';
import { OUTLETS } from './outlets';

describe('checkout validate', () => {
	it('tolak kosong + WA jelek + slot kosong', () => {
		const errs = validateCheckout({
			name: '',
			whatsapp: 'abc',
			outlet: OUTLETS[0],
			pickupSlotId: '',
			cart: []
		});
		expect(errs).toContain('name_required');
		expect(errs).toContain('whatsapp_invalid');
		expect(errs).toContain('slot_required');
		expect(errs).toContain('cart_empty');
	});

	it('blokir soldout + beda outlet + paused', () => {
		const paused = { ...OUTLETS[0], load: 'PAUSED' as const };
		const errs = validateCheckout({
			name: 'Budi',
			whatsapp: '+628123456789',
			outlet: paused,
			pickupSlotId: 's1',
			cart: [
				{ menuItemId: 'm1', qty: 1, outletId: 'juanda', availability: 'SOLD_OUT', price: 20000 },
				{
					menuItemId: 'm2',
					qty: 1,
					outletId: 'slamet-riyadi',
					availability: 'AVAILABLE',
					price: 20000
				}
			]
		});
		expect(errs).toContain('soldout_blocked');
		expect(errs).toContain('single_outlet_only');
		expect(errs).toContain('outlet_paused');
	});
});
