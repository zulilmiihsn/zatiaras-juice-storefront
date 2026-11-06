// Multi-city outlet truth.
// Sumber operasional (research 2026-09-25):
// - Repo publik resmi tim (zulilmiihsn/zatiaras-juice-storefront, lib/supabase.ts
//   branchInfoData + pages/index.tsx): alamat + jam + telepon Berau & Samarinda.
// - Live site resmi zatiarasjuice.biz.id: kartu Berau (alamat + 08:00-22:00 WITA).
// - Struk GoFood Berau Des 2023 (Scribd F-2303488842): "Jl Merah Delima
//   (Depan Klinik Berlian Bakti)" — koroborasi landmark Berau.
// - Kitalulus company profile: plus-code Juanda G4FP+GX5, Jl. Ir. H. Juanda,
//   Sidodadi, Samarinda Ulu 75243.
// Yang TIDAK ditemukan di sumber mana pun: alamat Slamet Riyadi,
// Kutilang, Gatot Subroto; harga menu terkini (Supabase dinamis, tak
// terakses publik; struk 2023 basi) — tetap VERIFY, jangan invent.
// Update owner 2026-09-25: Slamet Riyadi 07:00-22:00, Minggu libur (cocok
// planning truth); Kutilang + Gatot Subroto ikut jam Juanda Mon-Sun
// 07:00-23:00. Alamat Balikpapan + Slamet Riyadi tetap VERIFY.
import type { City, CityInfo, Outlet, OutletId } from './contracts';

export const CITIES: CityInfo[] = [
	{ id: 'samarinda', name: 'Samarinda', tagline: 'Juanda · Slamet Riyadi' },
	{ id: 'berau', name: 'Berau', tagline: 'Merah Delima' },
	{ id: 'balikpapan', name: 'Balikpapan', tagline: 'Kutilang · Gatot Subroto' }
];

export const OUTLETS: Outlet[] = [
	{
		id: 'juanda',
		name: 'Juanda',
		city: 'Samarinda',
		cityId: 'samarinda',
		address:
			'Jl. Ir. H. Juanda (samping Ami Ali Parfum), Sidodadi, Samarinda Ulu, Kota Samarinda 75243',
		hours: 'Mon-Sun 07:00-23:00',
		load: 'NORMAL',
		acceptsWebOrders: true,
		verified: true,
		// Published employer address: G4FP+GX5, Juanda, Samarinda (checked 2026-10-12).
		// Google Open Location Code recovery: 6PFVG4FP+GX5, cell centre.
		coordinates: {
			latitude: -0.4762375,
			longitude: 117.137484375,
			verified: true,
			source: 'https://www.kitalulus.com/company/zatiaras-juice-samarinda-r6vq',
			verifiedAt: '2026-10-12'
		}
	},
	{
		id: 'slamet-riyadi',
		name: 'Slamet Riyadi',
		city: 'Samarinda',
		cityId: 'samarinda',
		address: 'VERIFY_VIA_GBP',
		hours: 'Mon-Sat 07:00-22:00; Sunday closed',
		load: 'NORMAL',
		acceptsWebOrders: true,
		verified: true
	},
	{
		id: 'merah-delima',
		name: 'Merah Delima',
		city: 'Berau',
		cityId: 'berau',
		address: 'Jl. Merah Delima, depan Klinik Berlian Bakti, Tanjung Redeb, Berau',
		hours: '08:00-22:00 WITA',
		load: 'NORMAL',
		acceptsWebOrders: true,
		phone: '+62813-4988-2015',
		verified: true
	},
	{
		id: 'kutilang',
		name: 'Kutilang',
		city: 'Balikpapan',
		cityId: 'balikpapan',
		address: 'VERIFY_VIA_GBP',
		hours: 'Mon-Sun 07:00-23:00',
		load: 'NORMAL',
		acceptsWebOrders: true,
		verified: false
	},
	{
		id: 'gatot-subroto',
		name: 'Gatot Subroto',
		city: 'Balikpapan',
		cityId: 'balikpapan',
		address: 'VERIFY_VIA_GBP',
		hours: 'Mon-Sun 07:00-23:00',
		load: 'NORMAL',
		acceptsWebOrders: true,
		verified: false
	}
];

export function getOutlet(id: string): Outlet | undefined {
	return OUTLETS.find((o) => o.id === id);
}

export function getOutletsByCity(cityId: string): Outlet[] {
	return OUTLETS.filter((o) => o.cityId === cityId);
}

export function getCity(cityId: string): CityInfo | undefined {
	return CITIES.find((c) => c.id === cityId);
}

export function outletPath(o: Outlet): string {
	return `/${o.cityId}/${o.id}`;
}

export function formatOutletHours(hours: string): string {
	if (hours === 'Mon-Sun 07:00-23:00') return 'Setiap hari · 07.00–23.00';
	if (hours === 'Mon-Sat 07:00-22:00; Sunday closed') {
		return 'Senin–Sabtu · 07.00–22.00 · Minggu libur';
	}
	return hours;
}

export function isValidOutletId(id: string): id is OutletId {
	return (OUTLETS as Outlet[]).some((o) => o.id === id);
}

// PAUSED tidak terima order web baru. FR-OUTLET-005 + QUALITY gate.
export function canAcceptWebOrders(outlet: Outlet): boolean {
	if (!outlet.acceptsWebOrders) return false;
	if (outlet.load === 'PAUSED') return false;
	return true;
}

// IP suggestion: nama kota kasar -> cityId. Tidak pernah lock outlet otomatis.
export function suggestCityFromLabel(label: string | null | undefined): CityInfo | undefined {
	if (!label) return undefined;
	const l = label.toLowerCase();
	if (l.includes('samarinda')) return getCity('samarinda');
	if (l.includes('berau') || l.includes('tanjung redeb')) return getCity('berau');
	if (l.includes('balikpapan')) return getCity('balikpapan');
	return undefined;
}

export type { City };
