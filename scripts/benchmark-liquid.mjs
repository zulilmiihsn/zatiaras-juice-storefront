// Compare the same viewport and browser before/after a renderer change.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const label = process.argv[2] || 'current';
// QA_PATH selects the preview; --mobile emulates a touch phone with a 4x slower CPU.
const route = process.env.QA_PATH || '/qa/liquid';
const mobile = process.argv.includes('--mobile');
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
try {
	const page = await browser.newPage({
		viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		hasTouch: mobile
	});
	if (mobile) {
		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
	}
	await page.addInitScript(() => {
		window.liquidPerf = { frames: [], completedFrames: [], gpuWait: [], measuring: false };
		const proto = WebGL2RenderingContext.prototype;
		for (const method of ['drawArrays', 'drawElements', 'drawElementsInstanced']) {
			const original = proto[method];
			proto[method] = function (...args) {
				const started = performance.now();
				original.apply(this, args);
				const p = window.liquidPerf;
				if (!this.canvas.closest('[data-liquid-mode]')) return;
				if (!p.renderer) {
					const ext = this.getExtension('WEBGL_debug_renderer_info');
					p.renderer = ext
						? this.getParameter(ext.UNMASKED_RENDERER_WEBGL)
						: this.getParameter(this.RENDERER);
				}
				if (p.measuring && !p.pendingFrame) {
					p.pendingFrame = true;
					// Count one complete render, not each drink, pool and swirl draw call.
					queueMicrotask(() => {
						p.pendingFrame = false;
						p.frames.push(started);
						p.completedFrames.push(performance.now());
						if (p.gpuWait.length < 10) {
							this.finish();
							p.gpuWait.push(performance.now() - started);
						}
						p.backing = [this.canvas.width, this.canvas.height];
					});
				}
			};
		}
	});
	const started = Date.now();
	await page.goto((process.env.QA_BASE_URL || 'http://127.0.0.1:4173') + route, {
		waitUntil: 'domcontentloaded',
		timeout: 90000
	});
	await page.waitForSelector('[data-liquid-mode="live"]', { timeout: 90000 });
	await page.waitForFunction(() => window.liquidPerf.renderer);
	const startupMs = Date.now() - started;
	await page.waitForTimeout(1500);
	await page.evaluate(() => {
		window.liquidPerf.measuring = true;
	});
	await page.waitForTimeout(5000);
	const result = await page.evaluate(() => {
		const p = window.liquidPerf;
		const intervals = p.frames.slice(1).map((t, i) => t - p.frames[i]);
		const completed = p.completedFrames.slice(1).map((t, i) => t - p.completedFrames[i]);
		const percentile = (xs, q) =>
			[...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * q))];
		return {
			renderer: p.renderer,
			backing: p.backing,
			frames: p.frames.length,
			frameP50Ms: percentile(intervals, 0.5),
			frameP95Ms: percentile(intervals, 0.95),
			completedFrameP95Ms: percentile(completed, 0.95),
			gpuWaitP50Ms: percentile(p.gpuWait, 0.5),
			gpuWaitP95Ms: percentile(p.gpuWait, 0.95),
			mode: document.querySelector('[data-liquid-mode]').dataset.liquidMode
		};
	});
	await page.evaluate(() => {
		window.liquidPerf.frames = [];
		window.liquidPerf.completedFrames = [];
		window.liquidPerf.gpuWait = [];
		const started = performance.now();
		window.liquidDrag = setInterval(() => {
			const t = (performance.now() - started) / 1000;
			window.dispatchEvent(
				new PointerEvent('pointermove', {
					clientX: innerWidth * (0.5 + 0.15 * Math.sin(t * 2.5)),
					clientY: innerHeight * (0.72 + 0.04 * Math.cos(t * 2))
				})
			);
		}, 75);
	});
	await page.waitForTimeout(4000);
	const interaction = await page.evaluate(() => {
		clearInterval(window.liquidDrag);
		const p = window.liquidPerf;
		const completed = p.completedFrames
			.slice(1)
			.map((t, i) => t - p.completedFrames[i])
			.sort((a, b) => a - b);
		const intervals = p.frames
			.slice(1)
			.map((t, i) => t - p.frames[i])
			.sort((a, b) => a - b);
		return {
			frames: p.frames.length,
			frameP50Ms: intervals[Math.floor(intervals.length * 0.5)],
			frameP95Ms: intervals[Math.floor(intervals.length * 0.95)],
			completedFrameP95Ms: completed[Math.floor(completed.length * 0.95)],
			mode: document.querySelector('[data-liquid-mode]').dataset.liquidMode
		};
	});
	// Scrolling through the swell is the heaviest phase: drive, breaking crests and spray.
	await page.evaluate(() => {
		window.liquidPerf.frames = [];
		window.liquidPerf.completedFrames = [];
		const track = document.querySelector('[data-liquid-track]');
		const travel = track.offsetHeight - innerHeight;
		const started = performance.now();
		window.liquidScroll = setInterval(() => {
			const t = Math.min(1, (performance.now() - started) / 4000);
			scrollTo({ top: track.offsetTop + travel * 0.6 * t, behavior: 'instant' });
		}, 16);
	});
	await page.waitForTimeout(4000);
	const scrolling = await page.evaluate(() => {
		clearInterval(window.liquidScroll);
		const p = window.liquidPerf;
		const completed = p.completedFrames
			.slice(1)
			.map((t, i) => t - p.completedFrames[i])
			.sort((a, b) => a - b);
		const intervals = p.frames
			.slice(1)
			.map((t, i) => t - p.frames[i])
			.sort((a, b) => a - b);
		return {
			frames: p.frames.length,
			frameP50Ms: intervals[Math.floor(intervals.length * 0.5)],
			frameP95Ms: intervals[Math.floor(intervals.length * 0.95)],
			completedFrameP95Ms: completed[Math.floor(completed.length * 0.95)],
			mode: document.querySelector('[data-liquid-mode]').dataset.liquidMode
		};
	});
	const report = { label, route, mobile, startupMs, ...result, interaction, scrolling };
	mkdirSync('scratch/liquid-review', { recursive: true });
	writeFileSync(`scratch/liquid-review/performance-${label}.json`, JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report, null, 2));
	const budget = mobile ? 33 : 20;
	assert.equal(scrolling.mode, 'live', 'Benchmark must not switch to the static fallback');
	assert.ok(scrolling.frames >= 60, `Too few rendered frames: ${scrolling.frames}`);
	assert.ok(
		Number.isFinite(scrolling.frameP95Ms) && scrolling.frameP95Ms <= budget,
		`Scrolling p95 ${scrolling.frameP95Ms} ms exceeds ${budget} ms`
	);
	assert.ok(
		Number.isFinite(scrolling.completedFrameP95Ms) && scrolling.completedFrameP95Ms <= budget,
		`Completed submission p95 ${scrolling.completedFrameP95Ms} ms exceeds ${budget} ms`
	);
} finally {
	await browser.close();
}
