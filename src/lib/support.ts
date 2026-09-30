// FR-ORDER-004 + FR-SUPPORT + FR-FEEDBACK. Bahasa polos. Tanpa secret ke WA.
import type { Order, OrderState, SupportCategory } from '$lib/core/contracts';

// VERIFY nomor WA resmi outlet sebelum rilis.
// Fail-closed: selama placeholder, tombol bantuan WA disembunyikan UI
// (waLink -> null) agar tidak nyasar ke nomor antah berantah.
const WHATSAPP_PLACEHOLDER = '6280000000000';
export const WHATSAPP_OUTLET = WHATSAPP_PLACEHOLDER;

export function isSupportConfigured(): boolean {
	return WHATSAPP_OUTLET !== WHATSAPP_PLACEHOLDER;
}

export const STATUS_LABEL: Record<OrderState, string> = {
	DRAFT: 'Draf',
	PENDING_PAYMENT: 'Menunggu pembayaran',
	PAID: 'Sudah dibayar',
	CONFIRMED: 'Diterima outlet',
	PREPARING: 'Disiapkan',
	READY: 'Siap diambil',
	COMPLETED: 'Selesai',
	FULFILLMENT_FAILED: 'Ada kendala',
	REFUND_PENDING: 'Refund diproses',
	REFUNDED: 'Dana kembali',
	EXPIRED: 'Kedaluwarsa',
	CANCELLED: 'Dibatalkan'
};

export function statusLabel(s: OrderState): string {
	return STATUS_LABEL[s];
}

// Konteks aman: id, outlet, status bayar, total. Tanpa secret.
export function buildWaMessage(order: Order, reason: string): string {
	return `Halo Zatiaras, order ${order.id} outlet ${order.outletId} status ${order.state} total Rp${order.total}. Kendala: ${reason}. Minta bantuan.`;
}

// Null bila nomor resmi belum dikonfigurasi — UI wajib tampilkan fallback
// (simpan nomor pesanan, hubungi outlet langsung), bukan link mati.
export function waLink(order: Order, reason: string): string | null {
	if (!isSupportConfigured()) return null;
	return `https://wa.me/${WHATSAPP_OUTLET}?text=${encodeURIComponent(buildWaMessage(order, reason))}`;
}

export const FEEDBACK_CATS: { id: SupportCategory; label: string }[] = [
	{ id: 'TASTE', label: 'Rasa' },
	{ id: 'BITTER', label: 'Pahit' },
	{ id: 'SWEETNESS', label: 'Manis' },
	{ id: 'WRONG_ORDER', label: 'Salah pesanan' },
	{ id: 'SPILL_OR_LEAK', label: 'Tumpah/bocor' },
	{ id: 'DELAY', label: 'Lama' },
	{ id: 'SERVICE', label: 'Pelayanan' },
	{ id: 'CLEANLINESS', label: 'Kebersihan' },
	{ id: 'STOCK_OR_FULFILLMENT', label: 'Stok/pesanan' },
	{ id: 'PAYMENT', label: 'Pembayaran' },
	{ id: 'OTHER', label: 'Lainnya' }
];

export interface Feedback {
	orderId: string;
	category: SupportCategory;
	note: string;
	at: string;
}

const FKEY = 'z-feedback';

export function saveFeedback(f: Feedback): void {
	if (typeof localStorage === 'undefined') return;
	const all = listFeedback();
	all.push(f);
	localStorage.setItem(FKEY, JSON.stringify(all));
}

export function listFeedback(): Feedback[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(FKEY) ?? '[]');
	} catch {
		return [];
	}
}
