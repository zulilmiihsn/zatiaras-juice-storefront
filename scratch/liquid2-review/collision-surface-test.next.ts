import { describe, expect, it } from 'vitest';
import { makeCamera, placeDrink } from './scene';
import { LiquidSim } from './sim';
import { buildSurfaceMesh, createSurfaceGrid, type SurfaceGrid } from './surface';

const make = () => {
	const sim = new LiquidSim({ cols: 32, rows: 24 });
	const cam = makeCamera(1.6);
	const drink = placeDrink(cam, 0.72, 0.85, 0.5, 960 / 778);
	sim.layout(cam, drink);
	return { sim, drink, grid: createSurfaceGrid(sim), heights: new Float32Array(sim.field.height.length) };
};

function topology(grid: SurfaceGrid, filled: boolean) {
	const indices = filled ? grid.indices : grid.indices.subarray(0, grid.bodyCount);
	const edges = new Map<string, number>();
	const count = grid.rows * grid.cols + (filled ? 1 : 0);
	const neighbours = Array.from({ length: count }, () => new Set<number>());
	for (let i = 0; i < indices.length; i += 3)
		for (let j = 0; j < 3; j++) {
			const a = indices[i + j], b = indices[i + (j + 1) % 3];
			const key = [Math.min(a, b), Math.max(a, b)].join(',');
			edges.set(key, (edges.get(key) || 0) + 1);
			neighbours[a].add(b); neighbours[b].add(a);
		}
	for (const [edge, uses] of edges) {
		expect(uses).toBeLessThanOrEqual(2);
		if (uses !== 1) continue;
		const [a, b] = edge.split(',').map(Number);
		const outer = [a, b].every((k) => k >= grid.cols * (grid.rows - 1) && k < grid.cols * grid.rows);
		const contact = !filled && [a, b].every((k) => k < grid.cols);
		expect(outer || contact).toBe(true);
	}
	const seen = new Set([0]);
	for (const k of seen) for (const n of neighbours[k]) seen.add(n);
	expect(seen.size).toBe(count);
}

describe('liquid2 connected collision surface', () => {
	it('rests at the simulated pool with upward shared normals', () => {
		const { sim, grid, heights } = make();
		buildSurfaceMesh(sim, grid, heights);
		for (let i = 0; i < grid.data.length; i += 6) {
			expect(grid.data[i + 1]).toBeCloseTo(0, 6);
			expect(grid.data[i + 4]).toBeCloseTo(1, 6);
		}
	});

	it('lifts water beside the cup while leaving the distant surface low', () => {
		const { sim, drink, grid, heights } = make();
		for (let i = 0; i < sim.runUp.segments; i++)
			if (sim.runUp.cos[i] < -0.5) sim.runUp.height[i] = drink.height;
		buildSurfaceMesh(sim, grid, heights);
		let peak = 0;
		for (let j = 0; j < grid.rows; j++)
			for (let i = 0; i < grid.cols; i++) {
				const y = grid.data[(j * grid.cols + i) * 6 + 1];
				peak = Math.max(peak, y);
				if (grid.radii[j] > drink.radius * 3) expect(y).toBeCloseTo(0, 6);
			}
		expect(peak).toBeGreaterThan(drink.height * 0.9);
	});

	it('shares a smooth wet foot between the upright film and the main pool', () => {
		const { sim, drink, grid, heights } = make();
		sim.runUp.height.fill(drink.height);
		sim.runUp.offset.fill(drink.radius * 0.4);
		buildSurfaceMesh(sim, grid, heights);
		const foot = grid.radii.findIndex((r) => r >= drink.radius + grid.contactWidth - 0.000001);
		for (let i = 0; i < grid.cols; i++) {
			const o = (foot * grid.cols + i) * 6;
			expect(grid.data[o + 1]).toBeCloseTo(0, 5);
			expect(grid.data[o + 4]).toBeGreaterThan(0.99);
		}
	});

	it('keeps the entire exposed film outside the solid cylinder', () => {
		const { sim, drink, grid, heights } = make();
		sim.runUp.height.fill(drink.height * 1.5);
		sim.runUp.offset.fill(drink.radius);
		buildSurfaceMesh(sim, grid, heights);
		for (let i = 0; i < grid.rows * grid.cols; i++) {
			const r = Math.hypot(grid.data[i * 6] - drink.x, grid.data[i * 6 + 2] - drink.z);
			expect(r).toBeGreaterThanOrEqual(drink.radius - 0.000001);
		}
	});

	it('has no internal cut between the film and pool, and closes the contact hole after submersion', () => {
		const { grid } = make();
		topology(grid, false);
		topology(grid, true);
	});

	it('keeps shared normals finite through a physical collision and fall', () => {
		const { sim, grid, heights } = make();
		for (let i = 0; i < 240; i++) sim.runUp.advance(1 / 120, 1, sim.field);
		buildSurfaceMesh(sim, grid, heights);
		expect(grid.data.every(Number.isFinite)).toBe(true);
		for (let i = 0; i < grid.data.length; i += 6)
			expect(Math.hypot(grid.data[i + 3], grid.data[i + 4], grid.data[i + 5])).toBeCloseTo(1, 5);
	});
});
