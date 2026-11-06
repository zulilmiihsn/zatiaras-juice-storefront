// Run against the local dev server. Exercises the actual WebGL2 shader and scroll lifecycle.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5199';
// QA_PATH selects the preview, e.g. /qa/liquid1 for the frozen Liquid 1 copy.
const route = process.env.QA_PATH || '/qa/liquid';
// Liquid 2 is a different engine: its state comes from window.liquid2Debug, not shader uniforms.
const liquid2 = route === '/qa/liquid2';
const out = 'scratch/liquid-review';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
	executablePath:
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
		'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
const results = [];
const errors = [];
const pass = (name, detail = {}) => {
	results.push({ name, ...detail });
	console.log('PASS', name, JSON.stringify(detail));
};

async function instrument(page) {
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => {
		if (/shader unavailable|GL_INVALID|GL_OUT_OF_MEMORY/.test(message.text()))
			errors.push(message.text());
	});
	await page.addInitScript((liquid2) => {
		const probe = (window.liquidProbe = {
			frames: 0,
			uniforms: {},
			sample: null,
			fieldUploads: 0,
			fieldPeak: 0,
			fieldNonzero: 0
		});
		const names = new WeakMap();
		const proto = WebGL2RenderingContext.prototype;
		const positionBuffers = new WeakMap();
		const attributePointer = proto.vertexAttribPointer;
		proto.vertexAttribPointer = function (index, size, ...rest) {
			if (liquid2 && index === 0 && size === 3) {
				const buffer = this.getParameter(this.ARRAY_BUFFER_BINDING);
				if (buffer) positionBuffers.set(buffer, rest[2] ? rest[2] / 4 : size);
			}
			return attributePointer.call(this, index, size, ...rest);
		};
		const uploadVertices = proto.bufferSubData;
		proto.bufferSubData = function (target, offset, data, ...rest) {
			if (
				liquid2 &&
				target === this.ARRAY_BUFFER &&
				data instanceof Float32Array &&
				data.length % 3 === 0 &&
				positionBuffers.has(this.getParameter(this.ARRAY_BUFFER_BINDING))
			) {
				let low = Infinity,
					high = -Infinity;
				const stride = positionBuffers.get(this.getParameter(this.ARRAY_BUFFER_BINDING));
				for (let i = 1; i < data.length; i += stride) {
					low = Math.min(low, data[i]);
					high = Math.max(high, data[i]);
				}
				probe.surfaceRange = high - low;
			}
			return uploadVertices.call(this, target, offset, data, ...rest);
		};
		const upload = proto.texSubImage2D;
		proto.texSubImage2D = function (...args) {
			const data = args[8];
			// Only the 2D ripple field; the 1D wave line is uploaded as a single row.
			if (
				data instanceof Float32Array &&
				args[5] > 1 &&
				(!liquid2 || args[6] === this.RED) &&
				this.canvas.closest('[data-liquid-mode]')
			) {
				probe.fieldUploads++;
				probe.fieldPeak = 0;
				probe.fieldNonzero = 0;
				for (const value of data) {
					probe.fieldPeak = Math.max(probe.fieldPeak, Math.abs(value));
					if (Math.abs(value) > 0.0001) probe.fieldNonzero++;
				}
			}
			return upload.apply(this, args);
		};
		const get = proto.getUniformLocation;
		proto.getUniformLocation = function (program, name) {
			const location = get.call(this, program, name);
			if (location) names.set(location, name);
			return location;
		};
		for (const method of ['uniform1f', 'uniform2f', 'uniform3f']) {
			const original = proto[method];
			proto[method] = function (location, ...values) {
				const name = names.get(location);
				if (name) probe.uniforms[name] = values;
				return original.call(this, location, ...values);
			};
		}
		const instanced = proto.drawArraysInstanced;
		proto.drawArraysInstanced = function (...args) {
			if (liquid2) {
				probe.volumeSplats = args[3];
				probe.maxVolumeSplats = Math.max(probe.maxVolumeSplats || 0, args[3]);
			} else {
				probe.droplets = args[3];
				probe.maxDroplets = Math.max(probe.maxDroplets || 0, args[3]);
			}
			return instanced.apply(this, args);
		};
		const draw = proto.drawElements;
		proto.drawElements = function (...args) {
			draw.apply(this, args);
			if (!this.canvas.closest('[data-liquid-mode]')) return;
			probe.frameDraws = (probe.frameDraws || 0) + 1;
			if (liquid2 && probe.pendingFrame) return;
			const capture = () => {
				probe.lastFrameDraws = probe.frameDraws;
				probe.frameDraws = 0;
				probe.frames++;
				if (probe.capture) {
					const samples = [];
					for (const y of [0.01, 0.25, 0.5, 0.75, 0.99]) {
						for (const x of [0.01, 0.25, 0.5, 0.75, 0.99]) {
							const pixel = new Uint8Array(4);
							this.readPixels(
								Math.floor(this.canvas.width * x),
								Math.floor(this.canvas.height * y),
								1,
								1,
								this.RGBA,
								this.UNSIGNED_BYTE,
								pixel
							);
							samples.push([...pixel]);
						}
					}
					probe.sample = { samples, error: this.getError() };
					probe.capture = false;
				}
				if (probe.captureRect) {
					const [left, top, right, bottom] = probe.captureRect;
					const width = this.canvas.width,
						height = this.canvas.height;
					const x = Math.max(0, Math.floor(left * width));
					const y = Math.max(0, Math.floor((1 - bottom) * height));
					const w = Math.max(1, Math.min(width - x, Math.ceil((right - left) * width)));
					const h = Math.max(1, Math.min(height - y, Math.ceil((bottom - top) * height)));
					const pixels = new Uint8Array(w * h * 4);
					this.readPixels(x, y, w, h, this.RGBA, this.UNSIGNED_BYTE, pixels);
					let pink = 0,
						other = 0,
						tinted = 0,
						partial = 0;
					for (let i = 0; i < pixels.length; i += 4) {
						if (pixels[i + 3] > 20) tinted++;
						if (pixels[i + 3] > 20 && pixels[i + 3] < 235) partial++;
						if (pixels[i + 3] < 250) continue;
						if (pixels[i] > 170 && pixels[i + 1] < 110 && pixels[i + 2] > 60) pink++;
						else other++;
					}
					probe.rectStats = { pink, other, tinted, partial, total: w * h };
					probe.captureRect = null;
				}
				if (probe.captureMask) {
					const width = this.canvas.width,
						height = this.canvas.height;
					const pixels = new Uint8Array(width * height * 4);
					this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels);
					const visited = new Uint8Array(width * height);
					const queue = new Int32Array(width * height);
					let head = 0,
						tail = 0;
					const add = (i) => {
						if (i >= 0 && i < visited.length && !visited[i] && pixels[i * 4 + 3] >= 128) {
							visited[i] = 1;
							queue[tail++] = i;
						}
					};
					for (let x = 0; x < width; x++) add(x);
					while (head < tail) {
						const i = queue[head++],
							x = i % width;
						if (x > 0) add(i - 1);
						if (x < width - 1) add(i + 1);
						add(i - width);
						add(i + width);
					}
					let detached = 0;
					for (let i = 0; i < visited.length; i++)
						if (pixels[i * 4 + 3] >= 128 && !visited[i]) detached++;
					probe.continuity = { connected: tail, detached };
					probe.captureMask = false;
				}
			};
			// Liquid 2 draws several sheets after the pool. Read only after the complete
			// synchronous render, while the drawing buffer is still available this frame.
			if (liquid2) {
				probe.pendingFrame = true;
				queueMicrotask(() => {
					probe.pendingFrame = false;
					capture();
				});
			} else capture();
		};
	}, liquid2);
}

