// node scratch/shot-fit.mjs — viewport screenshot (bukan fullPage) saat section terlaris menempel di bawah header
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
for (const [w, h] of [[1908, 827], [1366, 768], [1440, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  await p.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle', timeout: 90000 });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => scrollTo({ top: document.querySelector('#terlaris').getBoundingClientRect().top + scrollY - 72, behavior: 'instant' }));
  await p.waitForTimeout(700);
  const m = await p.evaluate(() => { const r = document.querySelector('#terlaris').getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), vh: innerHeight }; });
  console.log(w, h, JSON.stringify(m));
  await p.screenshot({ path: `scratch/best-review/fit-${w}x${h}.png` });
  await p.close();
}
await b.close();
