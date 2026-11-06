const fs = require('fs');
let s;
const rep = (a, b) => {
	if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80));
	s = s.replace(a, () => b);
};
let f = 'src/lib/liquid/crown.ts';
s = fs.readFileSync(f, 'utf8');
rep(
	`	bool hit = false;
	for (int i = 0; i < STEPS; i++) {
		float d = scene(ro + rd * t);
		float cov = d / (pix * t);
		if (cov < best) { best = cov; tBest = t; }
		if (d < pix * t * 0.5) { hit = true; break; }
		t += d * 0.9;
		if (t > tb.y) break;
	}
	// Silhouettes get a one-pixel coverage ramp instead of a stair-stepped edge.
	float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, 1.0, best);`,
	`	bool hit = false, escaped = false;
	for (int i = 0; i < STEPS; i++) {
		float d = scene(ro + rd * t);
		float cov = d / (pix * t);
		if (cov < best) { best = cov; tBest = t; }
		if (d < pix * t * 0.5) { hit = true; break; }
		t += d * 0.9;
		if (t > tb.y) { escaped = true; break; }
	}
	// A ray that ran out of steps is grazing a surface, not looking past it: keep it solid.
	// Only rays that left the bounds get the one-pixel silhouette coverage ramp.
	float alpha = hit || !escaped ? 1.0 : 1.0 - smoothstep(0.0, 1.0, best);`
);
rep(
	'vec3 c = mix(vec3(0.05, 0.035, 0.045), vec3(0.42, 0.38, 0.4), smoothstep(-0.2, 0.9, d.y));',
	'vec3 c = mix(vec3(0.16, 0.1, 0.13), vec3(0.46, 0.42, 0.44), smoothstep(-0.2, 0.9, d.y));'
);
fs.writeFileSync(f, s);

f = 'src/lib/components/LiquidSplash.svelte';
s = fs.readFileSync(f, 'utf8');
rep(
	'let scale = coarse ? 0.5 : 0.7;',
	`// Backing scale relative to the device pixels; adapts between MIN_SCALE and ceiling.
		const MIN_SCALE = 0.4;
		let ceiling = coarse ? 0.75 : 1;
		let scale = ceiling;`
);
rep(
	`			// Adaptive resolution: drop the backing scale if frames run long.
			frames++;
			if (dtMs > 24) slowFrames++;
			if (frames >= 90) {
				if (slowFrames > 30 && scale > 0.3) {
					scale *= 0.8;
					layout();
				}
				frames = slowFrames = 0;
			}`,
	`			// Adaptive resolution: drop the backing scale while frames run long, and
			// climb back toward the last scale that held up once they are fast again.
			frames++;
			if (dtMs > 24) slowFrames++;
			if (frames >= 60) {
				if (slowFrames > 15 && scale > MIN_SCALE) {
					ceiling = Math.max(MIN_SCALE, scale * 0.95);
					scale = Math.max(MIN_SCALE, scale * 0.85);
					layout();
				} else if (slowFrames < 3 && scale < ceiling) {
					scale = Math.min(ceiling, scale * 1.1);
					layout();
				}
				frames = slowFrames = 0;
			}`
);
fs.writeFileSync(f, s);
