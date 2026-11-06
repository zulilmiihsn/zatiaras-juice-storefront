// One connected water surface, resolved finely beside the drink. The inner rows follow
// the collision-driven film; outer rows remain the simulated pool. A contact boundary
// follows the solid cylinder while it is exposed, and closes only after submersion.

import type { LiquidSim } from './sim';

export interface SurfaceGrid {
	cols: number;
	rows: number;
	radii: Float32Array;
	contactWidth: number;
	indices: Uint32Array;
	bodyCount: number;
	data: Float32Array;
}

export function createSurfaceGrid(sim: LiquidSim): SurfaceGrid {
	const cols = sim.runUp.segments;
	const rows = sim.field.rows + 8;
	const radius = sim.drink?.radius ?? 0.1;
	const contactWidth = radius * 1.15;
	const near = Math.min(32, rows - 12);
	const cameraDistance = Math.hypot(
		sim.camera.pos[0] - (sim.drink?.x ?? 0),
		sim.camera.pos[2] - (sim.drink?.z ?? 0)
	);
	// Flat skirts still reach behind the camera and beyond both viewport sides, so the
	// pool never exposes an outer edge as the final mean level climbs toward the lens.
	const outer = Math.max(14, cameraDistance + 8);
	const radii = Float32Array.from({ length: rows }, (_, j) =>
		j <= near
			? radius + contactWidth * Math.pow(j / near, 1.8)
			: radius +
				contactWidth +
				(outer - radius - contactWidth) * Math.pow((j - near) / (rows - 1 - near), 1.6)
	);
	const bodyCount = cols * (rows - 1) * 6;
	const indices = new Uint32Array(bodyCount + cols * 3);
	let n = 0;
	for (let j = 0; j < rows - 1; j++)
		for (let i = 0; i < cols; i++) {
			const k = j * cols + i;
			const next = j * cols + ((i + 1) % cols);
			indices.set([k, next, k + cols, next, next + cols, k + cols], n);
			n += 6;
		}
	const centre = rows * cols;
	for (let i = 0; i < cols; i++) {
		indices.set([centre, (i + 1) % cols, i], n);
		n += 3;
	}
	return {
		cols,
		rows,
		radii,
		contactWidth,
		indices,
		bodyCount,
		data: new Float32Array((centre + 1) * 6)
	};
}

/** Bilinear reconstruction of the solver's actual surface, including filled solid cells. */
function sample(sim: LiquidSim, heights: Float32Array, x: number, z: number): number {
	const field = sim.field;
	const fx = (x - field.domain.x0) / field.dx - 0.5;
	const fz = (z - field.domain.z0) / field.dz - 0.5;
	if (fx < 0 || fz < 0 || fx > field.cols - 1 || fz > field.rows - 1) return 0;
	const i = Math.min(field.cols - 2, Math.floor(fx));
	const j = Math.min(field.rows - 2, Math.floor(fz));
	const tx = fx - i,
		tz = fz - j,
		k = j * field.cols + i;
	return (
		(heights[k] * (1 - tx) + heights[k + 1] * tx) * (1 - tz) +
		(heights[k + field.cols] * (1 - tx) + heights[k + field.cols + 1] * tx) * tz
	);
}

/**
 * Fill interleaved position and normal arrays (6 floats per vertex) for the whole pool.
 * Each point is evaluated once; neighbouring grid points supply normals on both the
 * calm surface and the collision film, so their shared foot has no lighting seam.
 */
