// Contact sheet: 8 frames, 0.4s apart, of the splash region (desktop + phone).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const tag = process.argv[2] ?? 'a';
for (const [name, viewport, clip] of [
	['desk', { width: 1440, height: 900 }, { x: 560, y: 120, width: 880, height: 780 }],
	['phone', { width: 390, height: 844 }, { x: 0, y: 300, width: 390, height: 544 }]
]) {
	const page = await browser.newPage({ viewport });
	await page.goto('http://127.0.0.1:5199/qa/liquid', { waitUntil: 'networkidle', timeout: 90000 });
	await page.waitForTimeout(3000);
	const shots = [];
	for (let i = 0; i < 8; i++) {
		shots.push((await page.screenshot({ clip })).toString('base64'));
		await page.waitForTimeout(400);
	}
	const sheet = await page.evaluate(async ({ shots, w, h }) => {
		const c = document.createElement('canvas');
		const s = 0.5;
		c.width = w * s * 4; c.height = h * s * 2;
		const x = c.getContext('2d');
		for (let i = 0; i < shots.length; i++) {
			const img = new Image(); img.src = 'data:image/png;base64,' + shots[i]; await img.decode();
			x.drawImage(img, (i % 4) * w * s, Math.floor(i / 4) * h * s, w * s, h * s);
		}
		return c.toDataURL('image/jpeg', 0.8);
	}, { shots, w: clip.width, h: clip.height });
	fs.writeFileSync(`scratch/hero-splash/strip-${tag}-${name}.jpg`, Buffer.from(sheet.split(',')[1], 'base64'));
	await page.close();
}
await browser.close();
