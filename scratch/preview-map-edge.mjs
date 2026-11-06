import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--enable-unsafe-swiftshader'] });
try {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
	page.on('pageerror', (error) => console.log('PAGE ERROR', error.message));
	page.on('console', (message) => { if (message.type() === 'error') console.log('CONSOLE', message.text()); });
	page.on('requestfailed', (request) => console.log('REQUEST FAILED', request.url(), request.failure()?.errorText));
	await page.addInitScript(() => localStorage.setItem('z-last-outlet', 'juanda'));
	await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
	await page.locator('#temukan-zatiaras').scrollIntoViewIfNeeded();
	await page.waitForFunction(() => ['ready', 'error'].includes(document.querySelector('.outlet-map')?.dataset.mapState), undefined, { timeout: 35000 });
	console.log('MAP', await page.locator('.outlet-map').getAttribute('data-map-state'));
	if (await page.locator('.outlet-map').getAttribute('data-map-state') !== 'ready') throw new Error('Live map unavailable for outlet preview');
	for (const [name, width, height, city] of [['balikpapan-wide', 1915, 817, 'balikpapan'], ['desktop', 1440, 900, 'samarinda'], ['390', 390, 844, 'samarinda']]) {
		await page.setViewportSize({ width, height });
		await page.locator('#finder-city').selectOption(city);
		if (await page.getByRole('group', { name: 'Tampilan outlet' }).count()) throw new Error('Map/list switch must be removed');
		if (!(await page.locator('.map-backdrop').isVisible())) throw new Error('Map must remain visible');
		if (width < 768) {
			await page.locator('#finder-outlet').selectOption('slamet-riyadi');
			if (await page.locator('#temukan-zatiaras').getAttribute('data-selected-outlet') !== 'slamet-riyadi') throw new Error('Manual outlet selection must remain available');
			await page.locator('#finder-outlet').selectOption('juanda');
		}
		await page.evaluate(() => document.fonts.ready);
		await page.locator('#temukan-zatiaras').evaluate((node) => window.scrollTo({ top: scrollY + node.getBoundingClientRect().top, behavior: 'instant' }));
		await page.waitForTimeout(800);
		await page.locator('#temukan-zatiaras').screenshot({ path: `scratch/outlet-review/reference-${name}.png` });
		for (const edge of ['top', 'bottom']) {
			await page.locator('#temukan-zatiaras').evaluate((node, edge) => {
				const r = node.getBoundingClientRect();
				window.scrollTo({ top: scrollY + (edge === 'top' ? r.top - 180 : r.bottom - innerHeight + 180), behavior: 'instant' });
			}, edge);
			await page.waitForTimeout(800);
			await page.screenshot({ path: `scratch/outlet-review/reference-${name}-${edge}.png` });
		}
	}
} finally { await browser.close(); }
