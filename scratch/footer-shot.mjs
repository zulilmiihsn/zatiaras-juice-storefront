import { chromium } from 'playwright-core';
const [,, out, w = '1440', h = '900', dy = '0'] = process.argv;
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || /liquid/.test(m.text())) errors.push(m.text()); });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate((dy) => { const r = document.querySelector('.footer-wave').getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * +dy); }, dy);
await page.waitForTimeout(+(process.env.WAIT || 2500));
const mode = await page.evaluate(() => document.querySelector('.footer-wave [data-liquid-mode]')?.getAttribute('data-liquid-mode'));
const box = await page.evaluate(() => { const r = document.querySelector('.footer-wave').getBoundingClientRect(); return [r.top, r.height]; });
const buf = await page.screenshot({ path: out });
const samples = await page.evaluate(async ({ b64, top, height }) => {
	const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
	const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
	const g = c.getContext('2d'); g.drawImage(img, 0, 0);
	const hex = (x, y) => { const d = g.getImageData(x, y, 1, 1).data; return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''); };
	const x = Math.round(img.width * 0.3), out = [];
	for (const f of [0.5, 0.6, 0.7, 0.8, 0.9, 0.97, 1.03, 1.1, 1.25]) { const y = Math.round(top + height * f); if (y < img.height) out.push(f + ':' + hex(x, y)); }
	return out.join(' ');
}, { b64: buf.toString('base64'), top: box[0], height: box[1] });
console.log(samples);
console.log(JSON.stringify({ mode, box, errors }));
await browser.close();
