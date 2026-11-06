// Composite splash PNGs onto flat #00FF00 for image-to-video input; report alpha stats.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const EXE = 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
for (const name of ['splash-desktop', 'splash-mobile']) {
	const b64 = fs.readFileSync(`static/images/hero/${name}.png`).toString('base64');
	const out = await page.evaluate(async (src) => {
		const img = new Image();
		img.src = src;
		await img.decode();
		const c = document.createElement('canvas');
		c.width = img.width;
		c.height = img.height;
		const x = c.getContext('2d');
		x.drawImage(img, 0, 0);
		const d = x.getImageData(0, 0, c.width, c.height).data;
		let clear = 0, solid = 0, partial = 0;
		for (let i = 3; i < d.length; i += 4) d[i] === 0 ? clear++ : d[i] === 255 ? solid++ : partial++;
		const n = d.length / 4;
		x.globalCompositeOperation = 'destination-over';
		x.fillStyle = '#00FF00';
		x.fillRect(0, 0, c.width, c.height);
		return { clear: clear / n, solid: solid / n, partial: partial / n, png: c.toDataURL('image/png') };
	}, `data:image/png;base64,${b64}`);
	fs.writeFileSync(`scratch/hero-splash/${name}-green.png`, Buffer.from(out.png.split(',')[1], 'base64'));
	console.log(name, 'transparent', out.clear.toFixed(3), 'opaque', out.solid.toFixed(3), 'semi', out.partial.toFixed(3));
}
await browser.close();
