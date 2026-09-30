<!-- CupProduct.svelte — ilustrasi vektor tumbler Jus Alpukat 22 oz.
Aset turunan baru (bukan trace foto): kubah + badan + jus + logo Z resmi.
Logo Z Memakai path resmi byte-per-byte (cupPath.ts), geometri utuh. -->
<script lang="ts">
	import { CUP_D, CUP_TRANSFORM } from '$lib/assets/brand/cupPath';
</script>

<svg
	viewBox="0 0 300 430"
	class="h-auto w-full"
	role="img"
	aria-label="Cup Jus Alpukat Zatiaras 22 oz"
>
	<defs>
		<linearGradient id="cup-juice" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#a5c96b" />
			<stop offset="0.5" stop-color="#7fae3f" />
			<stop offset="1" stop-color="#5d8f28" />
		</linearGradient>
		<linearGradient id="cup-glass" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#ffffff" stop-opacity="0.55" />
			<stop offset="0.25" stop-color="#ffffff" stop-opacity="0.08" />
			<stop offset="0.75" stop-color="#ffffff" stop-opacity="0.05" />
			<stop offset="1" stop-color="#ffffff" stop-opacity="0.35" />
		</linearGradient>
		<clipPath id="cup-body-clip">
			<path d="M70,110 L230,110 L214,400 Q213,414 199,414 L101,414 Q87,414 86,400 Z" />
		</clipPath>
		<path id="zcup-logo" d={CUP_D} transform={CUP_TRANSFORM} />
	</defs>

	<!-- Kubah -->
	<path
		d="M62,108 Q62,52 150,52 Q238,52 238,108 Z"
		fill="#ffffff"
		fill-opacity="0.35"
		stroke="#e5e0d8"
		stroke-width="3"
	/>
	<ellipse cx="150" cy="108" rx="88" ry="12" fill="#f3efe7" stroke="#e5e0d8" stroke-width="3" />
	<rect
		x="58"
		y="102"
		width="184"
		height="14"
		rx="7"
		fill="#ffffff"
		fill-opacity="0.7"
		stroke="#e5e0d8"
		stroke-width="2"
	/>

	<!-- Badan cup -->
	<path
		d="M70,110 L230,110 L214,400 Q213,414 199,414 L101,414 Q87,414 86,400 Z"
		fill="#fdfcf9"
		stroke="#e5e0d8"
		stroke-width="3"
	/>

	<!-- Jus di dalam -->
	<g clip-path="url(#cup-body-clip)">
		<rect x="60" y="150" width="180" height="270" fill="url(#cup-juice)" />
		<ellipse cx="150" cy="150" rx="82" ry="12" fill="#b8d98a" />
		<rect x="60" y="150" width="180" height="270" fill="url(#cup-glass)" />
		<!-- gelembung -->
		<circle cx="120" cy="250" r="5" fill="#ffffff" opacity="0.5" />
		<circle cx="170" cy="310" r="7" fill="#ffffff" opacity="0.4" />
		<circle cx="140" cy="350" r="4" fill="#ffffff" opacity="0.5" />
		<circle cx="185" cy="220" r="3.5" fill="#ffffff" opacity="0.55" />
		<circle cx="110" cy="300" r="3" fill="#ffffff" opacity="0.45" />
	</g>

	<!-- Logo Z resmi di badan -->
	<use
		href="#zcup-logo"
		fill="#FF1081"
		transform="translate(150 265) scale(0.115) translate(-310 -397)"
	/>

	<!-- Kilau kaca -->
	<rect x="92" y="130" width="16" height="240" rx="8" fill="#ffffff" opacity="0.5" />
</svg>
