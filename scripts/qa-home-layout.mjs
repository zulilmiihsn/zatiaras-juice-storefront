import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const phase = process.argv[2] ?? 'verified';
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:5199';
const output = `scratch/home-layout/${phase}`;
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
const results = [];
try {
	for (const [width, height, reducedMotion = 'reduce', javaScriptEnabled = true] of [
		[320, 568],
		[360, 740],
		[375, 812],
		[390, 844],
		[768, 1024],
		[1024, 768],
		[1280, 720],
		[1440, 900],
		[844, 390],
		[390, 844, 'no-preference'],
		[390, 844, 'reduce', false]
	]) {
		const page = await browser.newPage({
			viewport: { width, height },
			reducedMotion,
			javaScriptEnabled
		});
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
		await page.evaluate(() => document.fonts.ready);
		await page.locator('img').evaluateAll((images) =>
			Promise.all(
				images.map(async (image) => {
					image.loading = 'eager';
					await image.decode();
				})
			)
		);
		for (const section of await page.locator('main section').all()) {
			await section.scrollIntoViewIfNeeded();
			await page.waitForTimeout(reducedMotion === 'reduce' ? 150 : 850);
		}
		await page.locator('footer').scrollIntoViewIfNeeded();
		await page.waitForTimeout(300);
		await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
		await page.waitForTimeout(300);
		const name = `${width}x${height}-${reducedMotion}-${javaScriptEnabled ? 'js' : 'no-js'}`;
		if ([390, 1440].includes(width)) {
			await page.screenshot({ path: `${output}/${name}-full.png`, fullPage: true });
		}
		const sections = await page.locator('main section').evaluateAll((nodes) =>
			nodes.map((node) => {
				const r = node.getBoundingClientRect();
				const h = node.querySelector('h1,h2');
				const heading = h?.getBoundingClientRect();
				const s = getComputedStyle(node);
				const clipped = [...node.querySelectorAll('h1,h2,h3,p,a')]
					// Isi akordeon/panel tertutup (inert) sengaja terpotong.
					.filter((el) => !el.closest('[inert]'))
					.filter((el) => {
						const box = el.getBoundingClientRect();
						return (
							box.width > 0 &&
							box.height > 0 &&
							(box.left < -1 ||
								box.right > innerWidth + 1 ||
								box.top < r.top - 1 ||
								box.bottom > r.bottom + 1)
						);
					})
					.map((el) => el.textContent.trim().replace(/\s+/g, ' '));
				return {
					title: h?.textContent.trim().replace(/\s+/g, ' '),
					top: Math.round(r.top + scrollY),
					height: Math.round(r.height),
					left: r.left,
					right: r.right,
					headingLeft: heading?.left,
					paddingTop: s.paddingTop,
					paddingBottom: s.paddingBottom,
					clipped
				};
			})
		);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
		results.push({ name, width, height, sections, errors, overflow });
		assert.equal(sections.length, 8, `${name}: preserve all eight sections`);
		assert.deepEqual(errors, [], `${name}: browser errors`);
		assert.equal(overflow, false, `${name}: page overflow`);
		for (const [index, section] of sections.entries()) {
			assert.deepEqual(section.clipped, [], `${name}: clipped content in ${section.title}`);
			if (index > 0) {
				const previous = sections[index - 1];
				assert.ok(
					section.top >= previous.top + previous.height - 2,
					`${name}: overlapping sections`
				);
			}
		}
		for (const index of [1, 2, 3, 6]) {
			assert.ok(
				Math.abs(sections[index].headingLeft - sections[0].headingLeft) < 1,
				`${name}: heading alignment`
			);
		}
		assert.ok(sections[0].height >= height - 1, `${name}: hero viewport height`);
		if (height >= 520 && javaScriptEnabled) {
			assert.ok(
				Math.abs(sections[4].height - height) <= 1,
				`${name}: preserve map viewport height`
			);
		}
		if (width >= 768) {
			const cards = await page.locator('#terlaris .cup-card').evaluateAll((nodes) =>
				nodes.map((node) => {
					const r = node.getBoundingClientRect();
					return { top: r.top, height: r.height };
				})
			);
			assert.equal(cards.length, 3, `${name}: best seller count`);
			assert.ok(
				cards[0].height > cards[1].height && cards[0].height > cards[2].height,
				`${name}: top seller card is the largest`
			);
		}
		await page.close();
	}
} finally {
	await browser.close();
	writeFileSync(`${output}/geometry.json`, JSON.stringify(results, null, 2));
}
console.log(
	JSON.stringify(
		results.map(({ name, sections }) => ({
			name,
			sectionHeights: sections.map((section) => section.height)
		}))
	)
);
