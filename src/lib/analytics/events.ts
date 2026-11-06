// ANALYTICS.md. Traffic bukan north star. Tanpa data sensitif.
import { browser } from '$app/environment';

export const EVENTS = [
	'page_view',
	'outlet_view',
	'menu_view',
	'product_view',
	'add_to_cart',
	'remove_from_cart',
	'cart_view',
	'checkout_started',
	'pickup_slot_selected',
	'payment_created',
	'payment_success',
	'payment_failed',
	'order_confirmed',
	'order_preparing',
	'order_ready',
	'order_completed',
	'fulfillment_failed',
	'whatsapp_support_clicked',
	'refund_requested',
	'refund_completed',
	'feedback_submitted',
	'group_order_started',
	'group_order_submitted',
	'group_order_approved',
	'group_order_rejected',
	'group_order_paid',
	'hero_order_clicked',
	'outlet_select_clicked',
	'menu_preview_clicked',
	'product_clicked',
	'group_order_clicked',
	'location_suggested',
	'location_suggestion_accepted',
	'location_suggestion_changed',
	'browser_location_requested',
	'browser_location_granted',
	'browser_location_denied',
	'outlet_selector_opened',
	'outlet_selected',
	'outlet_changed',
	'cart_revalidation_started',
	'cart_revalidation_completed',
	'cart_price_changed_after_switch',
	'cart_item_unavailable_after_switch'
] as const;
export type EventName = (typeof EVENTS)[number];

// Kunci dilarang ke analytics pihak ketiga.
const BLOCKED = ['whatsapp', 'name', 'phone', 'email', 'address', 'signature', 'token', 'note'];

export function sanitize(
	params: Record<string, unknown>
): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(params)) {
		if (BLOCKED.includes(k.toLowerCase())) continue;
		if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
	}
	return out;
}

export interface BufferedEvent {
	name: EventName;
	params: Record<string, string | number | boolean>;
	at: string;
}

const AKEY = 'z-analytics';

export function track(name: EventName, params: Record<string, unknown> = {}): void {
	const evt: BufferedEvent = { name, params: sanitize(params), at: new Date().toISOString() };
	if (browser) {
		try {
			const all = JSON.parse(localStorage.getItem(AKEY) ?? '[]') as BufferedEvent[];
			all.push(evt);
			localStorage.setItem(AKEY, JSON.stringify(all.slice(-200)));
		} catch {
			/* abaikan */
		}
	}
}

export function listEvents(): BufferedEvent[] {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(AKEY) ?? '[]');
	} catch {
		return [];
	}
}

export function clearEvents(): void {
	if (browser) localStorage.removeItem(AKEY);
}
