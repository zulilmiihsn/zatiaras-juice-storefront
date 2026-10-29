import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:5199';
mkdirSync('scratch/best-review', { recursive: true });
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
const report = [];
// Peringkat penjualan dari pemilik: urutan DOM harus sama.
const products = ['jus-alpukat', 'hero-signature', 'jus-mangga'];
try {
	for (const width of [320, 360, 375, 390, 768, 1024, 1280, 1440]) {
		const page = await browser.newPage({
			viewport: { width, height: 1000 },
			reducedMotion: 'reduce'
		});
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
		const section = page.locator('#terlaris');
		await section.scrollIntoViewIfNeeded();
		await page.evaluate(() => document.fonts.ready);
		assert.equal(await section.getByRole('heading', { level: 2 }).count(), 1);
		assert.equal(await section.getByRole('listitem').count(), 3);
		assert.deepEqual(
			await section
				.locator('a.cup-order')
				.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
			products.map((slug) => `/menu/${slug}`)
		);
		assert.deepEqual(
			await section
				.locator('h3')
				.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
			['Jus Alpukat', 'Alpukat Kocok', 'Jus Mangga']
		);
		// Section ini tanpa harga (keputusan pemilik); stok tidak pernah tampil.
		const copy = await section.innerText();
		assert.doesNotMatch(copy, /ketersediaan|SOLD_OUT|AVAILABLE|favorit pelanggan/i);
		assert.doesNotMatch(copy, /Rp\s*[0-9]/, 'harga tidak boleh tampil di section ini');
		assert.equal(await section.locator('img').count(), 3);
		assert.ok(
			await section
				.locator('img')
				.evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0)),
			'gambar produk gagal dimuat'
		);
		const bounds = await section.evaluate((node) => ({
			width: innerWidth,
			scrollWidth: document.documentElement.scrollWidth,
			clipped: [...node.querySelectorAll('h2,h3,p,a')].some((el) => {
				const box = el.getBoundingClientRect();
				return box.left < 0 || box.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1;
			}),
			columns: getComputedStyle(node.querySelector('.best-grid')).gridTemplateColumns.split(' ')
				.length,
			targets: [...node.querySelectorAll('.cup-order')].every(
				(el) => el.getBoundingClientRect().height >= 44
			),
			// Judul maksimal dua baris di semua lebar.
			titleLines: Math.round(
				node.querySelector('h2').getBoundingClientRect().height /
					parseFloat(getComputedStyle(node.querySelector('h2')).lineHeight)
			),
			// Cup tidak boleh menimpa teks kartu.
			overlap: [...node.querySelectorAll('.cup-card')].some((card) => {
				const photo = card.querySelector('.cup-photo').getBoundingClientRect();
				return [...card.querySelectorAll('h3, p')].some((text) => {
					const range = document.createRange();
					range.selectNodeContents(text);
					return [...range.getClientRects()].some(
						(rect) =>
							rect.right > photo.left + photo.width * 0.04 &&
							rect.left < photo.right &&
							rect.bottom > photo.top + photo.height * 0.08 &&
							rect.top < photo.bottom &&
							!card.classList.contains('lead')
					);
				});
			})
		}));
		assert.ok(
			bounds.scrollWidth <= width && !bounds.clipped && bounds.targets,
			JSON.stringify(bounds)
		);
		assert.ok(bounds.titleLines <= 2, `judul ${bounds.titleLines} baris pada ${width}px`);
		assert.equal(bounds.columns, width < 768 ? 1 : 2);
		// Fokus keyboard mengikuti peringkat.
		await section.locator('a.cup-order').first().focus();
		assert.equal(await page.locator(':focus').getAttribute('href'), '/menu/jus-alpukat');
		for (const slug of products.slice(1)) {
			await page.keyboard.press('Tab');
			assert.equal(await page.locator(':focus').getAttribute('href'), `/menu/${slug}`);
		}
		// Reduced motion: hover tidak menggerakkan cup.
		await section.locator('.cup-card').first().hover();
		assert.equal(
			await section
				.locator('.cup-photo')
				.first()
				.evaluate((el) => getComputedStyle(el).transform),
			'none'
		);
		if ([320, 390, 768, 1440].includes(width)) {
			await page.locator(':focus').evaluate((element) => element.blur());
			const hideHeader = await page.addStyleTag({
				content:
					'body > div > header { visibility:hidden !important; } [class*="fixed"] { display:none !important; }'
			});
			await page.mouse.move(0, 0);
			await section.screenshot({ path: `scratch/best-review/best-${width}.png` });
			await hideHeader.evaluate((el) => el.remove());
		}
		assert.deepEqual(errors, []);
		report.push({ width, ...bounds });
		console.log(`PASS best sellers ${width}px`);
		if (width === 1440) {
			await section.getByRole('link', { name: 'Pesan Alpukat Kocok', exact: true }).click();
			await page.waitForURL('**/menu/hero-signature');
			assert.match(await page.getByRole('heading', { level: 1 }).innerText(), /Alpukat Kocok/);
		}
		await page.close();
	}
	// Laptop: seluruh section muat satu tinggi viewport (header 72px + section) tanpa teks terpotong.
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
			const node = document.querySelector('#terlaris');
			scrollTo({ top: node.getBoundingClientRect().top + scrollY - 72, behavior: 'instant' });
			const box = node.getBoundingClientRect();
			const cards = [...node.querySelectorAll('.cup-card')].map((card) => {
				const frame = card.getBoundingClientRect();
				return [...card.querySelectorAll('h3, p, a')].every((el) => {
					const r = el.getBoundingClientRect();
					return r.top >= frame.top - 1 && r.bottom <= frame.bottom + 1;
				});
			});
			return { top: box.top, bottom: box.bottom, height: box.height, cards };
		});
		assert.ok(
			fit.bottom <= height + 1 || fit.height <= 560 + 1,
			`${width}x${height}: section ${Math.round(fit.height)}px melebihi viewport`
		);
		assert.deepEqual(fit.cards, [true, true, true], `${width}x${height}: teks keluar kartu`);
		console.log(`PASS fits one viewport ${width}x${height}`);
		await page.close();
	}
	const noJs = await browser.newPage({
		javaScriptEnabled: false,
		viewport: { width: 390, height: 844 }
	});
	await noJs.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
	assert.equal(await noJs.locator('#terlaris a.cup-order').count(), 3);
	assert.equal(
		await noJs
			.locator('#terlaris .cup-card')
			.first()
			.evaluate((el) => getComputedStyle(el).opacity),
		'1'
	);
	await noJs.close();
	const motion = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	await motion.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
	await motion.locator('#terlaris').scrollIntoViewIfNeeded();
	// Entrance harus selesai; tunggu sampai 6 detik karena dev server bisa lambat saat kompilasi.
	await motion.waitForFunction(
		() => getComputedStyle(document.querySelectorAll('#terlaris .cup-card')[2]).opacity === '1',
		null,
		{ timeout: 6000 }
	);
	await motion.locator('.cup-card').first().hover();
	await motion.waitForTimeout(700);
	assert.notEqual(
		await motion
			.locator('.cup-photo')
			.first()
			.evaluate((el) => getComputedStyle(el).transform),
		'none'
	);
	await motion.close();
	writeFileSync('scratch/best-review/results.json', JSON.stringify(report, null, 2));
	console.log('PASS no-JavaScript, keyboard, product routes, price gate, normal/reduced motion');
} finally {
	await browser.close();
}
