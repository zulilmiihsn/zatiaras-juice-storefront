import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
	for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
		const page = await browser.newPage({ viewport: vp });
		await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
		await page.waitForTimeout(1500);
		const r = await page.evaluate((W) => {
			const out = [];
			for (const el of document.querySelectorAll('body *')) {
				const b = el.getBoundingClientRect();
				if (b.width === 0 || b.height === 0) continue;
				if (b.right > W - 2 || b.left < 2) {
					const cs = getComputedStyle(el);
					if (cs.position === 'fixed') continue;
					out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} L${Math.round(b.left)} R${Math.round(b.right)} W${Math.round(b.width)}`);
				}
			}
			return { n: out.length, sample: out.slice(0, 12), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
		}, vp.width);
		console.log(vp.width, JSON.stringify(r, null, 1));
		await page.close();
	}
} finally { await browser.close(); }