async function scroll(page, progress) {
	await page.evaluate((progress) => {
		const track = document.querySelector('[data-liquid-track]');
		const top = track.getBoundingClientRect().top + scrollY;
		window.scrollTo({
			top: top + (track.offsetHeight - innerHeight) * progress,
			behavior: 'instant'
		});
	}, progress);
}

// The crest height eases toward its scroll target; measure input effects only after it rests.
async function settled(page) {
	if (liquid2) {
		await page.waitForFunction(() => window.liquid2Debug.drive < 0.01, undefined, {
			timeout: 30000
		});
		return;
	}
	await page.waitForFunction(
		() => {
			const probe = window.liquidProbe;
			const height = probe.uniforms.uH?.[0];
			const same = height !== undefined && height === probe.restingHeight;
			probe.restingHeight = height;
			return same;
		},
		undefined,
		{ polling: 250 }
	);
	// Drops still landing from the scroll ring the face; test input on a quiet surface.
	await page.waitForFunction(() => window.liquidProbe.fieldPeak === 0, undefined, {
		timeout: 20000
	});
}

// The drink sits inside the liquid: part of its box shows liquid in front of it, part shows
// the drink, and hiding the drink reveals liquid that was behind it.
async function liquid2Occlusion(page, width) {
	await scroll(page, 0.35);
	await page.waitForFunction(() => window.liquid2Debug.runUpHeight < 0.03, undefined, {
		timeout: 20000
	});
	// Scrolling surges around the drink and can swallow it; measure once the surges end
	// (mid-track the swell drive rests at its floor, not 0).
	await page.waitForFunction(() => window.liquid2Debug.drive < 0.2, undefined, { timeout: 30000 });
	await page.waitForTimeout(1500);
	const rect = await page.evaluate(() => window.liquid2Debug.drinkRect());
	const measure = async () => {
		await page.evaluate((rect) => (window.liquidProbe.captureRect = rect), rect);
		await page.waitForFunction(() => window.liquidProbe.captureRect === null);
		return page.evaluate(() => window.liquidProbe.rectStats);
	};
	const shown = await measure();
	await page.evaluate(() => window.liquid2Debug.hideDrink());
	await page.waitForTimeout(100);
	const hidden = await measure();
	await page.evaluate(() => window.liquid2Debug.showDrink());
	await page.screenshot({ path: `${out}/liquid2-wrap-${width}.png` });
	assert.ok(shown.other > shown.total * 0.05, `Drink not visible: ${JSON.stringify(shown)}`);
	assert.ok(shown.pink > shown.total * 0.05, `No liquid in front: ${JSON.stringify(shown)}`);
	// Fractions, not counts: adaptive resolution may resize the canvas between captures.
	assert.ok(
		hidden.pink / hidden.total > shown.pink / shown.total + 0.03,
		`No liquid behind: ${JSON.stringify({ shown, hidden })}`
	);
	pass(`Liquid wraps the drink front and back ${width}`, { shown, hidden });
}

