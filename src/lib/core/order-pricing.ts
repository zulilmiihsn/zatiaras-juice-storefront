// Server menghitung ulang harga dari data menu. Harga dari browser tidak dipercaya.
import type { OrderItem } from './contracts';
import { canAcceptWebOrders, getOutlet } from './outlets';
import {
	ICE,
	SWEETNESS,
	SIZES,
	jumboEligible,
	unitPrice,
	type Ice,
	type Size,
	type Sweetness
} from './options';
import { PICKUP_CHOICES, pickupText } from './whatsapp-order';
import {
	AVAILABILITY_VERIFIED,
	MENU_VERIFIED,
	availabilityFor,
	getMenuItem,
	priceFor
} from '$lib/data/menu';
import { menuKey, type LiveMenu } from './live-menu';

export interface OrderRequestItem {
	slug: string;
	qty: number;
	size?: Size;
	sweet?: Sweetness;
	ice?: Ice;
}

export interface OrderRequest {
	outletId: string;
	name: string;
	pickupChoiceId: string;
	note?: string;
	items: OrderRequestItem[];
}

export type PriceError =
	| 'ordering_closed'
	| 'bad_request'
	| 'outlet_invalid'
	| 'outlet_paused'
	| 'name_required'
	| 'cart_empty'
	| 'item_unknown'
	| 'item_sold_out'
	| 'option_invalid'
	| 'pickup_invalid';

export type PriceResult =
	| { ok: true; items: OrderItem[]; total: number; pickupNote: string; note?: string; name: string }
	| { ok: false; error: PriceError };

const fail = (error: PriceError): PriceResult => ({ ok: false, error });

// `live` = menu hidup dari POS untuk outlet ini. Bila ada, harga dan ketersediaan mengikuti POS
// (menu yang tidak ada di POS, nonaktif, atau habis ditolak) dan pemesanan boleh dibuka tanpa
// verifikasi manual. Tanpa `live`, perilaku lama berlaku.
export function priceOrder(req: OrderRequest, now: Date, live?: LiveMenu | null): PriceResult {
	if (!MENU_VERIFIED || (!AVAILABILITY_VERIFIED && !live)) return fail('ordering_closed');
	if (!req || typeof req !== 'object' || !Array.isArray(req.items)) return fail('bad_request');
	const outlet = getOutlet(String(req.outletId));
	if (!outlet) return fail('outlet_invalid');
	if (!canAcceptWebOrders(outlet)) return fail('outlet_paused');
	const name = String(req.name ?? '')
		.trim()
		.slice(0, 40);
	if (!name) return fail('name_required');
	if (req.items.length === 0) return fail('cart_empty');
	if (req.items.length > 30) return fail('bad_request');
	const choice = PICKUP_CHOICES.find((c) => c.id === req.pickupChoiceId);
	if (!choice) return fail('pickup_invalid');

	const items: OrderItem[] = [];
	let total = 0;
	for (const it of req.items) {
		const qty = it.qty;
		if (!Number.isInteger(qty) || qty < 1 || qty > 20) return fail('bad_request');
		const menu = getMenuItem(String(it.slug));
		if (!menu) return fail('item_unknown');
		const pos = live ? live.items.get(menuKey(menu.name)) : undefined;
		if (live) {
			if (!pos || !pos.available) return fail('item_sold_out');
		} else if (availabilityFor(menu, outlet.id) === 'SOLD_OUT') return fail('item_sold_out');
		const size: Size = it.size ?? 'REG';
		const sweet: Sweetness = it.sweet ?? 'NORMAL';
		const ice: Ice = it.ice ?? 'NORMAL';
		if (!SIZES.includes(size) || !SWEETNESS.includes(sweet) || !ICE.includes(ice))
			return fail('option_invalid');
		if (size === 'JUMBO' && !jumboEligible(menu.category)) return fail('option_invalid');
		const base = pos ? pos.price : priceFor(menu, outlet.id);
		const unit = size === 'JUMBO' && pos?.jumboPrice ? pos.jumboPrice : unitPrice(base, size);
		total += unit * qty;
		items.push({ menuItemId: menu.slug, name: menu.name, qty, unitPrice: unit, size, sweet, ice });
	}
	const note = String(req.note ?? '')
		.trim()
		.slice(0, 120);
	return {
		ok: true,
		items,
		total,
		name,
		pickupNote: pickupText(choice, now),
		...(note ? { note } : {})
	};
}
