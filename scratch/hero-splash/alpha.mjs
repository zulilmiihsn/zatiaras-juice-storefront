import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const page = await browser.newPage();
for (const name of ['splash-desktop', 'splash-mobile']) {
	const b64 = fs.readFileSync(`static/images/hero/${name}.png`).toString('base64');
	console.log(name, await page.evaluate(async (src) => {
		const img = new Image(); img.src = src; await img.decode();
		const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d');
		x.drawImage(img, 0, 0);
		const d = x.getImageData(0, 0, img.width, img.height).data;
		const h = new Array(9).fill(0); let max = 0;
		for (let i = 3; i < d.length; i += 4) { if (d[i]) h[Math.min(8, d[i] >> 5)]++; max = Math.max(max, d[i]); }
		return { max, buckets_of_32: h };
	}, `data:image/png;base64,${b64}`));
}
await browser.close();
