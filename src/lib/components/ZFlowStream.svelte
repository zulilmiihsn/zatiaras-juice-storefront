<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { CUP_D, CUP_TRANSFORM, CUP_VIEWBOX } from '$lib/assets/brand/cupPath';
	import { prefersReducedMotion } from '$lib/motion/scroll';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	let svgRef = $state<SVGSVGElement | null>(null);
	let flowPathA = $state<SVGPathElement | null>(null);
	let flowPathB = $state<SVGPathElement | null>(null);
	let liquidFill = $state<SVGRectElement | null>(null);

	onMount(() => {
		if (!browser || prefersReducedMotion() || !svgRef) return;
		gsap.registerPlugin(ScrollTrigger);

		const ctx = gsap.context(() => {
			// Scrub flowing outline along the Z contour
			if (flowPathA) {
				gsap.to(flowPathA, {
					strokeDashoffset: -1600,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 80%',
						end: 'bottom top',
						scrub: 1.2
					}
				});
			}

			if (flowPathB) {
				gsap.to(flowPathB, {
					strokeDashoffset: 1200,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 90%',
						end: 'bottom 10%',
						scrub: 1.8
					}
				});
			}

			// Liquid fill level rising as user scrolls
			if (liquidFill) {
				gsap.fromTo(
					liquidFill,
					{ y: 350 },
					{
						y: 0,
						ease: 'power1.out',
						scrollTrigger: {
							trigger: svgRef,
							start: 'top 70%',
							end: 'bottom 20%',
							scrub: 1
						}
					}
				);
			}
		}, svgRef);

		return () => ctx.revert();
	});
</script>

<div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
	<!-- Flowing ambient diagonal backdrop ribbon (Z-Flow Ribbon) -->
	<svg
		bind:this={svgRef}
		viewBox={CUP_VIEWBOX}
		class="absolute top-1/2 -right-16 h-[120%] w-auto max-w-none -translate-y-1/2 opacity-90 transition-opacity"
	>
		<defs>
			<!-- Base Z-Cup Geometry clip -->
			<clipPath id="zCupClip">
				<path d={CUP_D} transform={CUP_TRANSFORM} />
			</clipPath>

			<!-- Liquid Gradient: Brand Magenta to Warm Amber Fruit -->
			<linearGradient id="zLiquidGrad" x1="0" y1="1" x2="0.3" y2="0">
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0.22" />
				<stop offset="50%" stop-color="#FF1081" stop-opacity="0.12" />
				<stop offset="100%" stop-color="#FFA800" stop-opacity="0.06" />
			</linearGradient>

			<!-- Flow Stream Stroke Gradient -->
			<linearGradient id="streamGrad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0.8" />
				<stop offset="50%" stop-color="#FFA800" stop-opacity="0.6" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0.3" />
			</linearGradient>
		</defs>

		<!-- 1. Deep Watermark Silhouette -->
		<path d={CUP_D} transform={CUP_TRANSFORM} fill="#FF1081" fill-opacity="0.04" />

		<!-- 2. Interactive Liquid Viscosity Level (Clipped to Cup Silhouette) -->
		<g clip-path="url(#zCupClip)">
			<rect
				bind:this={liquidFill}
				x="0"
				y="0"
				width="100%"
				height="100%"
				fill="url(#zLiquidGrad)"
			/>

			<!-- Floating Micro Droplets / Texture Bubbles along diagonal -->
			<circle cx="280" cy="450" r="14" fill="#FF1081" fill-opacity="0.1" class="animate-pulse" />
			<circle
				cx="390"
				cy="380"
				r="22"
				fill="#FFA800"
				fill-opacity="0.08"
				class="animate-pulse"
				style="animation-duration: 3s;"
			/>
			<circle
				cx="340"
				cy="520"
				r="18"
				fill="#FF1081"
				fill-opacity="0.12"
				class="animate-pulse"
				style="animation-duration: 4s;"
			/>
			<circle
				cx="430"
				cy="580"
				r="10"
				fill="#4D7C0F"
				fill-opacity="0.08"
				class="animate-pulse"
				style="animation-duration: 2.5s;"
			/>
		</g>

		<!-- 3. Z-Flow A: Continuous flowing liquid stroke along the cup path -->
		<path
			bind:this={flowPathA}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="url(#streamGrad)"
			stroke-width="7"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="140 280"
			stroke-dashoffset="0"
			class="opacity-75"
		/>

		<!-- 4. Z-Flow B: Secondary high-speed micro-stream counter-flow -->
		<path
			bind:this={flowPathB}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="#FF1081"
			stroke-width="3"
			stroke-linecap="round"
			stroke-dasharray="60 400"
			stroke-dashoffset="120"
			class="opacity-50"
		/>
	</svg>
</div>
