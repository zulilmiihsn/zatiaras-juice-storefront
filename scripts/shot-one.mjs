// Single-shot helper: node scripts/shot-one.mjs <route> <out.png> <WxH>
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scratch', 'shots');
const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const [route, name, size] = process.argv.slice(2);
const [w, h] = (size ?? '1440x900').split('x').map(Number);

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: w, height: h } });
await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, name), fullPage: false });
console.log('shot:', name);
await browser.close();
