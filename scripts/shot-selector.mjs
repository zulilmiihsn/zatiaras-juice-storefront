// Interaction shot: open outlet selector modal on /menu.
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scratch', 'shots');
const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const browser = await chromium.launch({ executablePath: EXE });
for (const [name, viewport] of [
	['outlet-selector.png', { width: 1440, height: 900 }],
	['outlet-selector-mobile.png', { width: 390, height: 844 }]
]) {
	const page = await browser.newPage({ viewport });
	await page.goto(BASE + '/menu?simcity=samarinda', {
		waitUntil: 'networkidle',
		timeout: 45000
	});
	await page.waitForTimeout(500);
	await page.getByRole('button', { name: /Ganti/ }).click();
	await page.waitForTimeout(400);
	await page.screenshot({ path: path.join(OUT, name), fullPage: false });
	console.log('shot:', name);
	await page.close();
}
await browser.close();
