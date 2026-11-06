// Contact sheet of the shot-v-desk-* files.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const names = (process.argv[3] ?? '0,0.06,0.14,0.24,0.36').split(',');
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const page = await browser.newPage();
const shots = names.map((n) => fs.readFileSync(`scratch/hero-splash/shot-${process.argv[2]}-desk-${n}.png`).toString('base64'));
const out = await page.evaluate(async (shots) => {
	const c = document.createElement('canvas'); const w = 720, h = 450;
	c.width = w * 3; c.height = h * 2; const x = c.getContext('2d');
	for (let i = 0; i < shots.length; i++) {
		const img = new Image(); img.src = 'data:image/png;base64,' + shots[i]; await img.decode();
		x.drawImage(img, (i % 3) * w, Math.floor(i / 3) * h, w, h);
	}
	return c.toDataURL('image/jpeg', 0.8);
}, shots);
fs.writeFileSync(`scratch/hero-splash/sheet-${process.argv[2]}.jpg`, Buffer.from(out.split(',')[1], 'base64'));
await browser.close();
