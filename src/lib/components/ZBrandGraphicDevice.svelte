<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { CUP_D, CUP_TRANSFORM, CUP_VIEWBOX } from '$lib/assets/brand/cupPath';
	import { prefersReducedMotion } from '$lib/motion/scroll';
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	let svgRef = $state<SVGSVGElement | null>(null);
	let flowContourA = $state<SVGPathElement | null>(null);
	let flowContourB = $state<SVGPathElement | null>(null);
	let flowNegativeStream = $state<SVGPathElement | null>(null);
	let sheenGradient = $state<SVGLinearGradientElement | null>(null);
	let crestPulse = $state<SVGCircleElement | null>(null);

	onMount(() => {
		if (!browser || prefersReducedMotion() || !svgRef) return;
		gsap.registerPlugin(ScrollTrigger);

		const ctx = gsap.context(() => {
			// 1. Parallax Float: Bergerak lembut dengan kedalaman spasial di belakang kartu
			gsap.to(svgRef, {
				y: -65,
				rotation: 1.8,
				transformOrigin: 'center center',
				ease: 'none',
				scrollTrigger: {
					trigger: svgRef,
					start: 'top 90%',
					end: 'bottom top',
					scrub: 1.4
				}
			});

			// 2. Z-Flow A: Aliran garis kontur utama menyusuri bentuk cup
			if (flowContourA) {
				gsap.to(flowContourA, {
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

			// 3. Z-Flow B: Aliran sekunder counter-flow lebih halus
			if (flowContourB) {
				gsap.to(flowContourB, {
					strokeDashoffset: 1400,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 90%',
						end: 'bottom 10%',
						scrub: 1.8
					}
				});
			}

			// 4. Z-Flow Ruang Negatif: Aliran cairan melintasi rongga Z dari atas ke bawah
			if (flowNegativeStream) {
				gsap.to(flowNegativeStream, {
					strokeDashoffset: -650,
					ease: 'none',
					scrollTrigger: {
						trigger: svgRef,
						start: 'top 80%',
						end: 'bottom 15%',
						scrub: 1.3
					}
				});
			}

			// 5. Liquid Sheen Sweep: Kilauan cahaya sudut 24° menyapu permukaan siluet cup
			if (sheenGradient) {
				gsap.fromTo(
					sheenGradient,
					{ attr: { x1: '-0.8', y1: '-0.8', x2: '0.2', y2: '0.2' } },
					{
						attr: { x1: '0.8', y1: '0.8', x2: '1.8', y2: '1.8' },
						ease: 'none',
						scrollTrigger: {
							trigger: svgRef,
							start: 'top 85%',
							end: 'bottom 20%',
							scrub: 1.1
						}
					}
				);
			}

			// 6. Pulse pada puncak lancip ruang negatif
			if (crestPulse) {
				gsap.to(crestPulse, {
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
			}
		}, svgRef);

		return () => ctx.revert();
	});
</script>

<div
	class="pointer-events-none absolute inset-y-0 right-0 flex w-full items-center justify-center overflow-hidden pr-0 sm:pr-6 lg:w-7/12 lg:justify-end lg:pr-12"
	aria-hidden="true"
>
	<!-- Z-CUP BRAND GRAPHIC DEVICE (Z-Crop + Z-Flow + Cup-Lip Bar + Liquid Sheen) -->
	<svg
		bind:this={svgRef}
		viewBox={CUP_VIEWBOX}
		class="h-[78%] max-h-[560px] w-auto transition-transform sm:h-[84%] sm:max-h-[620px] lg:h-[92%] lg:max-h-[660px]"
	>
		<defs>
			<!-- Clip siluet cup untuk efek internal sheen -->
			<clipPath id="brandCupClip">
				<path d={CUP_D} transform={CUP_TRANSFORM} />
			</clipPath>

			<!-- Gradien Z-Flow Stroke A (Brand Magenta murni bergradasi transparansi) -->
			<linearGradient id="brandFlowGradA" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0.85" />
				<stop offset="40%" stop-color="#FF1081" stop-opacity="0.5" />
				<stop offset="70%" stop-color="#FF85BA" stop-opacity="0.75" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0.2" />
			</linearGradient>

			<!-- Gradien Z-Flow Stroke B (Halus & elegan) -->
			<linearGradient id="brandFlowGradB" x1="1" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0.4" />
				<stop offset="50%" stop-color="#FF1081" stop-opacity="0.1" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0.5" />
			</linearGradient>

			<!-- 24° Liquid Sheen Sweep (Sapuan kilauan cahaya magenta pada permukaan cup) -->
			<linearGradient
				bind:this={sheenGradient}
				id="brandSheenSweep"
				x1="0"
				y1="0"
				x2="1"
				y2="1"
				gradientTransform="rotate(24)"
			>
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0.02" />
				<stop offset="40%" stop-color="#FF1081" stop-opacity="0.08" />
				<stop offset="50%" stop-color="#FF1081" stop-opacity="0.24" />
				<stop offset="60%" stop-color="#FF1081" stop-opacity="0.08" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0.02" />
			</linearGradient>

			<!-- Gradien Aliran Ruang Negatif (Z-Flow Interior) -->
			<linearGradient id="brandNegStreamGrad" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#FF1081" stop-opacity="0" />
				<stop offset="35%" stop-color="#FF1081" stop-opacity="0.35" />
				<stop offset="60%" stop-color="#FF1081" stop-opacity="0.6" />
				<stop offset="100%" stop-color="#FF1081" stop-opacity="0" />
			</linearGradient>

			<!-- Filter Ambient Soft Glow -->
			<filter id="brandAura" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation="32" result="blur" />
			</filter>
		</defs>

		<!-- 1. AMBIENT BRAND AURA (Pendaran halus warna magenta di latar belakang) -->
		<path
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="#FF1081"
			fill-opacity="0.06"
			filter="url(#brandAura)"
		/>

		<!-- 2. Z-CROP WATERMARK SILHOUETTE (Siluet resmi Z-Cup sebagai graphic frame elegan) -->
		<!-- Opasitas 9% memberikan tekstur brand yang menyatu dengan latar krem tanpa menabrak kartu -->
		<path d={CUP_D} transform={CUP_TRANSFORM} fill="#FF1081" fill-opacity="0.09" />

		<!-- 3. LIQUID SHEEN SWEEP (Sapuan cahaya bergelombang di dalam siluet cup) -->
		<rect
			x="0"
			y="0"
			width="100%"
			height="100%"
			fill="url(#brandSheenSweep)"
			clip-path="url(#brandCupClip)"
		/>

		<!-- 4. Z-FLOW B: Garis kontur riak luar sekunder (Denyut energi halus) -->
		<path
			bind:this={flowContourB}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="url(#brandFlowGradB)"
			stroke-width="2"
			stroke-linecap="round"
			stroke-dasharray="90 320"
			stroke-dashoffset="120"
		/>

		<!-- 5. Z-FLOW A: Garis kontur utama bertenaga (Energi Zatiaras mengalir saat scroll) -->
		<path
			bind:this={flowContourA}
			d={CUP_D}
			transform={CUP_TRANSFORM}
			fill="none"
			stroke="url(#brandFlowGradA)"
			stroke-width="4.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray="160 260"
			stroke-dashoffset="0"
		/>

		<!-- 6. Z-FLOW INTERIOR: Aliran cairan di rongga ruang negatif Z (Menghubungkan atas & bawah) -->
		<path
			bind:this={flowNegativeStream}
			d="M 520,200 C 460,260 410,330 380,410 C 350,490 280,560 180,630"
			fill="none"
			stroke="url(#brandNegStreamGrad)"
			stroke-width="5"
			stroke-linecap="round"
			stroke-dasharray="120 220"
			stroke-dashoffset="0"
		/>

		<!-- 7. WAVE CREST ACCENT: Pendaran pada puncak gelombang lancip (270, 385) -->
		<circle
			bind:this={crestPulse}
			cx="270"
			cy="385"
			r="12"
			fill="none"
			stroke="#FF1081"
			stroke-width="2"
			opacity="0.6"
		/>
		<circle cx="270" cy="385" r="3.5" fill="#FF1081" opacity="0.75" />

		<!-- 8. CUP-LIP BAR ACCENT: Penegasan grafis bibir cup resmi di bagian atas -->
		<rect x="260" y="24" width="84" height="4" rx="2" fill="#FF1081" fill-opacity="0.5" />
	</svg>
</div>
