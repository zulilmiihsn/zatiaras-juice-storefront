import { describe, expect, it, vi } from 'vitest';
import { Fluid } from './fluid';
import { ShallowWater } from './shallow-water';
import { radiusAt } from './scene';

vi.setConfig({ testTimeout: 30000 });
const DRINK = { x: 0, z: 0, radius: 0.45, height: 1, baseY: -0.15 };
const make = (obstacle = true) => {
	const field = new ShallowWater({ cols: 32, rows: 24 }, { x0: -3, x1: 3, z0: -3, z1: 3 });
	field.setObstacle(obstacle ? DRINK : null);
	const fluid = new Fluid(768);
	fluid.layout(DRINK);
	return { fluid, field };
};

describe('liquid2 local fluid', () => {
	it('keeps a thin connected filament visible through its tip', () => {
		const { fluid, field } = make(false);
		fluid.count = 10;
		for (let i = 0; i < fluid.count; i++) {
			fluid.position[i * 3] = -0.75;
			fluid.position[i * 3 + 1] = -0.02 + i * fluid.smoothingRadius * 0.8;
			fluid.position[i * 3 + 2] = 0;
		}
		fluid.advance(1 / 60, 0, field, 0);
		expect(fluid.renderCount).toBe(10);
		expect(fluid.visibleHeight).toBeGreaterThan(0.6);
	});
	it('feeds a broad thin wave across the cup instead of a compact jet', () => {
		const { fluid, field } = make(false);
		for (let i = 0; i < 12; i++) fluid.advance(1 / 60, 0.8, field, 0);
		let low = Infinity,
			high = -Infinity;
		for (let i = 0; i < fluid.count; i++) {
			low = Math.min(low, fluid.position[i * 3 + 2]);
			high = Math.max(high, fluid.position[i * 3 + 2]);
		}
		expect(high - low).toBeGreaterThan(2 * DRINK.radius);
	});
	it('replays the same fixed-step trajectory across render rates', () => {
		const a = make(),
			b = make();
		for (let i = 0; i < 90; i++) {
			const drive = i < 60 ? 0.7 : 0;
			a.fluid.advance(1 / 60, drive, a.field, 0);
			b.fluid.advance(1 / 120, drive, b.field, 0);
			b.fluid.advance(1 / 120, drive, b.field, 0);
		}
		expect(a.fluid.count).toBe(b.fluid.count);
		expect(a.fluid.position.slice(0, a.fluid.count * 3)).toEqual(
			b.fluid.position.slice(0, b.fluid.count * 3)
		);
	});

	it('collides with the tapered wall at each height', () => {
		const { fluid, field } = make();
		const tapered = { ...DRINK, baseRadius: DRINK.radius * 0.58 };
		fluid.layout(tapered);
		field.setObstacle(tapered);
		for (let i = 0; i < 90; i++) fluid.advance(1 / 60, 0.8, field, 0);
		for (let i = 0; i < fluid.count; i++) {
			const x = fluid.position[i * 3],
				y = fluid.position[i * 3 + 1],
				z = fluid.position[i * 3 + 2];
			if (y < tapered.baseY + tapered.height && y > tapered.baseY)
				expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(radiusAt(tapered, y) - 1e-5);
		}
	});

	it('bounds work and keeps valid state after invalid input or a delayed frame', () => {
		const { fluid, field } = make();
		fluid.advance(60, 1000, field, 0);
		fluid.advance(Number.NaN, Number.POSITIVE_INFINITY, field, 0);
		for (let i = 0; i < 60; i++) fluid.advance(1 / 60, 1, field, 0);
		expect(fluid.count).toBeLessThanOrEqual(fluid.capacity);
		expect(fluid.position.slice(0, fluid.count * 3).every(Number.isFinite)).toBe(true);
	});
	it('raises both incoming sides and settles once inlet momentum ends', () => {
		const { fluid, field } = make();
		let left = 0,
			right = 0;
		for (let i = 0; i < 240; i++) {
			fluid.advance(1 / 120, 0.8, field, 0);
			for (let j = 0; j < fluid.count; j++) {
				if (fluid.position[j * 3] < 0) left = Math.max(left, fluid.position[j * 3 + 1]);
				else right = Math.max(right, fluid.position[j * 3 + 1]);
			}
		}
		// Opposing unobstructed streams can themselves form a higher free jet.
		// Check the actual solid flanks and gravity-driven decay instead.
		expect(left).toBeGreaterThan(0.25);
		expect(right).toBeGreaterThan(0.25);
		for (let i = 0; i < 300; i++) fluid.advance(1 / 60, 0, field, 0);
		expect(fluid.maxHeight).toBeLessThan(0.08);
	});

	it('never penetrates the cylinder and keeps a bounded particle reservoir', () => {
		const { fluid, field } = make();
		for (let i = 0; i < 180; i++) fluid.advance(1 / 120, 1, field, 0);
		expect(fluid.count).toBeLessThanOrEqual(fluid.capacity);
		for (let i = 0; i < fluid.count; i++) {
			const x = fluid.position[i * 3],
				y = fluid.position[i * 3 + 1],
				z = fluid.position[i * 3 + 2];
			expect([x, y, z].every(Number.isFinite)).toBe(true);
			if (y < DRINK.baseY + DRINK.height)
				expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(DRINK.radius - 1e-5);
		}
	});
});
