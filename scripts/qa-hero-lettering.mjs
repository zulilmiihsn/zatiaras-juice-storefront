import assert from 'node:assert/strict';

// Run against a supplied Playwright page (including a Tabbit-owned page).
// The page must already be on the homepage; this does not launch another browser.
export async function checkHeroLettering(page) {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.waitForFunction(
		() => getComputedStyle(document.querySelector('h1 .kl')).animationName === 'none'
	);
	await page.evaluate(() => document.fonts.ready);
	assert.equal(await page.getByRole('heading', { level: 1, name: 'Jus Alpukat' }).count(), 1);
	assert.equal(await page.locator('#hero-letter-shine').count(), 1);
	assert.equal(await page.locator('h1 .kl').count(), 10);
	assert.equal(await page.locator('#hero-order').getAttribute('href'), '/menu');

	const viewports = [320, 360, 375, 390, 768, 1024, 1280, 1440];
	for (const width of viewports) {
		await page.setViewportSize({ width, height: 1000 });
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		const state = await page.locator('h1 .kl').evaluateAll((letters) => ({
			fits: document.documentElement.scrollWidth <= innerWidth,
			intact: letters.every((letter) => {
				const rect = letter.getBoundingClientRect();
				return rect.left >= 0 && rect.right <= innerWidth;
			}),
			paint: letters.every((letter) => {
				const face = getComputedStyle(letter);
				const shine = getComputedStyle(letter, '::after');
				return (
					face.color === 'rgb(255, 16, 129)' &&
					shine.filter.includes('#hero-letter-shine') &&
					shine.maskImage.includes('radial-gradient') &&
					shine.backgroundImage === 'none' &&
					face.animationName === 'none'
				);
			})
		}));
		assert.ok(state.fits && state.intact && state.paint, `${width}px: ${JSON.stringify(state)}`);
	}

	await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
	await page.waitForFunction(() =>
		[...document.querySelectorAll('h1 .kl')].every((letter) => {
			const face = getComputedStyle(letter);
			return (
				getComputedStyle(letter, '::after').content === 'none' &&
				face.filter === 'none' &&
				face.webkitTextStrokeWidth === '0px'
			);
		})
	);
	await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
	return { viewports, letters: 10, reducedMotion: true, forcedColors: true };
}

export async function checkHeroExit(page) {
	await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
	await page.reload({ waitUntil: 'networkidle' });
	await page.evaluate(() => document.fonts.ready);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	const styles = await page
		.locator('h1 .kl')
		.evaluateAll((letters) => letters.map((letter) => letter.getAttribute('style')));
	await page.evaluate(() => {
		const track = document.querySelector('.hero-scrub');
		window.scrollTo({ top: (track.offsetHeight - innerHeight) * 0.12, behavior: 'instant' });
	});
	await page.waitForFunction(() => {
		const line = document.querySelector('h1 [data-s-base]');
		return line
			.getAnimations()
			.some(
				(animation) =>
					animation.effect.getKeyframes().length === 61 &&
					animation.playState === 'paused' &&
					Number(animation.currentTime) > 100
			);
	});
	assert.ok(
		await page
			.locator('h1 .kl')
			.evaluateAll(
				(letters, before) =>
					letters.every(
						(letter, index) =>
							letter.getAttribute('style') === before[index] &&
							getComputedStyle(letter, '::after').filter.includes('#hero-letter-shine')
					),
				styles
			)
	);
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await page.waitForFunction(() =>
		[...document.querySelectorAll('h1 [data-s-base]')].every(
			(line) =>
				!line.getAnimations().some((animation) => animation.effect.getKeyframes().length === 61)
		)
	);
	assert.equal(await page.locator('.hero-copy').evaluate((el) => el.inert), false);
	return { nativeLineExit: true, noInlineTransformWrites: true, reverseRestoresEntrance: true };
}

export async function checkHeroMedia(page) {
	const results = [];
	for (const [width, height, source, canvasWidth, canvasHeight] of [
		[1440, 900, 'desktop-1080p.mp4', 1920, 1080],
		[390, 844, 'mobile.mp4', 1080, 1920]
	]) {
		await page.setViewportSize({ width, height });
		await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.waitForFunction(() => {
			const canvas = document.querySelector('.hero-scrub canvas');
			return canvas.width > 300 && !canvas.classList.contains('opacity-0');
		});
		const media = await page.locator('.hero-scrub').evaluate((root) => ({
			width: root.querySelector('canvas').width,
			height: root.querySelector('canvas').height,
			preload: root.querySelector('video').preload,
			files: performance.getEntriesByType('resource')
				.filter((resource) => /hero-scrub.*mp4/.test(resource.name))
				.map((resource) => resource.name.split('/').at(-1))
		}));
		assert.equal(media.width, canvasWidth);
		assert.equal(media.height, canvasHeight);
		assert.equal(media.preload, 'none');
		assert.deepEqual(media.files, [source]);
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
		await page.waitForFunction(() =>
			Number(getComputedStyle(document.querySelector('h1 [data-s-base]')).opacity) > 0.999
		);
		const firstFrame = await page.evaluate(() => {
			const sample = document.createElement('canvas');
			sample.width = 16;
			sample.height = 9;
			sample.getContext('2d').drawImage(document.querySelector('.hero-scrub canvas'), 0, 0, 16, 9);
			return sample.toDataURL();
		});
		await page.evaluate(() => {
			const track = document.querySelector('.hero-scrub');
			window.scrollTo({ top: (track.offsetHeight - innerHeight) * 0.2, behavior: 'instant' });
		});
		await page.waitForFunction(() =>
			Number(getComputedStyle(document.querySelector('h1 [data-s-base]')).opacity) < 0.8
		);
		assert.equal(await page.evaluate(() => {
			const sample = document.createElement('canvas');
			sample.width = 16;
			sample.height = 9;
			sample.getContext('2d').drawImage(document.querySelector('.hero-scrub canvas'), 0, 0, 16, 9);
			return sample.toDataURL();
		}), firstFrame);
		results.push({ width, source, heldDuringCopy: true });
	}
	return results;
}
