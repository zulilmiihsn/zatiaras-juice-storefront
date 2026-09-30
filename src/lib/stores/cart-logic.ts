// Logika cart murni. FR-CART-001/002/003. Satu outlet per order.
// ADR 2026-09-25: satu cart normal = satu outlet; pindah outlet wajib revalidasi.
import type { Availability, OutletId } from '$lib/core/contracts';
import {
	AVAILABILITY_VERIFIED,
	MENU_VERIFIED,
	availabilityFor,
	getMenuItem,
	priceFor
} from '$lib/data/menu';

export interface Line {
	menuItemId: string;
	name: string;
	price: number;
	qty: number;
	outletId: string;
	availability: Availability;
}

export function addLine(lines: Line[], next: Line): Line[] {
	if (lines.length > 0 && lines[0].outletId !== next.outletId) return lines;
	const i = lines.findIndex((l) => l.menuItemId === next.menuItemId);
	if (i >= 0) {
		const copy = [...lines];
		copy[i] = { ...copy[i], qty: copy[i].qty + next.qty };
		return copy;
	}
	return [...lines, next];
}

export function setQty(lines: Line[], menuItemId: string, qty: number): Line[] {
	if (qty <= 0) return lines.filter((l) => l.menuItemId !== menuItemId);
	return lines.map((l) => (l.menuItemId === menuItemId ? { ...l, qty } : l));
}

export function subtotal(lines: Line[]): number {
	return lines.reduce((s, l) => s + l.price * l.qty, 0);
}

export type RevalidateStatus = 'unchanged' | 'price-changed' | 'unavailable';

export interface RevalidatedLine extends Line {
	status: RevalidateStatus;
	oldPrice?: number;
}

export interface RevalidationResult {
	lines: RevalidatedLine[];
	removed: RevalidatedLine[];
	priceChanged: RevalidatedLine[];
	unchanged: RevalidatedLine[];
}

// Pindah outlet: revalidasi harga + ketersediaan. Jangan diam-diam buang intent customer.
export function revalidateForOutlet(lines: Line[], targetOutlet: OutletId): RevalidationResult {
	// Without approved outlet data, never alter or drop customer items based on demo
	// price/availability values. Keep intent and require operator verification later.
	if (!MENU_VERIFIED || !AVAILABILITY_VERIFIED) {
		const kept = lines.map((line) => ({
			...line,
			outletId: targetOutlet,
			status: 'unchanged' as const
		}));
		return { lines: kept, removed: [], priceChanged: [], unchanged: kept };
	}

	const kept: RevalidatedLine[] = [];
	const removed: RevalidatedLine[] = [];
	const priceChanged: RevalidatedLine[] = [];
	const unchanged: RevalidatedLine[] = [];

	for (const l of lines) {
		const item = getMenuItem(l.menuItemId);
		if (!item) {
			const r: RevalidatedLine = { ...l, outletId: targetOutlet, status: 'unavailable' };
			removed.push(r);
			continue;
		}
		const avail = availabilityFor(item, targetOutlet);
		if (avail === 'SOLD_OUT') {
			removed.push({ ...l, outletId: targetOutlet, availability: avail, status: 'unavailable' });
			continue;
		}
		const price = priceFor(item, targetOutlet);
		if (price !== l.price) {
			const r: RevalidatedLine = {
				...l,
				outletId: targetOutlet,
				price,
				availability: avail,
				status: 'price-changed',
				oldPrice: l.price
			};
			kept.push(r);
			priceChanged.push(r);
		} else {
			const r: RevalidatedLine = {
				...l,
				outletId: targetOutlet,
				availability: avail,
				status: 'unchanged'
			};
			kept.push(r);
			unchanged.push(r);
		}
	}

	return { lines: kept, removed, priceChanged, unchanged };
}
