// Screenshot the home outlet finder at desktop and mobile widths.
import { chromium } from 'playwright-core';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5173';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
for (const [name, width, height] of [
	['desktop', 1440, 820],
	['mobile', 390, 800],
	['wide', 1920, 1000]
]) {
	const page = await browser.newPage({ viewport: { width, height } });
	await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
	const finder = page.locator('#temukan-zatiaras');
	await finder.scrollIntoViewIfNeeded();
	await page.evaluate(() => {
		const el = document.getElementById('temukan-zatiaras');
		scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' });
	});
	if (process.env.CITY) await page.selectOption('#finder-city', process.env.CITY);
	await page.waitForTimeout(14000);
	await page.screenshot({ path: `scratch/shots/finder-${process.env.CITY ?? 'default'}-${name}.png` });
	await page.close();
}
await browser.close();
