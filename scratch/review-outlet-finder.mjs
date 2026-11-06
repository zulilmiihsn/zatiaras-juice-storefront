import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
mkdirSync('scratch/outlet-review', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-swiftshader'] });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', req => { if (/openfreemap|maps\/zatiaras|worker/.test(req.url())) errors.push(`${req.url()}: ${req.failure()?.errorText}`); });
    await page.goto('http://127.0.0.1:5199/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('#temukan-zatiaras').scrollIntoViewIfNeeded();
    if (width < 1024) await page.getByRole('button', { name: 'Lihat Peta', exact: true }).click();
    await page.locator('[data-map-state="ready"], [data-map-state="error"]').waitFor({ timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1300);
    console.log(JSON.stringify({ width, state: await page.locator('[data-map-state]').getAttribute('data-map-state'), errors, text: await page.locator('#temukan-zatiaras').innerText() }));
    await page.addStyleTag({ content: 'header { visibility: hidden !important; }' });
    await page.locator('#temukan-zatiaras').screenshot({ path: `scratch/outlet-review/${width}.png` });
    console.log('after screenshot', width, await page.locator('[data-map-state]').getAttribute('data-map-state'), await page.locator('.map-loading').count());
    await page.locator('.outlet-map').screenshot({ path: `scratch/outlet-review/${width}-map.png` });
    await page.close();
  }
} finally { await browser.close(); }
