const fs = require('fs');
const f = 'src/lib/liquid/crown.ts';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 80)); s = s.replace(a, () => b); };
rep('bool hit = false, escaped = false;', 'bool hit = false;');
rep('if (t > tb.y) { escaped = true; break; }', 'if (t > tb.y) break;');
rep(`	// A ray that ran out of steps is grazing a surface, not looking past it: keep it solid.
	// Only rays that left the bounds get the one-pixel silhouette coverage ramp.
	float alpha = hit || !escaped ? 1.0 : 1.0 - smoothstep(0.0, 1.0, best);`,
`	// Silhouettes get a one-pixel coverage ramp instead of a stair-stepped edge.
	float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, 1.0, best);`);
fs.writeFileSync(f, s);
