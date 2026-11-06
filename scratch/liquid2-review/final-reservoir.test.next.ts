import { describe, expect, it } from 'vitest';
import { makeCamera, placeDrink } from './scene';
import { LiquidSim } from './sim';
import { buildSurfaceMesh, createSurfaceGrid } from './surface';

const make = () => {
	const sim = new LiquidSim({ cols: 32, rows: 24 });
	const camera = makeCamera(1.6);
	const drink = placeDrink(camera, 0.72, 0.85, 0.5, 960 / 778);
	sim.layout(camera, drink);
	return { sim, drink, grid: createSurfaceGrid(sim), heights: new Float32Array(sim.field.height.length) };
};

describe('liquid2 reservoir and impact separation', () => {
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
		for (let i = 0; i < grid.data.length; i += 3) expect(Math.abs(grid.data[i + 1])).toBeLessThan(0.06);
	});

	it('has one closed reservoir surface apart from its outside boundary', () => {
		const { grid } = make();
		const count = grid.data.length / 3;
		const neighbours = Array.from({ length: count }, () => new Set<number>());
		const edges = new Map<string, number>();
		for (let i = 0; i < grid.indices.length; i += 3)
			for (let j = 0; j < 3; j++) {
				const a = grid.indices[i + j], b = grid.indices[i + (j + 1) % 3];
				const edge = [Math.min(a, b), Math.max(a, b)].join(',');
				edges.set(edge, (edges.get(edge) || 0) + 1);
				neighbours[a].add(b); neighbours[b].add(a);
			}
		for (const [edge, uses] of edges) {
			expect(uses).toBeLessThanOrEqual(2);
			if (uses === 1) expect(edge.split(',').map(Number).every(k => k >= grid.cols * (grid.rows - 1) && k < grid.cols * grid.rows)).toBe(true);
		}
		const visited = new Set([0]);
		for (const i of visited) for (const n of neighbours[i]) visited.add(n);
		expect(visited.size).toBe(count);
	});
});
