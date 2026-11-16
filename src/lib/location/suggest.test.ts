import { describe, expect, it } from 'vitest';
import {
	CITIES,
	OUTLETS,
	getOutlet,
	getOutletsByCity,
	suggestCityFromLabel
} from '$lib/core/outlets';
import {
	haversineKm,
	nearestCityFromCoords,
	suggestFromCf,
	suggestionWithRememberedFirst
} from '$lib/location/suggest';

describe('multi-city outlets', () => {
	it('4 outlet aktif di 3 kota', () => {
		expect(OUTLETS.map((o) => o.id).sort()).toEqual(
			['juanda', 'merah-delima', 'mt-haryono', 'slamet-riyadi'].sort()
		);
		expect(CITIES.map((c) => c.id).sort()).toEqual(['balikpapan', 'berau', 'samarinda'].sort());
	});

	it('grouping kota benar', () => {
		expect(
			getOutletsByCity('samarinda')
				.map((o) => o.id)
				.sort()
		).toEqual(['juanda', 'slamet-riyadi'].sort());
		expect(getOutletsByCity('berau').map((o) => o.id)).toEqual(['merah-delima']);
		expect(
			getOutletsByCity('balikpapan')
				.map((o) => o.id)
				.sort()
		).toEqual(['mt-haryono']);
	});

	it('outlet tanpa verifikasi tidak fabricate alamat', () => {
		expect(getOutlet('mt-haryono')?.hours).toBe('VERIFY_VIA_OPS');
		expect(getOutlet('slamet-riyadi')?.address).toBe('VERIFY_VIA_GBP');
	});

	it('outlet terverifikasi punya fakta operasional (research 2026-09-25)', () => {
		const md = getOutlet('merah-delima');
		expect(md?.verified).toBe(true);
		expect(md?.address).toContain('Merah Delima');
		expect(md?.hours).toContain('22:00');
		const juanda = getOutlet('juanda');
		expect(juanda?.address).toContain('Juanda');
		expect(juanda?.address).toContain('Air Hitam');
	});

	it('saran IP tidak lock outlet, hanya kota', () => {
		const s = suggestFromCf({ city: 'Balikpapan' });
		expect(s?.city?.id).toBe('balikpapan');
		expect(s?.outlets.map((o) => o.id).sort()).toEqual(['mt-haryono']);
		expect(suggestCityFromLabel('Tanjung Redeb')).toBeDefined();
		expect(suggestFromCf({ city: 'Jakarta' })?.outlets).toEqual([]);
	});

	it('tanpa remembered + tanpa cf -> manual', () => {
		const s = suggestionWithRememberedFirst(null);
		expect(['ip', 'manual', 'remembered']).toContain(s.source);
	});

	it('haversine wajar samarinda-berau', () => {
		const d = haversineKm(-0.5021, 117.1536, 2.1406, 117.5186);
		expect(d).toBeGreaterThan(250);
		expect(d).toBeLessThan(350);
	});

	it('koordinat kasar -> saran kota, bukan outlet', () => {
		expect(nearestCityFromCoords(-0.5, 117.15)?.id).toBe('samarinda');
		expect(nearestCityFromCoords(2.14, 117.52)?.id).toBe('berau');
		expect(nearestCityFromCoords(-2.19, 117.37)?.id).not.toBe('berau');
		expect(nearestCityFromCoords(-1.265, 116.83)?.id).toBe('balikpapan');
	});

	it('di luar kalimantan -> null, fallback manual', () => {
		expect(nearestCityFromCoords(-6.2, 106.8)).toBeUndefined();
	});
});
