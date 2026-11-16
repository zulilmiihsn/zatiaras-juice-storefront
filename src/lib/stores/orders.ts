// Order draft lokal. FR-ORDER-001 DRAFT->PENDING_PAYMENT.
import { browser } from '$app/environment';
import { assertTransition, canTransition } from '$lib/core/order-machine';
import type { Order, OrderState, OutletId, PaymentMode } from '$lib/core/contracts';
import type { Line } from '$lib/stores/cart-logic';

export interface DraftInput {
	outletId: OutletId | string;
	name: string;
	whatsapp: string;
	slotId: string;
	lines: Line[];
	existingIds?: string[];
	paymentMode?: PaymentMode; // default GATEWAY (perilaku lama); CASHIER = QRIS statis + kode unik, dicek kasir
	pickupNote?: string;
	note?: string;
}

// Kode pickup pendek ramah-manusia (tanpa 0/O/1/I/L yang mirip).
// Unik terhadap daftar id yang diteruskan; loop hingga bebas tabrakan.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randChar(): string {
	let n: number;
	if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
		const buf = new Uint32Array(1);
		crypto.getRandomValues(buf);
		n = buf[0] % CODE_ALPHABET.length;
	} else {
		n = Math.floor(Math.random() * CODE_ALPHABET.length);
	}
	return CODE_ALPHABET[n];
}

export function makeOrderCode(existing: string[] = []): string {
	const taken = new Set(existing);
	let code: string;
	do {
		code = `ZT-${Array.from({ length: 6 }, randChar).join('')}`;
	} while (taken.has(code));
	return code;
}

export function createDraft(input: DraftInput): Order {
	const total = input.lines.reduce((s, l) => s + l.price * l.qty, 0);
	const order: Order = {
		id: makeOrderCode(input.existingIds ?? []),
		outletId: input.outletId as Order['outletId'],
		contact: { name: input.name, whatsapp: input.whatsapp },
		items: input.lines.map((l) => ({
			menuItemId: l.menuItemId,
			name: l.name,
			qty: l.qty,
			unitPrice: l.price,
			...(l.size ? { size: l.size } : {}),
			...(l.sweet ? { sweet: l.sweet } : {}),
			...(l.ice ? { ice: l.ice } : {})
		})),
		pickupSlotId: input.slotId,
		state: 'DRAFT',
		total
	};
	const mode = input.paymentMode ?? 'GATEWAY';
	const next: OrderState = mode === 'CASHIER' ? 'AWAITING_CASHIER' : 'PENDING_PAYMENT';
	if (!canTransition('DRAFT', next)) throw new Error('no-transition');
	return {
		...order,
		state: next,
		...(input.paymentMode ? { paymentMode: input.paymentMode } : {}),
		...(input.pickupNote ? { pickupNote: input.pickupNote } : {}),
		...(input.note?.trim() ? { note: input.note.trim() } : {})
	};
}

const KEY = 'z-orders';

export function saveOrder(o: Order): void {
	if (!browser) return;
	const all = listOrders();
	all.push(o);
	localStorage.setItem(KEY, JSON.stringify(all));
}

export function listOrders(): Order[] {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '[]');
	} catch {
		return [];
	}
}

export function getOrder(id: string): Order | undefined {
	return listOrders().find((o) => o.id === id);
}

export function moveOrder(id: string, to: OrderState): Order {
	if (!browser) throw new Error('ssr_no_store');
	const all = listOrders();
	const i = all.findIndex((o) => o.id === id);
	if (i < 0) throw new Error('order_not_found');
	assertTransition(all[i].state, to);
	all[i] = { ...all[i], state: to };
	localStorage.setItem(KEY, JSON.stringify(all));
	return all[i];
}

// Server adalah otoritas status untuk pesanan jalur kasir. Sinkron tanpa assertTransition
// karena polling bisa melewati langkah antara (mis. CONFIRMED langsung READY).
export function syncOrderState(id: string, state: OrderState): Order | undefined {
	if (!browser) return undefined;
	const all = listOrders();
	const i = all.findIndex((o) => o.id === id);
	if (i < 0) return undefined;
	if (all[i].state === state) return all[i];
	all[i] = { ...all[i], state };
	localStorage.setItem(KEY, JSON.stringify(all));
	return all[i];
}

const REASON_KEY = 'z-fail-reasons';

export function failOrder(id: string, reason: string): Order {
	if (browser) {
		const m = JSON.parse(localStorage.getItem(REASON_KEY) ?? '{}');
		m[id] = reason;
		localStorage.setItem(REASON_KEY, JSON.stringify(m));
	}
	return moveOrder(id, 'FULFILLMENT_FAILED');
}

export function failReason(id: string): string {
	if (!browser) return '';
	try {
		return JSON.parse(localStorage.getItem(REASON_KEY) ?? '{}')[id] ?? '';
	} catch {
		return '';
	}
}

// import.meta.env.DEV false statis di production build (dead-code-eliminated),
// true di dev & vitest.
function isDemoAllowed(): boolean {
	try {
		return (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
	} catch {
		return false;
	}
}

// Demo agar crew bisa UAT tanpa payment gateway.
// DEV-ONLY: no-op di production build agar data palsu tak bocor ke produksi.
export function seedDemo(): Order[] {
	if (!browser) return [];
	if (!isDemoAllowed()) return listOrders();
	if (listOrders().length > 0) return listOrders();
	const demo: Order[] = [
		{
			id: 'demo-1',
			outletId: 'juanda',
			contact: { name: 'Andi', whatsapp: '+6281230001' },
			items: [{ menuItemId: 'hero-signature', qty: 2, unitPrice: 22000 }],
			pickupSlotId: 'juanda-sekarang',
			state: 'PAID',
			total: 44000
		},
		{
			id: 'demo-2',
			outletId: 'slamet-riyadi',
			contact: { name: 'Sari', whatsapp: '+6281230002' },
			items: [{ menuItemId: 'jus-mangga', qty: 3, unitPrice: 20000 }],
			pickupSlotId: 'slamet-sekarang',
			state: 'CONFIRMED',
			total: 60000
		},
		{
			id: 'demo-3',
			outletId: 'juanda',
			contact: { name: 'Budi', whatsapp: '+6281230003' },
			items: [{ menuItemId: 'jus-alpukat', qty: 1, unitPrice: 22000 }],
			pickupSlotId: 'juanda-1jam',
			state: 'PREPARING',
			total: 22000
		}
	];
	localStorage.setItem(KEY, JSON.stringify(demo));
	return demo;
}
