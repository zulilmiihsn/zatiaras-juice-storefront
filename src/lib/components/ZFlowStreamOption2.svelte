<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { CUP_D, CUP_TRANSFORM, CUP_VIEWBOX } from '$lib/assets/brand/cupPath';
	import { prefersReducedMotion } from '$lib/motion/scroll';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	let svgRef = $state<SVGSVGElement | null>(null);
	let flowMain = $state<SVGPathElement | null>(null);
	let flowEcho1 = $state<SVGPathElement | null>(null);
	let flowEcho2 = $state<SVGPathElement | null>(null);
	let sheenSweep = $state<SVGLinearGradientElement | null>(null);

	onMount(() => {
		if (!browser || prefersReducedMotion() || !svgRef) return;
		gsap.registerPlugin(ScrollTrigger);

		const ctx = gsap.context(() => {
			// 1. Scrub main Z-Flow stroke along cup contour in pure #FF1081
			if (flowMain) {
				gsap.to(flowMain, {
					strokeDashoffset: -1800,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 85%',
						end: 'bottom top',
						scrub: 1.2
					}
				});
			}

			// 2. Echo Ripple 1: Expanding pulse stroke
			if (flowEcho1) {
				gsap.to(flowEcho1, {
					strokeDashoffset: 1400,
					scale: 1.04,
					transformOrigin: 'center center',
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 85%',
						end: 'bottom top',
						scrub: 1.6
					}
				});
			}

			// 3. Echo Ripple 2: Secondary outer pulse
			if (flowEcho2) {
				gsap.to(flowEcho2, {
					strokeDashoffset: -900,
					scale: 1.08,
					transformOrigin: 'center center',
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 90%',
						end: 'bottom 5%',
						scrub: 2
					}
				});
			}

			// 4. Liquid Sheen gradient sweep (pure magenta light sheen)
			if (sheenSweep) {
				gsap.fromTo(
					sheenSweep,
					{ attr: { x1: '-1', x2: '0' } },
					{
						attr: { x1: '1', x2: '2' },
						ease: 'none',
						scrollTrigger: {
							trigger: svgRef,
							start: 'top 80%',
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
	<!-- OPSI 2: 100% PURE MAGENTA Z-FLOW (Z-Flow Echo & Liquid Sheen) -->
	<svg
		bind:this={svgRef}
		viewBox={CUP_VIEWBOX}
		class="absolute top-1/2 -right-16 h-[125%] w-auto max-w-none -translate-y-1/2 opacity-95 transition-opacity"
	>
		<defs>
			<!-- Clip to Z-Cup contour -->
			<clipPath id="pureCupClip">
				<path d={CUP_D} transform={CUP_TRANSFORM} />
			</clipPath>

			<!-- 100% Pure Magenta Sheen Gradient (Zero Foreign Colors) -->
			<linearGradient
				bind:this={sheenSweep}
				id="pureMagentaSheen"
				x1="0"
				y1="0"
				x2="1"
				y2="1"
				gradientTransform="rotate(24)"
			>
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0.03" />
				<stop offset="45%" stop-color="#FF1081" stop-opacity="0.08" />
				<stop offset="50%" stop-color="#FF1081" stop-opacity="0.28" />
				<stop offset="55%" stop-color="#FF1081" stop-opacity="0.08" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0.03" />
			</linearGradient>

			<!-- Pure Magenta Flow Stroke Gradient -->
			<linearGradient id="pureFlowGrad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0.9" />
				<stop offset="50%" stop-color="#C90A63" stop-opacity="0.6" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0.2" />
			</linearGradient>
		</defs>

		<!-- Base Watermark Silhouette (Pure Magenta 5% Opacity) -->
		<path d={CUP_D} transform={CUP_TRANSFORM} fill="#FF1081" fill-opacity="0.05" />

		<!-- Liquid Sheen Sweep inside Cup (Monochrome Magenta Depth) -->
		<rect
			x="0"
			y="0"
			width="100%"
			height="100%"
			fill="url(#pureMagentaSheen)"
			clip-path="url(#pureCupClip)"
		/>

		<!-- Echo Ripple 2 (Outer, Delicate) -->
		<path
			bind:this={flowEcho2}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="#FF1081"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="80 350"
			stroke-dashoffset="60"
			class="opacity-30"
		/>

		<!-- Echo Ripple 1 (Middle) -->
		<path
			bind:this={flowEcho1}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="#FF1081"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="100 250"
			stroke-dashoffset="180"
			class="opacity-45"
		/>

		<!-- Main Z-Flow Path (Crisp, High Energy #FF1081) -->
		<path
			bind:this={flowMain}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="url(#pureFlowGrad)"
			stroke-width="6"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="160 260"
			stroke-dashoffset="0"
			class="opacity-80"
		/>
	</svg>
</div>
