// Capture the shared navigation states across desktop/mobile.
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5199';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scratch', 'shots');
const EXE =
	'C:\\Users\\ASUS\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const browser = await chromium.launch({ executablePath: EXE });

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
await desktop.evaluate(() => window.scrollTo({ top: 700, behavior: 'instant' }));
await desktop.waitForTimeout(450);
await desktop.screenshot({ path: path.join(OUT, 'home-navbar-scrolled.png') });
await desktop.close();

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
await mobile.getByRole('button', { name: 'Buka menu navigasi' }).click();
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: path.join(OUT, 'mobile-menu-drawer.png') });
await mobile.close();

await browser.close();
console.log('Captured scrolled desktop header + mobile drawer.');
