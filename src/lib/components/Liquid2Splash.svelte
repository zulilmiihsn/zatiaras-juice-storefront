<!-- Liquid 2: a 3D simulated magenta pool ($lib/liquid2) that swells as the page scrolls,
wraps the drink photo front and back, and rises until the frame is covered. The drink is
drawn inside the WebGL scene, depth-tested against a cylinder proxy. Scrolling back drains
the liquid. Without WebGL2, with reduced motion or data saver, a static render of the same
scene (static/images/liquid2, drink included) is shown. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { liquidBackingSize } from '$lib/liquid1/wave';
	import { Liquid2Renderer } from '$lib/liquid2/renderer';
	import {
		makeCamera,
		placeDrink,
		project,
		qualityTier,
		unprojectToPlane,
		type Camera,
		type Drink
	} from '$lib/liquid2/scene';
	import { LiquidSim } from '$lib/liquid2/sim';

	let {
		progress = 0,
		anchorX = 0.72,
		anchorY = 0.85,
		size = 0.5,
		drinkSrc,
		drinkAspect,
		oncovered,
		debug = false,
		class: className = ''
	}: {
		/** 0..1 scroll progress; the liquid rises and covers the frame at 1. */
		progress?: number;
		/** Drink base as fractions of the canvas box (desktop; portrait centres it). */
		anchorX?: number;
		anchorY?: number;
		/** Drink height as a fraction of the canvas height. */
		size?: number;
		/** Same-origin URL of the drink cut-out (transparent background). */
		drinkSrc: string;
		/** Drink image width / height. */
		drinkAspect: number;
		oncovered?: (covered: boolean) => void;
		/** Exposes window.liquid2Debug for the browser QA script. */
		debug?: boolean;
		class?: string;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	// pending until mount decides; still = static render fallback.
	let mode = $state<'pending' | 'live' | 'still'>('pending');

	const smooth = (a: number, b: number, x: number) => {
		const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
		return t * t * (3 - 2 * t);
	};
	const safeProgress = $derived(Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0);
	const fallbackCover = $derived(smooth(0.78, 1, safeProgress));

	$effect(() => {
		if (mode !== 'live') oncovered?.(fallbackCover >= 1);
	});

	onMount(() => {
		if (!canvas) return;
		const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
			.connection;
		const coarse = matchMedia('(pointer: coarse)').matches;
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const tier = qualityTier(coarse);
		const renderer = connection?.saveData || motion.matches ? null : Liquid2Renderer.create(canvas);
		if (!renderer) {
			mode = 'still';
			return;
		}
		mode = 'live';
		const sim = new LiquidSim(tier);

		const el = canvas;
		let rect = el.getBoundingClientRect();
		const MIN_SCALE = 0.55;
		let ceiling = 1;
		let scale = ceiling;
		let cam: Camera = makeCamera(1.6);
		let drink: Drink | null = null;
		let image: HTMLImageElement | null = null;
		let drinkShown = true;
		let visible = true;
		let raf = 0;
		let last = performance.now();
		let slowFrames = 0;
		let frames = 0;
		let wasCovered = false;
		let prevProgress = safeProgress;
		let animatedProgress = safeProgress;
		let scrollVel = 0;
		let lastDisturbance = 0;
		let stopped = false;
		let overloadedFrames = 0;
		let disturbances = 0;
		const pointer = { x: -1, y: -1, speed: 0, stamp: 0, active: false };

		const resizeBacking = () => {
			const backing = liquidBackingSize(rect.width, rect.height, devicePixelRatio, scale, coarse);
			if (!renderer.resize(backing.width, backing.height)) {
				fallback();
				return false;
			}
			return true;
		};

		const layout = () => {
			if (stopped) return;
			rect = el.getBoundingClientRect();
			// A collapsed box has no aspect to frame; wait for the next resize.
			if (!(rect.width > 0 && rect.height > 0)) return;
			if (!resizeBacking()) return;
			const aspect = rect.width / Math.max(1, rect.height);
			cam = makeCamera(aspect);
			// In portrait, centre the drink and keep the full cut-out within 84% of the width.
			// The cut-out includes fruit and transparent side margins; 84% gives the actual
			// cup enough room to remain legible on narrow screens without clipping the image.
			const portrait = aspect < 0.9;
			const fit = Math.min(size, ((portrait ? 0.84 : 0.62) * aspect) / Math.max(0.1, drinkAspect));
			drink = placeDrink(cam, portrait ? 0.5 : anchorX, anchorY, fit, drinkAspect);
			sim.layout(cam, drink);
		};

		const disturb = (clientX: number, clientY: number, strength: number) => {
			const fx = (clientX - rect.left) / Math.max(1, rect.width);
			const fy = (clientY - rect.top) / Math.max(1, rect.height);
			if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
			const hit = unprojectToPlane(cam, fx, fy, sim.level);
			if (!hit) return;
			sim.disturb(hit[0], hit[2], strength);
			disturbances++;
		};
		const onPointer = (event: PointerEvent) => {
			const dt = Math.max(8, event.timeStamp - (pointer.stamp || event.timeStamp - 16)) / 1000;
			if (pointer.active)
				pointer.speed = Math.min(
					4,
					Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) /
						Math.max(1, rect.height) /
						dt
				);
			pointer.x = event.clientX;
			pointer.y = event.clientY;
			pointer.stamp = event.timeStamp;
			pointer.active = true;
			// Frequent, light pushes leave a continuous wake rather than separate dents.
			if (visible && event.timeStamp - lastDisturbance >= 33) {
				disturb(event.clientX, event.clientY, -Math.min(0.06, 0.01 + pointer.speed * 0.02));
				lastDisturbance = event.timeStamp;
			}
		};
		const onDown = (event: PointerEvent) => {
			if (!visible || event.button > 0) return;
			disturb(event.clientX, event.clientY, -0.12);
		};
		const onTouch = (event: TouchEvent) => {
			const touch = event.touches[0];
			if (touch && visible) disturb(touch.clientX, touch.clientY, -0.05);
		};
		const release = () => {
			pointer.active = false;
			pointer.speed = 0;
		};

		// IntersectionObserver still reports a box that only touches the viewport edge as
		// intersecting; such a box shows nothing, so check the measured rect as well.
		const onscreen = () => rect.bottom > 0 && rect.top < innerHeight;

		const tick = (now: number) => {
			raf = 0;
			if (stopped || !visible || !onscreen() || document.hidden) return;
			const dtMs = now - last;
			const frameInterval = 1000 / 60;
			if (dtMs < frameInterval - 0.75) {
				raf = requestAnimationFrame(tick);
				return;
			}
			last = now;
			overloadedFrames = dtMs > 100 ? overloadedFrames + 1 : Math.max(0, overloadedFrames - 1);
			if (overloadedFrames >= 8) {
				fallback();
				return;
			}
			const inputSeconds = Math.max(0.001, dtMs / 1000);
			const seconds = Math.min(0.25, inputSeconds);
			animatedProgress += (safeProgress - animatedProgress) * (1 - Math.exp(-12 * seconds));
			if (Math.abs(safeProgress - animatedProgress) < 0.0001) animatedProgress = safeProgress;
			const p = animatedProgress;

			// Adaptive resolution, as in Liquid 1.
			frames++;
			if (dtMs > frameInterval * 1.8) slowFrames++;
			if (frames >= 30) {
				if (slowFrames > 8 && scale > MIN_SCALE) {
					ceiling = Math.max(MIN_SCALE, scale * 0.95);
					scale = Math.max(MIN_SCALE, scale * 0.85);
					// Resolution changes do not move the camera or remap the live material.
					if (!resizeBacking()) return;
				} else if (slowFrames < 3 && scale < ceiling) {
					scale = Math.min(ceiling, scale * 1.1);
					if (!resizeBacking()) return;
				}
				frames = slowFrames = 0;
			}

			// Every capped draw advances one quantum; fractional RAF jitter must not
			// intermittently skip both solvers. Input speed keeps its real-time clock.
			const dt = 1 / 60;
			scrollVel += ((p - prevProgress) / inputSeconds - scrollVel) * (1 - Math.exp(-12 * seconds));
			prevProgress = p;
			if (Math.abs(scrollVel) < 1e-4) scrollVel = 0;

			sim.advance(dt, { progress: p, scrollVelocity: scrollVel });
			if (!renderer.render(cam, drinkShown ? drink : null, sim, sim.time)) {
				fallback();
				return;
			}

			const covered = sim.covered;
			if (covered !== wasCovered) {
				wasCovered = covered;
				oncovered?.(covered);
			}
			if (!covered || animatedProgress !== safeProgress) raf = requestAnimationFrame(tick);
		};

		const resume = () => {
			if (!stopped && !raf && visible && onscreen() && !document.hidden) {
				last = performance.now();
				raf = requestAnimationFrame(tick);
			}
		};
		const fallback = () => {
			stopped = true;
			cancelAnimationFrame(raf);
			raf = 0;
			mode = 'still';
		};
		const onContextLost = (event: Event) => {
			event.preventDefault();
			fallback();
		};
		const onMotionChange = () => {
			if (motion.matches) fallback();
		};
		const resizeObserver = new ResizeObserver(() => {
			layout();
			resume();
		});
		resizeObserver.observe(el);
		const io = new IntersectionObserver((entries) => {
			visible = entries.some((entry) => entry.isIntersecting);
			resume();
		});
		io.observe(el);
		const onScroll = () => {
			rect = el.getBoundingClientRect();
			resume();
		};

		// The drink is optional: if it fails to load, the liquid renders alone.
		image = new Image();
		image.decoding = 'async';
		image.src = drinkSrc;
		image
			.decode()
			.then(() => {
				if (!stopped && image) renderer.setDrinkImage(image);
			})
			.catch(() => {
				image = null;
			});

		if (debug)
			(window as Window & { liquid2Debug?: unknown }).liquid2Debug = {
				get time() {
					return sim.time;
				},
				get particleCount() {
					return sim.fluid.count;
				},
				get visibleCount() {
					return sim.fluid.renderCount;
				},
				get level() {
					return sim.level;
				},
				get drive() {
					return sim.drive;
				},
				get runUpHeight() {
					return sim.sheets.maxHeight;
				},
				get flowSpeed() {
					return sim.fluid.speed;
				},
				get farFieldPeak() {
					if (!drink) return 0;
					const field = sim.field;
					let peak = 0;
					for (let j = 0; j < field.rows; j++)
						for (let i = 0; i < field.cols; i++) {
							const x = field.domain.x0 + (i + 0.5) * field.dx - drink.x;
							const z = field.domain.z0 + (j + 0.5) * field.dz - drink.z;
							if (x * x + z * z > 9 * drink.radius * drink.radius)
								peak = Math.max(peak, Math.abs(field.height[j * field.cols + i]));
						}
					return peak;
				},
				get covered() {
					return sim.covered;
				},
				get disturbances() {
					return disturbances;
				},
				/** Drink box as canvas fractions from the top-left: [left, top, right, bottom]. */
				drinkRect() {
					if (!drink) return null;
					const base = project(cam, [drink.x, drink.baseY, drink.z]);
					const top = project(cam, [drink.x, drink.baseY + drink.height, drink.z]);
					const w = ((base.y - top.y) * drinkAspect) / cam.aspect;
					return [base.x - w / 2, top.y, base.x + w / 2, base.y];
				},
				hideDrink() {
					drinkShown = false;
					resume();
				},
				showDrink() {
					drinkShown = true;
					resume();
				}
			};

		layout();
		window.addEventListener('pointermove', onPointer, { passive: true });
		window.addEventListener('pointerdown', onDown, { passive: true });
		window.addEventListener('touchmove', onTouch, { passive: true });
		window.addEventListener('touchend', release, { passive: true });
		window.addEventListener('pointercancel', release, { passive: true });
		window.addEventListener('blur', release);
		document.documentElement.addEventListener('pointerleave', release);
		window.addEventListener('scroll', onScroll, { passive: true });
		document.addEventListener('visibilitychange', resume);
		el.addEventListener('webglcontextlost', onContextLost);
		motion.addEventListener('change', onMotionChange);
		resume();

		return () => {
			stopped = true;
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			io.disconnect();
			window.removeEventListener('pointermove', onPointer);
			window.removeEventListener('pointerdown', onDown);
			window.removeEventListener('touchmove', onTouch);
			window.removeEventListener('touchend', release);
			window.removeEventListener('pointercancel', release);
			window.removeEventListener('blur', release);
			document.documentElement.removeEventListener('pointerleave', release);
			window.removeEventListener('scroll', onScroll);
			document.removeEventListener('visibilitychange', resume);
			el.removeEventListener('webglcontextlost', onContextLost);
			motion.removeEventListener('change', onMotionChange);
			if (debug) delete (window as Window & { liquid2Debug?: unknown }).liquid2Debug;
			renderer.dispose();
		};
	});
</script>

<div
	class="liquid-splash pointer-events-none {className}"
	data-liquid-mode={mode}
	aria-hidden="true"
>
	<canvas
		bind:this={canvas}
		class="absolute inset-0 h-full w-full"
		class:invisible={mode !== 'live'}
	></canvas>
	{#if mode !== 'live'}
		<picture>
			<source media="(max-aspect-ratio: 9/10)" srcset="/images/liquid2/wave-mobile.png" />
			<img
				class="still"
				src="/images/liquid2/wave-desktop.png"
				alt=""
				width="1200"
				height="750"
				loading="eager"
				decoding="async"
			/>
		</picture>
		<div class="fallback-cover" style:opacity={fallbackCover}></div>
	{/if}
</div>

<style>
	.liquid-splash {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.still {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 72% bottom;
	}
	.fallback-cover {
		position: absolute;
		inset: 0;
		background: #ff1081;
	}
	@media (max-aspect-ratio: 9/10) {
		.still {
			object-position: 50% bottom;
		}
	}
</style>
