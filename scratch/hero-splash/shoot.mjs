// Screenshot /qa/liquid at several scroll points (desktop + phone).
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const tag = process.argv[2] ?? 'a';
for (const [name, viewport, points] of [
	['desk', { width: 1440, height: 900 }, [0, 0.06, 0.14, 0.24, 0.36]],
	['phone', { width: 390, height: 844 }, [0, 0.14, 0.3]]
]) {
	const page = await browser.newPage({ viewport });
	page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
	page.on('pageerror', (e) => console.log('pageerror:', e.message));
	await page.goto('http://127.0.0.1:5199/qa/liquid', { waitUntil: 'networkidle', timeout: 90000 });
	for (const p of points) {
		await page.evaluate((p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight * 2) * p), p);
		await page.waitForTimeout(p === 0 ? 3500 : 1200);
		await page.mouse.move(viewport.width * 0.66, viewport.height * 0.45);
		await page.screenshot({ path: `scratch/hero-splash/shot-${tag}-${name}-${p}.png` });
	}
	console.log(name, await page.evaluate(() => document.querySelector('canvas')?.width + 'x' + document.querySelector('canvas')?.height));
	await page.close();
}
await browser.close();
