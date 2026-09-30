// Probe: inspect banner inputs on a fresh page.
import { chromium } from 'playwright-core';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
await page.goto(BASE + '/menu', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => ({
	url: location.href,
	local: { ...localStorage },
	sessionKeys: Object.keys(sessionStorage),
	banner: document.querySelector('[aria-label="Saran lokasi"]')?.textContent?.slice(0, 120) ?? null
}));
console.log(JSON.stringify(info, null, 2));
await browser.close();
