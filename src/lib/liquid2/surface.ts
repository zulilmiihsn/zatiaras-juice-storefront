// One connected water surface, resolved finely beside the drink. The inner rows follow
// the collision-driven film; outer rows remain the simulated pool. A contact boundary
// follows the solid cylinder while it is exposed, and closes only after submersion.

import type { LiquidSim } from './sim';
import { radiusAt } from './scene';

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
		data: new Float32Array((centre + 1) * 3)
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
			const o = (j * grid.cols + i) * 3,
				x = x0 + grid.radii[j] * grid.cos[i],
				z = z0 + grid.radii[j] * grid.sin[i];
			grid.data[o] = x;
			grid.data[o + 1] = sim.level + sample(sim, heights, x, z);
			grid.data[o + 2] = z;
		}
	const centre = grid.rows * grid.cols * 3;
	grid.data[centre] = x0;
	grid.data[centre + 1] = sim.level;
	grid.data[centre + 2] = z0;
}

export const RIM_SIDES = 8;
const RIM_COS = Float32Array.from({ length: RIM_SIDES }, (_, i) =>
	Math.cos((i * Math.PI * 2) / RIM_SIDES)
);
const RIM_SIN = Float32Array.from({ length: RIM_SIDES }, (_, i) =>
	Math.sin((i * Math.PI * 2) / RIM_SIDES)
);

export interface FilmTopology {
	rows: number;
	cols: number;
	patches: number;
	indices: Uint32Array;
	boundary: Uint32Array;
}

export interface FilmMesh extends FilmTopology {
	data: Float32Array;
	rowSamples: Int32Array;
	rowWeights: Float32Array;
	colSamples: Int32Array;
	colWeights: Float32Array;
	columnData: Float64Array;
	fieldHeights: Float32Array;
}

function sampleAxis(source: number, count: number) {
	const samples = new Int32Array(count * 4),
		weights = new Float32Array(count * 4);
	for (let i = 0; i < count; i++) {
		const value = (i * (source - 1)) / (count - 1),
			base = Math.floor(value),
			t = value - base,
			t2 = t * t,
			t3 = t2 * t;
		for (let j = 0; j < 4; j++)
			samples[i * 4 + j] = Math.max(0, Math.min(source - 1, base + j - 1));
		weights.set(
			[
				-0.5 * t + t2 - 0.5 * t3,
				1 - 2.5 * t2 + 1.5 * t3,
				0.5 * t + 2 * t2 - 1.5 * t3,
				-0.5 * t2 + 0.5 * t3
			],
			i * 4
		);
	}
	return { samples, weights };
}

/** Smooth two-sided lamellae with a rounded capillary rim and a submerged foot. */
export function createFilmTopology(sim: LiquidSim): FilmTopology {
	const source = sim.sheets,
		rows = (source.rows - 1) * 2 + 1,
		cols = (source.cols - 1) * 2 + 1;
	const patches = source.vertices.length / (source.rows * source.cols * 3),
		faceCount = patches * rows * cols;
	const path: number[] = [];
	for (let j = 0; j < rows; j++) path.push(j * cols);
	for (let i = 1; i < cols; i++) path.push((rows - 1) * cols + i);
	for (let j = rows - 2; j >= 0; j--) path.push(j * cols + cols - 1);
	const indices = new Uint32Array(
		patches * ((rows - 1) * (cols - 1) * 12 + (path.length - 1) * RIM_SIDES * 6)
	);
	let count = 0;
	for (let patch = 0; patch < patches; patch++) {
		const base = patch * rows * cols;
		for (let j = 0; j < rows - 1; j++)
			for (let i = 0; i < cols - 1; i++) {
				const a = base + j * cols + i,
					b = a + cols;
				indices.set(
					[
						a,
						b,
						a + 1,
						a + 1,
						b,
						b + 1,
						a + faceCount,
						a + 1 + faceCount,
						b + faceCount,
						a + 1 + faceCount,
						b + 1 + faceCount,
						b + faceCount
					],
					count
				);
				count += 12;
			}
		const rim = faceCount * 2 + patch * path.length * RIM_SIDES;
		for (let j = 0; j < path.length - 1; j++)
			for (let i = 0; i < RIM_SIDES; i++) {
				const a = rim + j * RIM_SIDES + i,
					b = rim + j * RIM_SIDES + ((i + 1) % RIM_SIDES);
				indices.set([a, b, a + RIM_SIDES, b, b + RIM_SIDES, a + RIM_SIDES], count);
				count += 6;
			}
	}
	return {
		rows,
		cols,
		patches,
		indices,
		boundary: Uint32Array.from(path)
	};
}

