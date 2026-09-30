// Nama hero resmi dari Brand Identity Guidelines. Harga ikut data operasional final.
// ADR 2026-09-25: harga/availability resolve lewat outlet (OutletMenuOffering).
import type { Availability, OutletId } from '$lib/core/contracts';

export type OutletAvailabilityMap = Record<OutletId, Availability>;

export interface PublicMenuItem {
	slug: string;
	name: string;
	description: string;
	price: number; // harga referensi; konteks outlet yang menentukan harga final
	hero?: boolean;
	availability: OutletAvailabilityMap;
}

// Sumber harga final: data operasional. Jangan tampilkan status internal ke customer.
export const MENU_VERIFIED = false;
// Outlet states below include legacy/demo values, not a published live feed.
export const AVAILABILITY_VERIFIED = false;

const OPEN: OutletAvailabilityMap = {
	juanda: 'AVAILABLE',
	'slamet-riyadi': 'AVAILABLE',
	'merah-delima': 'AVAILABLE',
	kutilang: 'AVAILABLE',
	'gatot-subroto': 'AVAILABLE'
};

export const MENU: PublicMenuItem[] = [
	{
		slug: 'hero-signature',
		name: 'Alpukat Kocok',
		description: 'Hero andalan. Alpukat kental dikocok, manisnya pas.',
		price: 25000,
		hero: true,
		availability: { ...OPEN, juanda: 'AVAILABLE', 'slamet-riyadi': 'AVAILABLE' }
	},
	{
		slug: 'jus-alpukat',
		name: 'Jus Alpukat',
		description: 'Alpukat segar diblender creamy, favorit pelanggan.',
		price: 22000,
		availability: { ...OPEN, juanda: 'AVAILABLE', 'slamet-riyadi': 'LIMITED' }
	},
	{
		slug: 'jus-mangga',
		name: 'Jus Mangga',
		description: 'Mangga manis segar, tropis dan menyegarkan.',
		price: 20000,
		availability: { ...OPEN, juanda: 'LIMITED', 'slamet-riyadi': 'AVAILABLE' }
	},
	{
		slug: 'jus-naga',
		name: 'Jus Naga',
		description: 'Buah naga segar, warna cerah dan ringan.',
		price: 20000,
		availability: { ...OPEN, juanda: 'SOLD_OUT', 'slamet-riyadi': 'AVAILABLE' }
	}
];

export function getMenuItem(slug: string): PublicMenuItem | undefined {
	return MENU.find((m) => m.slug === slug);
}

export function priceFor(item: PublicMenuItem, outletId: OutletId): number {
	// V1: harga global terverifikasi sama; hook ini tempat override per-outlet kelak.
	// Jangan fabricate perbedaan harga tanpa data operasional.
	void outletId;
	return item.price;
}

export function availabilityFor(item: PublicMenuItem, outletId: OutletId): Availability {
	return item.availability[outletId] ?? 'AVAILABLE';
}

export function isOrderable(item: PublicMenuItem, outletId: OutletId): boolean {
	return availabilityFor(item, outletId) !== 'SOLD_OUT';
}
