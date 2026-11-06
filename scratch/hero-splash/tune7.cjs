const fs = require('fs');
let f = 'src/lib/liquid/crown.ts';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
const startW = s.indexOf('const WIDE: Arm[] = [');
const endT = s.indexOf('const SAMPLES = 34;');
s = s.slice(0, startW) + `const WIDE: Arm[] = [
	// Main sheets: thick roots that flare outward and curl up at the tips.
	{ p0: [-0.12, 0.04], p1: [-0.3, 0.12], p2: [-0.58, 0.3], p3: [-0.74, 0.7], base: 0.24, tip: 0.035, phase: 0, drip: 1.4 },
	{ p0: [0.12, 0.04], p1: [0.32, 0.12], p2: [0.6, 0.32], p3: [0.76, 0.74], base: 0.24, tip: 0.035, phase: 1.7, drip: 1.4 },
	// Secondary tongues on the outer rim.
	{ p0: [-0.36, 0.04], p1: [-0.5, 0.1], p2: [-0.62, 0.12], p3: [-0.74, 0.2], base: 0.09, tip: 0.026, phase: 0.6, drip: 0.6 },
	{ p0: [0.38, 0.04], p1: [0.52, 0.1], p2: [0.64, 0.1], p3: [0.76, 0.16], base: 0.09, tip: 0.026, phase: 2.4, drip: 0.6 },
	// Crown spikes along the rim, each ending in a bead.
	{ p0: [-0.22, 0.06], p1: [-0.24, 0.16], p2: [-0.26, 0.24], p3: [-0.27, 0.32], base: 0.06, tip: 0.022, phase: 3.1, drip: 0.4 },
	{ p0: [-0.02, 0.08], p1: [-0.02, 0.16], p2: [-0.03, 0.22], p3: [-0.03, 0.28], base: 0.05, tip: 0.02, phase: 4.2, drip: 0.3 },
	{ p0: [0.2, 0.06], p1: [0.22, 0.18], p2: [0.25, 0.28], p3: [0.27, 0.38], base: 0.06, tip: 0.022, phase: 5.0, drip: 0.4 },
	{ p0: [0.44, 0.06], p1: [0.48, 0.14], p2: [0.5, 0.2], p3: [0.52, 0.25], base: 0.045, tip: 0.02, phase: 5.8, drip: 0.3 }
];

// Tall U crown (portrait).
const TALL: Arm[] = [
	{ p0: [-0.14, 0.04], p1: [-0.4, 0.3], p2: [-0.26, 0.66], p3: [-0.36, 1.0], base: 0.22, tip: 0.04, phase: 0, drip: 1.2 },
	{ p0: [0.14, 0.04], p1: [0.4, 0.28], p2: [0.3, 0.62], p3: [0.36, 0.92], base: 0.21, tip: 0.04, phase: 1.9, drip: 1.2 },
	{ p0: [-0.34, 0.04], p1: [-0.44, 0.1], p2: [-0.5, 0.14], p3: [-0.54, 0.2], base: 0.08, tip: 0.024, phase: 0.8, drip: 0.5 },
	{ p0: [0.34, 0.04], p1: [0.44, 0.1], p2: [0.49, 0.14], p3: [0.53, 0.18], base: 0.08, tip: 0.024, phase: 2.6, drip: 0.5 },
	{ p0: [-0.2, 0.06], p1: [-0.21, 0.14], p2: [-0.22, 0.2], p3: [-0.23, 0.28], base: 0.05, tip: 0.02, phase: 3.3, drip: 0.3 },
	{ p0: [-0.01, 0.08], p1: [-0.01, 0.16], p2: [-0.02, 0.24], p3: [-0.02, 0.32], base: 0.05, tip: 0.02, phase: 4.4, drip: 0.3 },
	{ p0: [0.2, 0.06], p1: [0.21, 0.14], p2: [0.22, 0.2], p3: [0.24, 0.26], base: 0.05, tip: 0.02, phase: 5.1, drip: 0.3 },
	{ p0: [0.44, 0.06], p1: [0.46, 0.1], p2: [0.47, 0.14], p3: [0.48, 0.18], base: 0.04, tip: 0.018, phase: 5.9, drip: 0.2 }
];

` + s.slice(endT);
rep('const ARM_COUNT = 6;', 'const ARM_COUNT = 8;');
fs.writeFileSync(f, s);
f = 'src/lib/liquid/renderer.ts'; s = fs.readFileSync(f, 'utf8');
rep("gl.uniform4f(this.u['shade.uPool'], cx, cy, size * 0.36, size * 0.11);", "gl.uniform4f(this.u['shade.uPool'], cx, cy, size * 0.46, size * 0.13);");
fs.writeFileSync(f, s);
