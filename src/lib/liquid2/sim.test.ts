import { describe, expect, it } from 'vitest';
import { coverLevel, makeCamera, placeDrink, qualityTier } from './scene';
import { LiquidSim } from './sim';

const cam = makeCamera(1.6);
const drink = placeDrink(cam, 0.72, 0.85, 0.5, 0.81);
const frames = (seconds: number) => Math.round(seconds * 60);
const peak = (sim: LiquidSim) => sim.field.height.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

const ramp = (sim: LiquidSim, from: number, to: number, seconds: number, each?: () => void) => {
	const n = frames(seconds);
	const velocity = (to - from) / seconds;
	for (let i = 1; i <= n; i++) {
		sim.advance(1 / 60, { progress: from + ((to - from) * i) / n, scrollVelocity: velocity });
		each?.();
	}
};
const hold = (sim: LiquidSim, progress: number, seconds: number) => {
	for (let i = 0; i < frames(seconds); i++) sim.advance(1 / 60, { progress, scrollVelocity: 0 });
};

describe('liquid2 simulation', () => {
	it('rises until the camera is covered', () => {
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(cam, drink);
		ramp(sim, 0, 1, 4);
		hold(sim, 1, 2);
		expect(sim.covered).toBe(true);
	});

	it('drains when scrolled back', () => {
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(cam, drink);
		ramp(sim, 0, 1, 4);
		hold(sim, 1, 2);
		let prev = sim.level;
		ramp(sim, 1, 0.3, 3, () => {
			expect(sim.level).toBeLessThanOrEqual(prev + 1e-3);
			prev = sim.level;
		});
		expect(sim.covered).toBe(false);
		expect(sim.level).toBeLessThan(coverLevel(cam));
	});

	it('keeps the liquid moving when the drink is re-placed', () => {
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(cam, drink);
		ramp(sim, 0, 0.4, 3);
		const before = peak(sim);
		sim.layout(cam, { ...drink, x: drink.x + 0.2 });
		expect(peak(sim)).toBeGreaterThan(before * 0.5);
		sim.field.solid.forEach((s, k) => {
			if (s) expect(sim.field.height[k]).toBe(0);
		});
	});

	it('ignores non-finite input', () => {
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(cam, drink);
		sim.advance(Number.NaN, { progress: 0.5, scrollVelocity: 1 });
		sim.advance(1 / 60, { progress: Number.NaN, scrollVelocity: Number.POSITIVE_INFINITY });
		for (let i = 0; i < 60; i++) sim.advance(1 / 60, { progress: 0.5, scrollVelocity: 1 });
		for (const v of sim.field.height) expect(Number.isFinite(v)).toBe(true);
		expect(Number.isFinite(sim.level)).toBe(true);
	});
});
