import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-swiftshader'] });
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 768 });
    page.on('pageerror', e => console.log(e.message));
    page.on('console', m => { if(m.type() === 'warning') console.log(m.text()); });
    await page.goto((process.env.QA_BASE_URL || 'http://localhost:5174') + '/qa/liquid', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-liquid-mode="live"]');
    await page.evaluate(() => document.fonts.ready);
    for (const progress of [0, 0.32, 0.6]) {
      await page.evaluate(p => {
        const track = document.querySelector('[data-liquid-track]');
        window.scrollTo({ top: scrollY + track.getBoundingClientRect().top + (track.offsetHeight - innerHeight) * p, behavior: 'instant' });
      }, progress);
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `scratch/liquid-review/crest-${name}-${progress}.png` });
    }
    console.log(name, 'captured');
    await page.close();
  }
} finally { await browser.close(); }
