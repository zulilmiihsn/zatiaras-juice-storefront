// Check the offline sequence as displayed by the real browser, including failures.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173';
const out = 'scratch/liquid2-offline/qa-rise';
mkdirSync(out, { recursive: true });
const checks = [];
const timings = [];
const browser = await chromium.launch({
	executablePath:
		process.env.CHROMIUM_PATH ||
		'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
const check = (name, condition) => {
	assert.ok(condition, name);
	checks.push(name);
};

async function scroll(page, progress, waitForVideo = true) {
	const start = Date.now();
	await page.evaluate((p) => {
		const track = document.querySelector('[data-liquid-track]');
		window.scrollTo({
			top: track.offsetTop + (track.offsetHeight - innerHeight) * p,
			behavior: 'instant'
		});
	}, progress);
	if (waitForVideo) {
		await page.waitForFunction(() => {
			const video = document.querySelector('.film video');
			const track = document.querySelector('[data-liquid-track]');
			const p = (scrollY - track.offsetTop) / (track.offsetHeight - innerHeight);
			const last = Math.round(video.duration * 24) - 1;
			const target = Math.round(Math.max(0, Math.min(1, p)) * last) / 24;
			return !video.seeking && Math.abs(video.currentTime - target) < 1 / 48;
		});
		timings.push(Date.now() - start);
	}
}

async function pixels(page) {
	return page.evaluate(() => {
		const video = document.querySelector('.film video');
		const canvas = document.createElement('canvas');
		canvas.width = 160;
		canvas.height = 100;
		const context = canvas.getContext('2d');
		context.drawImage(video, 0, 0, 160, 100);
		return Array.from(context.getImageData(0, 0, 160, 100).data);
	});
}

function pinkFraction(rgba, region = () => true) {
	let pink = 0;
	let total = 0;
	for (let i = 0; i < rgba.length; i += 4) {
		const pixel = i / 4;
		if (!region(pixel % 160, Math.floor(pixel / 160))) continue;
		total++;
		if (rgba[i] > 110 && rgba[i] > rgba[i + 1] * 1.4 && rgba[i + 2] > rgba[i + 1] * 1.15) pink++;
	}
	return pink / total;
}

try {
	for (const [name, width, height] of [
		['desktop', 1920, 1080],
		['tablet', 768, 1024],
		['mobile', 390, 844],
		['compact', 320, 568]
	]) {
		const page = await browser.newPage({
			viewport: { width, height },
			hasTouch: name !== 'desktop'
		});
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`${base}/qa/liquid2`);
		await page.waitForSelector('[data-liquid-mode="baked"]', { timeout: 60000 });
		check(`${name}: video decoded`, true);
		const dimensions = await page.locator('.film video').evaluate((video) => ({
			width: video.videoWidth,
			height: video.videoHeight
		}));
		check(
			`${name}: native video resolution`,
			dimensions.width === (width >= 768 ? 3840 : 1920) &&
				dimensions.height === (width >= 768 ? 2160 : 1080)
		);
		await page.screenshot({ path: `${out}/${name}-calm.png` });
		const calm = await pixels(page);
		check(
			`${name}: frame zero has no liquid outside the product`,
			pinkFraction(calm, (x) => x < 80) === 0
		);
		if (name !== 'desktop') {
			check(
				`${name}: portrait media fills the stage`,
				await page.locator('.film video').evaluate((video) => {
					const media = video.getBoundingClientRect();
					const stage = document.querySelector('.liquid-stage').getBoundingClientRect();
					return Math.abs(media.height - stage.height) < 1 && Math.abs(media.top - stage.top) < 1;
				})
			);
			await page.evaluate(() => window.scrollTo({ top: 40, behavior: 'instant' }));
			await page.waitForFunction(
				() =>
					Math.abs(
						document.querySelector('.film video').getBoundingClientRect().top -
							document.querySelector('.liquid-stage').getBoundingClientRect().top
					) < 1
			);
			check(`${name}: media follows the stage while the header scrolls away`, true);
		}
		await scroll(page, 0.12);
		const entering = await pixels(page);
		check(
			`${name}: first liquid stays below the cup`,
			pinkFraction(entering, (x, y) => x < 80 && y < 60) === 0
		);
		await page.screenshot({ path: `${out}/${name}-entering.png` });
		await scroll(page, 0.34);
		const impact = await pixels(page);
		let difference = 0;
		for (let i = 0; i < calm.length; i += 4)
			if (Math.abs(calm[i] - impact[i]) + Math.abs(calm[i + 1] - impact[i + 1]) > 20) difference++;
		check(`${name}: decoded impact differs from calm`, difference > 120);
		await page.screenshot({ path: `${out}/${name}-impact.png` });
		await scroll(page, 0.14);
		check(`${name}: reverse seek resolves`, true);
		await scroll(page, 0.62, false);
		await scroll(page, 0.18, false);
		await scroll(page, 0.74);
		check(`${name}: rapid input reaches newest frame`, true);
		await scroll(page, 1, false);
		await page.waitForSelector('[data-liquid-track][data-covered="true"]');
		check(`${name}: full cover`, true);
		check(
			`${name}: coverage waits for the final seek`,
			await page
				.locator('.film video')
				.evaluate(
					(video) =>
						!video.seeking && Math.abs(video.currentTime - (video.duration - 1 / 24)) < 1 / 48
				)
		);
		check(`${name}: rendered final frame is juice`, pinkFraction(await pixels(page)) > 0.98);
		check(
			`${name}: simulated flood covers the entire viewport`,
			await page.locator('.film video').evaluate((video) => {
				const box = video.getBoundingClientRect();
				return (
					getComputedStyle(document.querySelector('.film .cover')).display === 'none' &&
					box.top <= 0 &&
					box.left <= 0 &&
					box.right >= innerWidth &&
					box.bottom >= innerHeight
				);
			})
		);
		await page.screenshot({ path: `${out}/${name}-covered.png` });
		await scroll(page, 0.2, false);
		await page.waitForSelector('[data-liquid-track][data-covered="false"]');
		await page.waitForFunction(() => {
			const video = document.querySelector('.film video');
			return video.currentTime < video.duration - 0.12;
		});
		await scroll(page, 1, false);
		await page.waitForSelector('[data-liquid-track][data-covered="true"]');
		check(
			`${name}: quick reverse cannot reuse stale coverage`,
			await page
				.locator('.film video')
				.evaluate(
					(video) =>
						!video.seeking && Math.abs(video.currentTime - (video.duration - 1 / 24)) < 1 / 48
				)
		);
		await scroll(page, 0);
		check(
			`${name}: reverse returns to a liquid-free frame`,
			pinkFraction(await pixels(page), (x) => x < 80) === 0
		);
		await scroll(page, 0.4);
		await page.waitForSelector('[data-liquid-track][data-covered="false"]');
		check(`${name}: reverse uncovers`, true);
		check(
			`${name}: no horizontal overflow`,
			await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
		);
		check(`${name}: no runtime errors`, errors.length === 0);
		await page.close();
	}

	for (const preference of ['reduce', 'save-data']) {
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			reducedMotion: preference === 'reduce' ? 'reduce' : 'no-preference'
		});
		let transfers = 0;
		page.on('request', (request) => {
			if (/\/videos\/liquid2\/rise-.*\.mp4/.test(request.url())) transfers++;
		});
		if (preference === 'save-data')
			await page.addInitScript(() => {
				const connection = new EventTarget();
				connection.saveData = true;
				Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
			});
		await page.goto(`${base}/qa/liquid2`);
		await page.waitForFunction(() => document.querySelector('.film img.frame').naturalWidth > 0);
		await scroll(page, 0.4, false);
		await page.waitForTimeout(250);
		check(`${preference}: no video transfer`, transfers === 0);
		check(
			`${preference}: still remains visible`,
			(await page.locator('.film').getAttribute('data-liquid-mode')) === 'still'
		);
		await scroll(page, 1, false);
		await page.waitForSelector('[data-liquid-track][data-covered="true"]');
		check(`${preference}: coverage still works`, true);
		check(
			`${preference}: final rendered texture is available`,
			await page.locator('.film .cover').evaluate((img) => img.complete && img.naturalWidth > 0)
		);
		if (preference === 'reduce') {
			await scroll(page, 0.2, false);
			await page.emulateMedia({ reducedMotion: 'no-preference' });
			await page.waitForSelector('[data-liquid-mode="baked"]');
			await scroll(page, 0.3);
			check('motion preference change enables current frame', true);
		}
		await page.close();
	}

	const deferred = await browser.newPage({ viewport: { width: 390, height: 844 } });
	let releaseMedia;
	const mediaGate = new Promise((resolve) => {
		releaseMedia = resolve;
	});
	await deferred.route('**/videos/liquid2/rise-*.mp4', async (route) => {
		await mediaGate;
		await route.continue();
	});
	try {
		await deferred.goto(`${base}/qa/liquid2`, { waitUntil: 'domcontentloaded' });
		await deferred.waitForSelector('[data-liquid-mode="loading"]');
		await scroll(deferred, 1, false);
		await deferred.waitForSelector('[data-liquid-track][data-covered="true"]');
		await deferred.evaluate(() => {
			window.decodePromotions = [];
			const host = document.querySelector('.film');
			const video = host.querySelector('video');
			new MutationObserver(() => {
				if (host.dataset.liquidMode === 'baked')
					window.decodePromotions.push({
						seeking: video.seeking,
						time: video.currentTime,
						end: video.duration - 1 / 24
					});
			}).observe(host, { attributes: true, attributeFilter: ['data-liquid-mode'] });
		});
		releaseMedia();
		await deferred.waitForSelector('[data-liquid-mode="baked"]');
		const promotions = await deferred.evaluate(() => window.decodePromotions);
		check(
			'deferred media never reveals an obsolete opening frame at full cover',
			promotions.length > 0 &&
				promotions.every((frame) => !frame.seeking && Math.abs(frame.time - frame.end) < 1 / 48)
		);
		check(
			'deferred media retains actual juice coverage',
			pinkFraction(await pixels(deferred)) > 0.98
		);
	} finally {
		releaseMedia();
		await deferred.unrouteAll({ behavior: 'wait' });
		await deferred.close();
	}

	const failed = await browser.newPage();
	await failed.route('**/videos/liquid2/rise-*.mp4', (route) => route.abort());
	await failed.goto(`${base}/qa/liquid2`);
	await failed.waitForSelector('[data-liquid-mode="error"]');
	check(
		'failed media retains original product poster',
		await failed.locator('.film img.frame').evaluate((img) => img.complete && img.naturalWidth > 0)
	);
	await scroll(failed, 1, false);
	await failed.waitForSelector('[data-liquid-track][data-covered="true"]');
	check('failed media still covers', true);
	await failed.close();

	const noJs = await browser.newPage({ javaScriptEnabled: false });
	await noJs.goto(`${base}/qa/liquid2`);
	check(
		'no JavaScript retains original product poster',
		await noJs.locator('.film img.frame').evaluate((img) => img.complete && img.naturalWidth > 0)
	);
	await noJs.close();
} finally {
	await browser.close();
	timings.sort((a, b) => a - b);
	const report = {
		checks,
		seekP95Ms: timings[Math.min(timings.length - 1, Math.floor(timings.length * 0.95))],
		capturedAt: new Date().toISOString()
	};
	writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
	console.log(JSON.stringify(report));
}
