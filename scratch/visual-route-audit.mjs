import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5199';
const OUTPUT = 'D:/Projects/zatiarasjuice/scratch/route-audit';
const CHROME =
	'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const ROUTES = [
	'/',
	'/menu',
	'/menu/jus-alpukat',
	'/locations',
	'/samarinda',
	'/samarinda/juanda',
	'/samarinda/slamet-riyadi',
	'/berau',
	'/berau/merah-delima',
	'/balikpapan',
	'/balikpapan/kutilang',
	'/balikpapan/gatot-subroto',
	'/cart',
	'/checkout',
	'/track',
	'/feedback',
	'/about',
	'/group',
	'/group/g-demo',
	'/order/o-demo',
	'/outlet',
	'/analytics',
	'/qa'
];
const WIDTHS = [320, 360, 375, 390, 768, 1024, 1280, 1440];

fs.mkdirSync(OUTPUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const failures = [];

for (const route of ROUTES) {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const response = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForTimeout(250);
	const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '--').replaceAll('[', '').replaceAll(']', '');
	for (const width of WIDTHS) {
		await page.setViewportSize({ width, height: 900 });
		await page.waitForTimeout(30);
		const dimensions = await page.evaluate(() => ({
			viewport: window.innerWidth,
			document: document.documentElement.scrollWidth,
			body: document.body.scrollWidth
		}));
		if (dimensions.document > dimensions.viewport || dimensions.body > dimensions.viewport) {
			failures.push({ route, width, ...dimensions, reason: 'horizontal-overflow' });
		}
	}
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.screenshot({ path: path.join(OUTPUT, `${slug}-desktop.png`), fullPage: true });
	await page.setViewportSize({ width: 320, height: 800 });
	await page.screenshot({ path: path.join(OUTPUT, `${slug}-320.png`), fullPage: true });
	if (errors.length) failures.push({ route, reason: 'page-error', errors });
	console.log(`${response?.status() ?? 'n/a'} ${route}`);
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(300);
const homeTopCta = await page.locator('aside[aria-label="Aksi pesan mobile"]').count();
await page.evaluate(() => window.scrollTo({ top: 720, behavior: 'instant' }));
await page.waitForTimeout(600);
const homeScrollCta = await page.locator('aside[aria-label="Aksi pesan mobile"]').count();
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
await page.waitForTimeout(1200);
const homeFooterCta = await page.locator('aside[aria-label="Aksi pesan mobile"]').count();
if (homeTopCta !== 0 || homeScrollCta !== 1 || homeFooterCta !== 0) {
	failures.push({ reason: 'home-contextual-cta', homeTopCta, homeScrollCta, homeFooterCta });
}

await page.goto(`${BASE}/outlet`, { waitUntil: 'domcontentloaded', timeout: 30000 });
const staffCta = await page.locator('aside[aria-label="Aksi pesan mobile"]').count();
const staffFooter = await page.locator('footer').count();
if (staffCta !== 0 || staffFooter !== 0) failures.push({ route: '/outlet', reason: 'staff-shell-leak', staffCta, staffFooter });

await browser.close();
fs.writeFileSync(path.join(OUTPUT, 'issues.json'), JSON.stringify(failures, null, 2));
console.log(`audit issues: ${failures.length}; screenshots: ${OUTPUT}`);
