import { describe, expect, it } from 'vitest';
import { makeCamera, placeDrink } from './scene';
import { LiquidSim } from './sim';
import { buildSurfaceMesh, surfaceIndices, surfacePoint } from './surface';
import { Swirl } from './swirl';

const DRINK = { x: 0, z: 0, radius: 0.4, height: 1.1, baseY: -0.15 };
const active = () => {
	const swirl = new Swirl();
	for (let i = 0; i < 90; i++) swirl.advance(1 / 60, { progress: 0.3, scrollVelocity: 0.4 }, DRINK);
	return swirl;
};
const point = (swirl: Swirl, x: number, z: number, base = 0.17) => {
	const out = new Float32Array(3);
	surfacePoint(swirl, DRINK, x, z, base, out, 0);
	return out;
};

describe('liquid2 continuous surface', () => {
	it('keeps the actual pool position when the wave is resting', () => {
		const swirl = new Swirl();
		for (const [x, z, y] of [
			[0.5, 0.7, 0.12],
			[1.1, -0.4, -0.03],
			[4, 3, 0.2]
		]) {
			const p = point(swirl, x, z, y);
			expect(p[0]).toBeCloseTo(x, 6);
			expect(p[1]).toBeCloseTo(y, 6);
			expect(p[2]).toBeCloseTo(z, 6);
		}
	});

	it('rises from a broad footprint and returns smoothly to the uneven pool', () => {
		const swirl = active();
		const step = 0.002;
		const samples = Array.from({ length: 2500 }, (_, i) => {
			const x = DRINK.radius + step * i;
			const base = 0.17 + 0.015 * x;
			return { x, base, p: point(swirl, x, 0, base) };
		});
		const lifted = samples.filter(({ base, p }) => p[1] - base > 0.001);
		const peak = Math.max(...lifted.map(({ base, p }) => p[1] - base));
		expect(peak).toBeGreaterThan(DRINK.height * 0.25);
		expect(lifted.at(-1)!.x - lifted[0].x).toBeGreaterThan(peak * 1.5);
		const last = samples.findLastIndex(({ base, p }) => p[1] - base > 0.000001);
		const a = samples[last];
		const b = samples[last + 1];
		expect(Math.abs(b.p[1] - b.base - (a.p[1] - a.base)) / step).toBeLessThan(0.01);
		expect(b.p[0]).toBeCloseTo(b.x, 5);
		expect(b.p[1]).toBeCloseTo(b.base, 5);
	});

	it('keeps the rolling wave outside the drink at every phase', () => {
		const swirl = active();
		for (const phase of [0, 1, 2, 3, 4, 5]) {
			swirl.phase = phase;
			for (let i = 0; i < 48; i++)
				for (let j = 0; j < 80; j++) {
					const angle = (i / 48) * Math.PI * 2;
					const radius = DRINK.radius + j * 0.04;
					const p = point(swirl, radius * Math.cos(angle), radius * Math.sin(angle));
					expect(Math.hypot(p[0], p[2])).toBeGreaterThanOrEqual(DRINK.radius - 1e-6);
				}
		}
	});

	it('has one connected triangle surface with no internal boundary around the wave', () => {
		const cols = 13;
		const rows = 11;
		const indices = surfaceIndices(cols, rows);
		const edges = new Map<string, number>();
		const neighbours = Array.from({ length: cols * rows }, () => new Set<number>());
		for (let i = 0; i < indices.length; i += 3)
			for (let j = 0; j < 3; j++) {
				const a = indices[i + j];
				const b = indices[i + ((j + 1) % 3)];
				const key = [Math.min(a, b), Math.max(a, b)].join(',');
				edges.set(key, (edges.get(key) || 0) + 1);
				neighbours[a].add(b);
				neighbours[b].add(a);
			}
		for (const [edge, count] of edges) {
			expect(count).toBeLessThanOrEqual(2);
			if (count !== 1) continue;
			const [a, b] = edge.split(',').map(Number);
			expect(
				[a, b].every((k) => k < cols) ||
					[a, b].every((k) => k >= cols * (rows - 1)) ||
					[a, b].every((k) => k % cols === 0) ||
					[a, b].every((k) => k % cols === cols - 1)
			).toBe(true);
		}
		const seen = new Set([0]);
		for (const k of seen) for (const n of neighbours[k]) seen.add(n);
		expect(seen.size).toBe(cols * rows);
	});

	it('shares finite unit normals across the pool and the rolling crest', () => {
		const sim = new LiquidSim({ cols: 32, rows: 24 });
		const cam = makeCamera(1.6);
		sim.layout(cam, placeDrink(cam, 0.72, 0.85, 0.5, 960 / 778));
		const field = sim.field;
		const xs = Float32Array.from(
			{ length: field.cols },
			(_, i) => field.domain.x0 + (i + 0.5) * field.dx
		);
		const zs = Float32Array.from(
			{ length: field.rows },
			(_, i) => field.domain.z0 + (i + 0.5) * field.dz
		);
		const out = new Float32Array(xs.length * zs.length * 6);
		const heights = new Float32Array(field.height.length);
		buildSurfaceMesh(sim, xs, zs, out, heights);
		for (let i = 0; i < out.length; i += 6) expect(out[i + 4]).toBeCloseTo(1, 6);
		sim.swirl.height = 0.8;
		sim.swirl.phase = 1.2;
		buildSurfaceMesh(sim, xs, zs, out, heights);
		expect(out.every(Number.isFinite)).toBe(true);
		for (let i = 0; i < out.length; i += 6)
			expect(Math.hypot(out[i + 3], out[i + 4], out[i + 5])).toBeCloseTo(1, 5);
	});
});
