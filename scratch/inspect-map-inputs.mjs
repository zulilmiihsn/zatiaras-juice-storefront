import { readFileSync } from 'node:fs';
const style = JSON.parse(readFileSync('scratch/openfreemap-positron.json', 'utf8'));
console.log(JSON.stringify({version: style.version, sources: style.sources, glyphs: style.glyphs, sprite: style.sprite, layers: style.layers.map(x => [x.id, x.type, x['source-layer']])}, null, 2));