/** CPU reference for validating the equivalent vertex-shader reconstruction. */
export function createFilmMesh(sim: LiquidSim): FilmMesh {
	const topology = createFilmTopology(sim),
		source = sim.sheets;
	const { rows, cols, patches, boundary } = topology;
	const row = sampleAxis(source.rows, rows),
		col = sampleAxis(source.cols, cols);
	const faceCount = patches * rows * cols;
	return {
		...topology,
		rowSamples: row.samples,
		rowWeights: row.weights,
		colSamples: col.samples,
		colWeights: col.weights,
		columnData: new Float64Array(patches * source.rows * cols * 8),
		fieldHeights: new Float32Array(sim.field.height.length),
		data: new Float32Array((faceCount * 2 + patches * boundary.length * RIM_SIDES) * 6)
	};
}

export function buildFilmMesh(sim: LiquidSim, mesh: FilmMesh) {
	const source = sim.sheets,
		drink = sim.drink;
	if (!drink) {
		mesh.data.fill(0);
		return;
	}
	const data = mesh.data,
		h = drink.height,
		faceCount = mesh.patches * mesh.rows * mesh.cols;
	sim.field.renderHeights(mesh.fieldHeights);
	// Separate the two cubic axes; channels are position, normal, area and reference area.
	const columns = mesh.columnData;
	columns.fill(0);
	for (let patch = 0; patch < mesh.patches; patch++)
		for (let row = 0; row < source.rows; row++)
			for (let col = 0; col < mesh.cols; col++) {
				const out = ((patch * source.rows + row) * mesh.cols + col) * 8;
				for (let b = 0; b < 4; b++) {
					const weight = mesh.colWeights[col * 4 + b];
					if (weight === 0) continue;
					const i = (patch * source.rows + row) * source.cols + mesh.colSamples[col * 4 + b],
						k = i * 3;
					columns[out] += weight * source.vertices[k];
					columns[out + 1] += weight * source.vertices[k + 1];
					columns[out + 2] += weight * source.vertices[k + 2];
					columns[out + 3] += weight * source.normals[k];
					columns[out + 4] += weight * source.normals[k + 1];
					columns[out + 5] += weight * source.normals[k + 2];
					columns[out + 6] += weight * source.areas[i];
					columns[out + 7] += weight * source.referenceAreas[i];
				}
			}
	for (let patch = 0; patch < mesh.patches; patch++)
		for (let row = 0; row < mesh.rows; row++)
			for (let col = 0; col < mesh.cols; col++) {
				let x = 0,
					y = 0,
					z = 0,
					nx = 0,
					ny = 0,
					nz = 0,
					area = 0,
					reference = 0;
				for (let a = 0; a < 4; a++) {
					const weight = mesh.rowWeights[row * 4 + a];
					if (weight === 0) continue;
					const k = ((patch * source.rows + mesh.rowSamples[row * 4 + a]) * mesh.cols + col) * 8;
					x += weight * columns[k];
					y += weight * columns[k + 1];
					z += weight * columns[k + 2];
					nx += weight * columns[k + 3];
					ny += weight * columns[k + 4];
					nz += weight * columns[k + 5];
					area += weight * columns[k + 6];
					reference += weight * columns[k + 7];
				}
				const pool = sim.level + sample(sim, mesh.fieldHeights, x, z);
				y = Math.max(pool, y);
				const rise = Math.max(0, y - pool) / h;
				const foot = Math.min(1, rise / 0.04),
					open = Math.min(1, rise / 0.06);
				y -= 0.01 * h * (1 - foot * foot * (3 - 2 * foot));
				const thickness =
					0.006 *
					h *
					Math.max(0.5, Math.min(2.5, (reference * h * h) / Math.max(1e-10, area))) *
					open *
					open *
					(3 - 2 * open);
				const dx = x - drink.x,
					dz = z - drink.z,
					r2 = dx * dx + dz * dz;
				const solid = radiusAt(drink, y) + h * 0.014;
				if (sim.field.obstacle && y < drink.baseY + drink.height && r2 < solid * solid) {
					const r = Math.sqrt(r2);
					x = drink.x + (r > 1e-8 ? dx / r : -1) * solid;
					z = drink.z + (r > 1e-8 ? dz / r : 0) * solid;
				}
				const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
				if (length > 1e-9) {
					nx /= length;
					ny /= length;
					nz /= length;
				} else {
					nx = 0;
					ny = 1;
					nz = 0;
				}
				const vertex = patch * mesh.rows * mesh.cols + row * mesh.cols + col;
				for (let side = 0; side < 2; side++) {
					const sign = side === 0 ? 1 : -1,
						k = (vertex + side * faceCount) * 6;
					data[k] = x + sign * nx * thickness * 0.5;
					data[k + 1] = y + sign * ny * thickness * 0.5;
					data[k + 2] = z + sign * nz * thickness * 0.5;
					data[k + 3] = sign * nx;
					data[k + 4] = sign * ny;
					data[k + 5] = sign * nz;
				}
			}
	for (let patch = 0; patch < mesh.patches; patch++)
		for (let j = 0; j < mesh.boundary.length; j++) {
			const base = patch * mesh.rows * mesh.cols,
				vertex = base + mesh.boundary[j],
				k = vertex * 6,
				back = (vertex + faceCount) * 6;
			const before = (base + mesh.boundary[Math.max(0, j - 1)]) * 6,
				after = (base + mesh.boundary[Math.min(mesh.boundary.length - 1, j + 1)]) * 6;
			let tx = data[after] - data[before],
				ty = data[after + 1] - data[before + 1],
				tz = data[after + 2] - data[before + 2];
			const tangent = Math.sqrt(tx * tx + ty * ty + tz * tz);
			if (tangent > 1e-9) {
				tx /= tangent;
				ty /= tangent;
				tz /= tangent;
			} else {
				tx = 0;
				ty = 1;
				tz = 0;
			}
			let nx = data[k + 3],
				ny = data[k + 4],
				nz = data[k + 5];
			const dot = nx * tx + ny * ty + nz * tz;
			nx -= dot * tx;
			ny -= dot * ty;
			nz -= dot * tz;
			let normal = Math.sqrt(nx * nx + ny * ny + nz * nz);
			if (normal < 1e-9) {
				nx = Math.abs(tx) < 0.9 ? 1 : 0;
				ny = 0;
				nz = Math.abs(tx) < 0.9 ? 0 : 1;
				const d = nx * tx + nz * tz;
				nx -= d * tx;
				ny -= d * ty;
				nz -= d * tz;
				normal = Math.sqrt(nx * nx + ny * ny + nz * nz);
			}
			nx /= normal;
			ny /= normal;
			nz /= normal;
			const bx = ty * nz - tz * ny,
				by = tz * nx - tx * nz,
				bz = tx * ny - ty * nx;
			const radius =
				0.75 *
				Math.hypot(
					data[k] - data[back],
					data[k + 1] - data[back + 1],
					data[k + 2] - data[back + 2]
				);
			const x = (data[k] + data[back]) * 0.5,
				y = (data[k + 1] + data[back + 1]) * 0.5,
				z = (data[k + 2] + data[back + 2]) * 0.5;
			for (let side = 0; side < RIM_SIDES; side++) {
				const c = RIM_COS[side],
					s = RIM_SIN[side],
					vx = c * nx + s * bx,
					vy = c * ny + s * by,
					vz = c * nz + s * bz;
				const out = (faceCount * 2 + (patch * mesh.boundary.length + j) * RIM_SIDES + side) * 6;
				data[out] = x + radius * vx;
				data[out + 1] = y + radius * vy;
				data[out + 2] = z + radius * vz;
				data[out + 3] = vx;
				data[out + 4] = vy;
				data[out + 5] = vz;
			}
		}
}
