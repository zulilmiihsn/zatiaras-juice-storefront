import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
mkdirSync('output/visualizations/map-options', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('z-last-outlet', 'juanda'));
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.locator('#temukan-zatiaras').scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: '.finder-layout{display:block!important}.outlet-sidebar{display:none!important}.map-panel{width:100%!important;height:640px!important}.outlet-map{height:640px!important;min-height:640px!important;border-radius:0!important}.map-caption,.map-actions,.map-note,.maplibregl-control-container,.z-outlet-marker{visibility:hidden!important}.maplibregl-ctrl{display:none!important}' });
  await page.locator('[data-map-state="ready"]').waitFor({ timeout: 45000 });
  await page.locator('.map-dimensions button').nth(1).evaluate(node => node.click());
  for (const [name, id] of [['Samarinda','samarinda'],['Berau','berau'],['Balikpapan','balikpapan']]) {
    await page.getByRole('tab', { name, exact: true }).click();
    if (id === 'berau') {
      await page.locator('.map-overview').evaluate(node => node.click());
      await page.waitForTimeout(1000);
      await page.locator('.maplibregl-ctrl-zoom-in').evaluate(node => { node.click(); node.click(); });
    }
    await page.waitForTimeout(2200);
    await page.locator('.outlet-map').screenshot({ path: `output/visualizations/map-options/${id}.jpg`, type: 'jpeg', quality: 72 });
  }
} finally { await browser.close(); }
