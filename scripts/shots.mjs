// QA screenshot helper (pnpm shots). Uses preinstalled Playwright chromium.
// Usage: pnpm dev --port 5199  (one shell)  +  node scripts/shots.mjs  (another)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scratch', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const PAGES = [
	['home-desktop', '/', { width: 1440, height: 900 }, null],
	['locations-desktop', '/locations', { width: 1440, height: 900 }, null],
	['menu-desktop', '/menu', { width: 1440, height: 900 }, null],
	['berau-desktop', '/berau/merah-delima', { width: 1440, height: 900 }, null],
	['home-mobile', '/', { width: 390, height: 844 }, 'iPhone-ish'],
	['locations-mobile', '/locations', { width: 390, height: 844 }, 'iPhone-ish']
];

const browser = await chromium.launch({ executablePath: EXE });
for (const [name, route, viewport] of PAGES) {
	const page = await browser.newPage({ viewport });
	await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 });
	await page.waitForTimeout(1200);
	await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
	console.log('shot:', name);
	await page.close();
}
await browser.close();
console.log('done ->', OUT);
