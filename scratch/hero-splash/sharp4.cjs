const fs = require('fs');
const f = 'src/lib/liquid/crown.ts';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80)); s = s.replace(a, () => b); };
rep('	return d * min(1.0, 1.0 + uLag);\n}', `	// The lean shear stretches space with height; keep the step conservative.
	float lk = 2.0 * length(uLean) * lift;
	return d * min(1.0, 1.0 + uLag) / sqrt(1.0 + lk * lk);
}`);
fs.writeFileSync(f, s);
