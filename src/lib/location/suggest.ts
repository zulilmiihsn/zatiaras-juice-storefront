// Smart location: remembered > IP suggestion > manual > browser-geo (explicit only).
// IP tidak pernah lock outlet. Browser geo hanya setelah klik "Gunakan Lokasi Saya".
import type { CityInfo, LocationSource, Outlet } from '$lib/core/contracts';
import { CITIES, OUTLETS, getCity, getOutlet, suggestCityFromLabel } from '$lib/core/outlets';

export { suggestCityFromLabel };

export const LAST_OUTLET_KEY = 'z-last-outlet';
export const LAST_SOURCE_KEY = 'z-last-source';

export interface LocationSuggestion {
	city?: CityInfo;
	outlets: Outlet[];
	source: LocationSource;
	label: string;
}

export function readRememberedOutlet(): { outlet?: Outlet; source?: LocationSource } {
	if (typeof localStorage === 'undefined') return {};
	try {
		const id = localStorage.getItem(LAST_OUTLET_KEY);
		const source = localStorage.getItem(LAST_SOURCE_KEY) as LocationSource | null;
		if (!id) return {};
		const outlet = getOutlet(id);
		if (!outlet) return {};
		return { outlet, source: source ?? 'remembered' };
	} catch {
		return {};
	}
}

export function rememberOutlet(id: string, source: LocationSource = 'manual'): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(LAST_OUTLET_KEY, id);
		localStorage.setItem(LAST_SOURCE_KEY, source);
	} catch {
		/* abaikan */
	}
}

// Cloudflare cf object (city/region/country/lat/long) -> suggestion kota saja.
export function suggestFromCf(
	cf:
		| {
				city?: string;
				region?: string;
				country?: string;
				latitude?: string;
				longitude?: string;
		  }
		| null
		| undefined
): LocationSuggestion | null {
	if (!cf) return null;
	const city = suggestCityFromLabel(cf.city) ?? suggestCityFromLabel(cf.region);
	if (!city) {
		return {
			source: 'ip',
			outlets: [],
			label: 'Lokasi kamu belum terdeteksi — pilih kota manual.'
		};
	}
	const outlets = OUTLETS.filter((o) => o.cityId === city.id);
	return {
		city,
		outlets,
		source: 'ip',
		label: `Sepertinya kamu berada di ${city.name}.`
	};
}

export function suggestionWithRememberedFirst(
	cf: Parameters<typeof suggestFromCf>[0]
): LocationSuggestion {
	const { outlet } = readRememberedOutlet();
	if (outlet) {
		const city = getCity(outlet.cityId);
		return {
			city,
			outlets: city ? OUTLETS.filter((o) => o.cityId === city.id) : [outlet],
			source: 'remembered',
			label: `Outlet: ${outlet.name}, ${outlet.city}`
		};
	}
	const ip = suggestFromCf(cf);
	if (ip) return ip;
	return {
		source: 'manual',
		outlets: [...OUTLETS],
		label: 'Pilih kota dan outlet manual.'
	};
}

export function allCities(): CityInfo[] {
	return CITIES;
}

export function outletsOf(cityId: string): Outlet[] {
	return OUTLETS.filter((o) => o.cityId === cityId);
}

// Browser geo: hitung outlet terdekat hanya bila koordinat outlet terverifikasi.
// V1: koordinat outlet belum terverifikasi -> return null, fallback ke manual/IP.
export function nearestOutlet(lat: number, lon: number): Outlet | null {
	void lat;
	void lon;
	return null;
}

// Centroid kota kasar (publik, untuk saran kota saja — BUKAN pin outlet).
// Berau/Samarinda dari repo resmi tim; Balikpapan pusat kota umum.
// Jangan pernah dipakai untuk klaim jarak presisi / lock outlet otomatis.
const CITY_CENTROIDS: { cityId: string; lat: number; lon: number }[] = [
	{ cityId: 'samarinda', lat: -0.5021, lon: 117.1536 },
	{ cityId: 'berau', lat: -2.1872, lon: 117.3703 },
	{ cityId: 'balikpapan', lat: -1.2654, lon: 116.8312 }
];

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	return 2 * R * Math.asin(Math.sqrt(a));
}

// Koordinat kasar browser -> saran KOTA (bukan outlet). Di luar Kalimantan
// Timur (>500 km dari semua centroid) -> null, fallback manual.
export function nearestCityFromCoords(lat: number, lon: number): CityInfo | undefined {
	let best: { cityId: string; d: number } | undefined;
	for (const c of CITY_CENTROIDS) {
		const d = haversineKm(lat, lon, c.lat, c.lon);
		if (!best || d < best.d) best = { cityId: c.cityId, d };
	}
	if (!best || best.d > 500) return undefined;
	return getCity(best.cityId);
}
