const fs = require('fs');
let s;
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
let f = 'src/lib/liquid/sim.ts'; s = fs.readFileSync(f, 'utf8');
rep(`			const y = cy - size * 0.04;`, `			// Spread spawns over a small disc so new particles never stack.
			x += (Math.random() - 0.5) * this.h * 0.8;
			const y = cy - size * 0.04 + (Math.random() - 0.5) * this.h * 0.8;`);
rep(`		const kNear = 0.06 * h;`, `		const kNear = 0.04 * h;`);
rep(`			vel[i * 2] = x - prev[i * 2];
			vel[i * 2 + 1] = y - prev[i * 2 + 1];`, `			// Cap speed: relaxation must not fling liquid faster than a launch.
			let vx = x - prev[i * 2];
			let vy = y - prev[i * 2 + 1];
			const v2 = vx * vx + vy * vy;
			if (v2 > vMax * vMax) {
				const k = vMax / Math.sqrt(v2);
				vx *= k;
				vy *= k;
			}
			vel[i * 2] = vx;
			vel[i * 2 + 1] = vy;`);
rep(`		const { cx, cy, size } = this.layout;
		for (let i = 0; i < capacity; i++) {
			if (!alive[i]) continue;
			const x = pos[i * 2];`, `		const { cx, cy, size } = this.layout;
		const vMax = Math.sqrt(2 * 2.6 * size) * 1.15 * STEP_SECONDS;
		for (let i = 0; i < capacity; i++) {
			if (!alive[i]) continue;
			const x = pos[i * 2];`);
fs.writeFileSync(f, s);
f = 'src/lib/components/LiquidSplash.svelte'; s = fs.readFileSync(f, 'utf8');
rep('const sim = new LiquidSim(coarse ? 520 : 900);', 'const sim = new LiquidSim(coarse ? 700 : 1000);');
fs.writeFileSync(f, s);