// A sustained native scroll must deform the pool itself in one indexed draw. The former
// separate sheet draws could overlap its silhouette and still leave a visible hard join.
// The reservoir retains its indexed draw. Thin films now share the final camera,
// material and depth buffer; connectivity is measured after the complete render.
async function liquid2MovingRunUp(page, width) {
	await scroll(page, 0);
	await page.waitForFunction(
		() =>
			window.liquid2Debug.level < 0.01 &&
			window.liquid2Debug.drive < 0.01 &&
			window.liquid2Debug.runUpHeight < 0.03,
		undefined,
		{ timeout: 20000 }
	);
	// Physical node height alone cannot prove that a thin crest survived reconstruction.
	const waterPixels = async () => {
		await page.evaluate(() => {
			window.liquid2Debug.hideDrink();
			window.liquidProbe.captureRect = [0, 0.2, 1, 0.6];
			window.liquidProbe.captureMask = true;
		});
		await page.waitForFunction(
			() => window.liquidProbe.captureRect === null && !window.liquidProbe.captureMask
		);
		const stats = await page.evaluate(() => ({
			tinted: window.liquidProbe.rectStats.tinted,
			continuity: window.liquidProbe.continuity
		}));
		await page.evaluate(() => window.liquid2Debug.showDrink());
		return stats;
	};
	const before = await waterPixels();
	const moving = page.evaluate(async () => {
		window.stopRunUpScroll = false;
		const track = document.querySelector('[data-liquid-track]');
		const travel = track.offsetHeight - innerHeight;
		const started = performance.now();
		await new Promise((resolve) => {
			const move = (now) => {
				const t = Math.min(1, (now - started) / 2500);
				scrollTo({ top: track.offsetTop + travel * (0.05 + 0.6 * t), behavior: 'instant' });
				if (t < 1 && !window.stopRunUpScroll) requestAnimationFrame(move);
				else resolve();
			};
			requestAnimationFrame(move);
		});
	});
	let visiblePixels;
	try {
		await page.waitForFunction(() => window.liquid2Debug.runUpHeight > 0.45, undefined, {
			timeout: 20000
		});
		const crest = await waterPixels();
		visiblePixels = crest.tinted - before.tinted;
		assert.ok(
			crest.continuity.detached <= 32,
			`Detached water during impact: ${JSON.stringify(crest.continuity)}`
		);
		assert.ok(
			visiblePixels > 32,
			`The simulated crest was not visible above the quiet pool: ${visiblePixels} pixels`
		);
	} finally {
		await page.evaluate(() => (window.stopRunUpScroll = true));
		await moving;
	}
	const draws = await page.evaluate(() => window.liquidProbe.lastFrameDraws);
	assert.ok(
		await page.evaluate(() => window.liquidProbe.volumeSplats > 0),
		'The local fluid density must be rendered'
	);
	const state = await page.evaluate(() => ({
		level: window.liquid2Debug.level,
		farFieldPeak: window.liquid2Debug.farFieldPeak,
		runUp: window.liquid2Debug.runUpHeight
	}));
	assert.ok(
		state.level < 0.02 && state.farFieldPeak < 0.06,
		`The main pool rose with the collision film: ${JSON.stringify(state)}`
	);
	await page.screenshot({ path: `${out}/liquid2-moving-${width}.png` });
	pass(`Collision run-up rises locally while the main pool stays low ${width}`, {
		draws,
		visiblePixels,
		...state
	});
}

