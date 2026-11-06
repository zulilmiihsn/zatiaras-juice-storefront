const fs = require('fs');
let s;
const rep = (a, b) => {
	if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80));
	s = s.replace(a, () => b);
};

// ---------------- splash.ts ----------------
let f = 'src/lib/liquid/splash.ts';
s = fs.readFileSync(f, 'utf8');
rep(
	'\tprivate readonly debt = new Float32Array(8);',
	`	private readonly debt = new Float32Array(8);
	/** Vertical inertia: scroll speed kicks it, a spring brings it back (image-uv). */
	lag = 0;
	private lagVel = 0;`
);
rep(
	'\t\tpointer: Pointer,\n\t\tsim: LiquidSim\n\t): void {',
	'\t\tpointer: Pointer,\n\t\tsim: LiquidSim,\n\t\t/** Scroll progress change per second (signed). */\n\t\tscrollVel = 0\n\t): void {'
);
rep(
	'\t\t// Arms: idle sway plus pointer force, spring back to rest.',
	`		// Scroll inertia: the liquid lags behind the page, then springs back.
		const kick = Math.max(-1.2, Math.min(1.2, scrollVel));
		this.lagVel += (-kick * 14 - this.lag * 55) * dt;
		this.lagVel *= Math.exp(-3.2 * dt);
		this.lag += this.lagVel * dt;

		// Arms: idle sway plus pointer force, spring back to rest.`
);
rep(
	'Math.sin(time * 1.15 + side * 2.1) * 0.03 + Math.sin(time * 2.9 + side) * 0.01',
	'Math.sin(time * 1.15 + side * 2.1) * 0.045 + Math.sin(time * 2.9 + side) * 0.016'
);
rep(
	'\t\t\tthis.bendVel[side] += (force - (this.bend[side] - idle) * 38) * dt;',
	'\t\t\t// Scrolling flings the arms outward; they swing back on the spring.\n\t\t\tforce += (side === 0 ? -1 : 1) * Math.abs(kick) * 1.6;\n\t\t\tthis.bendVel[side] += (force - (this.bend[side] - idle) * 38) * dt;'
);
// faster droplet shedding while scrolling
rep(
	'\t\t\tthis.debt[i] += tips[i].rate * dt;',
	'\t\t\tthis.debt[i] += tips[i].rate * (1 + Math.min(4, Math.abs(scrollVel) * 5)) * dt;'
);
fs.writeFileSync(f, s);

// ---------------- renderer.ts ----------------
f = 'src/lib/liquid/renderer.ts';
s = fs.readFileSync(f, 'utf8');
rep(
	'uniform float uGlow;  // 1 = soft magenta bounce-light halo instead of the photo',
	'uniform float uGlow;  // 1 = soft magenta bounce-light halo instead of the photo\nuniform float uScroll; // 0..1 page scroll through the hero\nuniform float uLag;    // vertical scroll inertia, uv units'
);
rep(
	') * 0.017 * hw;',
	') * 0.026 * hw;'
);
rep(
	'd.x += (uv.x < 0.5 ? -1.0 : 1.0) * pulse * 0.014 * h * h;\n\td.y += pulse * 0.007 * h;',
	`d.x += (uv.x < 0.5 ? -1.0 : 1.0) * pulse * 0.024 * h * h;
	d.y += pulse * 0.012 * h;
	// Scroll: the crown surges up and flares open, then is dragged back down into the wave.
	float surge = smoothstep(0.0, 0.22, uScroll) * (1.0 - smoothstep(0.22, 0.5, uScroll));
	d.y -= surge * 0.16 * h;
	d.x += (uv.x < 0.5 ? -1.0 : 1.0) * surge * 0.11 * h * h;
	d.y += uLag * h;
	d.x += sin(uv.y * 6.0 + uTime * 2.0) * abs(uLag) * 0.35 * h * h;`
);
rep(
	"'uAlpha', 'uPad', 'uGlow']",
	"'uAlpha', 'uPad', 'uGlow', 'uScroll', 'uLag']"
);
rep(
	"\t\t\tgl.uniform1f(this.u['photo.uAlpha'], photo.alpha);",
	"\t\t\tgl.uniform1f(this.u['photo.uAlpha'], photo.alpha);\n\t\t\tgl.uniform1f(this.u['photo.uScroll'], photo.scroll);\n\t\t\tgl.uniform1f(this.u['photo.uLag'], photo.lag);"
);
rep(
	'\talpha: number;\n\tbend: ArrayLike<number>;',
	'\talpha: number;\n\t/** 0..1 scroll progress and vertical inertia from Splash. */\n\tscroll: number;\n\tlag: number;\n\tbend: ArrayLike<number>;'
);
fs.writeFileSync(f, s);

// ---------------- component ----------------
f = 'src/lib/components/LiquidSplash.svelte';
s = fs.readFileSync(f, 'utf8');
rep(
	'\t\tlet pointerStamp = 0;',
	'\t\tlet pointerStamp = 0;\n\t\tlet prevProgress = progress;\n\t\tlet scrollVel = 0;'
);
rep(
	'\t\t\tconst p = Math.min(1, Math.max(0, progress));',
	`			const p = Math.min(1, Math.max(0, progress));
			// Smoothed scroll speed in progress/s; drives the liquid's inertia.
			const seconds = Math.max(0.008, dt / 1000);
			scrollVel += ((p - prevProgress) / seconds - scrollVel) * (1 - Math.exp(-12 * seconds));
			prevProgress = p;`
);
rep(
	'splash.update(now / 1000, Math.min(dt, 50) / 1000, photoRect, portraitNow, pointer, sim);',
	'splash.update(now / 1000, Math.min(dt, 50) / 1000, photoRect, portraitNow, pointer, sim, scrollVel);'
);
rep(
	'{ rect: photoRect, sink, alpha: 1, bend: splash.bend, ptr: splash.ptr }',
	'{\n\t\t\t\t\trect: photoRect,\n\t\t\t\t\tsink,\n\t\t\t\t\talpha: 1,\n\t\t\t\t\tscroll: p,\n\t\t\t\t\tlag: splash.lag,\n\t\t\t\t\tbend: splash.bend,\n\t\t\t\t\tptr: splash.ptr\n\t\t\t\t}'
);
// sink later so the surge is visible first
rep('const sink = smooth(0.1, 0.55, p) * (1.25 - photoRect.y);', 'const sink = smooth(0.22, 0.62, p) * (1.25 - photoRect.y);');
fs.writeFileSync(f, s);
