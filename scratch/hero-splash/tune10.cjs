const fs = require('fs');
let s;
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
let f = 'src/lib/liquid/renderer.ts'; s = fs.readFileSync(f, 'utf8');
rep(`	f += T * clamp((w.y - s) * 22.0 + 1.0, 0.0, 4.0);
	return f;`, `	f += T * clamp((w.y - s) * 22.0 + 1.0, 0.0, 4.0);
	// Saturate deep liquid so anything submerged in the wave reads as one flat body.
	return min(f, 1.6);`);
fs.writeFileSync(f, s);
f = 'src/lib/components/LiquidSplash.svelte'; s = fs.readFileSync(f, 'utf8');
rep('pool: 1 - smooth(0.25, 0.6, p)', 'pool: 1 - smooth(0.1, 0.35, p)');
rep(': Math.min(size, aspect * 0.4)', ': Math.min(size, aspect * 0.36)');
fs.writeFileSync(f, s);
