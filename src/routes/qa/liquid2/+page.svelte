<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Liquid2Splash from '$lib/components/Liquid2Splash.svelte';
	import Liquid2Film from '$lib/components/Liquid2Film.svelte';

	// Prototype: hero pinned for 250vh; scroll progress drives the 3D liquid.
	let track: HTMLElement | undefined = $state();
	let progress = $state(0);
	let covered = $state(false);
	const live = $derived(page.url.searchParams.get('engine') === 'live');

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
		{#if live}
			<Liquid2Splash
				{progress}
				drinkSrc="/images/assortment/avocado-960.webp"
				drinkAspect={960 / 778}
				oncovered={(value) => (covered = value)}
				debug
				class="wave"
			/>
		{:else}
			<Liquid2Film {progress} oncovered={(value) => (covered = value)} />
		{/if}

		<!-- The live scene and its static render both draw the drink; this image only keeps
		     its name for assistive technology. -->
		<img
			class="sr-only"
			src="/images/assortment/avocado-960.webp"
			alt="Jus Alpukat Zatiaras"
			width="960"
			height="778"
		/>

		<div
			class="intro relative mx-auto max-w-6xl px-6 pt-20 sm:pt-24 lg:pt-28"
			class:film-intro={!live}
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
				<span class="sequence-instruction">
					{live
						? 'Gulir perlahan. Sentuh atau gerakkan kursor di permukaan cairan.'
						: 'Gulir perlahan. Jus pink naik dari bawah, membentur gelas, lalu menutup layar.'}
				</span>
				{#if !live}<span class="short-instruction">Gulir perlahan.</span>{/if}
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
	.liquid-stage :global(.film) {
		z-index: 1;
	}
	.liquid-stage :global(.wave:not([data-liquid-mode='live'])) {
		z-index: 0;
	}
	.intro {
		z-index: 2;
		will-change: opacity;
	}
	.short-instruction {
		display: none;
	}
	@media (max-aspect-ratio: 9/10) {
		.film-intro {
			height: 100%;
			padding-top: 1rem;
		}
		.film-intro > p:first-child {
			margin-bottom: 0.75rem;
			font-size: 0.625rem;
			line-height: 1.4;
			letter-spacing: 0.12em;
		}
		.film-intro h1 {
			font-size: clamp(2.6rem, 6vw, 4rem);
		}
		.film-intro > p:last-child {
			position: fixed;
			bottom: 1.5rem;
			left: 1.5rem;
		}
		.film-intro .sequence-instruction {
			display: none;
		}
		.film-intro .short-instruction {
			display: inline;
			padding: 0.35rem 0.7rem;
			border-radius: 999px;
			background: #fff8ec;
		}
	}
	@media (max-width: 767px) and (max-height: 700px) {
		.intro:not(.film-intro) {
			padding-top: 3rem;
		}
	}
</style>
