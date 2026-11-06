import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('2D outlet map', () => {
	const style = JSON.parse(readFileSync('static/maps/zatiaras.json', 'utf8'));
	it('has no extrusions, facade patterns, or extra sprite dependency', () => {
		expect(style.layers.some((layer: { type: string }) => layer.type === 'fill-extrusion')).toBe(
			false
		);
		expect(typeof style.sprite).toBe('string');
		expect(JSON.stringify(style)).not.toContain('buildings:');
	});
	it('keeps provider geography and required attribution', () => {
		expect(style.sources.openmaptiles.url).toBe('https://tiles.openfreemap.org/planet');
		for (const name of ['OpenStreetMap', 'OpenMapTiles', 'Positron'])
			expect(style.sources.openmaptiles.attribution).toContain(name);
		expect(
			style.layers.some(
				(layer: { 'source-layer': string }) => layer['source-layer'] === 'transportation'
			)
		).toBe(true);
	});
});
