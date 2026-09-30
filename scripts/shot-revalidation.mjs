// Manual/browser QA shot for the one-outlet cart switch warning.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scratch', 'shots');
const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
	localStorage.setItem('z-cart-outlet', 'juanda');
	localStorage.setItem(
		'z-cart',
		JSON.stringify([
			{
				menuItemId: 'jus-alpukat',
				name: 'Jus Alpukat',
				price: 22000,
				qty: 2,
				outletId: 'juanda',
				availability: 'AVAILABLE'
			}
		])
	);
});
await page.goto(`${BASE}/menu`, { waitUntil: 'networkidle', timeout: 45000 });
await page.getByRole('button', { name: /Ganti/ }).click();
await page.getByRole('button', { name: 'Balikpapan', exact: true }).click();
await page.getByRole('button', { name: /Zatiaras Kutilang/ }).click();
await page.getByRole('dialog', { name: 'Periksa ulang pesananmu' }).waitFor();
await page.screenshot({ path: path.join(OUT, 'cart-revalidation-mobile.png'), fullPage: false });

const before = await page.evaluate(() => ({
	outlet: localStorage.getItem('z-cart-outlet'),
	lines: JSON.parse(localStorage.getItem('z-cart') ?? '[]').length
}));
if (before.outlet !== 'juanda' || before.lines !== 1) {
	throw new Error(`Outlet/cart changed before confirmation: ${JSON.stringify(before)}`);
}

await page.getByRole('button', { name: /Ganti ke Kutilang/ }).click();
const after = await page.evaluate(() => ({
	outlet: localStorage.getItem('z-cart-outlet'),
	lineOutlet: JSON.parse(localStorage.getItem('z-cart') ?? '[]')[0]?.outletId
}));
if (after.outlet !== 'kutilang' || after.lineOutlet !== 'kutilang') {
	throw new Error(`Outlet switch failed: ${JSON.stringify(after)}`);
}
console.log('cart switch preserves intent, prompts first, and changes outlet after confirmation');
await browser.close();