export function buildSurfaceMesh(sim: LiquidSim, grid: SurfaceGrid, heights: Float32Array) {
	sim.field.renderHeights(heights);
	const { cols, rows, data: out, radii, contactWidth } = grid;
	const drink = sim.drink;
	const radius = drink?.radius ?? 0.1;
	const x0 = drink?.x ?? 0,
		z0 = drink?.z ?? 0;
	for (let i = 0; i < cols; i++) {
		const nx = sim.runUp.cos[i],
			nz = sim.runUp.sin[i];
		const contactBase = sample(sim, heights, x0 + radius * nx, z0 + radius * nz);
		const lift = drink ? Math.max(0, sim.runUp.height[i] - contactBase) : 0;
		const blend = drink ? Math.min(1, lift / (drink.height * 0.12)) : 0;
		const bend = blend * blend * (3 - 2 * blend);
		const lip = sim.runUp.offset[i] * bend;
		const rimT = 0.82;
		const rimT2 = rimT * rimT,
			rimT3 = rimT2 * rimT;
		const rimSource = radius + contactWidth * (1 - rimT);
		const rimRadial =
			rimSource - contactWidth * rimT2 * (1 - rimT) * bend + lip * Math.pow(rimT, 6);
		const rimBase = sample(sim, heights, x0 + rimSource * nx, z0 + rimSource * nz);
		const rimY = sim.level + rimBase + lift * rimT3 * (10 - 15 * rimT + 6 * rimT2);
		const tangentR =
			-contactWidth - contactWidth * (2 * rimT - 3 * rimT2) * bend + 6 * lip * Math.pow(rimT, 5);
		const tangentY = lift * 30 * rimT2 * (1 - rimT) * (1 - rimT);
		const tangentLength = Math.hypot(tangentR, tangentY) || 1;
		const tr = tangentR / tangentLength,
			ty = tangentY / tangentLength;
		const bead = Math.min(0.025 * lift, 0.08 * radius);
		for (let j = 0; j < rows; j++) {
			const sourceRadius = radii[j];
			const t = Math.max(0, 1 - (sourceRadius - radius) / contactWidth);
			const t2 = t * t,
				t3 = t2 * t;
			// Height and its first two derivatives vanish at the same broad, wet foot.
			// Points slide inward up the cylinder, then the physical crest's outward
			// momentum curls only the upper lip. No point enters the solid drink.
			let radial = sourceRadius - contactWidth * t2 * (1 - t) * bend + lip * t3 * t3;
			const base = sample(sim, heights, x0 + sourceRadius * nx, z0 + sourceRadius * nz);
			let y = sim.level + base + lift * t3 * (10 - 15 * t + 6 * t2);
			// Surface tension thickens a free liquid edge into a rounded rim. Roll that rim
			// over the same film instead of ending the high crest on a cut, paper-thin edge.
			if (lift > 0.00001 && t > rimT) {
				const angle = ((t - rimT) / (1 - rimT)) * Math.PI * 1.5;
				const along = Math.sin(angle),
					turn = 1 - Math.cos(angle);
				radial = Math.max(radius, rimRadial + bead * (along * tr + turn * ty));
				y = rimY + bead * (along * ty - turn * tr);
			}
			const o = (j * cols + i) * 6;
			out[o] = x0 + nx * radial;
			out[o + 1] = y;
			out[o + 2] = z0 + nz * radial;
		}
	}
	for (let j = 0; j < rows; j++)
		for (let i = 0; i < cols; i++) {
			const o = (j * cols + i) * 6;
			const a = (j * cols + ((i + 1) % cols)) * 6;
			const b = (j * cols + ((i + cols - 1) % cols)) * 6;
			const c = (Math.min(rows - 1, j + 1) * cols + i) * 6;
			const d = (Math.max(0, j - 1) * cols + i) * 6;
			const ex = out[a] - out[b],
				ey = out[a + 1] - out[b + 1],
				ez = out[a + 2] - out[b + 2];
			const fx = out[c] - out[d],
				fy = out[c + 1] - out[d + 1],
				fz = out[c + 2] - out[d + 2];
			let vx = ey * fz - ez * fy,
				vy = ez * fx - ex * fz,
				vz = ex * fy - ey * fx;
			// Math.hypot is markedly slower than sqrt in V8, and this runs per vertex per frame.
			const length = Math.sqrt(vx * vx + vy * vy + vz * vz);
			if (length > 1e-12) {
				vx /= length;
				vy /= length;
				vz /= length;
			} else {
				vx = 0;
				vy = 1;
				vz = 0;
			}
			out[o + 3] = vx;
			out[o + 4] = vy;
			out[o + 5] = vz;
		}
	const centre = rows * cols * 6;
	out[centre] = x0;
	out[centre + 1] = sim.level;
	out[centre + 2] = z0;
	out[centre + 3] = 0;
	out[centre + 4] = 1;
	out[centre + 5] = 0;
}
