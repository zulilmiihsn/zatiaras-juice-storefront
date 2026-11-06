import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
try {
	for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
		const page = await browser.newPage({ viewport: vp });
		const errors = [];
		page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
		page.on('pageerror', (e) => errors.push(String(e)));
		await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
		await page.waitForTimeout(2500);
		const track = await page.evaluate(() => {
			const s = document.querySelector('.hero-scrub');
			return { h: s.offsetHeight, vh: innerHeight };
		});
		console.log(name, JSON.stringify(track));
		const dist = track.h - track.vh;
		for (const p of [0, 0.25, 0.5, 0.75, 1]) {
			await page.evaluate((y) => window.scrollTo(0, y), Math.round(dist * p));
			await page.waitForTimeout(900);
			const info = await page.evaluate(() => ({
				p: document.querySelector('.hero-scrub').style.getPropertyValue('--p'),
					t: document.querySelector('.hero-scrub video')?.currentTime?.toFixed(2),
					dur: document.querySelector('.hero-scrub video')?.duration?.toFixed(2),
				inert: document.querySelector('.hero-copy').inert
			}));
			console.log(name, p, JSON.stringify(info));
			await page.screenshot({ path: `${out}/${name}-${String(p * 100)}.png` });
		}
		console.log(name, 'errors:', JSON.stringify(errors));
		await page.close();
	}
} finally {
	await browser.close();
}
