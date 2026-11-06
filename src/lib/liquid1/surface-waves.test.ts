import { describe, expect, it } from 'vitest';
import { FIELD_HEIGHT, FIELD_WIDTH, SurfaceWaves } from './surface-waves';

const cells = (field: SurfaceWaves) =>
	field.data.filter((value) => Math.abs(value) > 0.0001).length;
const energy = (field: SurfaceWaves) => field.data.reduce((sum, value) => sum + value * value, 0);

describe('local liquid waves', () => {
	it('starts locally and propagates beyond the contact area', () => {
		const field = new SurfaceWaves();
		field.impulse(0, -1, 1.5);
		field.advance(1 / 60);
		const initial = cells(field);
		expect(initial).toBeGreaterThan(0);
		expect(initial).toBeLessThan(FIELD_WIDTH * FIELD_HEIGHT * 0.1);
		for (let i = 0; i < 45; i++) field.advance(1 / 60);
		expect(cells(field)).toBeGreaterThan(initial * 2);
	});
	it('dissipates a disturbance without exciting the whole body indefinitely', () => {
		const field = new SurfaceWaves();
		field.impulse(0, -1, 1.5);
		for (let i = 0; i < 30; i++) field.advance(1 / 60);
		const disturbed = energy(field);
		for (let i = 0; i < 600; i++) field.advance(1 / 60);
		expect(energy(field)).toBeLessThan(disturbed * 0.01);
	});
	it('bounds rapid input and long pauses', () => {
		const field = new SurfaceWaves();
		field.setSpan(3.1);
		for (let i = 0; i < 100; i++) {
			field.impulse(0, -1, 100);
			field.advance(0.05, 100);
		}
		field.advance(60);
		expect(
			[...field.data].every((value) => Number.isFinite(value) && Math.abs(value) <= 0.140001)
		).toBe(true);
	});
	it('ignores invalid and off-surface input, and resets on reframing', () => {
		const field = new SurfaceWaves();
		field.impulse(Number.NaN, 0, 1);
		field.impulse(100, 0, 1);
		field.impulse(0, 10, 1);
		field.advance(1);
		expect(field.active).toBe(false);
		field.impulse(0, -1, 1);
		field.advance(1 / 30);
		field.setSpan(5);
		expect(energy(field)).toBe(0);
		expect(field.active).toBe(false);
	});
});
