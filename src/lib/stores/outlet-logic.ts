// Logika outlet murni. FR-OUTLET-002/003/004/005. Satu aksi utama per state.
import type { Availability, OrderState, OutletLoad } from '$lib/core/contracts';

export const FAIL_REASONS = ['Habis', 'Alat rusak', 'Tutup cepat', 'Lainnya'] as const;

// Aksi utama crew per state. PAID wajib konfirmasi dulu sebelum proses.
export function nextOutletAction(state: OrderState): { label: string; to: OrderState } | null {
	if (state === 'PAID') return { label: 'Terima', to: 'CONFIRMED' };
	if (state === 'CONFIRMED') return { label: 'Proses Pesanan', to: 'PREPARING' };
	if (state === 'PREPARING') return { label: 'Siap Diambil', to: 'READY' };
	if (state === 'READY') return { label: 'Selesai', to: 'COMPLETED' };
	return null;
}

export function canFail(state: OrderState): boolean {
	return state === 'PAID' || state === 'CONFIRMED';
}

export type LoadMap = Record<string, OutletLoad>;
export type AvailMap = Record<string, Availability>;

export function setLoad(map: LoadMap, outletId: string, load: OutletLoad): LoadMap {
	return { ...map, [outletId]: load };
}

export function canTakeOrders(load: OutletLoad): boolean {
	return load !== 'PAUSED';
}

export function availKey(outletId: string, menuId: string): string {
	return `${outletId}:${menuId}`;
}

export function setAvail(
	map: AvailMap,
	outletId: string,
	menuId: string,
	st: Availability
): AvailMap {
	return { ...map, [availKey(outletId, menuId)]: st };
}

export function getAvail(map: AvailMap, outletId: string, menuId: string): Availability {
	return map[availKey(outletId, menuId)] ?? 'AVAILABLE';
}
