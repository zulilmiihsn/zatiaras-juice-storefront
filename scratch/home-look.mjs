// Ad-hoc: look at the current homepage rendering (desktop + mobile sections).
// Usage: node scratch/home-look.mjs   (dev server must run on :5199)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const OUT = path.join('scratch', 'shots', 'home-look');
fs.mkdirSync(OUT, { recursive: true });

const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

// Wait for the dev server.
const deadline = Date.now() + 90_000;
for (;;) {
	try {
		const res = await fetch(BASE);
		if (res.ok) break;
	} catch {
		/* retry */
	}
	if (Date.now() > deadline) throw new Error(`dev server not ready: ${BASE}`);
	await new Promise((r) => setTimeout(r, 1000));
}

const browser = await chromium.launch({ executablePath: EXE });

async function shots(name, viewport, steps) {
	const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
	await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
	await page.waitForTimeout(1000);
	for (const [label, fn] of steps) {
		await fn(page);
		await page.waitForTimeout(700);
		await page.screenshot({ path: path.join(OUT, `${name}-${label}.png`) });
		console.log('shot:', `${name}-${label}`);
	}
	const height = await page.evaluate(() => document.documentElement.scrollHeight);
	console.log(name, 'page height px:', height);
	await page.close();
}

const scrollTo = (selector) => async (page) => {
	await page.evaluate((sel) => {
		const el = document.querySelector(sel);
		if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64 });
	}, selector);
	await page.waitForTimeout(400);
};

await shots('desktop', { width: 1440, height: 900 }, [
	['01-hero', async () => {}],
	['02-assortment', scrollTo('#jus-apa-aja')],
	['03-andalan', scrollTo('#menu-andalan')],
	['04-pickup', scrollTo('section[aria-labelledby="pickup-title"]')],
	['05-finder', scrollTo('#temukan-zatiaras')],
	['06-group', scrollTo('section[aria-label="Pesan rame-rame"]')],
	['07-proof', scrollTo('section[aria-label="Bukti produk"]')],
	['08-closing', scrollTo('section[aria-label="Pesan sekarang"]')],
	['09-footer', scrollTo('#footer-public')]
]);

await shots('mobile', { width: 390, height: 844 }, [
	['01-hero', async () => {}],
	['02-assortment', scrollTo('#jus-apa-aja')],
	['03-andalan', scrollTo('#menu-andalan')],
	['05-finder', scrollTo('#temukan-zatiaras')],
	['06-group', scrollTo('section[aria-label="Pesan rame-rame"]')],
	['08-closing', scrollTo('section[aria-label="Pesan sekarang"]')]
]);

await browser.close();
console.log('done ->', OUT);
