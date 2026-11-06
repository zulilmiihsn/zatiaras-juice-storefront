// node scratch/shot-best.mjs  — screenshots #terlaris at 3 widths into scratch/best-review/
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

mkdirSync('scratch/best-review', { recursive: true });
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
try {
	for (const [width, height] of [
		[1440, 900],
		[768, 1000],
		[390, 844]
	]) {
		const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
		const errors = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await page.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle', timeout: 90000 });
		await page.addStyleTag({ content: 'body > div > header, .site-header, header:not(.x){visibility:hidden!important} #terlaris header{visibility:visible!important}' });
		const section = page.locator('#terlaris');
		await section.scrollIntoViewIfNeeded();
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(800);
		await section.screenshot({ path: `scratch/best-review/best-${width}.png` });
		console.log(width, 'ok', errors.length ? errors : '');
		await page.close();
	}
} finally {
	await browser.close();
}
