<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { CUP_D, CUP_TRANSFORM, CUP_VIEWBOX } from '$lib/assets/brand/cupPath';
	import { prefersReducedMotion } from '$lib/motion/scroll';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	let svgRef = $state<SVGSVGElement | null>(null);
	let negStreamTop = $state<SVGPathElement | null>(null);
	let negStreamBottom = $state<SVGPathElement | null>(null);
	let crestRipple = $state<SVGCircleElement | null>(null);
	let crestRipple2 = $state<SVGCircleElement | null>(null);
	let edgeGlint = $state<SVGPathElement | null>(null);

	onMount(() => {
		if (!browser || prefersReducedMotion() || !svgRef) return;
		gsap.registerPlugin(ScrollTrigger);

		const ctx = gsap.context(() => {
			// 1. Subtle elevation & tilt parallax on the giant cup
			gsap.to(svgRef, {
				y: -45,
				rotation: 2,
				transformOrigin: 'center center',
				ease: 'none',
				scrollTrigger: {
					trigger: svgRef,
					start: 'top 85%',
					end: 'bottom top',
					scrub: 1.4
				}
			});

			// 2. Negative Space Stream 1 (Upper-right cove flow)
			if (negStreamTop) {
				gsap.to(negStreamTop, {
					strokeDashoffset: -600,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 85%',
						end: 'bottom 15%',
						scrub: 1.2
					}
				});
			}

			// 3. Negative Space Stream 2 (Lower-left cove wave surge towards sharp tip)
			if (negStreamBottom) {
				gsap.to(negStreamBottom, {
					strokeDashoffset: 550,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 80%',
						end: 'bottom 10%',
						scrub: 1.6
					}
				});
			}

			// 4. Sharp Wave Crest micro-ripples in lower negative space
			if (crestRipple && crestRipple2) {
				gsap.to(crestRipple, {
					scale: 2.2,
					opacity: 0,
					transformOrigin: '270px 385px',
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 75%',
						end: 'bottom 25%',
						scrub: 1
					}
				});

				gsap.to(crestRipple2, {
					scale: 2.8,
					opacity: 0,
					transformOrigin: '270px 385px',
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 70%',
						end: 'bottom 20%',
						scrub: 1.5
					}
				});
			}

			// 5. Luminous Inner Edge Sheen along negative space perimeter
			if (edgeGlint) {
				gsap.to(edgeGlint, {
					strokeDashoffset: -2200,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 85%',
						end: 'bottom top',
						scrub: 1.1
					}
				});
			}
		}, svgRef);

		return () => ctx.revert();
	});
</script>

<div
	class="pointer-events-none absolute inset-y-0 right-0 flex w-full items-center justify-center overflow-hidden pr-2 sm:pr-8 lg:w-1/2 lg:justify-end lg:pr-16"
	aria-hidden="true"
>
	<!-- OPSI 3: CUP RAKSASA LATAR BELAKANG (SOLID PINK MAGENTA + RUANG NEGATIF MENGALIR) -->
	<svg
		bind:this={svgRef}
		viewBox={CUP_VIEWBOX}
		class="h-[75%] max-h-[540px] w-auto opacity-90 drop-shadow-[0_20px_60px_rgba(255,16,129,0.22)] transition-transform sm:h-[82%] sm:max-h-[600px] lg:h-[88%] lg:max-h-[640px]"
	>
		<defs>
			<!-- Inner Rim Sheen Gradient (Glint kilau putih menyusuri tepi dalam) -->
			<linearGradient id="opt3EdgeGlint" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0" />
				<stop offset="45%" stop-color="#FFFFFF" stop-opacity="0.1" />
				<stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.9" />
				<stop offset="55%" stop-color="#FFB3D4" stop-opacity="0.6" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0" />
			</linearGradient>

			<!-- Negative Space Stream Gradient (Aliran lembut di ruang kosong) -->
			<linearGradient id="opt3StreamGrad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0" />
				<stop offset="40%" stop-color="#FF1081" stop-opacity="0.3" />
				<stop offset="60%" stop-color="#FFFFFF" stop-opacity="0.5" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0.05" />
			</linearGradient>
		</defs>

		<!-- 1. CUP UTUH SOLID: 100% Pink Magenta Murni (Tidak terpotong, bentuk utuh sempurna) -->
		<path d={CUP_D} transform={CUP_TRANSFORM} fill="#FF1081" />

		<!-- 2. ANIMASI RUANG NEGATIF: Aliran cairan rongga atas kanan -->
		<path
			bind:this={negStreamTop}
			d="M 520,200 C 470,250 430,310 405,370 C 385,420 365,460 340,500"
			fill="none"
			stroke="url(#opt3StreamGrad)"
			stroke-width="12"
			stroke-linecap="round"
			stroke-dasharray="100 180"
			stroke-dashoffset="0"
		/>

		<!-- 3. ANIMASI RUANG NEGATIF: Aliran cairan rongga bawah kiri -->
		<path
			bind:this={negStreamBottom}
			d="M 180,630 C 170,560 190,490 230,440 C 245,420 260,400 270,385"
			fill="none"
			stroke="url(#opt3StreamGrad)"
			stroke-width="13"
			stroke-linecap="round"
			stroke-dasharray="110 200"
			stroke-dashoffset="60"
		/>

		<!-- 4. RIPPLE GELOMBANG PADA PUNCAK LANCIP RUANG NEGATIF (270, 385) -->
		<circle
			bind:this={crestRipple}
			cx="270"
			cy="385"
			r="14"
			fill="none"
			stroke="#FFFFFF"
			stroke-width="2.5"
			opacity="0.7"
		/>
		<circle
			bind:this={crestRipple2}
			cx="270"
			cy="385"
			r="24"
			fill="none"
			stroke="#FFFFFF"
			stroke-width="1.8"
			opacity="0.4"
		/>

		<!-- 5. KILAUAN TEPI DALAM (Menyusuri kontur pertemuan magenta & ruang kosong saat scroll) -->
		<path
			bind:this={edgeGlint}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="url(#opt3EdgeGlint)"
			stroke-width="3.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="140 320"
			stroke-dashoffset="0"
		/>
	</svg>
</div>
