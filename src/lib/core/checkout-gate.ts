// Kapan checkout web boleh dibuka. Pembayaran lewat QRIS statis outlet yang dicek kasir (tanpa gateway).
// Tetap tertutup selama harga atau ketersediaan belum terverifikasi (AGENTS.md: jangan tampilkan data
// seed sebagai kebenaran operasional) dan selama outlet belum punya gambar QRIS.
export interface GateInput {
	menuVerified: boolean;
	availabilityVerified: boolean;
	hasQris: boolean;
}

export type GateReason = 'menu_unverified' | 'availability_unverified' | 'no_qris';

export function checkoutGate(g: GateInput): { open: boolean; reason?: GateReason } {
	if (!g.menuVerified) return { open: false, reason: 'menu_unverified' };
	if (!g.availabilityVerified) return { open: false, reason: 'availability_unverified' };
	if (!g.hasQris) return { open: false, reason: 'no_qris' };
	return { open: true };
}
