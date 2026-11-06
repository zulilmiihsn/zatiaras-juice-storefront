import { describe, expect, it } from 'vitest';
import { RunUp } from './run-up';
import { ShallowWater } from './shallow-water';

const DRINK = { x: 0, z: 0, radius: 0.4, height: 1.1, baseY: -0.15 };
const make = () => {
	const field = new ShallowWater({ cols: 32, rows: 24 }, { x0: -3, x1: 3, z0: -3, z1: 3 });
	field.setObstacle(DRINK);
	const runUp = new RunUp(64);
	runUp.layout(DRINK);
	return { field, runUp };
};
const advance = (runUp: RunUp, field: ShallowWater, seconds: number, drive: number) => {
	for (let i = 0; i < Math.ceil(seconds * 120); i++) runUp.advance(1 / 120, drive, field);
};

describe('liquid2 collision run-up', () => {
	it('waits for incoming momentum to reach the cup before lifting water', () => {
		const { runUp, field } = make();
		advance(runUp, field, 0.15, 1);
		expect(runUp.speed).toBeGreaterThan(0);
		expect(runUp.maxHeight).toBeLessThan(0.001);
		advance(runUp, field, 1.85, 1);
		expect(runUp.maxHeight).toBeGreaterThan(DRINK.height * 0.4);
	});

	it('cannot produce a rising crown without a solid obstacle', () => {
		const { runUp, field } = make();
		field.setObstacle(null);
		advance(runUp, field, 2, 1);
		expect(runUp.speed).toBeGreaterThan(1);
		expect(runUp.maxHeight).toBe(0);
	});

	it('concentrates impact locally rather than lifting the whole circumference uniformly', () => {
		const { runUp, field } = make();
		advance(runUp, field, 1.6, 0.8);
		expect(runUp.maxHeight).toBeGreaterThan(0.25 * DRINK.height);
		expect(Math.min(...runUp.height)).toBeLessThan(runUp.maxHeight * 0.5);
	});

	it('keeps momentum after input stops and falls under gravity when contact pressure is removed', () => {
		const { runUp, field } = make();
		advance(runUp, field, 1.4, 1);
		const before = runUp.maxHeight;
		field.setObstacle(null);
		advance(runUp, field, 0.05, 0);
		expect(runUp.maxHeight).toBeGreaterThan(before * 0.5);
		advance(runUp, field, 3, 0);
		expect(runUp.maxHeight).toBeLessThan(0.01);
	});

	it('stays finite and bounded after a flick or invalid input', () => {
		const { runUp, field } = make();
		runUp.advance(60, 1000, field);
		runUp.advance(Number.NaN, Number.POSITIVE_INFINITY, field);
		advance(runUp, field, 4, 1);
		expect(runUp.height.every(Number.isFinite)).toBe(true);
		expect(runUp.offset.every(Number.isFinite)).toBe(true);
		expect(runUp.maxHeight).toBeLessThanOrEqual(DRINK.height * 1.8);
	});
});
