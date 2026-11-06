import { describe, expect, it } from 'vitest';
import { OUTLETS } from '$lib/core/outlets';
import { cityMapView, outletMapPoint } from './map';

describe('public outlet map truth', () => {
	it('centres Berau on the published Tanjung Redeb area north of the equator', () => {
		expect(cityMapView('berau')?.center).toEqual([117.5186, 2.1406]);
	});
	it('centres Balikpapan on the OSM city feature rather than the coastal reference', () => {
		expect(cityMapView('balikpapan')?.center).toEqual([116.8593379, -1.2398711]);
	});
	it('never converts outlet verification or city centroids into branch pins', () => {
		const outlet = { ...OUTLETS[0], coordinates: undefined, verified: true };
		expect(outletMapPoint(outlet)).toBeNull();
		expect(cityMapView('unknown')).toBeUndefined();
		expect(OUTLETS.filter((item) => outletMapPoint(item))).toHaveLength(1);
	});
	it('requires verified coordinates with provenance and valid bounds', () => {
		const outlet = OUTLETS[0];
		const coordinates = outlet.coordinates!;
		expect(outletMapPoint(outlet)).toEqual([117.137484375, -0.4762375]);
		for (const patch of [
			{ verified: false },
			{ source: '' },
			{ verifiedAt: '' },
			{ latitude: NaN },
			{ latitude: 91 },
			{ longitude: Infinity },
			{ longitude: 181 }
		]) {
			expect(outletMapPoint({ ...outlet, coordinates: { ...coordinates, ...patch } })).toBeNull();
		}
	});
});
