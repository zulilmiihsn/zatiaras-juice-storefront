<!-- Footer divider: the live Liquid 1 surface rises and swells as the footer scrolls into
view. The supplied wave artwork stays as the still image for reduced motion, data saver,
missing WebGL2, and before the renderer starts. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import Liquid1Splash from '$lib/components/Liquid1Splash.svelte';

	/** #d90359, the footer colour at the bottom edge of this box. */
	const FOOTER_MAGENTA: [number, number, number] = [217 / 255, 3 / 255, 89 / 255];

	let box: HTMLDivElement | undefined = $state();
	let progress = $state(0);

	onMount(() => {
		if (!box) return;
		const el = box;
		let raf = 0;
		const measure = () => {
			raf = 0;
			const rect = el.getBoundingClientRect();
			// 0 when the divider's top meets the viewport bottom, 1 once it has risen
			// about 40% of the viewport, so the swell plays out while the footer arrives.
			const travel = rect.height + innerHeight * 0.4;
			progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / travel));
		};
		const schedule = () => {
			if (!raf) raf = requestAnimationFrame(measure);
		};
		measure();
		addEventListener('scroll', schedule, { passive: true });
		addEventListener('resize', schedule, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			removeEventListener('scroll', schedule);
			removeEventListener('resize', schedule);
		};
	});
</script>

<div bind:this={box} class="footer-wave relative -mb-px w-full overflow-hidden" aria-hidden="true">
	<Liquid1Splash
		{progress}
		maxLevel={1.6}
		minSwell={0.8}
		spray={false}
		dye={[0.86, 0.006, 0.27]}
		fade={{ color: FOOTER_MAGENTA, height: 0.4 }}
		class="wave"
	>
		{#snippet still()}
			<picture>
				<source
					srcset="/images/zatiaras-wave-divider-1920.avif 1920w, /images/zatiaras-wave-divider-3840.avif 3840w, /images/zatiaras-wave-divider-5760.avif 5760w"
					sizes="(max-width: 759px) 760px, 100vw"
					type="image/avif"
				/>
				<img
					src="/images/zatiaras-wave-divider-1920.webp"
					srcset="/images/zatiaras-wave-divider-1920.webp 1920w, /images/zatiaras-wave-divider-3840.webp 3840w, /images/zatiaras-wave-divider-5760.webp 5760w"
					sizes="(max-width: 759px) 760px, 100vw"
					width="3840"
					height="1229"
					loading="lazy"
					decoding="async"
					alt=""
					class="relative left-1/2 block h-auto w-full min-w-[760px] -translate-x-1/2"
					style="mask-image: linear-gradient(to bottom, black 78%, rgb(0 0 0 / 0.896) 82.4%, rgb(0 0 0 / 0.648) 86.8%, rgb(0 0 0 / 0.352) 91.2%, rgb(0 0 0 / 0.104) 95.6%, transparent 100%)"
					fetchpriority="low"
				/>
			</picture>
		{/snippet}
	</Liquid1Splash>
</div>

<style>
	/* Same box as the supplied artwork (3840 x 1229), so the footer content keeps its overlap. */
	.footer-wave {
		height: calc(var(--footer-wave-width) * 1229 / 3840);
	}
	/* Live: the canvas is transparent above the surface, so the box carries the page cream
	that the footer gradient would otherwise turn magenta inside the box. */
	.footer-wave:has(:global([data-liquid-mode='live'])) {
		background: var(--color-cream);
	}
</style>
