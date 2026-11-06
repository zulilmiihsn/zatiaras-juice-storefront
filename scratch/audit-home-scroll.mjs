import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const BASE = 'http://localhost:5173';
const OUT = 'scratch/performance-audit';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	headless: true
});
const results = { environment: 'Local Vite dev server; Chromium headless. Not production CWV or physical phone FPS.', responsive: [], motion: [] };

async function inspect(page) {
	return page.evaluate(() => {
		const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right }; };
		const header = document.querySelector('header');
		const links = [...header.querySelectorAll('a')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden');
		const vid = document.querySelector('video');
		return {
			width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, y: scrollY,
			header: { rect: rect(header), transform: getComputedStyle(header).transform, translate: getComputedStyle(header).translate, links: links.map(e => ({ text: e.textContent.trim() || e.getAttribute('aria-label'), ...rect(e) })), ctaVisible: !!document.querySelector('.mobile-cta') },
			video: { paused: vid.paused, time: vid.currentTime, source: vid.currentSrc, width: vid.videoWidth, height: vid.videoHeight, duration: vid.duration },
			footerSource: document.querySelector('footer picture img').currentSrc,
			unresolvedSvgRefs: [...document.querySelectorAll('svg use')].map(e => e.getAttribute('href')).filter(h => h?.startsWith('#') && !document.getElementById(h.slice(1)))
		};
	});
}

