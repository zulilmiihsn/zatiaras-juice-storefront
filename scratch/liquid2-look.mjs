// Screenshots of /qa/liquid2 across scroll progress, plus render mode and frame pacing.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const out = process.env.OUT_DIR || 'scratch/liquid2-review';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
const steps = (process.env.STEPS || '0,0.2,0.35,0.5,0.7').split(',').map(Number);
try {
for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
	const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 768 });
	page.on('console', (m) => /liquid2|error/i.test(m.text()) && console.log('console', m.text()));
	await page.addInitScript((d) => (window.__dur = d), Number(process.env.DUR || 1500));
	await page.goto('http://127.0.0.1:5199/qa/liquid2', { waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-liquid-mode="live"]', { timeout: 45000 });
	await page.waitForTimeout(2000);
	let from = 0;
	for (const p of steps) {
		if (process.env.MOTION) {
			// Scroll toward p over 1.5 s and shoot while still moving.
			await page.evaluate((b) => {
				const t = document.querySelector('[data-liquid-track]');
				const travel = t.offsetHeight - innerHeight;
				const a = (scrollY - t.offsetTop) / travel;
				const start = performance.now();
				window.__scroll = setInterval(() => {
					const k = Math.min(1, (performance.now() - start) / Number(window.__dur || 1500));
					scrollTo({ top: t.offsetTop + travel * (a + (b - a) * k), behavior: 'instant' });
				}, 16);
			}, p);
			await page.waitForTimeout(Number(process.env.SHOT_AT || 1100));
		} else {
			await page.evaluate((p) => {
				const t = document.querySelector('[data-liquid-track]');
				scrollTo({ top: t.offsetTop + (t.offsetHeight - innerHeight) * p, behavior: 'instant' });
			}, p);
			await page.waitForTimeout(Number(process.env.WAIT || 2500));
		}
		from = p;
		const captured = await page.evaluate(async () => {
			await new Promise(requestAnimationFrame);
			clearInterval(window.__scroll);
			const d = window.liquid2Debug;
			return {
				png: document.querySelector('canvas').toDataURL('image/png'),
				mode: document.querySelector('[data-liquid-mode]').dataset.liquidMode,
				progress: (scrollY - document.querySelector('[data-liquid-track]').offsetTop) / (document.querySelector('[data-liquid-track]').offsetHeight - innerHeight),
				time: d?.time?.toFixed(2),
				particles: d?.particleCount,
				visible: d?.visibleCount,
				height: d?.runUpHeight?.toFixed(2),
				level: d?.level?.toFixed(2),
				spray: d?.spray,
				drive: d?.drive?.toFixed(2)
			};
		});
		const { png, ...info } = captured;
		console.log(name, p, JSON.stringify(info));
		writeFileSync(`${out}/${name}-frame-${p}.png`, Buffer.from(png.split(',')[1], 'base64'));
		await page.screenshot({ path: `${out}/${name}-${process.env.MOTION ? 'moving-' : ''}${p}.png` });
		if (process.env.MOTION) await page.waitForTimeout(500);
	}
	await page.close();
}
} finally {
await browser.close();
}
