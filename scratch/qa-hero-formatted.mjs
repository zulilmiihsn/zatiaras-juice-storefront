import assert from 'node:assert/strict';

// Run against a supplied Playwright page (including a Tabbit-owned page).
// The page must already be on the homepage; this does not launch another browser.
export async function checkHeroLettering(page) {
	await page.emulateMedia({ reducedMotion: 'reduce' });
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
	assert.ok(
		await page.locator('h1 .kl').evaluateAll((letters) =>
			letters.every((letter) => {
				const face = getComputedStyle(letter);
				return (
					getComputedStyle(letter, '::after').content === 'none' &&
					face.filter === 'none' &&
					face.webkitTextStrokeWidth === '0px'
				);
			})
		)
	);
	await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });
	return { viewports, letters: 10, reducedMotion: true, forcedColors: true };
}

export async function checkHeroExit(page) {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
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
		const letter = document.querySelector('h1 .kl');
		return letter
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
		[...document.querySelectorAll('h1 .kl')].every(
			(letter) =>
				!letter.getAnimations().some((animation) => animation.effect.getKeyframes().length === 61)
		)
	);
	assert.equal(await page.locator('.hero-copy').evaluate((el) => el.inert), false);
	return { nativeExit: true, noInlineTransformWrites: true, reverseRestoresEntrance: true };
}
