import { chromium } from 'playwright-core';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
for (const width of [1440, 1920, 1024]) {
	const page = await browser.newPage({ viewport: { width, height: 900 } });
	await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
	await page.locator('#pickup-title').scrollIntoViewIfNeeded();
	const res = await page.evaluate(() => {
		const h = document.querySelector('#pickup-title');
		const col = document.querySelector('.pickup-intro').clientWidth;
		const out = { col };
		for (const fs of ['4.75rem', '4.25rem', '3.75rem', '3.5rem']) {
			h.style.fontSize = fs;
			const acc = h.querySelector(".pickup-title-accent"); acc.style.whiteSpace = "nowrap"; acc.style.display = "inline-block";
			const lines = Math.round(acc.getBoundingClientRect().height);
			out[fs] = { textWidth: Math.round(acc.scrollWidth), height: lines }; acc.style.whiteSpace = ""; acc.style.display = "";
		}
		h.style.fontSize = '';
		return out;
	});
	console.log(width, JSON.stringify(res));
	await page.close();
}
await browser.close();
