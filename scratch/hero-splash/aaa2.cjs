const fs = require('fs');
let s;
const rep = (a, b) => {
	if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80));
	s = s.replace(a, () => b);
};
const f = 'src/lib/liquid/renderer.ts';
s = fs.readFileSync(f, 'utf8');
rep(
	`		float a = textureLod(uTex, vUv, 5.0).a;
		a = smoothstep(0.0, 0.55, a) * 0.3 * uAlpha;`,
	`		// Clamped sampling would smear edge pixels outwards; fade the halo past the border.
		float outside = max(max(-vUv.x, vUv.x - 1.0), max(-vUv.y, vUv.y - 1.0));
		float a = textureLod(uTex, clamp(vUv, 0.0, 1.0), 5.0).a;
		a = smoothstep(0.0, 0.55, a) * 0.3 * uAlpha * (1.0 - smoothstep(0.0, 0.1, outside));`
);
rep("gl.uniform1f(this.u['photo.uPad'], 0.45);", "gl.uniform1f(this.u['photo.uPad'], 0.12);");
fs.writeFileSync(f, s);
