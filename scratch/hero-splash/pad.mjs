// 16:9 green canvas, splash scaled to 72% height, centred, clear of the bottom-right watermark corner.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const page = await browser.newPage();
const b64 = fs.readFileSync('static/images/hero/splash-desktop.png').toString('base64');
const png = await page.evaluate(async (src) => {
	const img = new Image(); img.src = src; await img.decode();
	const W = 1920, H = 1080, h = H * 0.72, w = img.width * (h / img.height);
	const c = document.createElement('canvas'); c.width = W; c.height = H;
	const x = c.getContext('2d');
	x.fillStyle = '#00FF00'; x.fillRect(0, 0, W, H);
	x.drawImage(img, (W - w) / 2, H * 0.17, w, h);
	return c.toDataURL('image/png');
}, `data:image/png;base64,${b64}`);
fs.writeFileSync('scratch/hero-splash/splash-desktop-green-16x9.png', Buffer.from(png.split(',')[1], 'base64'));
await browser.close();
