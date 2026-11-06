// One hardware-GPU screenshot of /qa/liquid at the given scroll points.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
});
const tag = process.argv[2] ?? 'g';
const points = (process.argv[3] ?? '0,0.3').split(',').map(Number);
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.25 });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://127.0.0.1:5199/qa/liquid', { waitUntil: 'networkidle', timeout: 90000 });
console.log(await page.evaluate(() => {
	const gl = document.createElement('canvas').getContext('webgl2');
	const ext = gl?.getExtension('WEBGL_debug_renderer_info');
	return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no gl';
}));
for (const p of points) {
	await page.evaluate((p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight * 2) * p), p);
	await page.waitForTimeout(4000);
	const c = await page.evaluate(() => { const c = document.querySelector('canvas'); return c ? `${c.width}x${c.height}` : 'none'; });
	console.log(p, c);
	await page.screenshot({ path: `scratch/hero-splash/shot-${tag}-desk-${p}.png` });
}
await browser.close();
