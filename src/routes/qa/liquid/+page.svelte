<script lang="ts">
	import { onMount } from 'svelte';
	import LiquidSplash from '$lib/components/LiquidSplash.svelte';

	// Prototype: hero pinned for 250vh; scroll progress drives the wave.
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
	<title>Liquid prototype | Zatiaras Juice</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<div bind:this={track} class="relative h-[250dvh]" data-liquid-track data-covered={covered}>
	<section
		class="liquid-stage sticky top-0 min-h-[100dvh] overflow-hidden bg-[#FFF8EC]"
		aria-label="Prototipe hero liquid"
	>
		<LiquidSplash {progress} oncovered={(value) => (covered = value)} class="wave" />

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
				Zatiaras Juice · Eksplorasi gerak
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
		left: 71%;
		bottom: 15%;
		height: min(52svh, 34rem);
		width: auto;
		transform: translateX(-50%);
		z-index: 1;
		pointer-events: none;
	}
	/* The live liquid is drawn above the drink and swallows it as it rises;
	   the opacity fade only serves the static fallback, which sits beneath the drink. */
	.liquid-stage:has(:global(.wave[data-liquid-mode='live'])) .cup {
		opacity: 1 !important;
	}
	@media (max-aspect-ratio: 9/10) {
		.cup {
			left: 68%;
			bottom: 18%;
			height: auto;
			width: 68vw;
		}
	}
</style>
