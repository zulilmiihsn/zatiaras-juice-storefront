// Run against pnpm dev --port 5199. Real WebGL, source requests and native controls.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? process.env.SHOTS_BASE ?? 'http://127.0.0.1:5199';
const browser = await chromium.launch({
	executablePath:
		process.env.CHROME_PATH ??
		'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
mkdirSync('scratch/outlet-review', { recursive: true });
const report = [];
const loadedPages = [];
async function open(options = {}, remembered = 'juanda', lines = []) {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options });
	const errors = [],
		requests = [];
	page.on('pageerror', (error) => errors.push(error.message));
	// MapLibre reports invalid paint expressions through console rather than pageerror.
	page.on('console', (message) => {
		if (
			message.type() === 'error' &&
			/layers\[.*paint|fill-extrusion|expression/i.test(message.text())
		)
			errors.push(message.text());
	});
	page.on('request', (request) => requests.push(request.url()));
	if (remembered)
		await page.addInitScript(
			({ id, lines }) => {
				localStorage.setItem('z-last-outlet', id);
				localStorage.setItem('z-cart-outlet', 'juanda');
				localStorage.setItem('z-cart', JSON.stringify(lines));
			},
			{ id: remembered, lines }
		);
	loadedPages.push(page);
	return { page, errors, requests };
}
async function go(page) {
	await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
	await page.waitForFunction(() => {
		const remembered = localStorage.getItem('z-last-outlet');
		return (
			!remembered ||
			document.querySelector('#temukan-zatiaras')?.dataset.selectedOutlet === remembered
		);
	});
}
const finder = (page) => page.locator('#temukan-zatiaras');
const ready = async (page) => {
	await page.locator('.map-backdrop').scrollIntoViewIfNeeded();
	await page.locator('[data-map-state="ready"]').waitFor({ timeout: 35000 });
};
const pick = async (page, selector, value) => {
	await page.locator(selector).click();
	await page.locator(`${selector}-list [data-value="${value}"]`).click();
};
const selectCity = (page, id) => pick(page, '#finder-city', id);
const selectOutlet = async (page, id) => {
	if (await page.locator('#finder-outlet').isVisible()) return pick(page, '#finder-outlet', id);
	return page.locator(`.outlet-card[data-outlet="${id}"] .outlet-choice`).click();
};
const selectedCity = (page) => page.locator('#finder-city').getAttribute('data-value');
const selectedOutlet = (page) => finder(page).getAttribute('data-selected-outlet');
const storage = (page) =>
	page.evaluate(() =>
		['z-last-outlet', 'z-cart', 'z-cart-outlet'].map((key) => localStorage.getItem(key))
	);
async function align(page) {
	await finder(page).evaluate((node) =>
		window.scrollTo({ top: window.scrollY + node.getBoundingClientRect().top, behavior: 'instant' })
	);
}
async function snapshot(page, name) {
	await page.evaluate(() => document.fonts.ready);
	await align(page);
	await page.waitForTimeout(1200);
	await finder(page).screenshot({ path: `scratch/outlet-review/${name}.png` });
}
async function snapshotTransition(page, name) {
	await align(page);
	await page.evaluate(() => window.scrollBy({ top: -180, behavior: 'instant' }));
	await page.waitForTimeout(500);
	await page.screenshot({ path: `scratch/outlet-review/transition-${name}.png` });
	await align(page);
}
function pass(name, details = {}) {
	console.log(`PASS ${name}`);
	report.push({ name, ...details });
}
async function checkCredits(page, name) {
	const credits = page.locator('.maplibregl-ctrl-attrib');
	const toggle = credits.locator('summary');
	const closed = await credits.boundingBox();
	assert.equal(closed.width, 36);
	assert.equal(closed.height, 36);
	assert.equal(
		await toggle.evaluate((node) => {
			const r = node.getBoundingClientRect();
			return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
		}),
		true,
		'Decorative map edges must not cover attribution controls'
	);
	assert.equal(await credits.getByRole('link').count(), 0, 'Closed credits leave keyboard order');
	if (name) await credits.screenshot({ path: `scratch/outlet-review/credits-${name}-closed.png` });
	await toggle.focus();
	await page.keyboard.press('Enter');
	if (!(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)))
		assert.equal(
			await credits.evaluate((node) =>
				node
					.getAnimations()
					.some(
						(animation) =>
							animation instanceof CSSTransition && animation.transitionProperty === 'width'
					)
			),
			true,
			'Credit circle animates into a bar'
		);
	await page.waitForTimeout(400);
	const expanded = await credits.boundingBox();
	const stage = await page.locator('.map-backdrop').boundingBox();
	assert.ok(expanded.width > closed.width);
	assert.equal(expanded.height, closed.height);
	assert.ok(expanded.x >= stage.x && expanded.x + expanded.width <= stage.x + stage.width);
	for (const source of ['OpenStreetMap', 'OpenMapTiles', 'Positron']) {
		const link = credits.getByRole('link', { name: source, exact: true });
		assert.equal(await link.isVisible(), true);
		assert.equal(
			await link.evaluate((node) => {
				const bar = node.closest('details').getBoundingClientRect();
				return [...node.getClientRects()].every(
					(r) =>
						r.left >= bar.left && r.right <= bar.right && r.top >= bar.top && r.bottom <= bar.bottom
				);
			}),
			true,
			`${source} remains inside credit bar`
		);
	}
	if (name) await credits.screenshot({ path: `scratch/outlet-review/credits-${name}-open.png` });
	await credits.getByRole('link', { name: 'OpenStreetMap', exact: true }).focus();
	await page.keyboard.press('Escape');
	assert.equal(await toggle.evaluate((node) => node === document.activeElement), true);
	await page.waitForTimeout(400);
	assert.equal((await credits.boundingBox()).width, 36);
	await page.keyboard.press('Space');
	assert.equal(await credits.getAttribute('open'), '');
	await toggle.click();
	await page.waitForTimeout(400);
}
async function geometry(page) {
	await page.locator('.outlet-cta').scrollIntoViewIfNeeded();
	return finder(page).evaluate((node) => {
		const rect = (element) => element.getBoundingClientRect();
		const box = rect(node);
		const marker = node.querySelector('.z-outlet-marker');
		const pin = marker && rect(marker);
		const stage = rect(node.querySelector('.map-backdrop'));
		const markerLabel = node.querySelector('.marker-name');
		const label = markerLabel?.getClientRects().length ? rect(markerLabel) : null;
		const controls = [
			...node.querySelectorAll('select,.outlet-choice,.outlet-cta,.quick-directions')
		]
			.filter((element) => element.getClientRects().length)
			.map(rect);
		return {
			width: box.width,
			height: box.height,
			viewportHeight: innerHeight,
			mapWithinSection:
				stage.left >= box.left &&
				stage.right <= box.right &&
				stage.top >= box.top &&
				stage.bottom <= box.bottom &&
				stage.height >= box.height * 0.55,
			contentsFit: ['.finder-header', '.finder-dock', '.map-backdrop'].every((selector) => {
				const r = rect(node.querySelector(selector));
				return r.top >= box.top - 1 && r.bottom <= box.bottom + 1;
			}),
			scrollWidth: document.documentElement.scrollWidth,
			controlsFit: controls.every((r) => r.left >= 0 && r.right <= innerWidth && r.height >= 36),
			pinClear:
				!pin ||
				(pin.top >= stage.top &&
					pin.bottom <= stage.bottom &&
					pin.left >= stage.left &&
					pin.right <= stage.right &&
					(!label ||
						(label.left >= stage.left &&
							label.right <= stage.right &&
							label.bottom <= stage.bottom)) &&
					['.finder-header', '.finder-dock'].every((selector) => {
						const overlay = rect(node.querySelector(selector));
						const overlaps = (r) =>
							r.left < overlay.right &&
							r.right > overlay.left &&
							r.top < overlay.bottom &&
							r.bottom > overlay.top;
						return !overlaps(pin) && (!label || !overlaps(label));
					})),
			ctaExposed: (() => {
				const r = rect(node.querySelector('.outlet-cta'));
				return node
					.querySelector('.outlet-cta')
					.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
			})()
		};
	});
}
try {
	const desktop = await open({}, 'merah-delima');
	const page = desktop.page;
	await go(page);
	assert.equal(await selectedCity(page), 'berau');
	assert.equal(
		desktop.requests.some((url) => /openfreemap|maplibre-gl-worker/.test(url)),
		false,
		'Map loads only near viewport'
	);
	assert.equal(await page.locator('.city-suggestion').count(), 0);
	const originalStorage = await storage(page);
	await align(page);
	await selectCity(page, 'samarinda');
	await ready(page);
	assert.equal(await page.locator('.outlet-map').getAttribute('data-map-mode'), '2d');
	assert.equal(
		desktop.requests.some((url) => /\/maps\/buildings/.test(url)),
		false
	);
	assert.equal(await page.getByRole('button', { name: /^[23]D$/ }).count(), 0);
	assert.equal(await page.locator('.z-outlet-marker').count(), 1);
	await selectOutlet(page, 'slamet-riyadi');
	assert.equal(await page.locator('.map-note').count(), 0);
	assert.equal(await page.locator('.quick-directions').count(), 0);
	assert.equal(await page.locator('.z-outlet-marker').getAttribute('aria-pressed'), 'false');
	assert.equal(await page.locator('.marker-state').isVisible(), false);
	await selectOutlet(page, 'juanda');
	await page.waitForTimeout(1200);
	await page.getByRole('button', { name: 'Pilih outlet Zatiaras Juanda', exact: true }).click();
	assert.equal(await selectedOutlet(page), 'juanda');
	assert.equal(await page.locator('.marker-state').isVisible(), true);
	assert.equal(await page.locator('.outlet-cta').getAttribute('href'), '/menu?outlet=juanda');
	assert.match(
		await page.locator('.quick-directions').getAttribute('href'),
		/destination=-0\.4762375,117\.137484375/
	);

	assert.equal(await page.locator('.detail-address').isVisible(), true);
	assert.equal(await page.locator('#finder-outlet .select-value').innerText(), 'Juanda');
	assert.equal(await page.locator('.outlet-card.active .selected-address').isVisible(), true);
	assert.equal(await finder(page).getByText('Detail outlet', { exact: true }).count(), 0);
	assert.equal(await page.locator('.detail-hours').isVisible(), true);
	await snapshotTransition(page, 'desktop');
	await snapshot(page, 'dock-desktop');
	await page.getByRole('button', { name: 'Perbesar peta', exact: true }).click();
	await page.getByRole('button', { name: 'Perbesar peta', exact: true }).click();
	await snapshot(page, 'map-closeup');
	await checkCredits(page, 'desktop');
	for (const [city, ids] of [
		['berau', ['merah-delima']],
		['balikpapan', ['kutilang', 'gatot-subroto']],
		['samarinda', ['juanda', 'slamet-riyadi']]
	]) {
		await selectCity(page, city);
		assert.equal(await page.locator('.outlet-card').count(), ids.length);
		for (const id of ids) {
			await selectOutlet(page, id);
			assert.equal(await page.locator('.outlet-cta').getAttribute('href'), `/menu?outlet=${id}`);

			assert.equal(await selectedCity(page), city);
			if (id === 'slamet-riyadi')
				assert.match(await page.locator('.detail-hours').innerText(), /Minggu libur/);
		}
	}
	await page.setViewportSize({ width: 1915, height: 817 });
	await selectCity(page, 'balikpapan');
	await snapshot(page, 'balanced-balikpapan-wide');
	await page.setViewportSize({ width: 1440, height: 900 });
	await selectCity(page, 'samarinda');
	assert.equal(await finder(page).getByRole('group', { name: 'Tampilan outlet' }).count(), 0);
	assert.equal(await page.locator('.map-backdrop').isVisible(), true);
	await ready(page);
	await page.locator('#finder-city').focus();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	assert.equal(await selectedCity(page), 'berau');
	await selectCity(page, 'samarinda');
	await page.locator('input[name="finder-outlet-card"]:checked').focus();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	assert.equal(await selectedOutlet(page), 'slamet-riyadi');
	for (let i = 0; i < 9; i++) await selectCity(page, ['samarinda', 'berau', 'balikpapan'][i % 3]);
	assert.deepEqual(await storage(page), originalStorage);
	await selectCity(page, 'samarinda');
	await selectOutlet(page, 'juanda');
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 1440, height: 900 }
	]) {
		await page.setViewportSize(viewport);
		await align(page);
		await page.waitForTimeout(1200);
		const resized = await geometry(page);
		assert.ok(
			resized.pinClear && resized.controlsFit && resized.ctaExposed,
			JSON.stringify(resized)
		);
		assert.equal(await selectedOutlet(page), 'juanda');
	}
	assert.deepEqual(desktop.errors, []);
	pass(
		'2D city guide, lazy requests, remembered priority, five outlets, marker sync, native keyboard, attribution, cart unchanged'
	);
	await page.close();

	const order = await open();
	await go(order.page);
	await align(order.page);
	await selectCity(order.page, 'berau');
	await order.page.locator('.outlet-cta').click();
	await order.page.getByRole('button', { name: /Zatiaras Merah Delima/ }).waitFor();
	assert.equal(new URL(order.page.url()).searchParams.get('outlet'), 'merah-delima');
	assert.equal((await storage(order.page))[2], 'merah-delima');
	assert.deepEqual(order.errors, []);
	await order.page.close();
	const fixture = [
		{
			menuItemId: 'jus-alpukat',
			name: 'Jus Alpukat',
			price: 18000,
			qty: 2,
			outletId: 'juanda',
			availability: 'AVAILABLE'
		}
	];
	const filled = await open({}, 'juanda', fixture);
	await go(filled.page);
	const beforeOrder = await storage(filled.page);
	await align(filled.page);
	await selectCity(filled.page, 'berau');
	assert.deepEqual(await storage(filled.page), beforeOrder);
	await filled.page.locator('.outlet-cta').click();
	const dialog = filled.page.getByRole('dialog', { name: 'Periksa ulang pesananmu' });
	await dialog.waitFor();
	assert.deepEqual(await storage(filled.page), beforeOrder);
	await dialog.getByRole('button', { name: 'Tetap di outlet ini' }).click();
	assert.deepEqual(await storage(filled.page), beforeOrder);
	await go(filled.page);
	await align(filled.page);
	await selectCity(filled.page, 'berau');
	await filled.page.locator('.outlet-cta').click();
	await dialog.getByRole('button', { name: 'Ganti ke Merah Delima' }).click();
	assert.equal((await storage(filled.page))[2], 'merah-delima');
	const moved = JSON.parse((await storage(filled.page))[1]);
	assert.equal(moved[0].qty, 2);
	assert.equal(moved[0].outletId, 'merah-delima');
	assert.deepEqual(filled.errors, []);
	await filled.page.close();
	const invalid = await open();
	await invalid.page.goto(`${BASE}/menu?outlet=unknown-outlet`, { waitUntil: 'networkidle' });
	await invalid.page.getByRole('button', { name: /Zatiaras Juanda/ }).waitFor();
	assert.equal((await storage(invalid.page))[2], 'juanda');
	assert.equal(await invalid.page.getByRole('dialog').count(), 0);
	assert.deepEqual(invalid.errors, []);
	await invalid.page.close();
	pass(
		'Order CTA carries selected outlet, populated cart requires confirmation, invalid outlet ignored'
	);

	for (const [width, height] of [
		[320, 568],
		[360, 640],
		[375, 812],
		[390, 844],
		[768, 1024],
		[1024, 768],
		[1280, 800],
		[1440, 900]
	]) {
		const check = await open({ viewport: { width, height }, reducedMotion: 'reduce' });
		await go(check.page);
		await align(check.page);
		await ready(check.page);
		await checkCredits(check.page, [320, 390].includes(width) ? `${width}` : null);
		await selectOutlet(check.page, 'slamet-riyadi');
		assert.equal(await finder(check.page).getByText('Detail outlet', { exact: true }).count(), 0);
		assert.equal(
			(await geometry(check.page)).contentsFit,
			true,
			'Long hours and location note must fit'
		);
		if (width === 320) {
			for (const [city, ids] of [
				['berau', ['merah-delima']],
				['balikpapan', ['kutilang', 'gatot-subroto']]
			]) {
				await selectCity(check.page, city);
				for (const id of ids) {
					await selectOutlet(check.page, id);
					const compact = await geometry(check.page);
					assert.ok(
						compact.contentsFit && Math.abs(compact.height - height) <= 1,
						JSON.stringify({ id, ...compact })
					);
				}
			}
			await selectCity(check.page, 'samarinda');
		}
		await selectOutlet(check.page, 'juanda');

		await align(check.page);
		await check.page.waitForTimeout(1000);
		const bounds = await geometry(check.page);
		assert.ok(bounds.scrollWidth <= width && bounds.mapWithinSection, JSON.stringify(bounds));
		assert.ok(Math.abs(bounds.height - height) <= 1 && bounds.contentsFit, JSON.stringify(bounds));
		assert.ok(bounds.controlsFit && bounds.pinClear && bounds.ctaExposed, JSON.stringify(bounds));
		if (width === 390) await snapshotTransition(check.page, '390');
		assert.equal(
			await finder(check.page).getByRole('group', { name: 'Tampilan outlet' }).count(),
			0
		);
		if ([320, 390, 1440].includes(width)) await snapshot(check.page, `dock-${width}`);
		if ([320, 390, 1440].includes(width)) {
			await selectOutlet(check.page, 'slamet-riyadi');

			assert.equal(await check.page.locator('.map-note').count(), 0);
			await selectOutlet(check.page, 'juanda');
			await check.page.locator('.map-backdrop').scrollIntoViewIfNeeded();
			assert.equal(await check.page.locator('.mobile-cta').count(), 0);
			const before = await check.page.evaluate(() => scrollY);
			const stage = await check.page.locator('.map-backdrop').boundingBox();
			await check.page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
			await check.page.mouse.wheel(0, 250);
			await check.page.waitForTimeout(400);
			assert.ok(
				(await check.page.evaluate(() => scrollY)) > before,
				'Map must allow page scrolling'
			);
		}
		assert.deepEqual(check.errors, []);
		pass(`${width}x${height}, contained map, pin/CTA clear, reduced motion`, bounds);
		await check.page.close();
	}
	const offline = await open({ viewport: { width: 320, height: 568 } });
	await offline.page.route('**/maps/zatiaras.json', (route) => route.abort());
	await go(offline.page);
	await align(offline.page);
	await offline.page.locator('.map-backdrop').scrollIntoViewIfNeeded();
	await offline.page.locator('[data-map-state="error"]').waitFor({ timeout: 30000 });
	await selectCity(offline.page, 'berau');
	assert.equal(
		await offline.page.locator('.outlet-cta').getAttribute('href'),
		'/menu?outlet=merah-delima'
	);
	await offline.page.unroute('**/maps/zatiaras.json');
	await offline.page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
	await ready(offline.page);
	assert.deepEqual(offline.errors, []);
	pass('short mobile: failed tiles, usable outlet controls, visible retry');
	await offline.page.close();
	const unsupported = await open();
	await unsupported.page.addInitScript(() => {
		const original = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function (type, ...args) {
			return String(type).includes('webgl') ? null : original.call(this, type, ...args);
		};
	});
	await go(unsupported.page);
	await align(unsupported.page);
	await unsupported.page.locator('.map-backdrop').scrollIntoViewIfNeeded();
	await unsupported.page.locator('[data-map-state="error"]').waitFor({ timeout: 30000 });
	assert.equal(
		await unsupported.page.locator('.outlet-cta').getAttribute('href'),
		'/menu?outlet=juanda'
	);
	assert.deepEqual(unsupported.errors, []);
	pass('no WebGL: working outlet navigation');
	await unsupported.page.close();
	const noJs = await open(
		{ javaScriptEnabled: false, viewport: { width: 320, height: 568 } },
		null
	);
	await go(noJs.page);
	assert.equal(await noJs.page.locator('.no-script-outlets a').count(), 5);
	pass('no JavaScript: five direct outlet links');
	writeFileSync('scratch/outlet-review/qa-results.json', JSON.stringify(report, null, 2));
} catch (error) {
	for (const [index, page] of loadedPages.entries())
		if (!page.isClosed())
			await page
				.screenshot({ path: `scratch/outlet-review/dock-failure-${index}.png` })
				.catch(() => {});
	throw error;
} finally {
	await browser.close();
}