// The far edge of the pool melts into the page instead of ending on a hard line: the band
// around it holds many partly transparent pixels, not a single antialiased row.
async function liquid2EdgeFade(page, width) {
	await scroll(page, 0);
	await page.waitForFunction(() => window.liquid2Debug.level < 0.01, undefined, { timeout: 20000 });
	await page.waitForTimeout(500);
	await page.evaluate(() => (window.liquidProbe.captureRect = [0, 0.5, 1, 0.8]));
	await page.waitForFunction(() => window.liquidProbe.captureRect === null);
	const band = await page.evaluate(() => window.liquidProbe.rectStats);
	const rowPixels =
		band.total /
		Math.round(0.3 * (await page.evaluate(() => document.querySelector('canvas').height)));
	assert.ok(band.partial > rowPixels * 12, `Hard back edge: ${JSON.stringify(band)}`);
	pass(`Back edge fades into the page ${width}`, band);
}

// Cover is a fade, not a cut: just before the lens goes under, the page area above the
// pool is partly tinted, not still fully transparent.
async function liquid2CoverFade(page, width) {
	await scroll(page, 1);
	await page.waitForFunction(
		// The fade runs from camera height - 0.25 to camera height (1.0): sample mid-fade.
		() => window.liquid2Debug.level > 0.85 && window.liquid2Debug.level < 0.95,
		undefined,
		{ timeout: 20000, polling: 16 }
	);
	await page.evaluate(() => (window.liquidProbe.captureRect = [0, 0, 1, 0.08]));
	await page.waitForFunction(() => window.liquidProbe.captureRect === null);
	const top = await page.evaluate(() => window.liquidProbe.rectStats);
	assert.ok(top.tinted > top.total * 0.5, `Top still bare: ${JSON.stringify(top)}`);
	pass(`Cover fades in before the lens submerges ${width}`, top);
}

async function open(viewport, options = {}) {
	const page = await browser.newPage({ viewport, ...options });
	await instrument(page);
	return page;
}

async function load(page, mode = 'live') {
	await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
	await page
		.waitForSelector(`[data-liquid-mode="${mode}"]`, { timeout: 45000 })
		.catch(async (error) => {
			console.log('Load state', await page.locator('body').innerText(), errors);
			console.log(
				'Liquid mode',
				await page.locator('[data-liquid-mode]').getAttribute('data-liquid-mode')
			);
			throw error;
		});
	await page.evaluate(() => document.fonts.ready);
}

