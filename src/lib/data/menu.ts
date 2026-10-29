// Nama hero resmi dari Brand Identity Guidelines. Harga ikut data operasional final.
// ADR 2026-09-25: harga/availability resolve lewat outlet (OutletMenuOffering).
import type { Availability, OutletId } from '$lib/core/contracts';

export type OutletAvailabilityMap = Record<OutletId, Availability>;

// Kategori jualan (urutan = prioritas bisnis). Dipakai section beranda "Jus Apa Aja Ada"
// dan filter /menu?kategori=. Hanya fakta dari pemilik; tanpa klaim kesehatan.
export const CATEGORIES = [
	{
		slug: 'buah-sayur',
		name: 'Jus Buah & Sayur',
		blurb: 'Buah dan sayur segar, diblender saat dipesan.'
	},
	{
		slug: 'mix-jus',
		name: 'Mix Jus',
		blurb: 'Beberapa buah dalam satu cup. Cocok buat yang susah pilih satu.'
	},
	{ slug: 'kocok', name: 'Kocok', blurb: 'Alpukat kental dikocok, manisnya pas.' },
	{
		slug: 'baby',
		name: 'Baby',
		blurb: 'Smoothies buah dengan whipped cream dan topping potongan buah.'
	},
	{ slug: 'non-jus', name: 'Non Jus', blurb: 'Pilihan minuman selain jus.' }
] as const;
export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export interface PublicMenuItem {
	slug: string;
	name: string;
	category: CategorySlug;
	description: string;
	price: number; // harga referensi; konteks outlet yang menentukan harga final
	hero?: boolean;
	availability: OutletAvailabilityMap;
}

