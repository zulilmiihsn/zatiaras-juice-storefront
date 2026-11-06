import { chromium } from 'playwright-core';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
try {
	for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
		const page = await browser.newPage({ viewport: vp });
		await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
		await page.waitForTimeout(2000);
		const { h, hh } = await page.evaluate(() => ({
			h: document.querySelector('.hero-scrub').offsetHeight,
			hh: document.querySelector('header').offsetHeight
		}));
		const endY = h - vp.height;
		for (const y of [0, 20, 200, endY - 300, endY - 100, endY, endY + 1200]) {
			await page.evaluate((yy) => window.scrollTo(0, yy), Math.max(0, Math.round(y)));
			await page.waitForTimeout(500);
			const bg = await page.evaluate(() => getComputedStyle(document.querySelector('header')).backgroundColor);
			const heroBottom = await page.evaluate(() => Math.round(document.querySelector('.hero-scrub').getBoundingClientRect().bottom));
			console.log(name, 'scrollY', Math.round(y), 'heroBottom', heroBottom, 'headerH', hh, 'bg', bg);
		}
		await page.close();
	}
} finally {
	await browser.close();
}
