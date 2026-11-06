const fs = require('fs');
let s;
const rep = (a, b) => {
	if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80));
	s = s.replace(a, () => b);
};

// ---------------- renderer ----------------
let f = 'src/lib/liquid/renderer.ts';
s = fs.readFileSync(f, 'utf8');

// Photo vertex shader: padded quad so a wide glow can bleed past the image edge.
rep(
	`uniform float uAspect;
out vec2 vUv;
void main() {
	vec2 q = verts[gl_VertexID];
	vUv = q; // v down, like the image
	vec2 w = uRect.xy + q * uRect.zw;`,
	`uniform float uAspect;
uniform float uPad;   // extra uv margin around the image (glow pass)
out vec2 vUv;
void main() {
	vec2 q = verts[gl_VertexID] * (1.0 + 2.0 * uPad) - uPad;
	vUv = q; // v down, like the image
	vec2 w = uRect.xy + q * uRect.zw;`
);

// Photo fragment shader: glow mode + surge pulses.
rep(
	`uniform float uAlpha;
out vec4 outColor;

vec2 disp(vec2 uv) {`,
	`uniform float uAlpha;
uniform float uGlow;  // 1 = soft magenta bounce-light halo instead of the photo
out vec4 outColor;

vec2 disp(vec2 uv) {`
);
rep(
	`	// Arms swing from the root: displacement grows with height squared.`,
	`	// Surges: a slow pulse climbs each arm, swelling it outward and stretching it.
	float pulse = pow(0.5 + 0.5 * sin(uTime * 0.85 - uv.y * 3.6 + (uv.x < 0.5 ? 0.0 : 1.7)), 3.0);
	d.x += (uv.x < 0.5 ? -1.0 : 1.0) * pulse * 0.014 * h * h;
	d.y += pulse * 0.007 * h;
	// Arms swing from the root: displacement grows with height squared.`
);
rep(
	`void main() {
	vec2 e = vec2(0.002, 0.002);
	vec2 d = disp(vUv);`,
	`void main() {
	if (uGlow > 0.5) {
		// Light the splash throws onto its surroundings: wide, soft, tinted by the liquid.
		float a = textureLod(uTex, vUv, 5.0).a;
		a = smoothstep(0.0, 0.55, a) * 0.3 * uAlpha;
		outColor = vec4(vec3(1.0, 0.1, 0.52) * a, a);
		return;
	}
	vec2 e = vec2(0.002, 0.002);
	vec2 d = disp(vUv);`
);

// Shade: back wave layer, crest highlight, caustics.
rep(
	`	float aa = max(fwidth(c), 1e-4);
	float alpha = clamp((c - T) / aa + 0.5, 0.0, 1.0);
	if (alpha <= 0.0) { outColor = vec4(0.0); return; }`,
	`	float aa = max(fwidth(c), 1e-4);
	float alpha = clamp((c - T) / aa + 0.5, 0.0, 1.0);

	// Back wave: a second, lighter and translucent swell behind the front one.
	vec2 wp = world(vUv);
	float backS = waveSurface(wp.x * 0.8 + 1.3) - 0.05;
	float pixel = fwidth(wp.y) * 1.5;
	float backA = smoothstep(-pixel, pixel, wp.y - backS) * step(backS, 1.1);
	float backRim = exp(-pow((wp.y - backS - 0.004) / 0.009, 2.0)) * step(backS, 1.1);
	vec3 backCol = mix(vec3(1.0, 0.42, 0.72), vec3(1.0, 0.18, 0.58), smoothstep(0.0, 0.18, wp.y - backS));
	backCol += vec3(1.0, 0.85, 0.95) * backRim * 0.7;
	vec4 back = vec4(backCol * backA * 0.62, backA * 0.62);
	if (alpha <= 0.0) { outColor = back; return; }`
);
rep(
	`	outColor = vec4(min(col, vec3(1.0)) * alpha, alpha);
}\`;`,
	`	// Under the surface: faint drifting caustics; on the crest: a bright wet line.
	float depth = wp.y - waveSurface(wp.x);
	float below = step(0.0, depth) * step(waveSurface(wp.x), 1.1);
	col *= 1.0 + 0.06 * below * smoothstep(0.0, 0.12, depth)
		* sin(wp.x * 22.0 + sin(wp.y * 15.0 + uTime) * 2.2 + uTime * 0.9);
	float crest = exp(-pow((depth - 0.006) / 0.011, 2.0)) * step(waveSurface(wp.x), 1.1);
	col += vec3(1.0, 0.9, 0.96) * crest * 0.55;

	vec4 front = vec4(min(col, vec3(1.0)) * alpha, alpha);
	outColor = front + back * (1.0 - front.a);
}\`;`
);

// uniforms
rep(
	"for (const name of ['uRect', 'uAspect', 'uTex', 'uTime', 'uBend', 'uPtr', 'uAlpha']) {",
	"for (const name of ['uRect', 'uAspect', 'uTex', 'uTime', 'uBend', 'uPtr', 'uAlpha', 'uPad', 'uGlow']) {"
);
// two draws: glow then photo
rep(
	`			gl.uniform1f(this.u['photo.uAlpha'], photo.alpha);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disable(gl.BLEND);`,
	`			gl.uniform1f(this.u['photo.uAlpha'], photo.alpha);
			// Bounce-light halo first, then the photograph itself.
			gl.uniform1f(this.u['photo.uGlow'], 1);
			gl.uniform1f(this.u['photo.uPad'], 0.45);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.uniform1f(this.u['photo.uGlow'], 0);
			gl.uniform1f(this.u['photo.uPad'], 0);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disable(gl.BLEND);`
);
fs.writeFileSync(f, s);

// ---------------- component: crest spray ----------------
f = 'src/lib/components/LiquidSplash.svelte';
s = fs.readFileSync(f, 'utf8');
rep(
	'\t\t\tsim.absorbBelow = wave;',
	`			sim.absorbBelow = wave + 0.12;
			// Spray thrown off the crest while the wave climbs.
			const rising = Math.sin(Math.PI * smooth(0.05, 0.75, p));
			if (rising > 0.02 && wave < 1.05) {
				const aspect = sim.layout.aspect;
				const sprays = rising * 1.6 * (dt / 16.7);
				for (let n = Math.random() * 2 < sprays ? 1 : 0; n > 0; n--) {
					const sx = Math.random() * aspect;
					const t = now / 1000;
					const surface =
						wave +
						(0.03 + 0.05 * Math.sin(Math.PI * p)) *
							(0.6 * Math.sin(sx * 3.1 + t * 0.9) +
								0.32 * Math.sin(sx * 7.3 - t * 1.7) +
								0.14 * Math.sin(sx * 15 + t * 2.6));
					sim.inject(sx, surface, (Math.random() - 0.5) * 0.5, -(0.5 + Math.random() * 0.8));
				}
			}`
);
fs.writeFileSync(f, s);
