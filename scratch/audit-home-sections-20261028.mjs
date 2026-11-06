import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';

const base = 'scratch/home-layout/audit-20261028-current';
const rows = JSON.parse(readFileSync(`${base}/geometry.json`, 'utf8'));
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
try {
	const page = await browser.newPage();
	for (const name of ['390x844-no-preference-js']) {
		const row = rows.find((item) => item.name === name);
		const source = readFileSync(`${base}/${name}-full.png`).toString('base64');
		for (const [index, section] of row.sections.entries()) {
			const data = await page.evaluate(async ({ source, section }) => {
				const img = new Image();
				img.src = `data:image/png;base64,${source}`;
				await img.decode();
				const canvas = document.createElement('canvas');
				canvas.width = img.width;
				canvas.height = section.height;
				canvas.getContext('2d').drawImage(img, 0, -section.top);
				return canvas.toDataURL().split(',')[1];
			}, { source, section });
			writeFileSync(`${base}/${name}-section-${index + 1}.png`, Buffer.from(data, 'base64'));
			console.log(`${name} section ${index + 1}: ${section.title} ${section.height}px`);
		}
	}
} finally {
	await browser.close();
}
