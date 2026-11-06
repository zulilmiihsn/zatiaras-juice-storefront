const fs = require('fs');
let s;
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
let f = 'src/lib/liquid/sim.ts'; s = fs.readFileSync(f, 'utf8');
rep('const vMax = Math.sqrt(2 * 2.6 * size) * 1.15 * STEP_SECONDS;', 'const vMax = Math.sqrt(2 * 2.6 * size * 0.85) * 1.02 * STEP_SECONDS;');
rep(`				x = cx + side * size * (0.24 + sway + Math.random() * 0.08);
				angle = side * flare * (0.1 + Math.random() * 0.22);`, `				// Fan across the rim: outer launches lean further out, forming a sheet.
				const u = Math.random();
				x = cx + side * size * (0.12 + sway + u * 0.3);
				angle = side * flare * (0.04 + u * 0.4 + (Math.random() - 0.5) * 0.08);`);
fs.writeFileSync(f, s);
