// Export the actual WebGL surface as transparent fallback art, including its no-particle silhouette.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

// QA_PATH selects the preview, STILL_DIR the output folder, STILL_PROGRESS an optional
// scroll position (0..1) to capture instead of the top of the track.
const route = process.env.QA_PATH || '/qa/liquid';
const dir = process.env.STILL_DIR || 'static/images/hero';
const progress =
	process.env.STILL_PROGRESS === undefined ? null : Number(process.env.STILL_PROGRESS);
const captures = [];

const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
try {
	for (const [name, width, height] of [
		['desktop', 1440, 900],
		['mobile', 390, 844]
	]) {
		const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 768 });
		await page.addInitScript(() => {
			const original = WebGL2RenderingContext.prototype.drawElements;
			WebGL2RenderingContext.prototype.drawElements = function (...args) {
				original.apply(this, args);
				if (window.captureLiquidStill && this.canvas.closest('[data-liquid-mode]')) {
					window.captureLiquidStill = false;
					// Capture after the complete water surface has been drawn, before the browser
					// clears the default drawing buffer to present this rendered frame.
					queueMicrotask(() => {
						window.liquidStill = this.canvas.toDataURL('image/png');
					});
				}
			};
		});
		await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4173') + route, {
			waitUntil: 'domcontentloaded'
		});
		await page.waitForSelector('[data-liquid-mode="live"]');
		if (route === '/qa/liquid2') await page.waitForFunction(() => window.liquid2Debug.time >= 0.3);
		if (progress !== null)
			await page.evaluate(
				async ({ progress, moving }) => {
					const track = document.querySelector('[data-liquid-track]');
					const travel = track.offsetHeight - innerHeight;
					const move = (p) => scrollTo({ top: track.offsetTop + travel * p, behavior: 'instant' });
					if (!moving) return move(progress);
					// The fallback shows the wrap while the liquid still has momentum, rather
					// than the flat pool left after waiting for the swirl to settle.
					// Give the impact film time to fold before freezing the still.
					const started = performance.now();
					await new Promise((resolve) => {
						const frame = (now) => {
							const t = Math.min(1, (now - started) / 2500);
							move(progress * t);
							if (t < 1) requestAnimationFrame(frame);
							else resolve();
						};
						requestAnimationFrame(frame);
					});
				},
				{ progress, moving: route === '/qa/liquid2' }
			);
		await page.waitForTimeout(progress === null ? 800 : route === '/qa/liquid2' ? 80 : 3000);
		await page.evaluate(() => {
			window.captureLiquidStill = true;
		});
		await page.waitForFunction(() => window.liquidStill);
		const encoded = await page.evaluate(() => window.liquidStill.split(',')[1]);
		const bytes = Buffer.from(encoded, 'base64');
		captures.push({ name, bytes });
		await page.close();
	}
} finally {
	await browser.close();
}
// Static-file writes can trigger Vite HMR. Finish both live captures before publishing them.
mkdirSync(dir, { recursive: true });
for (const { name, bytes } of captures) {
	writeFileSync(`${dir}/wave-${name}.png`, bytes);
	console.log(name, bytes.length, 'bytes');
}
