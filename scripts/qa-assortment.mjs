import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:5199';
const output = 'scratch/assortment-review';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
const slugs = ['jus-alpukat', 'hero-signature', 'jus-mangga'];
const report = [];
async function openSection(page) {
	await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
	const section = page.locator('#jus-apa-aja');
	await section.scrollIntoViewIfNeeded();
	await page.evaluate(() => document.fonts.ready);
	await section.locator('h3').last().waitFor({ state: 'visible' });
	await section.locator('img').evaluateAll((images) => {
		images.forEach((image) => (image.loading = 'eager'));
		return Promise.all(images.map((image) => image.decode()));
	});
	return section;
}
try {
	for (const width of [320, 360, 375, 390, 768, 1024, 1280, 1440]) {
		const page = await browser.newPage({
			viewport: { width, height: 1000 },
			reducedMotion: 'reduce'
		});
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const section = await openSection(page);
		assert.equal(await section.locator('h3').count(), 3);
		assert.deepEqual(
			await section
				.locator('.menu-link')
				.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
			slugs.map((slug) => `/menu/${slug}`)
		);
		assert.equal(await section.locator('.all-menu').getAttribute('href'), '/menu');
		assert.doesNotMatch(await section.innerText(), /Rp\s*[0-9]|SOLD_OUT|AVAILABLE|LIMITED|stok/i);
		assert.equal(
			await section.locator('h2 span').evaluate((el) => getComputedStyle(el).color),
			'rgb(255, 16, 129)'
		);
		const geometry = await section.evaluate((node) => ({
			width: innerWidth,
			scrollWidth: document.documentElement.scrollWidth,
			columns: new Set(
				[...node.querySelectorAll('.assortment-product')].map((el) =>
					Math.round(el.getBoundingClientRect().left)
				)
			).size,
			clipped: [...node.querySelectorAll('h2,h3,p,a,.product-photo')].some((el) => {
				const box = el.getBoundingClientRect();
				return box.left < -1 || box.right > innerWidth + 1;
			}),
			targets: [...node.querySelectorAll('a')].every((el) => {
				const box = el.getBoundingClientRect();
				return box.width >= 44 && box.height >= 44;
			}),
			images: [...node.querySelectorAll('.product-photo')].every(
				(el) => el.naturalWidth > 0 && el.getAttribute('alt')
			)
		}));
		assert.ok(
			geometry.scrollWidth <= width && !geometry.clipped && geometry.targets && geometry.images,
			JSON.stringify(geometry)
		);
		assert.equal(geometry.columns, width < 768 ? 1 : 3);
		const composition = await section.evaluate((node) => {
			const photos = [...node.querySelectorAll('.product-photo')].map((el) =>
				el.getBoundingClientRect()
			);
			const copies = [...node.querySelectorAll('.product-copy')].map((el) =>
				el.getBoundingClientRect()
			);
			return {
				heights: photos.map((box) => box.height),
				verticalOffsets: photos.map((box, index) => {
					const scene = node.querySelectorAll('.product-scene')[index].getBoundingClientRect();
					return box.top + box.height / 2 - (scene.top + scene.height / 2);
				}),
				copyClear: photos.every((box, index) => box.bottom <= copies[index].top),
				proportions: [...node.querySelectorAll('.product-blob')].every(
					(el) => getComputedStyle(el).objectFit === 'contain'
				)
			};
		});
		const [avocadoHeight, chocolateHeight, mangoHeight] = composition.heights;
		assert.ok(avocadoHeight < chocolateHeight && avocadoHeight > chocolateHeight * 0.9);
		assert.ok(Math.abs(chocolateHeight - mangoHeight) < 1);
		assert.ok(composition.verticalOffsets.every((offset) => Math.abs(offset) < 1));
		assert.ok(composition.copyClear && composition.proportions, JSON.stringify(composition));
		await section.locator('.all-menu').focus();
		assert.notEqual(
			await page.locator(':focus').evaluate((el) => getComputedStyle(el).outlineStyle),
			'none'
		);
		for (const slug of slugs) {
			await page.keyboard.press('Tab');
			assert.equal(await page.locator(':focus').getAttribute('href'), `/menu/${slug}`);
		}
		if ([320, 390, 768, 1440].includes(width)) {
			await page.locator(':focus').evaluate((el) => el.blur());
			const style = await page.addStyleTag({
				content: 'header, .mobile-cta { visibility: hidden !important; }'
			});
			await section.screenshot({ path: `${output}/assortment-${width}.png` });
			await style.evaluate((el) => el.remove());
		}
		assert.deepEqual(errors, []);
		report.push({ ...geometry, composition });
		console.log(`PASS assortment ${width}px`);
		await page.close();
	}
	for (const viewport of [
		{ width: 1280, height: 720 },
		{ width: 1440, height: 900 }
	]) {
		const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
		const section = await openSection(page);
		const fit = await section.evaluate((node) => {
			window.scrollTo({
				top: node.getBoundingClientRect().top + scrollY - 96,
				behavior: 'instant'
			});
			return {
				height: node.getBoundingClientRect().height,
				contentVisible: [...node.querySelectorAll('h2,h3,p,a')].every((el) => {
					const box = el.getBoundingClientRect();
					return box.top >= 96 && box.bottom <= innerHeight + 1;
				})
			};
		});
		assert.ok(fit.height <= viewport.height - 96 + 1 && fit.contentVisible, JSON.stringify(fit));
		await page.close();
	}
	for (const slug of slugs) {
		const page = await browser.newPage({ reducedMotion: 'reduce' });
		const section = await openSection(page);
		await section.locator(`a[href="/menu/${slug}"]`).click();
		await page.waitForURL(`**/menu/${slug}`);
		assert.ok(await page.getByRole('heading', { level: 1 }).isVisible());
		assert.doesNotMatch(await page.locator('main').innerText(), /Rp\s*[0-9]/);
		await page.close();
	}
	const noJs = await browser.newPage({
		javaScriptEnabled: false,
		viewport: { width: 390, height: 844 }
	});
	const staticSection = await openSection(noJs);
	assert.equal(await staticSection.locator('.menu-link').count(), 3);
	assert.ok(await staticSection.locator('h3').first().isVisible());
	await noJs.close();
	const motion = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	const section = await openSection(motion);
	await section.locator('.menu-link').first().hover();
	assert.ok(await section.locator('.product-photo').first().isVisible());
	await motion.close();
	writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
	console.log(
		'PASS product routes, price gates, keyboard focus, no-JavaScript, normal/reduced motion'
	);
} finally {
	await browser.close();
}