// Harga reguler dari daftar menu resmi 2026-06-18 (seed POS), sama di semua outlet.
// Pesan online tetap tertutup selama AVAILABILITY_VERIFIED false.
export const MENU_VERIFIED = true;
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
		slug: 'jus-alpukat',
		name: 'Jus Alpukat',
		category: 'buah-sayur',
		description: 'Alpukat segar diblender creamy, favorit pelanggan.',
		price: 22000,
		availability: { ...OPEN, juanda: 'AVAILABLE', 'slamet-riyadi': 'LIMITED' }
	},
	{
		slug: 'jus-mangga',
		name: 'Jus Mangga',
		category: 'buah-sayur',
		description: 'Mangga manis segar, tropis dan menyegarkan.',
		price: 20000,
		availability: { ...OPEN, juanda: 'LIMITED', 'slamet-riyadi': 'AVAILABLE' }
	},
	{
		slug: 'jus-naga',
		name: 'Jus Naga',
		category: 'buah-sayur',
		description: 'Buah naga segar, warna cerah dan ringan.',
		price: 20000,
		availability: { ...OPEN, juanda: 'SOLD_OUT', 'slamet-riyadi': 'AVAILABLE' }
	},
	{
		slug: 'jus-stroberi',
		name: 'Jus Stroberi',
		category: 'buah-sayur',
		description: 'Stroberi segar diblender.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'jus-durian',
		name: 'Jus Durian',
		category: 'buah-sayur',
		description: 'Durian diblender.',
		price: 25000,
		availability: OPEN
	},
	{
		slug: 'jus-apel',
		name: 'Jus Apel',
		category: 'buah-sayur',
		description: 'Apel segar diblender.',
		price: 18000,
		availability: OPEN
	},
	{
		slug: 'jus-jeruk',
		name: 'Jus Jeruk',
		category: 'buah-sayur',
		description: 'Jeruk segar.',
		price: 15000,
		availability: OPEN
	},
	{
		slug: 'jus-melon',
		name: 'Jus Melon',
		category: 'buah-sayur',
		description: 'Melon segar diblender.',
		price: 15000,
		availability: OPEN
	},
	{
		slug: '3-diva',
		name: '3 Diva',
		category: 'mix-jus',
		description: 'Tiga buah dalam satu cup.',
		price: 18000,
		availability: OPEN
	},
	{
		slug: 'alpukat-mix-durian',
		name: 'Alpukat Mix Durian',
		category: 'mix-jus',
		description: 'Alpukat dan durian dalam satu cup.',
		price: 30000,
		availability: OPEN
	},
	{
		slug: 'stroberi-mix-mangga',
		name: 'Stroberi Mix Mangga',
		category: 'mix-jus',
		description: 'Stroberi dan mangga dalam satu cup.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'mangga-mix-buah-naga',
		name: 'Mangga Mix Buah Naga',
		category: 'mix-jus',
		description: 'Mangga dan buah naga dalam satu cup.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'stroberi-mix-pisang',
		name: 'Stroberi Mix Pisang',
		category: 'mix-jus',
		description: 'Stroberi dan pisang dalam satu cup.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'pisang-mix-milo',
		name: 'Pisang Mix Milo',
		category: 'mix-jus',
		description: 'Pisang dan Milo dalam satu cup.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'apel-mix-nanas',
		name: 'Apel Mix Nanas',
		category: 'mix-jus',
		description: 'Apel dan nanas dalam satu cup.',
		price: 18000,
		availability: OPEN
	},
	{
		slug: 'hero-signature',
		name: 'Alpukat Kocok',
		category: 'kocok',
		description: 'Hero andalan. Alpukat kental dikocok, manisnya pas.',
		price: 22000,
		hero: true,
		availability: { ...OPEN, juanda: 'AVAILABLE', 'slamet-riyadi': 'AVAILABLE' }
	},
	{
		slug: 'durian-kocok',
		name: 'Durian Kocok',
		category: 'kocok',
		description: 'Durian kental dikocok.',
		price: 30000,
		availability: OPEN
	},
	{
		slug: 'mangga-kocok',
		name: 'Mangga Kocok',
		category: 'kocok',
		description: 'Mangga kental dikocok.',
		price: 25000,
		availability: OPEN
	},
	{
		slug: 'naga-kocok',
		name: 'Naga Kocok',
		category: 'kocok',
		description: 'Buah naga kental dikocok.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'pisang-kocok',
		name: 'Pisang Kocok',
		category: 'kocok',
		description: 'Pisang kental dikocok.',
		price: 18000,
		availability: OPEN
	},
	{
		slug: 'alpukat-mix-durian-kocok',
		name: 'Alpukat Mix Durian Kocok',
		category: 'kocok',
		description: 'Alpukat dan durian kental dikocok.',
		price: 30000,
		availability: OPEN
	},
	{
		slug: 'baby-avocado',
		name: 'Baby Avocado',
		category: 'baby',
		description: 'Smoothies alpukat dengan whipped cream dan topping potongan buah.',
		price: 25000,
		availability: OPEN
	},
	{
		slug: 'baby-mango',
		name: 'Baby Mango',
		category: 'baby',
		description: 'Smoothies mangga dengan whipped cream dan topping potongan buah.',
		price: 25000,
		availability: OPEN
	},
	{
		slug: 'baby-dragon',
		name: 'Baby Dragon',
		category: 'baby',
		description: 'Smoothies buah naga dengan whipped cream dan topping potongan buah.',
		price: 25000,
		availability: OPEN
	},
	{
		slug: 'baby-stroberi',
		name: 'Baby Stroberi',
		category: 'baby',
		description: 'Smoothies stroberi dengan whipped cream dan topping potongan buah.',
		price: 25000,
		availability: OPEN
	},
	{
		slug: 'baby-milo',
		name: 'Baby Milo',
		category: 'baby',
		description: 'Smoothies Milo dengan whipped cream.',
		price: 22000,
		availability: OPEN
	},
	{
		slug: 'avocado-milky',
		name: 'Avocado Milky',
		category: 'non-jus',
		description: 'Alpukat susu.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'mango-milky',
		name: 'Mango Milky',
		category: 'non-jus',
		description: 'Mangga susu.',
		price: 25000,
		availability: OPEN
	},
	{
		slug: 'honey-lemon',
		name: 'Honey Lemon',
		category: 'non-jus',
		description: 'Lemon dan madu.',
		price: 20000,
		availability: OPEN
	},
	{
		slug: 'es-milo-malaysia',
		name: 'Es Milo Malaysia',
		category: 'non-jus',
		description: 'Es Milo.',
		price: 15000,
		availability: OPEN
	},
	{
		slug: 'es-buah-jadul',
		name: 'Es Buah Jadul',
		category: 'non-jus',
		description: 'Es buah gaya lama.',
		price: 15000,
		availability: OPEN
	},
	{
		slug: 'sop-buah',
		name: 'Sop Buah',
		category: 'non-jus',
		description: 'Potongan buah segar.',
		price: 15000,
		availability: OPEN
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
