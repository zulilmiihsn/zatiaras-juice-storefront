import type { Outlet } from '$lib/core/contracts';
import { CITY_CENTROIDS } from './suggest';

/** City overview only: never use a centroid as an outlet marker or distance claim. */
export function cityMapView(
	cityId: string
): { center: [number, number]; zoom: number } | undefined {
	const city = CITY_CENTROIDS.find((item) => item.cityId === cityId);
	return city ? { center: [city.lon, city.lat], zoom: 11 } : undefined;
}

/** Coordinate verification is separate from the legacy outlet.verified flag. */
export function outletMapPoint(outlet: Outlet): [number, number] | null {
	const point = outlet.coordinates;
	if (
		!point?.verified ||
		!point.source.trim() ||
		!point.verifiedAt ||
		!Number.isFinite(point.latitude) ||
		!Number.isFinite(point.longitude) ||
		Math.abs(point.latitude) > 90 ||
		Math.abs(point.longitude) > 180
	)
		return null;
	return [point.longitude, point.latitude];
}
