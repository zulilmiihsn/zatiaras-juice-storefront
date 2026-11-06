const fs = require('fs');
let s;
const rep = (a, b) => {
	if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80));
	s = s.replace(a, () => b);
};
const f = 'src/lib/liquid/renderer.ts';
s = fs.readFileSync(f, 'utf8');
rep(
	'\tvec4 c = texture(uTex, vUv - d);',
	`	vec2 su = vUv - d;
	vec4 c = texture(uTex, su);
	// Outside the image there is no liquid (clamping would smear the border pixels).
	c *= step(0.0, su.x) * step(su.x, 1.0) * step(0.0, su.y) * step(su.y, 1.0);`
);
rep(
	"gl.uniform1f(this.u['photo.uPad'], 0);",
	"// Small margin so flexing arms are not cut at the image border.\n\t\t\tgl.uniform1f(this.u['photo.uPad'], 0.06);"
);
fs.writeFileSync(f, s);
