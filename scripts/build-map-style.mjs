// Preserve OpenFreeMap geography, zoom hierarchy, glyphs, sprites and required credits.
import { mkdirSync, writeFileSync } from 'node:fs';

const response = await fetch('https://tiles.openfreemap.org/styles/positron');
if (!response.ok) throw new Error(`Map style download failed: ${response.status}`);
const style = await response.json();
style.name = 'Zatiaras Magenta';
style.sources.openmaptiles.attribution =
	'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> · <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> · <a href="https://github.com/openmaptiles/positron-gl-style" target="_blank">Positron</a>';
style.metadata = {
	...style.metadata,
	'zatiaras:source': 'https://tiles.openfreemap.org/styles/positron',
	'zatiaras:checked': '2026-10-16'
};
for (const layer of style.layers) {
	layer.paint ??= {};
	if (layer.type === 'background') layer.paint['background-color'] = '#fde8f0';
	if (layer.type === 'fill') {
		layer.paint['fill-color'] =
			layer['source-layer'] === 'water'
				? '#f6b3d0'
				: layer['source-layer'] === 'building'
					? '#fbd2e2'
					: /park|landcover/.test(layer['source-layer'])
						? '#d6e8aa'
						: '#ffd5e7';
		if (layer.paint['fill-outline-color']) layer.paint['fill-outline-color'] = '#ffa9cc';
		if (layer.id === 'building') {
			layer.minzoom = 15;
			layer.paint['fill-opacity'] = ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 0.45, 18, 0.8];
		}
	}
	if (layer.type === 'line') {
		layer.paint['line-color'] =
			layer['source-layer'] === 'waterway'
				? '#f98ab8'
				: layer['source-layer'] === 'boundary'
					? '#be88a2'
					: /casing|railway/.test(layer.id)
						? '#f98ab8'
						: '#fff5fa';
		// Street hierarchy, rather than one undifferentiated road palette.
		if (layer.id === 'highway_major_casing') {
			layer.paint['line-color'] = '#fde8f0';
			layer.paint['line-width'] = [
				'interpolate',
				['linear'],
				['zoom'],
				11,
				3,
				13,
				5,
				15,
				8,
				18,
				22
			];
		}
		if (layer.id === 'highway_major_inner') {
			layer.paint['line-color'] = '#ff2e93';
			layer.paint['line-width'] = [
				'interpolate',
				['linear'],
				['zoom'],
				11,
				1,
				13,
				2,
				15,
				4,
				18,
				12
			];
		}
		if (layer.id === 'highway_minor') {
			layer.paint['line-opacity'] = ['interpolate', ['linear'], ['zoom'], 11, 0.3, 15, 0.75];
			layer.paint['line-color'] = '#f7bcd6';
			layer.paint['line-width'] = [
				'interpolate',
				['linear'],
				['zoom'],
				12,
				0.7,
				14,
				1.5,
				16,
				3.8,
				18,
				9
			];
		}
		if (layer.id === 'highway_path') {
			layer.minzoom = 15.5;
			layer.paint['line-color'] = '#f7bcd6';
			layer.paint['line-width'] = ['interpolate', ['linear'], ['zoom'], 15, 0.6, 18, 2];
			layer.paint['line-dasharray'] = [2, 3];
		}
		if (layer.id === 'boundary_3') layer.layout = { ...layer.layout, visibility: 'none' };
	}
	if (layer.type === 'symbol') {
		layer.paint['text-color'] = layer['source-layer'] === 'place' ? '#654052' : '#704658';
		layer.paint['text-halo-color'] = '#fcecf4';
		if (/shield|airport/.test(layer.id)) layer.layout = { ...layer.layout, visibility: 'none' };
		if (layer.id === 'highway-name-major') {
			layer.layout['text-font'] = ['Noto Sans Bold'];
			layer.layout['text-size'] = ['interpolate', ['linear'], ['zoom'], 12, 10, 15, 12, 18, 14];
			layer.layout['symbol-spacing'] = 450;
			layer.paint['text-color'] = '#522237';
			layer.paint['text-halo-width'] = 2;
		}
		if (layer.id === 'highway-name-minor' || layer.id === 'highway-name-path') {
			layer.minzoom = 16;
			layer.layout['text-size'] = ['interpolate', ['linear'], ['zoom'], 16, 10, 18, 12];
			layer.layout['symbol-spacing'] = 600;
		}
		if (layer.id === 'label_other') {
			layer.minzoom = 13;
			layer.layout['text-font'] = ['Noto Sans Regular'];
			layer.layout['text-size'] = ['interpolate', ['linear'], ['zoom'], 13, 10, 17, 12];
			layer.layout['text-letter-spacing'] = 0.08;
			layer.layout['text-padding'] = 28;
		}
		if (layer.id === 'label_village') layer.minzoom = 14;
		if (layer['source-layer'] === 'water_name' || layer['source-layer'] === 'waterway') {
			layer.paint['text-color'] = '#663c50';
			layer.layout['text-letter-spacing'] = 0.06;
		}
	}
}
mkdirSync('static/maps', { recursive: true });
writeFileSync('static/maps/zatiaras.json', JSON.stringify(style));