try {
	for (const width of process.argv.includes('--fallback-only')
		? []
		: [320, 360, 375, 390, 768, 1024, 1280, 1440]) {
		const height = width < 768 ? 844 : 900;
		const page = await open({ width, height }, { hasTouch: width < 768 });
		await load(page);
		await scroll(page, 0);
		await page.waitForFunction(() => window.liquidProbe.frames > 2);
		const layout = await page.evaluate(() => ({
			overflow: document.documentElement.scrollWidth > innerWidth,
			width: document.querySelector('canvas').width,
			height: document.querySelector('canvas').height
		}));
		assert.equal(layout.overflow, false, `Horizontal overflow at ${width}`);
		assert.ok(layout.width > 0 && layout.height > 0);
		await page.screenshot({ path: `${out}/viewport-${width}.png` });
		pass(`WebGL2 and viewport ${width}`, layout);
		if (width === 390 || width === 1440) {
			await page.waitForTimeout(1500);
			assert.equal(await page.evaluate(() => window.liquidProbe.maxDroplets || 0), 0);
			pass(`Calm surface throws no droplets ${width}`);
			if (liquid2) await liquid2MovingRunUp(page, width);
			await scroll(page, 0.58);
			if (liquid2) {
				// Liquid 2 has no spray: scrolling stirs the surface but draws no drops.
				await page.waitForFunction(() => window.liquid2Debug.drive > 0.2, undefined, {
					timeout: 20000
				});
				await page.waitForTimeout(1500);
				assert.equal(await page.evaluate(() => window.liquidProbe.maxDroplets || 0), 0);
				pass(`Scrolling stirs the surface without drops ${width}`);
			} else {
				await page.waitForFunction(() => window.liquidProbe.maxDroplets > 0, undefined, {
					timeout: 20000
				});
				pass(`Colliding waves throw droplets ${width}`);
			}
			for (const progress of [0.28, 0.58, 0.82]) {
				await scroll(page, progress);
				await page.waitForTimeout(1200);
				if (progress === 0.28) {
					await page.evaluate(() => {
						window.liquidProbe.sample = null;
						window.liquidProbe.capture = true;
						window.liquidProbe.captureMask = true;
					});
					await page.waitForFunction(() => window.liquidProbe.sample !== null);
					const pink = await page.evaluate(() =>
						window.liquidProbe.sample.samples.filter((p) => p[3] === 255)
					);
					assert.ok(pink.length > 0, 'Wave must be visible');
					const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
					assert.ok(
						median(pink.map((p) => p[0])) >= 220 && median(pink.map((p) => p[2])) >= 100,
						'Pink body must not become dark red'
					);
					pass(`Bright pink surface ${width}`);
					const continuity = await page.evaluate(() => window.liquidProbe.continuity);
					assert.ok(
						continuity.connected > 1000 && continuity.detached <= 32,
						`Detached droplets: ${JSON.stringify(continuity)}`
					);
					// Droplets are a separate draw after the sheet, so the mask holds the body only.
					pass(`Liquid body is one connected surface ${width}`, continuity);
				}
				await page.screenshot({ path: `${out}/wave-${width}-${progress}.png` });
			}
			await page.evaluate(() => (window.liquidProbe.capture = true));
			await scroll(page, 0.99);
			await page.waitForSelector('[data-covered="true"]');
			await page.waitForFunction(
				(liquid2) =>
					liquid2 ? window.liquid2Debug.covered : window.liquidProbe.uniforms.uLevel?.[0] > 5.5,
				liquid2
			);
			// Request a fresh draw after the animation settles at the covered endpoint.
			await page.evaluate(() => {
				window.liquidProbe.sample = null;
				window.liquidProbe.capture = true;
				window.dispatchEvent(new Event('scroll'));
			});
			await page.waitForFunction(() => window.liquidProbe.sample !== null);
			const sample = await page.evaluate(() => window.liquidProbe.sample);
			assert.equal(sample.error, 0, 'WebGL error');
			for (const [r, g, b, a] of sample.samples) {
				assert.equal(a, 255, 'Transparent hole in the full-screen wave');
				assert.ok(r >= 250 && g >= 13 && g <= 19 && b >= 125 && b <= 133);
			}
			await page.screenshot({ path: `${out}/covered-${width}.png` });
			pass(`Full viewport covered ${width}: 25 opaque samples`);
			if (width === 1440) {
				await page.waitForTimeout(600);
				await page.evaluate(() => {
					window.liquidProbe.sample = null;
					window.liquidProbe.capture = true;
				});
				await page.setViewportSize({ width: 1360, height });
				await page.waitForFunction(() => window.liquidProbe.sample !== null);
				assert.ok(
					await page.evaluate(() =>
						window.liquidProbe.sample.samples.every((pixel) => pixel[3] === 255)
					)
				);
				await page.setViewportSize({ width, height });
				pass('Resizing a settled covered canvas repaints the full surface');
			}
			await scroll(page, 0);
			await page.waitForSelector('[data-covered="false"]');
			await page.waitForFunction(
				(liquid2) =>
					(liquid2 ? window.liquid2Debug.level : window.liquidProbe.uniforms.uLevel?.[0]) < 0.001,
				liquid2
			);
			pass(`Reverse scroll restores wave ${width}`);
			if (width === 390 && liquid2) {
				await settled(page);
				const before = await page.evaluate(() => window.liquid2Debug.disturbances);
				await page.touchscreen.tap(width * 0.65, height * 0.94);
				await page.waitForFunction((before) => window.liquid2Debug.disturbances > before, before);
				assert.ok(await page.evaluate(() => window.liquid2Debug.drive < 0.01));
				pass('Mobile touch disturbs the surface locally without driving swells');
			} else if (width === 390) {
				await settled(page);
				const before = await page.evaluate(() => window.liquidProbe.uniforms.uH[0]);
				await page.touchscreen.tap(width * 0.65, height * 0.94);
				await page.waitForFunction(() => window.liquidProbe.fieldPeak > 0.001);
				assert.ok(
					Math.abs((await page.evaluate(() => window.liquidProbe.uniforms.uH[0])) - before) < 0.005
				);
				assert.ok(await page.evaluate(() => window.liquidProbe.fieldNonzero < 64 * 40 * 0.4));
				pass('Mobile touch creates a local wave without a whole-body bounce');
			}
		}
		if (liquid2 && width === 390) await liquid2Occlusion(page, width);
		if (width === 1440 && liquid2) {
			await settled(page);
			const before = await page.evaluate(() => window.liquid2Debug.disturbances);
			await page.mouse.click(width * 0.6, height * 0.94);
			await page.mouse.move(width * 0.42, height * 0.93);
			await page.mouse.move(width * 0.64, height * 0.95, { steps: 8 });
			await page.waitForFunction((before) => window.liquid2Debug.disturbances > before + 2, before);
			assert.ok(await page.evaluate(() => window.liquid2Debug.drive < 0.01));
			await page.screenshot({ path: `${out}/local-water-ripples.png` });
			pass('Pointer wake disturbs the surface locally without driving swells');
			await liquid2Occlusion(page, width);
			await liquid2CoverFade(page, width);
			await liquid2EdgeFade(page, width);
		} else if (width === 1440) {
			await settled(page);
			const previous = await page.evaluate(() => window.liquidProbe.uniforms.uH[0]);
			await page.mouse.click(width * 0.6, height * 0.94);
			await page.waitForFunction(() => window.liquidProbe.fieldPeak > 0.001);
			assert.ok(
				Math.abs((await page.evaluate(() => window.liquidProbe.uniforms.uH[0])) - previous) < 0.005
			);
			assert.ok(await page.evaluate(() => window.liquidProbe.fieldNonzero < 64 * 40 * 0.4));
			const uploads = await page.evaluate(() => window.liquidProbe.fieldUploads);
			await page.mouse.move(width * 0.42, height * 0.93);
			await page.mouse.move(width * 0.64, height * 0.95, { steps: 8 });
			await page.waitForFunction((uploads) => window.liquidProbe.fieldUploads > uploads, uploads);
			assert.ok(await page.evaluate(() => window.liquidProbe.fieldPeak <= 0.140001));
			await page.screenshot({ path: `${out}/local-water-ripples.png` });
			pass('Pointer wake propagates in the surface field without a whole-body spring');
		}
		if (width === 1440) {
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			await page.waitForTimeout(500);
			const frames = await page.evaluate(() => window.liquidProbe.frames);
			await page.waitForTimeout(500);
			assert.equal(await page.evaluate(() => window.liquidProbe.frames), frames);
			pass('Offscreen rendering stops');
			await scroll(page, 0);
			await page.waitForFunction((frames) => window.liquidProbe.frames > frames, frames);
			await page.evaluate(() =>
				document
					.querySelector('canvas')
					.getContext('webgl2')
					.getExtension('WEBGL_lose_context')
					.loseContext()
			);
			await page.waitForSelector('[data-liquid-mode="still"]');
			await scroll(page, 1);
			await page.waitForSelector('[data-covered="true"]');
			pass('Context loss falls back and still completes scroll');
		}
		await page.close();
	}

	if (liquid2) {
		const missing = await open({ width: 1440, height: 900 });
		await missing.route('**/images/assortment/avocado-960.webp', (r) => r.fulfill({ status: 404 }));
		await load(missing);
		await missing.waitForFunction(() => window.liquidProbe.frames > 60);
		await missing.evaluate(() => (window.liquidProbe.capture = true));
		await missing.waitForFunction(() => window.liquidProbe.sample !== null);
		assert.equal(await missing.evaluate(() => window.liquidProbe.sample.error), 0, 'WebGL error');
		assert.ok(await missing.locator('img[alt="Jus Alpukat Zatiaras"]').count());
		await missing.close();
		pass('Drink image failing to load: liquid stays live, no WebGL error, alt kept');

		const noFloat = await open({ width: 1440, height: 900 });
		await noFloat.addInitScript(() => {
			const get = WebGL2RenderingContext.prototype.getExtension;
			WebGL2RenderingContext.prototype.getExtension = function (name) {
				return name === 'EXT_color_buffer_float' ? null : get.call(this, name);
			};
		});
		await load(noFloat);
		await scroll(noFloat, 0.99);
		await noFloat.waitForSelector('[data-covered="true"]');
		await noFloat.evaluate(() => {
			window.liquidProbe.capture = true;
			window.dispatchEvent(new Event('scroll'));
		});
		await noFloat.waitForFunction(() =>
			window.liquidProbe.sample?.samples.every((p) => p[3] === 255)
		);
		await noFloat.close();
		pass('No float colour buffer: still live and fully covered');
	}

	const hidpi = await open({ width: 1920, height: 1080 }, { deviceScaleFactor: 2 });
	await load(hidpi);
	const pixels = await hidpi.locator('canvas').evaluate((canvas) => canvas.width * canvas.height);
	assert.ok(pixels <= 900000, `HiDPI drawing buffer exceeded budget: ${pixels}`);
	await hidpi.close();
	pass('HiDPI drawing buffer capped at 900000 pixels', { pixels });
	const preference = await open({ width: 390, height: 844 });
	await load(preference);
	await preference.emulateMedia({ reducedMotion: 'reduce' });
	await preference.waitForSelector('[data-liquid-mode="still"]');
	const stoppedAt = await preference.evaluate(() => window.liquidProbe.frames);
	await preference.waitForTimeout(300);
	assert.equal(await preference.evaluate(() => window.liquidProbe.frames), stoppedAt);
	await preference.close();
	pass('Changing reduced-motion preference stops the live renderer');

	for (const reason of ['reduced-motion', 'no-webgl', 'data-saver']) {
		const page = await open(
			{ width: 390, height: 844 },
			reason === 'reduced-motion' ? { reducedMotion: 'reduce' } : {}
		);
		if (reason === 'no-webgl') {
			await page.addInitScript(() => {
				const original = HTMLCanvasElement.prototype.getContext;
				HTMLCanvasElement.prototype.getContext = function (type, ...args) {
					return type === 'webgl2' ? null : original.call(this, type, ...args);
				};
			});
		}
		if (reason === 'data-saver') {
			await page.addInitScript(() =>
				Object.defineProperty(navigator, 'connection', { value: { saveData: true } })
			);
		}
		await load(page, 'still');
		await page.waitForFunction(() => document.querySelector('.still').naturalWidth > 0);
		assert.equal(await page.evaluate(() => window.liquidProbe.frames), 0);
		await scroll(page, 1);
		await page.waitForSelector('[data-covered="true"]');
		await page.waitForFunction(
			() => getComputedStyle(document.querySelector('.fallback-cover')).opacity === '1'
		);
		assert.equal(
			await page.locator('.fallback-cover').evaluate((el) => getComputedStyle(el).opacity),
			'1'
		);
		await scroll(page, 0);
		await page.waitForSelector('[data-covered="false"]');
		await page.screenshot({ path: `${out}/fallback-${reason}.png` });
		pass(`${reason}: loaded still, no render loop, reversible cover`);
		await page.close();
	}
	const noJs = await browser.newPage({
		viewport: { width: 390, height: 844 },
		javaScriptEnabled: false
	});
	await noJs.goto(`${base}${route}`, { waitUntil: 'load' });
	await noJs.waitForFunction(() => document.querySelector('.still').naturalWidth > 0);
	assert.ok(await noJs.getByRole('link', { name: 'Lihat menu' }).getAttribute('href'));
	pass('No JavaScript: static visual and menu navigation');
	await noJs.close();
	assert.deepEqual(errors, [], 'Browser/shader errors');
} finally {
	writeFileSync(`${out}/qa-results.json`, JSON.stringify({ results, errors }, null, 2));
	await browser.close();
}
