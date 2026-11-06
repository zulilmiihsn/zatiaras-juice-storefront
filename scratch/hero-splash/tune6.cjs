const fs = require('fs');
const f = 'src/lib/components/LiquidSplash.svelte';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
rep(`Simulation + screen-space shading live in $lib/liquid.`, `Crown (animated arms) + droplet simulation + screen-space shading live in
$lib/liquid.`);
rep(`	import { LiquidRenderer } from '$lib/liquid/renderer';`, `	import { LiquidRenderer } from '$lib/liquid/renderer';
	import { Crown } from '$lib/liquid/crown';`);
rep(`		const sim = new LiquidSim(coarse ? 700 : 1000);`, `		const sim = new LiquidSim(coarse ? 220 : 360);
		const crown = new Crown();`);
rep(`				size: portrait ? Math.min(size * 0.56, aspect * 0.6) : Math.min(size, aspect * 0.36)`, `				size: portrait ? Math.min(size * 0.84, aspect * 0.95) : Math.min(size, aspect * 0.36)`);
rep(`			sim.emission = 1 - smooth(0.15, 0.55, p);
			sim.absorbBelow = wave;
			const steps = dt > 28 ? 2 : 1;
			for (let s = 0; s < steps; s++) sim.step(pointer);`, `			sim.absorbBelow = wave;
			crown.presence = 1 - smooth(0.2, 0.55, p);
			crown.update(now / 1000, Math.min(dt, 50) / 1000, sim.layout, pointer, sim);

			// A fast swipe through the splash throws liquid off with it.
			const { cx, cy, size: crownSize } = sim.layout;
			const speed = Math.hypot(pointer.vx, pointer.vy);
			if (
				pointer.active &&
				speed > 1.2 &&
				Math.abs(pointer.x - cx) < crownSize * 0.8 &&
				pointer.y < cy + crownSize * 0.1 &&
				pointer.y > cy - crownSize * 1.05
			) {
				sim.inject(pointer.x, pointer.y, pointer.vx * 0.6, pointer.vy * 0.6);
			}

			const steps = dt > 28 ? 2 : 1;
			for (let s = 0; s < steps; s++) sim.step(pointer);`);
rep(`			renderer.render(sim, {`, `			renderer.render(sim, crown, {`);
fs.writeFileSync(f, s);
