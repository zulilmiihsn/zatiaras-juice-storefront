const fs = require('fs');
let s;
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
let f = 'src/lib/liquid/sim.ts'; s = fs.readFileSync(f, 'utf8');
rep('const pulse = 0.82 + 0.18 * Math.sin(t * 2.1) + 0.06 * Math.sin(t * 5.3);',
	'const pulse = 0.9 + 0.08 * Math.sin(t * 2.1) + 0.04 * Math.sin(t * 5.3);');
rep(`// Particles / second, scaled to the pool so phones stay as dense as desktop.
		const rate = this.capacity * 0.55 * this.emission;`,
	`// Flight time of a full launch; emit so ~80% of the pool is airborne.
		const flight = 1.62 / Math.sqrt(size);
		const rate = ((this.capacity * 0.8) / flight) * this.emission;`);
rep('const flare = this.layout.aspect < 0.9 ? 0.55 : 0.7;', 'const flare = this.layout.aspect < 0.9 ? 0.5 : 0.42;');
rep(`			const central = Math.random() < 0.14;`, `			const roll = Math.random();
			const central = roll < 0.14;
			const droplet = roll > 0.95; // a few fast ones tear off as droplets`);
rep(`				speed = speedBase * (0.7 + Math.random() * 0.3);`, `				speed = speedBase * (droplet ? 1.05 + Math.random() * 0.12 : 0.82 + Math.random() * 0.18);`);
fs.writeFileSync(f, s);
f = 'src/lib/components/LiquidSplash.svelte'; s = fs.readFileSync(f, 'utf8');
rep('anchorX = 0.7,', 'anchorX = 0.72,');
rep('size = 0.56,', 'size = 0.5,');
rep('size: portrait ? Math.min(size * 0.62, aspect * 0.78) : Math.min(size, aspect * 0.36)',
	'size: portrait ? Math.min(size * 0.56, aspect * 0.6) : Math.min(size, aspect * 0.36)');
fs.writeFileSync(f, s);
