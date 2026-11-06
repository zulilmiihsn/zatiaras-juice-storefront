import { chromium } from 'playwright-core';
const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5173';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 800]]) {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
	const h = page.locator('#pickup-title');
	await h.scrollIntoViewIfNeeded();
	await page.waitForTimeout(1500);
	const box = await page.locator('.pickup-intro').boundingBox();
	await page.screenshot({ path: `scratch/shots/pickup-${name}.png`, clip: { x: 0, y: Math.max(0, box.y - 40), width, height: Math.min(box.height + 120, height) } });
	await page.close();
}
await browser.close();
