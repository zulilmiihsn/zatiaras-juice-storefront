<!-- Offline liquid simulation. Native scrolling seeks the rendered sequence;
     it never advances a browser physics solver or intercepts wheel/touch input. -->
<script lang="ts">
	import { onMount } from 'svelte';

	let {
		progress = 0,
		oncovered
	}: {
		progress?: number;
		oncovered?: (covered: boolean) => void;
	} = $props();

	let video: HTMLVideoElement | undefined = $state();
	let host: HTMLDivElement | undefined = $state();
	let mode = $state<'still' | 'loading' | 'baked' | 'error'>('still');
	let atEnd = $state(false);
	let requestSync: (() => void) | undefined;
	const safeProgress = $derived(Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0);
	const coverT = $derived(Math.min(1, Math.max(0, (safeProgress - 0.84) / 0.16)));
	const cover = $derived(coverT * coverT * (3 - 2 * coverT));

	$effect(() => {
		void safeProgress;
		if (safeProgress < 1) atEnd = false;
		requestSync?.();
		oncovered?.(safeProgress >= 1 && (mode !== 'baked' || atEnd));
	});

	onMount(() => {
		if (!video || !host) return;
		const media = video;
		const surface = host;
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		// Match the homepage's media policy: no video transfer for data saver or 2G.
		const connection = (
			navigator as Navigator & {
				connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
			}
		).connection;
		let visible = false;
		let loaded = false;
		let failed = false;
		let stopped = false;
		let raf = 0;
		const stillRequested = () =>
			motion.matches ||
			connection?.saveData === true ||
			connection?.effectiveType === 'slow-2g' ||
			connection?.effectiveType === '2g';

		const sync = () => {
			raf = 0;
			if (stopped) return;
			// The QA header initially pushes the sticky stage below the viewport top.
			// Keep portrait media at the visible bottom while that header scrolls out.
			// Full-height framing now follows the stage on every viewport. The former
			// inset correction is unnecessary and would shift this composition upward.
			if (failed) return;
			if (stillRequested()) {
				mode = 'still';
				if (loaded) {
					loaded = false;
					media.removeAttribute('src');
					media.load();
				}
				return;
			}
			if (!visible || document.hidden) return;
			if (!loaded) {
				loaded = true;
				mode = 'loading';
				media.preload = 'auto';
				media.src = matchMedia('(max-width: 767px)').matches
					? '/videos/liquid2/rise-mobile.mp4'
					: '/videos/liquid2/rise-uhd.mp4';
				media.load();
				return;
			}
			if (!Number.isFinite(media.duration) || media.duration <= 0) return;
			if (media.seeking) {
				atEnd = false;
				return;
			}
			// The export is 24 FPS with every frame independently decodable. Coalesce
			// rapid scroll input instead of queuing an obsolete seek for every event.
			const fps = 24;
			const lastFrame = Math.max(0, Math.round(media.duration * fps) - 1);
			const target = Math.round(safeProgress * lastFrame) / fps;
			if (Math.abs(media.currentTime - target) < 0.5 / fps) {
				const ready = media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
				if (ready) mode = 'baked';
				atEnd =
					ready && safeProgress >= 1 && Math.abs(media.currentTime - lastFrame / fps) < 0.5 / fps;
				return;
			}
			atEnd = false;
			try {
				media.currentTime = target;
			} catch {
				failed = true;
				mode = 'error';
			}
		};
		const schedule = () => {
			if (!stopped && !raf) raf = requestAnimationFrame(sync);
		};
		const onError = () => {
			if (!loaded || stopped) return;
			failed = true;
			mode = 'error';
		};
		requestSync = schedule;
		const observer = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			schedule();
		});
		observer.observe(surface);
		for (const event of ['loadedmetadata', 'loadeddata', 'seeked', 'canplay'])
			media.addEventListener(event, schedule);
		media.addEventListener('error', onError);
		motion.addEventListener('change', schedule);
		connection?.addEventListener('change', schedule);
		document.addEventListener('visibilitychange', schedule);
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		return () => {
			stopped = true;
			requestSync = undefined;
			cancelAnimationFrame(raf);
			observer.disconnect();
			for (const event of ['loadedmetadata', 'loadeddata', 'seeked', 'canplay'])
				media.removeEventListener(event, schedule);
			media.removeEventListener('error', onError);
			motion.removeEventListener('change', schedule);
			connection?.removeEventListener('change', schedule);
			document.removeEventListener('visibilitychange', schedule);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			media.pause();
			media.removeAttribute('src');
			media.load();
		};
	});
</script>

<div bind:this={host} class="film" data-liquid-mode={mode} aria-hidden="true">
	<picture>
		<source media="(max-width: 767px)" srcset="/videos/liquid2/rise-poster-mobile.webp" />
		<img
			class="frame"
			src="/videos/liquid2/rise-poster.webp"
			alt=""
			width="3840"
			height="2160"
			fetchpriority="high"
		/>
	</picture>
	<video
		bind:this={video}
		class="frame"
		class:visible={mode === 'baked'}
		muted
		playsinline
		preload="none"
		disablepictureinpicture
		tabindex="-1"
	></video>
	<!-- The last rendered juice surface extends the flood across portrait crops
	     and remains available when media preferences disable video. Its edge rises
	     from the bottom; the composition never dissolves into a flat color.
	     Full-height video now supplies the actual flood in all baked viewports;
	     this extension is restricted to static and unavailable-media fallbacks. -->
	<img
		class="cover"
		class:disabled={mode === 'baked'}
		src="/videos/liquid2/rise-cover.webp"
		alt=""
		width="3840"
		height="2160"
		style:clip-path={`inset(${(1 - cover) * 100}% 0 0)`}
	/>
</div>

<style>
	.film {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		background: #fff8ec;
	}
	.frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 68% bottom;
	}
	video {
		visibility: hidden;
	}
	video.visible {
		visibility: visible;
	}
	.cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		background: #ff1081;
	}
	.cover.disabled {
		display: none;
	}
	@media (max-aspect-ratio: 9/10) {
		.frame {
			object-position: 75% bottom;
		}
	}
</style>
