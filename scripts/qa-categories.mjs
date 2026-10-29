import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:5199';
mkdirSync('scratch/best-review', { recursive: true });
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
const names = ['JUS BUAH & SAYUR', 'MIX JUS', 'KOCOK', 'BABY', 'NON JUS'];

// Panel terbuka harus berisi teks dan tombol di dalam bingkainya (tidak terpotong).
const openFits = (section) =>
	section.evaluate((node) => {
		const panel = node.querySelector('.cat.open');
		const frame = panel.getBoundingClientRect();
		return [...panel.querySelectorAll('.cat-big, .cat-blurb, .cat-samples li, .cat-cta')]
			.filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none')
			.every((el) => {
				const r = el.getBoundingClientRect();
				return (
					r.left >= frame.left - 1 &&
					r.right <= frame.right + 1 &&
					r.top >= frame.top - 1 &&
					r.bottom <= frame.bottom + 1
				);
			});
	});

try {
	for (const width of [320, 360, 375, 390, 768, 1024, 1280, 1440]) {
		const page = await browser.newPage({
			viewport: { width, height: 1000 },
			reducedMotion: 'reduce'
		});
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
		const section = page.locator('#jus-apa-aja');
		await section.scrollIntoViewIfNeeded();
		await page.evaluate(() => document.fonts.ready);
		assert.equal(await section.getByRole('heading', { level: 2 }).count(), 1);
		assert.equal(
			await section.getByRole('heading', { level: 2 }).getAttribute('aria-label'),
			'Jus Apa Aja Ada'
		);
		const heads = section.locator('.cat-head');
		assert.equal(await heads.count(), 5);
		assert.deepEqual(await section.locator('.cat-name').allInnerTexts(), names);
		assert.deepEqual(
			await heads.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-expanded'))),
			['true', 'false', 'false', 'false', 'false']
		);
		// Isi panel tertutup tidak bisa difokus (inert); hanya yang terbuka.
		assert.deepEqual(
			await section
				.locator('.cat-body')
				.evaluateAll((nodes) => nodes.map((n) => n.hasAttribute('inert'))),
			[false, true, true, true, true]
		);
		assert.equal(
			await section.locator('.cat.open .cat-cta').getAttribute('href'),
			'/menu?kategori=buah-sayur'
		);
		assert.ok(await openFits(section), `${width}px: isi panel pertama terpotong`);
		// Klik membuka panel lain dan menutup yang lama.
		await heads.nth(3).click();
		await page.waitForTimeout(150);
		assert.deepEqual(
			await heads.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-expanded'))),
			['false', 'false', 'false', 'true', 'false']
		);
		assert.equal(
			await section.locator('.cat.open .cat-cta').getAttribute('href'),
			'/menu?kategori=baby'
		);
		await page.waitForTimeout(1000);
		assert.ok(await openFits(section), `${width}px: isi panel Baby terpotong`);
		// Fokus keyboard juga membuka panel.
		await heads.nth(2).focus();
		assert.equal(await heads.nth(2).getAttribute('aria-expanded'), 'true');
		// Mobile/tablet: hover mouse tidak boleh membuka panel (hanya klik).
		if (width < 1024) {
			await heads.nth(4).hover();
			await page.waitForTimeout(300);
			assert.equal(await heads.nth(4).getAttribute('aria-expanded'), 'false');
		}
		const sizes = await section.evaluate((node) => ({
			scrollWidth: document.documentElement.scrollWidth,
			targets: [...node.querySelectorAll('.cat-head, .cat-cta, .cats-all')].every(
				(el) => el.getBoundingClientRect().height >= 44
			),
			titleLines: Math.round(
				node.querySelector('h2').getBoundingClientRect().height /
					parseFloat(getComputedStyle(node.querySelector('h2')).lineHeight)
			)
		}));
		assert.ok(sizes.scrollWidth <= width, `${width}px: overflow horizontal`);
		assert.ok(sizes.targets, `${width}px: target sentuh < 44px`);
		assert.ok(sizes.titleLines <= 2, `${width}px: judul ${sizes.titleLines} baris`);
		assert.deepEqual(errors, []);
		console.log(`PASS categories ${width}px`);
		await page.close();
	}

	// Desktop: hover mouse membuka panel (setelah jeda singkat), judul tetap satu baris.
	const hover = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await hover.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
	const hoverSection = hover.locator('#jus-apa-aja');
	await hoverSection.scrollIntoViewIfNeeded();
	await hover.locator('.cat').nth(2).hover();
	await hover.waitForFunction(
		() => document.querySelectorAll('#jus-apa-aja .cat-head')[2].ariaExpanded === 'true',
		null,
		{ timeout: 4000 }
	);
	await hover.close();

	// Laptop: seluruh section muat satu viewport (header 72px + section) tanpa teks terpotong.
	for (const [width, height] of [
		[1024, 768],
		[1280, 720],
		[1366, 768],
		[1440, 900],
		[1908, 827]
	]) {
		const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
		await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
		await page.evaluate(() => document.fonts.ready);
		const fit = await page.evaluate(() => {
			const node = document.querySelector('#jus-apa-aja');
			scrollTo({ top: node.getBoundingClientRect().top + scrollY - 72, behavior: 'instant' });
			const box = node.getBoundingClientRect();
			return { bottom: box.bottom, height: box.height };
		});
		assert.ok(
			fit.bottom <= height + 1 || fit.height <= 560 + 1,
			`${width}x${height}: section ${Math.round(fit.height)}px melebihi viewport`
		);
		assert.ok(await openFits(page.locator('#jus-apa-aja')), `${width}x${height}: isi terpotong`);
		console.log(`PASS fits one viewport ${width}x${height}`);
		await page.close();
	}

	// Tanpa JavaScript: panel pertama terbuka dan ada tautan ke kelima kategori.
	const noJs = await browser.newPage({
		javaScriptEnabled: false,
		viewport: { width: 390, height: 844 }
	});
	await noJs.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
	assert.equal(await noJs.locator('#jus-apa-aja .cats-nojs a').count(), 5);
	assert.equal(await noJs.locator('#jus-apa-aja .cat.open').count(), 1);
	assert.equal(
		await noJs
			.locator('#jus-apa-aja .cat')
			.first()
			.evaluate((el) => getComputedStyle(el).opacity),
		'1'
	);
	await noJs.close();

	// Halaman /menu memfilter kategori; kategori tanpa menu terdata punya pesan jujur.
	const menu = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	await menu.goto(`${base}/menu?kategori=buah-sayur`, { waitUntil: 'networkidle', timeout: 60000 });
	let body = await menu.locator('main').innerText();
	assert.match(body, /Jus Alpukat/);
	assert.doesNotMatch(body, /Alpukat Kocok/);
	assert.equal(
		await menu.locator('nav[aria-label="Kategori menu"] a[aria-current="page"]').count(),
		1
	);
	await menu.goto(`${base}/menu?kategori=kocok`, { waitUntil: 'networkidle', timeout: 60000 });
	body = await menu.locator('main').innerText();
	assert.match(body, /Alpukat Kocok/);
	assert.doesNotMatch(body, /Jus Mangga/);
	await menu.goto(`${base}/menu?kategori=baby`, { waitUntil: 'networkidle', timeout: 60000 });
	body = await menu.locator('main').innerText();
	assert.match(body, /Baby Avocado/);
	assert.doesNotMatch(body, /Alpukat Kocok/);
	await menu.goto(`${base}/menu?kategori=ngawur`, { waitUntil: 'networkidle', timeout: 60000 });
	assert.match(await menu.locator('main').innerText(), /Jus Mangga/);
	await menu.close();
	console.log('PASS menu filter, no-JavaScript, hover, keyboard, targets');
} finally {
	await browser.close();
}
