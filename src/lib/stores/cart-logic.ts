// Logika cart murni. FR-CART-001/002/003. Satu outlet per order.
// ADR 2026-09-25: satu cart normal = satu outlet; pindah outlet wajib revalidasi.
import type { Availability, OutletId } from '$lib/core/contracts';
import { jumboEligible, unitPrice, type Ice, type Size, type Sweetness } from '$lib/core/options';
import type { CategorySlug } from '$lib/data/menu';
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
	price: number; // harga satuan final (sudah termasuk selisih Jumbo bila ada)
	qty: number;
	outletId: string;
	availability: Availability;
	// Opsi cup. Opsional supaya baris lama tanpa opsi tetap valid.
	size?: Size;
	sweet?: Sweetness;
	ice?: Ice;
	basePrice?: number; // harga Reguler, untuk menghitung ulang saat ukuran berubah
	category?: CategorySlug;
}

// Kunci baris: item yang sama dengan opsi berbeda adalah baris berbeda.
// Tanpa opsi, kunci = menuItemId (kompatibel dengan pemakaian lama).
export function lineKey(l: Pick<Line, 'menuItemId' | 'size' | 'sweet' | 'ice'>): string {
	if (!l.size && !l.sweet && !l.ice) return l.menuItemId;
	return [l.menuItemId, l.size ?? '', l.sweet ?? '', l.ice ?? ''].join('|');
}

export function addLine(lines: Line[], next: Line): Line[] {
	if (lines.length > 0 && lines[0].outletId !== next.outletId) return lines;
	const key = lineKey(next);
	const i = lines.findIndex((l) => lineKey(l) === key);
	if (i >= 0) {
		const copy = [...lines];
		copy[i] = { ...copy[i], qty: copy[i].qty + next.qty };
		return copy;
	}
	return [...lines, next];
}

// key = lineKey(baris). Menerima menuItemId polos untuk baris tanpa opsi.
export function setQty(lines: Line[], key: string, qty: number): Line[] {
	if (qty <= 0) return lines.filter((l) => lineKey(l) !== key);
	return lines.map((l) => (lineKey(l) === key ? { ...l, qty } : l));
}

// Tawaran naik ukuran: Reguler jadi Jumbo. Baris yang sudah sama dengan Jumbo digabung.
export function upsizeLine(lines: Line[], key: string): Line[] {
	const target = lines.find((l) => lineKey(l) === key);
	if (!target || target.size !== 'REG' || target.basePrice === undefined) return lines;
	if (!jumboEligible(target.category)) return lines;
	const upsized: Line = {
		...target,
		size: 'JUMBO',
		price: unitPrice(target.basePrice, 'JUMBO')
	};
	const rest = lines.filter((l) => lineKey(l) !== key);
	const j = rest.findIndex((l) => lineKey(l) === lineKey(upsized));
	if (j >= 0) {
		const copy = [...rest];
		copy[j] = { ...copy[j], qty: copy[j].qty + upsized.qty };
		return copy;
	}
	// Pertahankan posisi baris di keranjang.
	const idx = lines.findIndex((l) => lineKey(l) === key);
	const out = [...lines];
	out[idx] = upsized;
	return out;
}

// Tambahan yang diperoleh bila baris dinaikkan ke Jumbo. 0 bila tidak memenuhi syarat.
export function upsizeGain(line: Line): number {
	if (line.size !== 'REG' || line.basePrice === undefined || !jumboEligible(line.category)) return 0;
	return (unitPrice(line.basePrice, 'JUMBO') - line.price) * line.qty;
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
		const base = priceFor(item, targetOutlet);
		const price = l.size ? unitPrice(base, l.size) : base;
		if (price !== l.price) {
			const r: RevalidatedLine = {
				...l,
				outletId: targetOutlet,
				price,
				basePrice: base,
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
