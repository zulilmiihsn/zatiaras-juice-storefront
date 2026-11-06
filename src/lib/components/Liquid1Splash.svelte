<!-- Liquid 1: frozen copy of the liquid prototype (1D wave line, colliding swells, splash
surface), kept for reuse in other use cases. Change it only on purpose; new work on the
liquid hero continues in LiquidSplash.svelte and $lib/liquid. -->
<!-- Rendering update: the active renderer is a bounded WebGL2 mesh in $lib/liquid1/wave.
Its top edge follows a simulated wave line ($lib/liquid1/wave-line): wind at rest, colliding
swells and splash droplets as the page scrolls, while the level rises over the drink.
The original design description below is retained as history; raymarching is no longer loaded. -->
<!-- LiquidSplash.svelte — real-time Heritage Magenta liquid crown (WebGL2, $lib/liquid/crown).
The crown is procedural 3D geometry, raymarched every frame. Scroll progress collapses it
into its own puddle, which swells into a ring wave that rolls over the camera. Pointer
moves push the crown and ripple the puddle; a tap re-splashes it. Without WebGL2 or with
data saver the static render is shown; with reduced motion the crown holds still. -->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { WaveRenderer, liquidBackingSize } from '$lib/liquid1/wave';

	let {
		progress = 0,
		anchorX = 0.75,
		anchorY = 0.86,
		size = 0.62,
		maxLevel = 7.4,
		minSwell = 0,
		spray = true,
		dye,
		fade,
		still,
		oncovered,
		class: className = ''
	}: {
		/** 0..1 scroll progress; the wave rises and covers the screen at 1. */
		progress?: number;
		/** Crown centre as a fraction of the canvas box (desktop). */
		anchorX?: number;
		/** Puddle lip as a fraction of the canvas height, minus 0.1 (desktop). */
		anchorY?: number;
		/** Crown height as a fraction of the canvas height. */
		size?: number;
		/** Liquid level at progress 1; 7.4 covers the box, lower values keep a visible surface. */
		maxLevel?: number;
		/** Swell energy floor (0..1), so the surface keeps rolling at any scroll position. */
		minSwell?: number;
		/** False keeps crests from throwing droplets. */
		spray?: boolean;
		/** Display-space liquid colour (0..1 RGB); defaults to the Liquid 1 pink. */
		dye?: [number, number, number];
		/** Eases the liquid into a flat colour (0..1 RGB) over this fraction of the box bottom. */
		fade?: { color: [number, number, number]; height: number };
		/** Replaces the default still image when the live renderer is unavailable. */
		still?: Snippet;
		oncovered?: (covered: boolean) => void;
		class?: string;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	// pending until mount decides; still = static render fallback.
	let mode = $state<'pending' | 'live' | 'still'>('pending');

	type V3 = [number, number, number];
	const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	const cross = (a: V3, b: V3): V3 => [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0]
	];
	const norm = (a: V3): V3 => {
		const l = Math.hypot(a[0], a[1], a[2]) || 1;
		return [a[0] / l, a[1] / l, a[2] / l];
	};
	const smooth = (a: number, b: number, x: number) => {
		const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
		return t * t * (3 - 2 * t);
	};

	// Product-shot camera: slightly above the rim, long lens.
	const CAM: V3 = [0, 2.2, 7.8];
	const FWD = norm(sub([0, 1.25, 0], CAM));
	const RIGHT = norm(cross(FWD, [0, 1, 0]));
	const UP = cross(RIGHT, FWD);
	/** Crown half width (arm reach) in world units. */
	const REACH = 1.85;

	const safeProgress = $derived(Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0);
	const fallbackCover = $derived(smooth(0.48, 0.82, safeProgress));

	$effect(() => {
		if (mode !== 'live') oncovered?.(fallbackCover >= 1);
	});

	onMount(() => {
		if (!canvas) return;
		const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
			.connection;
		const coarse = matchMedia('(pointer: coarse)').matches;
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const reduced = motion.matches;
		const renderer = connection?.saveData || reduced ? null : WaveRenderer.create(canvas, coarse);
		if (!renderer) {
			mode = 'still';
			return;
		}
		mode = 'live';
		renderer.spray = spray;

		const el = canvas;
		let rect = el.getBoundingClientRect();
		// Backing scale relative to the device pixels; adapts between MIN_SCALE and ceiling.
		const MIN_SCALE = 0.55;
		let ceiling = 1;
		let scale = ceiling;
		let backingH = 2;
		// Framing, in units of the canvas height from the top-left corner.
		let focal = 1.7;
		let cx = 1;
		let cy = 0.6;
		const pointer = { x: -9, y: -9, vx: 0, vy: 0, active: false, stamp: 0 };
		let visible = true;
		let raf = 0;
		let last = performance.now();
		let slowFrames = 0;
		let frames = 0;
		let wasCovered = false;
		let prevProgress = safeProgress;
		let animatedProgress = safeProgress;
		let scrollVel = 0;
		let lag = 0;
		let lastDisturbance = 0;
		let lastDrawn = -1;
		let elapsed = 0;
		let stopped = false;
		let overloadedFrames = 0;

		const layout = () => {
			rect = el.getBoundingClientRect();
			const backing = liquidBackingSize(rect.width, rect.height, devicePixelRatio, scale, coarse);
			const bw = backing.width;
			backingH = backing.height;
			renderer.resize(bw, backingH);
			const aspect = rect.width / Math.max(1, rect.height);
			const portrait = aspect < 0.9;
			focal = portrait ? 0.84 : (size / 0.62) * 1.25;
			cx = aspect / 2 + (portrait ? 0 : (anchorX - 0.75) * aspect);
			// Place the puddle's front lip at the bottom of the box, the crown above it.
			const lip = sub([0, 0, REACH], CAM);
			const lipV = (dot(lip, UP) / dot(lip, FWD)) * focal;
			cy = (portrait ? 0.81 : anchorY - 0.05) + lipV;
			lastDrawn = -1;
		};

		const toWorld = (clientX: number, clientY: number, timeStamp: number) => {
			const h = Math.max(1, rect.height);
			const x = (clientX - rect.left) / h;
			const y = (clientY - rect.top) / h;
			const dt = Math.max(8, timeStamp - (pointer.stamp || timeStamp - 16)) / 1000;
			if (pointer.active) {
				pointer.vx = Math.max(-4, Math.min(4, (x - pointer.x) / dt));
				pointer.vy = Math.max(-4, Math.min(4, (y - pointer.y) / dt));
			}
			pointer.x = x;
			pointer.y = y;
			pointer.active = true;
			pointer.stamp = timeStamp;
			// Frequent, light pushes leave a continuous wake rather than separate dents.
			if (!reduced && visible && timeStamp - lastDisturbance >= 33 && y > 0.3 && y < 1) {
				renderer.disturbAt(
					(clientX - rect.left) / Math.max(1, rect.width),
					y,
					Math.min(0.35, 0.05 + Math.hypot(pointer.vx, pointer.vy) * 0.08)
				);
				lastDisturbance = timeStamp;
			}
		};
		const onPointer = (event: PointerEvent) =>
			toWorld(event.clientX, event.clientY, event.timeStamp);
		const onDown = (event: PointerEvent) => {
			if (reduced || !visible || event.button > 0) return;
			onPointer(event);
			// A tap near the crown splashes it again.
			// The impulse is local to the surface; it no longer raises the whole crest.
			if (pointer.y > 0.3 && pointer.y < 1) {
				renderer.disturbAt((event.clientX - rect.left) / Math.max(1, rect.width), pointer.y, 0.9);
			}
		};
		const onTouch = (event: TouchEvent) => {
			const touch = event.touches[0];
			if (touch) toWorld(touch.clientX, touch.clientY, event.timeStamp);
		};
		const release = () => {
			pointer.active = false;
			pointer.vx = pointer.vy = 0;
		};

		const tick = (now: number) => {
			raf = 0;
			if (stopped || !visible || document.hidden) return;
			const dtMs = now - last;
			// The surface is always in motion (wind, swells, droplets); a 30 FPS idle cap
			// reads as stutter, so pace every visible frame at up to 60 FPS.
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
			const seconds = Math.min(0.05, Math.max(0.001, dtMs / 1000));
			animatedProgress += (safeProgress - animatedProgress) * (1 - Math.exp(-12 * seconds));
			if (Math.abs(safeProgress - animatedProgress) < 0.0001) animatedProgress = safeProgress;
			const p = animatedProgress;
			// Reduced motion: one still frame per scroll position, no idle animation.
			if (reduced && p === lastDrawn) return;
			lastDrawn = p;

			// Adaptive resolution: drop the backing scale while frames run long, and
			// climb back toward the last scale that held up once they are fast again.
			frames++;
			if (dtMs > frameInterval * 1.8) slowFrames++;
			if (frames >= 30) {
				if (slowFrames > 8 && scale > MIN_SCALE) {
					ceiling = Math.max(MIN_SCALE, scale * 0.95);
					scale = Math.max(MIN_SCALE, scale * 0.85);
					layout();
				} else if (slowFrames < 3 && scale < ceiling) {
					scale = Math.min(ceiling, scale * 1.1);
					layout();
				}
				frames = slowFrames = 0;
			}

			const dt = reduced ? 0 : Math.min(dtMs, 50) / 1000;
			// Scrolling speeds up the flow of the surface instead of bending it as one body.
			elapsed += dt * (1 + Math.min(1.5, Math.abs(scrollVel) * 1.5));
			const time = reduced ? 2 : elapsed;
			scrollVel += ((p - prevProgress) / seconds - scrollVel) * (1 - Math.exp(-12 * seconds));
			prevProgress = p;
			// Settle exactly, so the swell energy rests once scrolling stops.
			if (Math.abs(scrollVel) < 1e-4) scrollVel = 0;
			const kick = Math.max(-1.2, Math.min(1.2, scrollVel));

			// Scroll inertia: the crown stretches as the page moves, then springs back.
			// Replace that original elastic response with a non-oscillating flow response.
			lag += (kick * 0.065 - lag) * (1 - Math.exp(-6 * dt));

			// Scroll timeline: wind-stirred calm, then swells roll in from both sides,
			// collide and throw droplets while the level rises over the drink and the screen.
			// Fast scrolling briefly adds energy on top of the scroll position's own swell.
			const swell = smooth(0.02, 0.5, p);
			const h = Math.min(1.4, Math.max(minSwell, swell) + Math.min(0.5, Math.abs(kick) * 0.5));
			const level = maxLevel * smooth(0.1, 1, p);

			// Pointer ray onto the puddle surface drives a local dent and ripples.
			// Projection, propagation, and decay are owned by WaveRenderer.disturbAt.
			pointer.vx *= 0.85;
			pointer.vy *= 0.85;

			renderer.render({
				principal: [cx * backingH, (1 - cy) * backingH],
				focal,
				cam: CAM,
				right: RIGHT,
				up: UP,
				fwd: FWD,
				time,
				h,
				lag: Math.max(-0.35, lag),
				level,
				dye,
				fade
			});

			const covered = level > 6.6;
			if (covered !== wasCovered) {
				wasCovered = covered;
				oncovered?.(covered);
			}
			if (!covered || animatedProgress !== safeProgress) raf = requestAnimationFrame(tick);
		};

		const resume = () => {
			if (!stopped && !raf && visible && !document.hidden) {
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
	{#if mode !== 'live' && still}
		{@render still()}
	{:else if mode !== 'live'}
		<picture>
			<source media="(max-aspect-ratio: 9/10)" srcset="/images/liquid1/wave-mobile.png" />
			<img
				class="still"
				src="/images/liquid1/wave-desktop.png"
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
		object-position: 65% bottom;
	}
	.fallback-cover {
		position: absolute;
		inset: 0;
		background: #ff1081;
	}
	@media (max-aspect-ratio: 9/10) {
		.still {
			object-position: 80% bottom;
		}
	}
</style>