try {
	for (const width of [320, 360, 375, 390, 640, 768, 1024, 1280, 1440]) {
		const page = await browser.newPage({ viewport: { width, height: 900 } });
		const errors = [];
		page.on('pageerror', e => errors.push(e.message));
		await page.goto(BASE, { waitUntil: 'networkidle' });
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(500);
		const top = await inspect(page);
		await page.evaluate(() => window.scrollTo({ top: 1250, behavior: 'instant' }));
		await page.waitForTimeout(600);
		const scrolled = await inspect(page);
		results.responsive.push({ width, top, scrolled, errors });
		if ([320, 390, 640, 768, 1440].includes(width)) await page.screenshot({ path: `${OUT}/home-${width}-scrolled.png` });
		if ([320, 390, 1440].includes(width)) {
			await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
			await page.waitForTimeout(400);
			await page.screenshot({ path: `${OUT}/home-${width}-top.png` });
		}
		await page.close();
	}

	const tablet = await browser.newPage({ viewport: { width: 640, height: 900 } });
	await tablet.goto(BASE, { waitUntil: 'networkidle' });
	await tablet.getByRole('button', { name: 'Buka menu navigasi' }).click();
	await tablet.waitForTimeout(150);
	results.tabletDrawer = await tablet.evaluate(() => ({
		open: !!document.querySelector('[role="dialog"]'),
		videoPaused: document.querySelector('video').paused,
		bodyOverflow: document.body.style.overflow
	}));
	await tablet.keyboard.press('Escape');
	await tablet.waitForTimeout(350);
	results.tabletDrawer.closed = await tablet.evaluate(() => ({
		open: !!document.querySelector('[role="dialog"]'),
		videoPaused: document.querySelector('video').paused,
		focusLabel: document.activeElement.getAttribute('aria-label')
	}));
	await tablet.close();

	const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
	await mobile.goto(BASE, { waitUntil: 'networkidle' });
	await mobile.waitForTimeout(500);
	results.footerArtwork = {
		atTop: await mobile.evaluate(() =>
			performance.getEntriesByType('resource').filter(r => r.name.includes('wave-divider')).map(r => r.name)
		)
	};
	await mobile.evaluate(() => document.activeElement?.blur());
	await mobile.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
	await mobile.waitForTimeout(400);
	const hidden = await inspect(mobile);
	for (let i = 0; i < 40; i++) { await mobile.evaluate(() => window.scrollBy({ top: -2, behavior: 'instant' })); await mobile.waitForTimeout(100); }
	await mobile.waitForTimeout(400);
	const slowUp = await inspect(mobile);
	await mobile.evaluate(() => window.scrollBy({ top: -30, behavior: 'instant' }));
	await mobile.waitForTimeout(400);
	const fastUp = await inspect(mobile);
	results.mobileHeaderDirection = { hidden, slowUp, fastUp };
	await mobile.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await mobile.waitForTimeout(300);
	await mobile.getByRole('button', { name: 'Buka menu navigasi' }).click();
	await mobile.waitForTimeout(150);
	results.mobileDrawer = await mobile.evaluate(() => ({
		open: !!document.querySelector('[role="dialog"]'),
		videoPaused: document.querySelector('video').paused,
		bodyOverflow: document.body.style.overflow
	}));
	await mobile.keyboard.press('Escape');
	await mobile.waitForTimeout(400);
	results.mobileDrawer.closed = await mobile.evaluate(() => ({
		open: !!document.querySelector('[role="dialog"]'),
		videoPaused: document.querySelector('video').paused,
		focusLabel: document.activeElement.getAttribute('aria-label')
	}));
	await mobile.screenshot({ path: `${OUT}/mobile-header-return.png` });

	await mobile.evaluate(() => {
		const section = document.querySelector('section[aria-label="Pesan dulu tinggal ambil"]');
		window.scrollTo({ top: section.getBoundingClientRect().top + scrollY + 50, behavior: 'instant' });
	});
	await mobile.waitForTimeout(400);
	const middleStart = await inspect(mobile);
	await mobile.waitForTimeout(1000);
	const middleEnd = await inspect(mobile);
	results.coveredVideo = { middleStart, middleEnd };
	await mobile.screenshot({ path: `${OUT}/mobile-middle.png` });
	await mobile.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
	await mobile.waitForTimeout(500);
	results.footerVideo = await inspect(mobile);
	results.footerArtwork.atBottom = await mobile.evaluate(() =>
		performance.getEntriesByType('resource').filter(r => r.name.includes('wave-divider')).map(r => r.name)
	);
	await mobile.screenshot({ path: `${OUT}/mobile-footer.png` });
	await mobile.close();

	for (const reducedMotion of ['reduce', 'no-preference']) {
		const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
		const requests = [];
		page.on('request', r => { if (r.url().includes('/videos/')) requests.push(r.url()); });
		await page.goto(BASE, { waitUntil: 'networkidle' });
		await page.waitForTimeout(800);
		results.motion.push({ reducedMotion, requests, state: await inspect(page), scrollBehavior: await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior) });
		await page.close();
	}

	const saver = await browser.newPage({ viewport: { width: 390, height: 844 } });
	await saver.addInitScript(() => { if (navigator.connection) Object.defineProperty(navigator.connection, 'saveData', { configurable: true, get: () => true }); });
	await saver.goto(BASE, { waitUntil: 'networkidle' });
	await saver.waitForTimeout(800);
	results.saveData = { supported: await saver.evaluate(() => navigator.connection?.saveData), state: await inspect(saver) };
	await saver.close();

	for (const result of results.responsive) {
		assert.equal(result.errors.length, 0, `JavaScript errors at ${result.width}px`);
		assert.ok(result.scrolled.scrollWidth <= result.width, `Horizontal page overflow at ${result.width}px`);
		assert.ok(result.scrolled.header.links.every(link => link.x >= 0 && link.right <= result.width), `Header item clipped at ${result.width}px`);
	}
	for (const result of results.responsive.filter(result => result.width >= 768)) {
		const top = new Map(result.top.header.links.map(link => [link.text.trim(), link]));
		for (const link of result.scrolled.header.links) {
			const before = top.get(link.text.trim());
			if (before) assert.ok(Math.abs(before.x - link.x) < 1, `Navbar shifted at ${result.width}px: ${link.text}`);
		}
	}
	assert.equal(results.mobileHeaderDirection.hidden.header.rect.y, -73, 'Mobile header should hide on downward scroll');
	assert.equal(results.mobileHeaderDirection.slowUp.header.rect.y, 0, 'Mobile header should return during slow upward scroll');
	assert.equal(results.tabletDrawer.open, true, 'Compact 640px drawer should open');
	assert.equal(results.tabletDrawer.closed.open, false, 'Compact 640px drawer should close');
	assert.equal(results.mobileDrawer.videoPaused, true, 'Video should pause while mobile drawer is open');
	assert.equal(results.mobileDrawer.closed.videoPaused, false, 'Video should resume after mobile drawer closes');
	assert.equal(results.coveredVideo.middleEnd.video.paused, true, 'Video should pause behind the main canvas');
	assert.equal(results.footerVideo.video.paused, true, 'Video should pause in the footer');
	assert.equal(results.footerArtwork.atTop.length, 0, 'Footer artwork should not load at page top');
	assert.ok(results.footerArtwork.atBottom.length > 0, 'Footer artwork should load near the footer');
	assert.ok(results.motion.find(result => result.reducedMotion === 'reduce').requests.every(url => !/hero\\.(webm|mp4)$/.test(url)), 'Reduced motion must not download video sources');
	assert.equal(results.saveData.supported, true, 'Test browser should expose Save-Data for simulation');
	assert.equal(results.saveData.state.video.paused, true, 'Video should pause with Save-Data enabled');
} finally {
	await browser.close();
	fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({
	responsive: results.responsive.map(r => ({ width: r.width, pageOverflow: r.scrolled.scrollWidth > r.scrolled.width, headerOutOfBounds: r.scrolled.header.links.filter(l => l.right > r.width || l.x < 0).map(l => l.text), totalHeight: r.top.height, errors: r.errors })),
	header: results.mobileHeaderDirection && { afterDown: results.mobileHeaderDirection.hidden.header.rect.y, afterSlowUp: results.mobileHeaderDirection.slowUp.header.rect.y, afterFastUp: results.mobileHeaderDirection.fastUp.header.rect.y },
	coveredVideo: results.coveredVideo && { paused: results.coveredVideo.middleEnd.video.paused, t1: results.coveredVideo.middleStart.video.time, t2: results.coveredVideo.middleEnd.video.time },
	footer: results.footerVideo?.video,
	motion: results.motion.map(r => ({ reducedMotion: r.reducedMotion, paused: r.state.video.paused, time: r.state.video.time, videoRequests: r.requests, scrollBehavior: r.scrollBehavior })),
	saveData: results.saveData && { saveData: results.saveData.supported, videoPaused: results.saveData.state.video.paused }
}, null, 2));
