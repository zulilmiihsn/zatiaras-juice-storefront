import { describe, expect, it } from 'vitest';
import type { Drink } from './scene';
import { buildSwirlMesh, Swirl, swirlPoint, SWIRL_TURN } from './swirl';

const DRINK: Drink = { x: 0.8, z: -0.5, radius: 0.4, height: 1.1, baseY: -0.15 };
const run = (swirl: Swirl, seconds: number, progress: number, speed: number) => {
	for (let i = 0; i < Math.round(seconds * 60); i++)
		swirl.advance(1 / 60, { progress, scrollVelocity: speed }, DRINK);
};

describe('liquid2 swirl', () => {
	it('rests hidden in the pool before any scroll', () => {
		const swirl = new Swirl();
		run(swirl, 2, 0, 0);
		expect(swirl.height).toBeLessThan(0.02);
	});

	it('rises and spins while the page scrolls', () => {
		const swirl = new Swirl();
		run(swirl, 1, 0.3, 0.6);
		expect(swirl.height).toBeGreaterThan(0.4 * DRINK.height);
		expect(swirl.omega).toBeGreaterThan(0.5);
	});

	it('coasts on its own momentum after scrolling stops, then settles', () => {
		const swirl = new Swirl();
		run(swirl, 1, 0.3, 0.6);
		const spinning = swirl.omega;
		run(swirl, 0.3, 0.3, 0);
		expect(swirl.omega).toBeGreaterThan(0.4 * spinning);
		run(swirl, 5, 0.3, 0);
		expect(swirl.omega).toBeLessThan(0.1 * spinning);
		expect(swirl.height).toBeLessThan(0.15 * DRINK.height);
	});

	it('ignores non-finite input', () => {
		const swirl = new Swirl();
		swirl.advance(Number.NaN, { progress: 0.5, scrollVelocity: 1 }, DRINK);
		swirl.advance(1 / 60, { progress: Number.NaN, scrollVelocity: Number.POSITIVE_INFINITY }, DRINK);
		for (const v of [swirl.height, swirl.omega, swirl.phase]) expect(Number.isFinite(v)).toBe(true);
	});

	describe('shape', () => {
		const swirl = new Swirl();
		run(swirl, 1, 0.3, 0.6);
		const level = 0.2;
		const points: [number, number, number][] = [];
		for (let i = 0; i <= 40; i++)
			for (let j = 0; j <= 20; j++) points.push([...swirlPoint(swirl, DRINK, level, i / 40, j / 20)]);

		it('wraps the drink front and back without entering it', () => {
			expect(points.some((p) => p[2] > DRINK.z + DRINK.radius)).toBe(true);
			expect(points.some((p) => p[2] < DRINK.z - DRINK.radius)).toBe(true);
			for (const p of points)
				expect(Math.hypot(p[0] - DRINK.x, p[2] - DRINK.z)).toBeGreaterThanOrEqual(DRINK.radius);
		});

		it('rises out of the pool and curls its lip over toward the drink', () => {
			const across = (u: number) =>
				Array.from({ length: 21 }, (_, j) => swirlPoint(swirl, DRINK, level, u, j / 20));
			const mid = across(0.5);
			expect(mid[0][1]).toBeLessThan(level);
			const top = mid.reduce((best, p, j) => (p[1] > mid[best][1] ? j : best), 0);
			// The highest point is not the lip: past it the sheet folds back down, inward.
			expect(top).toBeLessThan(20);
			const radial = (p: readonly number[]) => Math.hypot(p[0] - DRINK.x, p[2] - DRINK.z);
			expect(radial(mid[20])).toBeLessThan(radial(mid[top]));
		});

		it('tapers into the pool at both ends', () => {
			for (const u of [0, 1])
				for (let j = 0; j <= 20; j++)
					expect(swirlPoint(swirl, DRINK, level, u, j / 20)[1]).toBeLessThanOrEqual(level + 1e-6);
		});

		it('spans more than half a turn around the drink', () => {
			expect(SWIRL_TURN).toBeGreaterThan(Math.PI);
		});
	});
});

describe('liquid2 swirl mesh', () => {
	it('builds unit normals facing consistently, with one surface evaluation per vertex', () => {
		const swirl = new Swirl();
		run(swirl, 1, 0.3, 0.6);
		const nu = 24;
		const nv = 8;
		const out = new Float32Array((nu + 1) * (nv + 1) * 6);
		buildSwirlMesh(swirl, DRINK, 0.2, nu, nv, out);
		for (let o = 0; o < out.length; o += 6) {
			for (let k = 0; k < 6; k++) expect(Number.isFinite(out[o + k])).toBe(true);
			expect(Math.hypot(out[o + 3], out[o + 4], out[o + 5])).toBeCloseTo(1, 4);
			const p = swirlPoint(swirl, DRINK, 0.2, ((o / 6) % (nu + 1)) / nu, Math.floor(o / 6 / (nu + 1)) / nv);
			expect(out[o]).toBeCloseTo(p[0], 5);
			expect(out[o + 1]).toBeCloseTo(p[1], 5);
		}
	});

	it('is cheap enough to rebuild every frame on a phone', () => {
		const swirl = new Swirl();
		run(swirl, 1, 0.3, 0.6);
		const out = new Float32Array((72 + 1) * (16 + 1) * 6);
		const started = performance.now();
		for (let i = 0; i < 60; i++) buildSwirlMesh(swirl, DRINK, 0.2, 72, 16, out);
		expect((performance.now() - started) / 60).toBeLessThan(1.5);
	});
});
