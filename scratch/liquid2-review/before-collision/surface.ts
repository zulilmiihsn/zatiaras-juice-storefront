// A single water surface: the simulated pool and its rolling crest share vertices,
// triangles, normals and material. The wave displaces the pool's own grid, so its broad
// shoulder has no cut edge or independent sheet to intersect the water below it.

import type { Drink } from './scene';
import type { LiquidSim } from './sim';
import type { Swirl } from './swirl';

/** Move an existing pool point through a compact rolling wave; never add another surface. */
export function surfacePoint(
	swirl: Swirl,
	drink: Drink | null,
	x: number,
	z: number,
	base: number,
	out: Float32Array,
	o: number
) {
	out[o] = x;
	out[o + 1] = base;
	out[o + 2] = z;
	if (!drink || !(swirl.height > 0.00001)) return;
	const dx = x - drink.x;
	const dz = z - drink.z;
	const r2 = dx * dx + dz * dz;
	const limit = drink.radius * 3 + swirl.height * 4;
	if (r2 > limit * limit || r2 < drink.radius * drink.radius) return;
	const radius = Math.sqrt(r2);
	const angle = Math.atan2(dz, dx);
	// Broad, travelling pressure lobes make the same wave wrap around the cup. Small
	// diagonal folds disturb its crest without growing separate fingers or rigid walls.
	const amplitude =
		swirl.height *
		(0.65 + 0.25 * Math.sin(angle - swirl.phase) + 0.1 * Math.sin(3 * angle + 0.7 * swirl.phase));
	const width = 0.7 * drink.radius + 1.1 * amplitude;
	const crest = 1.3 * drink.radius + 1.1 * amplitude;
	const q = (radius - crest) / width;
	if (Math.abs(q) >= 1) return;
	// Both height and horizontal roll have zero first and second derivatives at the
	// footprint edge. They therefore join the actual uneven pool with the same tangent.
	const shoulder = 1 - q * q;
	const envelope = shoulder * shoulder * shoulder;
	const inner = Math.min(1, Math.max(0, (radius / drink.radius - 1) / 0.3));
	const contact = inner * inner * (3 - 2 * inner);
	const lift = amplitude * envelope * contact;
	const fold = 1 + 0.06 * Math.sin(4 * angle + 2 * q - swirl.time * 1.8);
	// Points slide toward crests (sharper peaks, broader troughs) and crests lean along
	// the flow, so a travelling swell curls forward instead of rising as a sine bump.
	// Beside the drink the displacement fades smoothly: folding a run-up face into the
	// cylinder would make shards and let water pass through the product image.
	const roll = -0.95 * lift * envelope;
	const radial = Math.max(drink.radius * 1.001, radius + roll);
	const tangent = 0.05 * lift * envelope * Math.sin(3 * angle + swirl.phase);
	out[o] = drink.x + (radial * dx - tangent * dz) / radius;
	out[o + 1] = base + lift * fold;
	out[o + 2] = drink.z + (radial * dz + tangent * dx) / radius;
}

/** A connected rectangular grid; its only boundary is the outside of the entire pool. */
export function surfaceIndices(cols: number, rows: number): Uint32Array {
	if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2)
		throw new RangeError('liquid2 surface requires at least two rows and columns');
	const indices = new Uint32Array((cols - 1) * (rows - 1) * 6);
	let n = 0;
	for (let j = 0; j < rows - 1; j++)
		for (let i = 0; i < cols - 1; i++) {
			const k = j * cols + i;
			indices.set([k, k + cols, k + 1, k + 1, k + cols, k + cols + 1], n);
			n += 6;
		}
	return indices;
}

/**
 * Fill interleaved position and normal arrays (6 floats per vertex) for the whole pool.
 * Each point is evaluated once; neighbouring grid points supply normals on both the
 * calm surface and the folded crest, so the join has no independent lighting seam.
 */
export function buildSurfaceMesh(
	sim: LiquidSim,
	xs: Float32Array,
	zs: Float32Array,
	out: Float32Array,
	heights: Float32Array
) {
	const field = sim.field;
	field.renderHeights(heights);
	const cols = xs.length;
	const rows = zs.length;
	for (let j = 0; j < rows; j++) {
		const z = zs[j];
		const cj = Math.floor((z - field.domain.z0) / field.dz);
		for (let i = 0; i < cols; i++) {
			const x = xs[i];
			const ci = Math.floor((x - field.domain.x0) / field.dx);
			const height =
				ci >= 0 && ci < field.cols && cj >= 0 && cj < field.rows
					? heights[cj * field.cols + ci]
					: 0;
			surfacePoint(sim.swirl, sim.drink, x, z, sim.level + height, out, (j * cols + i) * 6);
		}
	}
	for (let j = 0; j < rows; j++)
		for (let i = 0; i < cols; i++) {
			const o = (j * cols + i) * 6;
			const a = (j * cols + Math.min(cols - 1, i + 1)) * 6;
			const b = (j * cols + Math.max(0, i - 1)) * 6;
			const c = (Math.min(rows - 1, j + 1) * cols + i) * 6;
			const d = (Math.max(0, j - 1) * cols + i) * 6;
			const ex = out[a] - out[b],
				ey = out[a + 1] - out[b + 1],
				ez = out[a + 2] - out[b + 2];
			const fx = out[c] - out[d],
				fy = out[c + 1] - out[d + 1],
				fz = out[c + 2] - out[d + 2];
			let nx = fy * ez - fz * ey;
			let ny = fz * ex - fx * ez;
			let nz = fx * ey - fy * ex;
			// Math.hypot is markedly slower than sqrt in V8, and this runs per vertex per frame.
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
			if (len > 1e-12) {
				nx /= len;
				ny /= len;
				nz /= len;
			} else {
				nx = 0;
				ny = 1;
				nz = 0;
			}
			out[o + 3] = nx;
			out[o + 4] = ny;
			out[o + 5] = nz;
		}
}
