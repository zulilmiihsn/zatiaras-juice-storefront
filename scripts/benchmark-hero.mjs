// Run serially on a supplied foreground Playwright/Tabbit homepage, with no builds
// running. Results measure rendered frame intervals, not just JavaScript duration.
export async function benchmarkHero(page) {
	await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.evaluate(() => document.fonts.ready);
	await page.waitForFunction(() => {
		const canvas = document.querySelector('.hero-scrub canvas');
		return canvas.width > 300 && !canvas.classList.contains('opacity-0');
	});
	// Measure the exit after the approved entrance completes, not both at once.
	await page.waitForFunction(() =>
		document.querySelector('.hero-exit-scope').getAnimations({ subtree: true }).every(
			(animation) => !('animationName' in animation) || animation.playState === 'finished'
		)
	);

	const runs = [];
	for (const [phase, from, to, duration] of [
		['copy-down-1', 0, 0.24, 3000],
		['copy-down-2', 0, 0.24, 3000],
		['copy-up', 0.24, 0, 3000],
		['video-1', 0.31, 0.98, 5000],
		['video-2', 0.31, 0.98, 5000]
	]) {
		await page.evaluate((from) => {
			const track = document.querySelector('.hero-scrub');
			window.scrollTo({ top: (track.offsetHeight - innerHeight) * from, behavior: 'instant' });
		}, from);
		await page.waitForFunction((from) => {
			const opacity = Number(getComputedStyle(document.querySelector('h1 [data-s-base]')).opacity);
			return from === 0 ? opacity > 0.999 : opacity < 0.1;
		}, from);

		const result = await page.evaluate(
			({ from, to, duration }) =>
				new Promise((resolve) => {
					const distance = document.querySelector('.hero-scrub').offsetHeight - innerHeight;
					const intervals = [];
					let start;
					let last;
					function tick(now) {
						start ??= now;
						if (last !== undefined) intervals.push(now - last);
						last = now;
						const t = Math.min(1, (now - start) / duration);
						window.scrollTo({ top: (from + (to - from) * t) * distance, behavior: 'instant' });
						if (t < 1) return requestAnimationFrame(tick);
						const sorted = [...intervals].sort((a, b) => a - b);
						const fps = (1000 * intervals.length) / intervals.reduce((sum, ms) => sum + ms, 0);
						const p95 = sorted[Math.floor(sorted.length * 0.95)];
						const lateFrames = intervals.filter((ms) => ms > 25).length;
						resolve({
							fps: Number(fps.toFixed(2)),
							p95ms: Number(p95.toFixed(2)),
							maxMs: Number(sorted.at(-1).toFixed(2)),
							frames: intervals.length,
							lateFrames,
							within60fpsBudget: fps >= 59 && p95 <= 18.5 && lateFrames / intervals.length <= 0.01
						});
					}
					requestAnimationFrame(tick);
				}),
			{ from, to, duration }
		);
		runs.push({ phase, ...result });
	}
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	return {
		display: await page.evaluate(() => ({
			width: innerWidth,
			height: innerHeight,
			dpr: devicePixelRatio,
			visibility: document.visibilityState
		})),
		runs
	};
}
