import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
	const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
	await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
	const H = () => page.evaluate(() => {
		const out = [];
		for (const el of document.querySelectorAll('body *')) {
			const ff = getComputedStyle(el).fontFamily;
			const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
			if (hasText && /Helvetica/.test(ff)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} :: ${ff.slice(0, 70)} :: "${[...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join(' ').slice(0, 40)}"`);
		}
		return out;
	});
	const H0 = await H();
	console.log('top:', H0.length); H0.slice(0, 8).forEach((x) => console.log(' ', x));
	const total = await page.evaluate(() => document.documentElement.scrollHeight);
	for (let y = 0; y < total; y += 600) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
	await page.waitForTimeout(800);
	const H1 = await H();
	console.log('after scroll:', H1.length); H1.slice(0, 12).forEach((x) => console.log(' ', x));
} finally { await browser.close(); }
