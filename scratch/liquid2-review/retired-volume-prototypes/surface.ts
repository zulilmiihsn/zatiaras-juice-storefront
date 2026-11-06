// One connected water surface, resolved finely beside the drink. The inner rows follow
// the collision-driven film; outer rows remain the simulated pool. A contact boundary
// follows the solid cylinder while it is exposed, and closes only after submersion.

import type { LiquidSim } from './sim';

export interface SurfaceGrid {
	cols: number;
	rows: number;
	radii: Float32Array;
	cos: Float32Array;
	sin: Float32Array;
	contactWidth: number;
	indices: Uint32Array;
	bodyCount: number;
	data: Float32Array;
}

export function createSurfaceGrid(sim: LiquidSim): SurfaceGrid {
	const cols = sim.field.cols <= 64 ? 64 : 96;
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
		cos: Float32Array.from({ length: cols }, (_, i) => Math.cos((i * Math.PI * 2) / cols)),
		sin: Float32Array.from({ length: cols }, (_, i) => Math.sin((i * Math.PI * 2) / cols)),
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
	const x0 = sim.drink?.x ?? 0,
		z0 = sim.drink?.z ?? 0;
	for (let j = 0; j < grid.rows; j++)
		for (let i = 0; i < grid.cols; i++) {
			const o = (j * grid.cols + i) * 6;
			const x = x0 + grid.radii[j] * grid.cos[i],
				z = z0 + grid.radii[j] * grid.sin[i];
			grid.data[o] = x;
			grid.data[o + 1] = sim.level + sample(sim, heights, x, z);
			grid.data[o + 2] = z;
			grid.data[o + 3] = 0;
			grid.data[o + 4] = 1;
			grid.data[o + 5] = 0;
		}
	const centre = grid.rows * grid.cols * 6;
	grid.data[centre] = x0;
	grid.data[centre + 1] = sim.level;
	grid.data[centre + 2] = z0;
	grid.data[centre + 3] = 0;
	grid.data[centre + 4] = 1;
	grid.data[centre + 5] = 0;
}
