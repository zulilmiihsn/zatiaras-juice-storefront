import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const folder = process.env.LIQUID_OUT || 'scratch/liquid-review';
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
  args: ['--enable-unsafe-swiftshader']
});
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => console.log('PAGE ERROR', e.message));
    page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log(m.text()); });
    await page.goto('http://127.0.0.1:5199/qa/liquid', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('[data-liquid-mode="live"]', { timeout: 90000 });
    await page.waitForTimeout(1800);
    for (const p of [0, 0.45, 0.82, 1]) {
      await page.evaluate(p => {
        const el = document.querySelector('[data-liquid-track]');
        const top = el.getBoundingClientRect().top + scrollY;
        window.scrollTo(0, top + (el.offsetHeight - innerHeight) * p);
      }, p);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${folder}/${name}-${p}.png` });
    }
    console.log(name, await page.locator('canvas').evaluate(el => ({ width: el.width, height: el.height, visible: getComputedStyle(el).visibility })));
    await page.close();
  }
} finally {
  await browser.close();
}
