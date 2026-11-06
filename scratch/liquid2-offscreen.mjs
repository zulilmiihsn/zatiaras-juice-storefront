// Why does the loop keep drawing after scrolling to the page bottom?
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
	window.draws = 0;
	const d = WebGL2RenderingContext.prototype.drawElements;
	WebGL2RenderingContext.prototype.drawElements = function (...a) { window.draws++; return d.apply(this, a); };
});
await page.goto('http://127.0.0.1:5199/qa/liquid2', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-liquid-mode="live"]');
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
for (let i = 0; i < 6; i++) {
	await page.waitForTimeout(500);
	console.log(await page.evaluate(() => {
		const r = document.querySelector('canvas').getBoundingClientRect();
		return JSON.stringify({ draws: window.draws, top: Math.round(r.top), bottom: Math.round(r.bottom), inner: innerHeight, level: window.liquid2Debug.level.toFixed(3), covered: window.liquid2Debug.covered, scrollY, max: document.documentElement.scrollHeight });
	}));
}
await browser.close();
