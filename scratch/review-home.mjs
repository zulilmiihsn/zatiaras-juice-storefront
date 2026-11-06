import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

mkdirSync('scratch/home-review', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `scratch/home-review/${name}-hero.png` });
    await page.screenshot({ path: `scratch/home-review/${name}-full.png`, fullPage: true });
    console.log(JSON.stringify({name, errors, ...await page.evaluate(() => ({
      headings: [...document.querySelectorAll('h1,h2')].map(x => x.textContent.trim()),
      viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      video: (() => { const v = document.querySelector('video'); return v ? { paused: v.paused, readyState: v.readyState, width: v.videoWidth } : null; })()
    })) }));
    await page.close();
  }
} finally { await browser.close(); }
