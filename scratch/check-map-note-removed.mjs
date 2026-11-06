// Verify the removed map note (unverified-pin hint) is gone and the dock stays clean.
// Usage: node scratch/check-map-note-removed.mjs   (dev server on :5199)
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const OUT = 'scratch/shots/home-look';
fs.mkdirSync(OUT, { recursive: true });
const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const browser = await chromium.launch({ executablePath: EXE });
for (const [name, viewport] of [
	['desktop', { width: 1440, height: 900 }],
	['mobile', { width: 390, height: 844 }]
]) {
	const page = await browser.newPage({ viewport });
	await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
	await page.locator('#temukan-zatiaras').scrollIntoViewIfNeeded();
	await page.waitForTimeout(1500);
	await page.locator('#finder-city').selectOption('balikpapan');
	await page.waitForTimeout(1200);
	const outletSelect = page.locator('#finder-outlet');
	if (await outletSelect.isVisible()) await outletSelect.selectOption('kutilang');
	else await page.getByRole('radio', { name: 'Pilih outlet Kutilang' }).check();
	await page.waitForTimeout(1500);
	console.log(
		name,
		'map-note count:',
		await page.locator('.map-note').count(),
		'| address shown:',
		await page.locator('.outlet-card.active .selected-address').innerText()
	);
	await page
		.locator('#temukan-zatiaras')
		.screenshot({ path: `${OUT}/finder-no-note-${name}.png` });
	await page.close();
}
await browser.close();
console.log('done');
