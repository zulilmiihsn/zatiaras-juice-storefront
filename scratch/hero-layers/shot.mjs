import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
for (const [name, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
	const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
	await page.goto('http://127.0.0.1:5199/', { waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);
	await page.screenshot({ path: `scratch/hero-layers/${name}.png` });
	if (name === 'desktop') {
		const box = await page.locator('h1.hl').boundingBox();
		await page.screenshot({ path: 'scratch/hero-layers/title.png', clip: { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 20), width: Math.min(1100, box.width + 80), height: box.height + 60 } });
	}
	await page.close();
}
await browser.close();
