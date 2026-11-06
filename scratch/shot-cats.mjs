// node scratch/shot-cats.mjs — screenshot #jus-apa-aja (viewport, bukan fullPage) + state panel
import { chromium } from 'playwright-core';
const b = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
async function open(w, h) {
	const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
	await p.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle', timeout: 90000 });
	await p.evaluate(() => document.fonts.ready);
	await p.evaluate(() =>
		scrollTo({
			top: document.querySelector('#jus-apa-aja').getBoundingClientRect().top + scrollY - 72,
			behavior: 'instant'
		})
	);
	await p.waitForTimeout(700);
	return p;
}
for (const [w, h] of [
	[1908, 827],
	[1366, 768]
]) {
	const p = await open(w, h);
	await p.screenshot({ path: `scratch/best-review/cats-${w}x${h}-0.png` });
	await p.locator('.cat-head').nth(3).click();
	await p.waitForTimeout(1100);
	await p.screenshot({ path: `scratch/best-review/cats-${w}x${h}-3.png` });
	await p.close();
}
const m = await b.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await m.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle', timeout: 90000 });
await m.addStyleTag({ content: 'body > div > header{visibility:hidden!important}' });
await m.locator('#jus-apa-aja').scrollIntoViewIfNeeded();
await m.waitForTimeout(600);
await m.locator('#jus-apa-aja').screenshot({ path: 'scratch/best-review/cats-390-0.png' });
await m.locator('.cat-head').nth(3).click();
await m.waitForTimeout(900);
await m.locator('#jus-apa-aja').screenshot({ path: 'scratch/best-review/cats-390-3.png' });
await b.close();
console.log('ok');
