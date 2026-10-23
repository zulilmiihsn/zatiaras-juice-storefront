<script lang="ts">
	import { onMount } from 'svelte';
	import Liquid2Splash from '$lib/components/Liquid2Splash.svelte';

	// Prototype: hero pinned for 250vh; scroll progress drives the 3D liquid.
	let track: HTMLElement | undefined = $state();
	let progress = $state(0);
	let covered = $state(false);

	onMount(() => {
		const update = () => {
			if (!track) return;
			const rect = track.getBoundingClientRect();
			const travel = Math.max(1, rect.height - innerHeight);
			progress = Math.min(1, Math.max(0, -rect.top / travel));
		};
		update();
		addEventListener('scroll', update, { passive: true });
		addEventListener('resize', update);
		return () => {
			removeEventListener('scroll', update);
			removeEventListener('resize', update);
		};
	});
</script>

<svelte:head>
	<title>Liquid 2 | Zatiaras Juice</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div bind:this={track} class="relative h-[250dvh]" data-liquid-track data-covered={covered}>
	<section
		class="liquid-stage sticky top-0 min-h-[100dvh] overflow-hidden bg-[#FFF8EC]"
		aria-label="Prototipe hero liquid 3D"
	>
		<Liquid2Splash
			{progress}
			drinkSrc="/images/assortment/avocado-960.webp"
			drinkAspect={960 / 778}
			oncovered={(value) => (covered = value)}
			debug
			class="wave"
		/>

		<!-- The live scene draws the drink itself; this image keeps its name for assistive
		     technology and shows it when the static fallback is in use. -->
		<img
			class="cup absolute"
			src="/images/assortment/avocado-960.webp"
			alt="Jus Alpukat Zatiaras"
			width="960"
			height="778"
			style="opacity: {1 - Math.min(1, progress * 4)}"
		/>

		<div
			class="intro relative mx-auto max-w-6xl px-6 pt-20 sm:pt-24 lg:pt-28"
			style="opacity: {1 - Math.min(1, progress * 3.2)}"
		>
			<p class="mb-6 text-xs font-semibold tracking-[0.18em] text-ink/60 uppercase">
				Zatiaras Juice · Eksplorasi gerak 3D
			</p>
			<h1
				class="font-display text-[clamp(3.5rem,13vw,8rem)] leading-[0.9] font-extrabold text-brand"
			>
				JUS<br />ALPUKAT
			</h1>
			<p class="mt-6 max-w-64 text-sm leading-relaxed text-ink/70">
				Gulir perlahan. Sentuh atau gerakkan kursor di permukaan cairan.
			</p>
		</div>
	</section>
</div>
<section class="flex min-h-[100dvh] items-center bg-brand px-6 text-white">
	<div class="mx-auto w-full max-w-6xl">
		<p class="mb-4 text-xs font-semibold tracking-[0.18em] uppercase">Zatiaras Juice</p>
		<h2 class="font-display text-5xl font-extrabold sm:text-7xl">Rasa buah.<br />Sepenuh hati.</h2>
		<a
			href="/menu"
			class="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#FFF8EC] px-6 font-semibold text-ink transition-transform duration-200 ease-out active:scale-[0.98]"
			>Lihat menu</a
		>
	</div>
</section>

<style>
	.liquid-stage {
		height: 100dvh;
		isolation: isolate;
	}
	.liquid-stage :global(.wave) {
		z-index: 3;
	}
	.liquid-stage :global(.wave:not([data-liquid-mode='live'])) {
		z-index: 0;
	}
	.intro {
		z-index: 2;
	}
	.cup {
		left: 72%;
		bottom: 15%;
		height: min(50svh, 34rem);
		width: auto;
		transform: translateX(-50%);
		z-index: 1;
		pointer-events: none;
	}
	/* Live: the canvas draws the drink inside the liquid; keep this image for its name only. */
	.liquid-stage:has(:global(.wave[data-liquid-mode='live'])) .cup {
		opacity: 0 !important;
	}
	@media (max-aspect-ratio: 9/10) {
		.cup {
			left: 50%;
			bottom: 15%;
			height: auto;
			width: 62vw;
		}
	}
</style>
