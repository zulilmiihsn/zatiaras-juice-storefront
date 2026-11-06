import { describe, expect, it } from 'vitest';
import type { Drink } from './scene';
import { Swirl } from './swirl';

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
		swirl.advance(
			1 / 60,
			{ progress: Number.NaN, scrollVelocity: Number.POSITIVE_INFINITY },
			DRINK
		);
		for (const v of [swirl.height, swirl.omega, swirl.phase]) expect(Number.isFinite(v)).toBe(true);
	});
});
