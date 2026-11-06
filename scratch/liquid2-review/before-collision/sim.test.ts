import { describe, expect, it, vi } from 'vitest';

// Long fixed-step simulations; give them room when test files run in parallel.
vi.setConfig({ testTimeout: 20000 });
import { coverLevel, groundDomain, makeCamera, placeDrink, qualityTier } from './scene';
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

describe('liquid2 simulation layout changes', () => {
	it('keeps the portrait drink visible through the middle of the wrap', () => {
		const portrait = makeCamera(390 / 844);
		const imageAspect = 960 / 778;
		const drink = placeDrink(
			portrait,
			0.5,
			0.85,
			(0.84 * portrait.aspect) / imageAspect,
			imageAspect
		);
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(portrait, drink);
		ramp(sim, 0, 0.5, 3);
		hold(sim, 0.5, 1);
		expect(sim.level).toBeLessThan(drink.baseY + drink.height * 0.8);
		expect(sim.level).toBeGreaterThan(drink.baseY + drink.height * 0.5);
		expect(sim.covered).toBe(false);
	});

	it('re-sizes the grid on an orientation change and keeps the liquid moving', () => {
		const portrait = makeCamera(0.5);
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(portrait, placeDrink(portrait, 0.5, 0.85, 0.3, 0.81));
		ramp(sim, 0, 0.3, 3);
		const before = peak(sim);
		const landscape = makeCamera(2);
		const drink = placeDrink(landscape, 0.72, 0.85, 0.5, 0.81);
		sim.layout(landscape, drink);
		const { domain } = sim.field;
		const view = groundDomain(landscape);
		expect(domain.x0).toBeCloseTo(view.x0, 5);
		expect(domain.x1).toBeCloseTo(view.x1, 5);
		expect(drink.x - drink.radius).toBeGreaterThan(domain.x0);
		expect(drink.x + drink.radius).toBeLessThan(domain.x1);
		expect(sim.field.solid.some((s) => s === 1)).toBe(true);
		expect(peak(sim)).toBeGreaterThan(before * 0.3);
	});
});

describe('liquid2 simulation swirl', () => {
	it('whirls up around the drink as soon as scrolling starts, and stirs the pool', () => {
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(cam, drink);
		ramp(sim, 0, 0.3, 1);
		expect(sim.swirl.height).toBeGreaterThan(0.3 * drink.height);
		expect(sim.swirl.omega).toBeGreaterThan(0.5);
		expect(peak(sim)).toBeGreaterThan(0.05);
	});
});

describe('liquid2 simulation volume', () => {
	it('keeps the mean surface at the level while it bursts around the drink', () => {
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(cam, drink);
		ramp(sim, 0, 0.3, 1);
		hold(sim, 0.3, 2);
		const f = sim.field;
		let sum = 0;
		let n = 0;
		for (let k = 0; k < f.height.length; k++)
			if (!f.solid[k]) {
				sum += f.height[k];
				n++;
			}
		expect(Math.abs(sum / n)).toBeLessThan(0.01);
	});
});

describe('liquid2 simulation sensitivity', () => {
	it('stays gentle under a slow scroll', () => {
		const sim = new LiquidSim(qualityTier(true));
		sim.layout(cam, drink);
		let maxDrive = 0;
		let nearPeak = 0;
		ramp(sim, 0, 0.1, 1.5, () => {
			maxDrive = Math.max(maxDrive, sim.drive);
			const f = sim.field;
			for (let j = 0; j < f.rows; j++)
				for (let i = 0; i < f.cols; i++) {
					const k = j * f.cols + i;
					const x = f.domain.x0 + (i + 0.5) * f.dx;
					const z = f.domain.z0 + (j + 0.5) * f.dz;
					if (!f.solid[k] && Math.hypot(x - drink.x, z - drink.z) < drink.radius + 0.6)
						nearPeak = Math.max(nearPeak, Math.abs(f.height[k]));
				}
		});
		expect(maxDrive).toBeLessThan(0.3);
		expect(nearPeak).toBeLessThan(0.08);
	});

	it('throws no drops: Liquid 2 has no spray', () => {
		expect('spray' in new LiquidSim(qualityTier(true))).toBe(false);
	});
});
