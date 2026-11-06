import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-swiftshader'] });
for (const [width,height] of [[1440,900],[390,844],[320,568]]) {
 const page = await browser.newPage({ viewport: {width,height}, reducedMotion:'reduce' });
 page.on('pageerror',e=>console.log(e.message));
 await page.goto('http://127.0.0.1:5199', {waitUntil:'networkidle',timeout:60000});
 await page.locator('#temukan-zatiaras').evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.locator('[data-map-state="ready"]').waitFor({timeout:40000});
 await page.waitForTimeout(2200);
 await page.screenshot({path:`scratch/outlet-review/dock-${width}.png`});
 console.log(width,await page.locator('#temukan-zatiaras').evaluate(el=>({height:el.getBoundingClientRect().height, dock:el.querySelector('.finder-dock').getBoundingClientRect().toJSON(), marker:el.querySelector('.z-outlet-marker')?.getBoundingClientRect().toJSON(), detail:getComputedStyle(el.querySelector('.detail-address')).display})));
 await page.close();
}
await browser.close();
