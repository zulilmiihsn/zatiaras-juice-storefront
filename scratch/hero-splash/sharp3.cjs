const fs = require('fs');
const f = 'src/lib/liquid/crown.ts';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80)); s = s.replace(a, () => b); };
rep(
	'	float top = H * (0.78 + 0.5 * h1 * pow(cos(a * N * 0.5), 4.0));',
	`	float cu = cos(a * N * 0.5);
	float top = H * (0.78 + 0.5 * h1 * cu * cu * cu * cu);
	// The cusps rise steeply around the rim; scale the cut so rays cannot step through them.
	float cusp = H * h1 * N * abs(cu * cu * cu * sin(a * N * 0.5)) / max(r, 0.3);`
);
rep('	wall = smax(wall, y - top, 0.04);', '	wall = smax(wall, (y - top) / sqrt(1.0 + cusp * cusp), 0.04);');
fs.writeFileSync(f, s);
