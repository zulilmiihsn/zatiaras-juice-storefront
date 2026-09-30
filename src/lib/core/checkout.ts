// FR-CHECKOUT + FR-CART + FR-MENU-002 + QUALITY gates.
import type { Availability, Outlet } from './contracts';
import { canAcceptWebOrders } from './outlets';

export interface CartLine {
	menuItemId: string;
	qty: number;
	outletId: string;
	availability: Availability;
	price: number;
}

export interface CheckoutInput {
	name: string;
	whatsapp: string;
	outlet: Outlet;
	pickupSlotId: string;
	cart: CartLine[];
}

export function validateCheckout(input: CheckoutInput): string[] {
	const errors: string[] = [];
	if (!input.name.trim()) errors.push('name_required');
	if (!/^\+?62\d{8,14}$/.test(input.whatsapp.replace(/[\s-]/g, '')))
		errors.push('whatsapp_invalid');
	if (!input.pickupSlotId) errors.push('slot_required');
	if (input.cart.length === 0) errors.push('cart_empty');
	const outletIds = new Set(input.cart.map((c) => c.outletId));
	if (outletIds.size > 1) errors.push('single_outlet_only');
	if (input.cart.some((c) => c.outletId !== input.outlet.id)) errors.push('outlet_mismatch');
	if (input.cart.some((c) => c.availability === 'SOLD_OUT')) errors.push('soldout_blocked');
	if (input.cart.some((c) => c.qty <= 0)) errors.push('qty_invalid');
	if (!canAcceptWebOrders(input.outlet)) errors.push('outlet_paused');
	return errors;
}
