import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const page = await browser.newPage();
for (const name of ['splash-desktop', 'splash-mobile']) {
	const b64 = fs.readFileSync(`static/images/hero/${name}.png`).toString('base64');
	const url = await page.evaluate(async (src) => {
		const img = new Image(); img.src = src; await img.decode();
		const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
		c.getContext('2d').drawImage(img, 0, 0);
		return c.toDataURL('image/webp', 0.82);
	}, `data:image/png;base64,${b64}`);
	const out = `static/images/hero/${name}.webp`;
	fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
	console.log(out, fs.statSync(out).size >> 10, 'KB');
}
await browser.close();
