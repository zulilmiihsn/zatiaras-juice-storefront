// Full-bleed captures around the finder section edges (top transition + bottom transition).
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 60000 });
const top = await page.evaluate(() => { const r = document.getElementById('temukan-zatiaras').getBoundingClientRect(); return [r.top + scrollY, r.bottom + scrollY]; });
await page.evaluate((y) => scrollTo({ top: y - 140, behavior: 'instant' }), top[0]);
await page.waitForTimeout(6000);
await page.screenshot({ path: 'scratch/shots/edge-top.png' });
await page.evaluate((y) => scrollTo({ top: y - 520, behavior: 'instant' }), top[1]);
await page.waitForTimeout(1500);
await page.screenshot({ path: 'scratch/shots/edge-bottom.png' });
await browser.close();
