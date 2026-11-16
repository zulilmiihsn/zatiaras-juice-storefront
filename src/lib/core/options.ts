// Opsi pesanan per cup: ukuran, manis, es. Fakta dari pemilik (Brand Guidelines V1.2):
// Reguler 16 oz (500 ml), Jumbo 22 oz dengan selisih harga seragam. Manis dan es
// adalah pilihan pelanggan, bukan klaim produk.
import type { CategorySlug } from '$lib/data/menu';

export const SIZES = ['REG', 'JUMBO'] as const;
export type Size = (typeof SIZES)[number];

export const SWEETNESS = ['NORMAL', 'LESS', 'NONE'] as const;
export type Sweetness = (typeof SWEETNESS)[number];

export const ICE = ['NORMAL', 'LESS', 'NONE'] as const;
export type Ice = (typeof ICE)[number];

// Selisih Jumbo 22 oz terhadap Reguler 16 oz. Seragam di semua menu yang punya Jumbo.
export const JUMBO_UPCHARGE = 8000;

// Kategori yang punya Jumbo. Baby dan Non Jus belum terverifikasi: jangan tawarkan Jumbo.
// VERIFY_VIA_OPS sebelum menambah kategori di sini.
export const JUMBO_CATEGORIES: readonly CategorySlug[] = ['buah-sayur', 'mix-jus', 'kocok'];

export const SIZE_LABEL: Record<Size, string> = { REG: 'Reguler 16 oz', JUMBO: 'Jumbo 22 oz' };
export const SWEET_LABEL: Record<Sweetness, string> = {
	NORMAL: 'Normal',
	LESS: 'Kurang manis',
	NONE: 'Tanpa gula'
};
export const ICE_LABEL: Record<Ice, string> = {
	NORMAL: 'Normal',
	LESS: 'Sedikit es',
	NONE: 'Tanpa es'
};

export interface ItemOptions {
	size: Size;
	sweet: Sweetness;
	ice: Ice;
}

export const DEFAULT_OPTIONS: ItemOptions = { size: 'REG', sweet: 'NORMAL', ice: 'NORMAL' };

export function jumboEligible(category: CategorySlug | undefined): boolean {
	return !!category && JUMBO_CATEGORIES.includes(category);
}

export function unitPrice(basePrice: number, size: Size): number {
	return size === 'JUMBO' ? basePrice + JUMBO_UPCHARGE : basePrice;
}

export function optionSummary(o: Partial<ItemOptions> | undefined): string {
	if (!o) return '';
	const parts: string[] = [];
	if (o.size) parts.push(SIZE_LABEL[o.size]);
	if (o.sweet) parts.push(`Manis: ${SWEET_LABEL[o.sweet]}`);
	if (o.ice) parts.push(`Es: ${ICE_LABEL[o.ice]}`);
	return parts.join(' · ');
}
