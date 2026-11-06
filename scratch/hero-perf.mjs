// Scroll the hero at a steady speed and report main-thread cost per frame.
import { chromium } from 'playwright-core';

const url = process.env.URL || 'http://localhost:5199/';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist']
});
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
	const logs = [];
	page.on('console', (m) => /scrub|codec|decode/i.test(m.text()) && logs.push(m.text()));
	await page.goto(url, { waitUntil: 'load' });
	await page.waitForTimeout(6000); // let the 58 MB video fetch + first frames decode
	const mode = await page.evaluate(() => {
		const c = document.querySelector('.hero-stage canvas');
		return { canvasOpacity: c && getComputedStyle(c).opacity, hasVD: typeof VideoDecoder !== 'undefined' };
	});
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Performance.enable');
	const metric = async () =>
		Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
	await page.evaluate(() => {
		window.__f = [];
		let last = performance.now();
		const tick = (t) => {
			window.__f.push(t - last);
			last = t;
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
	const before = await metric();
	const total = await page.evaluate(() => document.querySelector('.hero-scrub').offsetHeight);
	const steps = 120;
	for (let i = 1; i <= steps; i++) {
		await page.mouse.wheel(0, (total * 0.8) / steps);
		await page.waitForTimeout(16);
	}
	await page.waitForTimeout(500);
	const after = await metric();
	const frames = await page.evaluate(() => window.__f.slice(1));
	frames.sort((a, b) => a - b);
	const q = (p) => frames[Math.min(frames.length - 1, Math.floor(frames.length * p))].toFixed(1);
	const d = (k) => (((after[k] - before[k]) * 1000) / steps).toFixed(2);
	console.log({ mode, frames: frames.length, p50: q(0.5), p95: q(0.95), max: q(1) });
	console.log('ms per scroll step:', {
		task: d('TaskDuration'),
		script: d('ScriptDuration'),
		style: d('RecalcStyleDuration'),
		layout: d('LayoutDuration')
	});
	console.log(logs.slice(0, 5));
} finally {
	await browser.close();
}
