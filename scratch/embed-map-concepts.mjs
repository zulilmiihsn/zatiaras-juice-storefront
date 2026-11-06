import { readFileSync, writeFileSync, statSync } from 'node:fs';
const file = 'output/visualizations/zatiaras-map-options.html';
let html = readFileSync(file, 'utf8');
html = html.replaceAll('src="__SAMARINDA__"', 'data-initial-map="samarinda"');
const assets = {
  '__SAMARINDA__': ['image/jpeg', 'output/visualizations/map-options/samarinda.jpg'],
  '__BERAU__': ['image/jpeg', 'output/visualizations/map-options/berau.jpg'],
  '__BALIKPAPAN__': ['image/jpeg', 'output/visualizations/map-options/balikpapan.jpg'],
  '__DISPLAY_FONT__': ['font/woff2', 'static/fonts/ZatiarasDisplayV1-ExtraBold-V1.2-RC4.woff2'],
  '__BODY_FONT__': ['font/woff2', 'node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2'],
  '__BOLD_FONT__': ['font/woff2', 'node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2'],
  '__ZMARK__': ['image/svg+xml', 'src/lib/assets/brand/ZJ_CUP_STANDALONE.svg']
};
for (const [token, [type, path]] of Object.entries(assets)) html = html.replaceAll(token, `data:${type};base64,${readFileSync(path).toString('base64')}`);
if (/__[A-Z_]+__/.test(html)) throw new Error('Unresolved asset');
writeFileSync(file, html);
const bytes = statSync(file).size;
if (bytes > 1_000_000) throw new Error(`Fragment too large: ${bytes}`);
console.log(`Fragment ${bytes} bytes; all assets embedded`);
