import { describe, expect, it } from 'vitest';
import { makeCamera, placeDrink, radiusAt } from './scene';
import { LiquidSim } from './sim';
import { buildSurfaceMesh, createSurfaceGrid, createFilmMesh, buildFilmMesh } from './surface';

const make = () => {
	const sim = new LiquidSim({ cols: 32, rows: 24 });
	const camera = makeCamera(1.6);
	const drink = placeDrink(camera, 0.72, 0.85, 0.5, 960 / 778);
	sim.layout(camera, drink);
	return {
		sim,
		drink,
		grid: createSurfaceGrid(sim),
		heights: new Float32Array(sim.field.height.length)
	};
};

describe('liquid2 reservoir and impact separation', () => {
	it('preserves affine surfaces through cubic reconstruction and winds the rim outward', () => {
		const { sim, drink } = make();
		const sheet = sim.sheets;
		for (let patch = 0; patch < 4; patch++)
			for (let row = 0; row < sheet.rows; row++)
				for (let col = 0; col < sheet.cols; col++) {
					const k = ((patch * sheet.rows + row) * sheet.cols + col) * 3;
					sheet.vertices.set([drink.x + 1 + col * 0.1, 0.2 + row * 0.15, drink.z + patch * 0.3], k);
					sheet.normals.set([0, 0, -1], k);
				}
		sheet.areas.fill(0.001);
		const mesh = createFilmMesh(sim);
		buildFilmMesh(sim, mesh);
		const faces = mesh.patches * mesh.rows * mesh.cols,
			data = mesh.data;
		for (const [row, col] of [
			[3, 3],
			[7, 5],
			[11, 9]
		]) {
			const index = row * mesh.cols + col,
				a = index * 6,
				b = (index + faces) * 6;
			expect((data[a] + data[b]) / 2).toBeCloseTo(
				drink.x + 1 + ((col * (sheet.cols - 1)) / (mesh.cols - 1)) * 0.1,
				5
			);
			expect((data[a + 1] + data[b + 1]) / 2).toBeCloseTo(
				0.2 + ((row * (sheet.rows - 1)) / (mesh.rows - 1)) * 0.15,
				5
			);
		}
		let lowest = Infinity,
			checked = 0;
		for (let i = 0; i < mesh.indices.length; i += 3) {
			if (
				mesh.indices[i] < faces * 2 ||
				mesh.indices[i + 1] < faces * 2 ||
				mesh.indices[i + 2] < faces * 2
			)
				continue;
			const a = mesh.indices[i] * 6,
				b = mesh.indices[i + 1] * 6,
				c = mesh.indices[i + 2] * 6;
			const ax = data[b] - data[a],
				ay = data[b + 1] - data[a + 1],
				az = data[b + 2] - data[a + 2];
			const bx = data[c] - data[a],
				by = data[c + 1] - data[a + 1],
				bz = data[c + 2] - data[a + 2];
			const nx = ay * bz - az * by,
				ny = az * bx - ax * bz,
				nz = ax * by - ay * bx;
			const length = Math.hypot(nx, ny, nz);
			if (length < 1e-9) continue;
			lowest = Math.min(lowest, (nx * data[a + 3] + ny * data[a + 4] + nz * data[a + 5]) / length);
			checked++;
		}
		expect(checked).toBeGreaterThan(0);
		expect(lowest).toBeGreaterThan(-0.00001);
	});
	it('builds a smooth thick film with finite normals, bounded indices and a submerged foot', () => {
		const { sim, drink } = make();
		for (let i = 0; i < 90; i++)
			sim.advance(1 / 60, { progress: (i + 1) / 250, scrollVelocity: 0.24 });
		const mesh = createFilmMesh(sim);
		buildFilmMesh(sim, mesh);
		expect(mesh.data.every(Number.isFinite)).toBe(true);
		expect(mesh.indices.every((index) => index < mesh.data.length / 6)).toBe(true);
		let lowest = Infinity,
			clearance = Infinity,
			normalError = 0;
		for (let k = 0; k < mesh.data.length; k += 6) {
			const x = mesh.data[k],
				y = mesh.data[k + 1],
				z = mesh.data[k + 2];
			lowest = Math.min(lowest, y);
			if (y > drink.baseY && y < drink.baseY + drink.height)
				clearance = Math.min(clearance, Math.hypot(x - drink.x, z - drink.z) - radiusAt(drink, y));
			normalError = Math.max(
				normalError,
				Math.abs(Math.hypot(mesh.data[k + 3], mesh.data[k + 4], mesh.data[k + 5]) - 1)
			);
		}
		expect(lowest).toBeLessThan(sim.level);
		expect(clearance).toBeGreaterThanOrEqual(-1e-5);
		expect(normalError).toBeLessThan(0.001);
	});
	it('reconstructs a resting pool without an invented crest', () => {
		const { sim, grid, heights } = make();
		buildSurfaceMesh(sim, grid, heights);
		for (let i = 0; i < grid.data.length; i += 3) expect(grid.data[i + 1]).toBeCloseTo(0, 6);
	});

	it('leaves the distant pool low while the local fluid rises against the cup', () => {
		const { sim, grid, heights } = make();
		let peak = 0;
		for (let i = 0; i < 120; i++) {
			sim.advance(1 / 60, { progress: (i + 1) / 300, scrollVelocity: 0.2 });
			peak = Math.max(peak, sim.fluid.visibleHeight);
		}
		buildSurfaceMesh(sim, grid, heights);
		expect(sim.level).toBe(0);
		expect(peak).toBeGreaterThan(0.15);
		for (let i = 0; i < grid.data.length; i += 3)
			expect(Math.abs(grid.data[i + 1])).toBeLessThan(0.06);
	});

	it('has one closed reservoir surface apart from its outside boundary', () => {
		const { grid } = make();
		const count = grid.data.length / 3;
		const neighbours = Array.from({ length: count }, () => new Set<number>());
		const edges = new Map<string, number>();
		for (let i = 0; i < grid.indices.length; i += 3)
			for (let j = 0; j < 3; j++) {
				const a = grid.indices[i + j],
					b = grid.indices[i + ((j + 1) % 3)];
				const edge = [Math.min(a, b), Math.max(a, b)].join(',');
				edges.set(edge, (edges.get(edge) || 0) + 1);
				neighbours[a].add(b);
				neighbours[b].add(a);
			}
		for (const [edge, uses] of edges) {
			expect(uses).toBeLessThanOrEqual(2);
			if (uses === 1)
				expect(
					edge
						.split(',')
						.map(Number)
						.every((k) => k >= grid.cols * (grid.rows - 1) && k < grid.cols * grid.rows)
				).toBe(true);
		}
		const visited = new Set([0]);
		for (const i of visited) for (const n of neighbours[i]) visited.add(n);
		expect(visited.size).toBe(count);
	});
});
