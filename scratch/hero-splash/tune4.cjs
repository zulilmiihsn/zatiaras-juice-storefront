const fs = require('fs');
const f = 'src/lib/liquid/sim.ts';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
// Remove emitter block wholesale.
const start = s.indexOf('\tprivate emit(): void {');
const end = s.indexOf('\tprivate allocate(): number {');
s = s.slice(0, start) + `	/** Add one particle; velocity in world units per second. Returns false when full. */
	inject(x: number, y: number, vx: number, vy: number): boolean {
		const i = this.allocate();
		if (i < 0) return false;
		// Spread spawns slightly so new particles never stack exactly.
		this.pos[i * 2] = x + (Math.random() - 0.5) * this.h * 0.3;
		this.pos[i * 2 + 1] = y + (Math.random() - 0.5) * this.h * 0.3;
		this.vel[i * 2] = vx * STEP_SECONDS;
		this.vel[i * 2 + 1] = vy * STEP_SECONDS;
		return true;
	}

` + s.slice(end);
rep(`	/** 0..1 — how strongly the emitters launch liquid (scroll fades it out). */
	emission = 1;
`, '');
rep('\tprivate spawnDebt = 0;\n', '');
rep('\t\t\tthis.emit();\n', '');
rep('// 2D viscoelastic liquid (Clavet et al. 2005, double density relaxation).', '// 2D viscoelastic liquid (Clavet et al. 2005, double density relaxation) for the\n// droplets and splashes around the crown.');
rep(`		// Apex of a full-speed launch ≈ 0.9 × size.
		return (2.6 * this.layout.size) * STEP_SECONDS * STEP_SECONDS;`, `		return 2.6 * this.layout.size * STEP_SECONDS * STEP_SECONDS;`);
rep('const vMax = Math.sqrt(2 * 2.6 * size * 0.85) * 1.02 * STEP_SECONDS;', 'const vMax = size * 2.4 * STEP_SECONDS;');
rep('this.h = layout.size * 0.06;', 'this.h = layout.size * 0.045;');
fs.writeFileSync(f, s);
