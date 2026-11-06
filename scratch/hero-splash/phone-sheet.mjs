// Side-by-side of shot-<tag>-phone-* files.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [tag, list] = process.argv.slice(2);
const names = list.split(',');
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const page = await browser.newPage();
const shots = names.map((n) => fs.readFileSync(`scratch/hero-splash/shot-${tag}-phone-${n}.png`).toString('base64'));
const out = await page.evaluate(async (shots) => {
	const c = document.createElement('canvas'); const w = 390, h = 844;
	c.width = w * shots.length; c.height = h; const x = c.getContext('2d');
	for (let i = 0; i < shots.length; i++) {
		const img = new Image(); img.src = 'data:image/png;base64,' + shots[i]; await img.decode();
		x.drawImage(img, i * w, 0, w, h);
	}
	return c.toDataURL('image/jpeg', 0.8);
}, shots);
fs.writeFileSync(`scratch/hero-splash/phone-${tag}.jpg`, Buffer.from(out.split(',')[1], 'base64'));
await browser.close();
