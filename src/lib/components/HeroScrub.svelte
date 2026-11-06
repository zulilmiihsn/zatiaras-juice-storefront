<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import { prefersReducedMotion } from '$lib/motion/scroll';
	import { FrameScrubber } from '$lib/motion/frame-scrubber';
	import { HERO_COPY_END, heroScrimOpacity, heroVideoProgress } from '$lib/motion/hero-timeline';

	let {
		children,
		label,
		onProgress
	}: {
		children: Snippet;
		label: string;
		/** Called on every scrub tick with progress 0..1; drives the copy's scroll exit. */
		onProgress?: (p: number) => void;
	} = $props();

	// Approved footage at 60fps with every frame a keyframe. Use desktop 1080p for
	// normal viewports; keep 4K for large displays instead of decoding it everywhere.
	// WebCodecs paints the canvas; the native video loads only if that path fails.
	const PORTRAIT_QUERY = '(max-width: 767px), (orientation: portrait)';
	const LARGE_DESKTOP_QUERY = '(min-width: 1921px)';

	let root = $state<HTMLElement | null>(null);
	let video = $state<HTMLVideoElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	// The canvas sits over the poster once its first frame is painted.
	let canvasReady = $state(false);
	let copy = $state<HTMLElement | null>(null);
	// SSR renders the tall scrub track; static mode (reduced motion, data saver) collapses it.
	let scrubbing = $state(true);

	onMount(() => {
		if (!root || !video || !canvas || !copy) return;
		const v = video;
		const copyEl = copy;
		const wash = root.querySelector<HTMLElement>('.hero-cream');
		let lastWash = '';
		const rootEl = root;

		const connection = (
			navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
		).connection;
		const lowData =
			connection?.saveData === true ||
			connection?.effectiveType === 'slow-2g' ||
			connection?.effectiveType === '2g';
		const staticMode = prefersReducedMotion() || lowData;
		scrubbing = !staticMode;

		const portrait = matchMedia(PORTRAIT_QUERY).matches;
		const source = portrait
			? 'mobile'
			: matchMedia(LARGE_DESKTOP_QUERY).matches
				? 'desktop'
				: 'desktop-1080p';
		v.poster = `/videos/hero-scrub/${portrait ? 'mobile' : 'desktop'}-poster.jpg`;
		if (staticMode) {
			v.preload = 'none';
			return;
		}
		// <video> path: seeking while a seek is in flight is dropped by the browser, so re-seek to the
		// latest target on 'seeked'.
		let target = 0;
		let scrubber: FrameScrubber | null = null;
		let videoActive = false;
		const apply = () => {
			const progress = heroVideoProgress(state.p);
			if (scrubber) {
				scrubber.seek(progress);
				return;
			}
			if (!videoActive || !v.duration) return;
			target = progress * v.duration;
			// Skip sub-frame moves: a seek for less than half a 60fps frame changes nothing visible.
			if (!v.seeking && Math.abs(target - v.currentTime) >= 1 / 120) v.currentTime = target;
		};
		const onSeeked = () => {
			if (Math.abs(v.currentTime - target) > 0.02) v.currentTime = target;
		};
		const useVideo = () => {
			if (videoActive) return;
			videoActive = true;
			canvasReady = false;
			v.preload = 'auto';
			v.addEventListener('seeked', onSeeked);
			v.addEventListener('loadedmetadata', apply);
			v.load();
			apply();
		};

		const abort = new AbortController();
		FrameScrubber.create(
			`/videos/hero-scrub/${source}.mp4`,
			canvas,
			abort.signal
		).then((created) => {
			if (abort.signal.aborted) return created?.destroy();
			if (!created) return useVideo();
			created.onFirstFrame = () => (canvasReady = true);
			created.onError = () => {
				scrubber = null;
				useVideo();
			};
			scrubber = created;
			apply();
		});

		const state = { p: 0 };
		const tween = gsap.to(state, {
			p: 1,
			ease: 'none',
			scrollTrigger: {
				trigger: rootEl,
				start: 'top top',
				end: 'bottom bottom',
				scrub: 0.35
			},
			onUpdate() {
				// Text exits first, then the scrim lifts, then the video begins.
				// Avoid changing full-viewport masks while filtered letters are flying.
				const opacity = String(heroScrimOpacity(state.p));
				if (wash && opacity !== lastWash) {
					wash.style.opacity = opacity;
					lastWash = opacity;
				}
				onProgress?.(state.p);
				const inactive = state.p >= HERO_COPY_END;
				if (copyEl.inert !== inactive) copyEl.inert = inactive;
				apply();
			}
		});

		return () => {
			abort.abort();
			scrubber?.destroy();
			v.removeEventListener('seeked', onSeeked);
			v.removeEventListener('loadedmetadata', apply);
			tween.scrollTrigger?.kill();
			tween.kill();
			ScrollTrigger.refresh();
		};
	});
</script>

<section
	bind:this={root}
	class="hero-scrub relative z-10"
	class:hero-scrub--track={scrubbing}
	aria-label={label}
>
	<div class="hero-stage">
		<video
			bind:this={video}
			class="absolute inset-0 h-full w-full object-cover object-bottom"
			muted
			playsinline
			disablepictureinpicture
			disableremoteplayback
			preload="none"
			poster="/videos/hero-scrub/desktop-poster.jpg"
			tabindex="-1"
			aria-hidden="true"
		>
			<source src="/videos/hero-scrub/mobile.mp4" type="video/mp4" media={PORTRAIT_QUERY} />
			<source
				src="/videos/hero-scrub/desktop.mp4"
				type="video/mp4"
				media={LARGE_DESKTOP_QUERY}
			/>
			<source src="/videos/hero-scrub/desktop-1080p.mp4" type="video/mp4" />
		</video>
		<canvas
			bind:this={canvas}
			class="absolute inset-0 h-full w-full object-cover object-bottom transition-opacity duration-200"
			class:opacity-0={!canvasReady}
			aria-hidden="true"
		></canvas>

		<!-- Keep the approved cream gradients static during the copy flight.
		     Fade their single parent only after the letters have left. -->
		<div
			class="hero-cream pointer-events-none absolute inset-0 z-[1] will-change-[opacity]"
			aria-hidden="true"
		>
			<div class="absolute inset-0 bg-[#FBF1DE]/30 mix-blend-multiply"></div>
			<div
				class="absolute inset-0 bg-gradient-to-r from-[#FFFDF9]/30 via-[#FFFDF9]/4 to-transparent [mask-image:linear-gradient(to_bottom,black_65%,transparent_100%)] max-lg:from-[#FFFDF9]/44 max-lg:via-[#FFFDF9]/14 max-lg:to-transparent max-lg:[mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
			></div>
			<div
				class="absolute inset-0 bg-[radial-gradient(ellipse_62%_78%_at_22%_58%,rgb(255_253_249/0.74),rgb(255_253_249/0.4)_52%,transparent_82%)] max-lg:bg-[radial-gradient(ellipse_130%_62%_at_30%_34%,rgb(255_253_249/0.78),rgb(255_253_249/0.4)_55%,transparent_85%)]"
			></div>
			<div
				class="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#FFFDF9]/35 to-transparent"
			></div>
		</div>

		<div
			bind:this={copy}
			class="hero-copy relative z-10 flex h-full items-center max-lg:items-start max-lg:pt-8"
		>
			{@render children()}
		</div>
	</div>
</section>

<style>
	.hero-scrub--track {
		height: 450dvh;
	}
	.hero-stage {
		position: sticky;
		top: 0;
		height: 100dvh;
		overflow: hidden;
	}
</style>
