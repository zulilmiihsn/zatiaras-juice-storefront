// Bentuk menu hidup dari POS. Murni (tanpa I/O) agar dipakai perhitungan harga dan server sama-sama.
export interface PosMenuItem {
	name: string;
	price: number;
	jumboPrice: number | null;
	available: boolean;
}

export interface LiveMenu {
	outletId: string;
	fetchedAt: number;
	/** Kunci = nama menu ternormalisasi. null = nama ganda di POS (ambigu, tidak boleh dipilih diam-diam). */
	items: Map<string, PosMenuItem | null>;
}

/** Nama menu dibandingkan tanpa beda huruf besar/kecil dan spasi ganda. */
export function menuKey(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
