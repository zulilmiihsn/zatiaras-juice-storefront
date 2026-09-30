<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Z_CUP_WATERFLOW_D } from '$lib/assets/brand/cupPath';
	import { prefersReducedMotion } from '$lib/motion/scroll';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	// Z-Cup Water Flow langsung dari balik navbar: tanpa lid, tanpa pancaran
	// terpisah. Aliran Z terungkap dari y=-80 (balik navbar) ke bawah.

	let containerRef = $state<HTMLDivElement | null>(null);
	let svgRef = $state<SVGSVGElement | null>(null);
	let maskRectRef = $state<SVGRectElement | null>(null);
	let maskWaveRef = $state<SVGEllipseElement | null>(null);
	let liquidGlowSheen = $state<SVGLinearGradientElement | null>(null);

	onMount(() => {
		if (!browser || prefersReducedMotion() || !containerRef || !svgRef) return;
		gsap.registerPlugin(ScrollTrigger);

		const ctx = gsap.context(() => {
			// KONDISI AWAL (scroll = 0):
			// Tersembunyi sempurna di balik navbar, nol elemen terlihat
			gsap.set(svgRef, { opacity: 0 });
			// Lid (y<90) tak pernah dibuka: aliran mulai dari badan Z tepat di balik navbar.
			if (maskRectRef) gsap.set(maskRectRef, { attr: { height: 0, y: 90 } });
			if (maskWaveRef) gsap.set(maskWaveRef, { attr: { cy: 70, ry: 40 } });

			// ScrollTrigger: merespons dari piksel scroll pertama (start: 'top top')
			// Aliran Z membuka penuh hingga tembus ke bawah (420px scroll)
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: document.body,
					start: 'top top',
					end: '+=420',
					scrub: 0.35,
					invalidateOnRefresh: true
				}
			});

			// 0. Fade in instan pada piksel pertama scroll
			tl.to(
				svgRef,
				{
					opacity: 1,
					duration: 0.04,
					ease: 'none'
				},
				0
			);

			// 1. Liquid Reveal Mask: dari y=90 (lid disembunyikan) hingga dasar (y=1200)
			if (maskRectRef) {
				tl.to(
					maskRectRef,
					{
						attr: { height: 1110, y: 90 },
						ease: 'none',
						duration: 1
					},
					0.04
				);
			}
			if (maskWaveRef) {
				tl.to(
					maskWaveRef,
					{
						attr: { cy: 1100, ry: 60 },
						ease: 'none',
						duration: 1
					},
					0.04
				);
			}

			// 2. Sapuan kilau cairan sepanjang bentuk Z-Cup saat mengalir
			if (liquidGlowSheen) {
				tl.fromTo(
					liquidGlowSheen,
					{ attr: { y1: '-0.5', y2: '0.2' } },
					{ attr: { y1: '0.9', y2: '1.6' }, ease: 'none', duration: 1 },
					0.05
				);
			}
		}, containerRef);

		return () => ctx.revert();
	});
</script>

<div
	bind:this={containerRef}
	class="pointer-events-none absolute -top-16 -right-12 z-10 flex h-[calc(100%+14rem)] w-[360px] justify-end overflow-visible sm:-right-20 sm:w-[440px] lg:-right-32 lg:w-[520px] xl:-right-40 xl:w-[580px]"
	aria-hidden="true"
>
	<!-- BENTUK Z-CUP WATER FLOW LANGSUNG DARI BALIK NAVBAR -->
	<svg
		bind:this={svgRef}
		viewBox="-40 30 700 1170"
		class="h-full max-h-[1100px] w-auto overflow-visible"
		style="opacity: 0;"
	>
		<defs>
			<!-- MASK CAIRAN DARI BADAN Z (lid y<90 disembunyikan) KE BAWAH -->
			<mask id="zCupFullFlowMask">
				<rect bind:this={maskRectRef} x="-60" y="90" width="740" height="0" fill="white" />
				<!-- Leading wave crest (kepala cairan mengalir) -->
				<ellipse bind:this={maskWaveRef} cx="310" cy="70" rx="390" ry="40" fill="white" />
			</mask>

			<!-- Gradien kilau cairan diagonal saat mengalir -->
			<linearGradient
				bind:this={liquidGlowSheen}
				id="zCupFlowSheen"
				x1="0"
				y1="0"
				x2="1"
				y2="1"
				gradientTransform="rotate(25)"
			>
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0" />
				<stop offset="45%" stop-color="#FF1081" stop-opacity="0" />
				<stop offset="50%" stop-color="#FFAAD4" stop-opacity="0.75" />
				<stop offset="55%" stop-color="#FF1081" stop-opacity="0" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0" />
			</linearGradient>

			<!-- Filter glow pendaran khas warna Pink Magenta murni (#FF1081) -->
			<filter id="zCupBrandGlow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#FF1081" flood-opacity="0.25" />
			</filter>

			<!-- ClipPath bentuk Z-Cup untuk lapisan sheen -->
			<clipPath id="zCupAuthenticClip">
				<path d={Z_CUP_WATERFLOW_D} />
			</clipPath>
		</defs>

		<!-- BENTUK PADAT SOLID Z-CUP WATER FLOW -->
		<g mask="url(#zCupFullFlowMask)">
			<path d={Z_CUP_WATERFLOW_D} fill="#FF1081" filter="url(#zCupBrandGlow)" />

			<!-- Lapisan Kilau Cairan (Liquid Sheen) yang menyapu saat bentuk terisi -->
			<rect
				x="-40"
				y="-60"
				width="700"
				height="1200"
				fill="url(#zCupFlowSheen)"
				clip-path="url(#zCupAuthenticClip)"
			/>
		</g>
	</svg>
</div>
