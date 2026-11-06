import { chromium } from 'playwright-core';

const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
const mobile = process.argv.includes('--mobile');
try {
	const page = await browser.newPage({
		viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
		hasTouch: mobile
	});
	const cdp = await page.context().newCDPSession(page);
	if (mobile) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
	await page.addInitScript(() => {
		window.profileSizes = { textures: [], buffers: [] };
		const proto = WebGL2RenderingContext.prototype, texture = proto.texImage2D, buffer = proto.bufferData;
		proto.texImage2D = function (...args) {
			if (args.length === 9 && window.profileSizes.textures.length < 16) window.profileSizes.textures.push([args[2], args[3], args[4]]);
			return texture.apply(this, args);
		};
		proto.bufferData = function (target, data, ...rest) {
			const bytes = typeof data === 'number' ? data : data?.byteLength;
			if (target === this.ARRAY_BUFFER && !window.profileSizes.buffers.includes(bytes)) window.profileSizes.buffers.push(bytes);
			return buffer.call(this, target, data, ...rest);
		};
	});
	await page.goto('http://127.0.0.1:5199/qa/liquid2');
	await page.waitForSelector('[data-liquid-mode="live"]');
	await page.waitForTimeout(1500);
	console.log('quality', JSON.stringify(await page.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches, touch: navigator.maxTouchPoints, ...window.profileSizes }))));
	await cdp.send('Profiler.enable');
	await cdp.send('Profiler.start');
	await page.evaluate(() => {
		const started = performance.now();
		const track = document.querySelector('[data-liquid-track]');
		window.profileScroll = setInterval(() => {
			const p = 0.6 * Math.min(1, (performance.now() - started) / 4000);
			scrollTo({ top: track.offsetTop + (track.offsetHeight - innerHeight) * p, behavior: 'instant' });
		}, 16);
	});
	await page.waitForTimeout(4000);
	await page.evaluate(() => clearInterval(window.profileScroll));
	const { profile } = await cdp.send('Profiler.stop');
	const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
	const times = new Map();
	for (let i = 0; i < profile.samples.length; i++) {
		const id = profile.samples[i];
		times.set(id, (times.get(id) || 0) + profile.timeDeltas[i]);
	}
	console.log(
		JSON.stringify(
			[...times].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([id, us]) => ({
				name: nodes.get(id).callFrame.functionName,
				file: nodes.get(id).callFrame.url.replace('http://127.0.0.1:5199/', ''),
				ms: Math.round(us / 1000)
			})),
			null,
			2
		)
	);
} finally {
	await browser.close();
}
