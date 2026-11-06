import { describe, expect, it } from 'vitest';
import { DROPLET_STRIDE, LINE_CELLS, MAX_DROPLETS, WaveLine } from './wave-line';

const peak = (line: WaveLine) => Math.max(...line.height.map(Math.abs));
const run = (line: WaveLine, seconds: number, energy: number) => {
	for (let i = 0; i < seconds * 60; i++) line.advance(1 / 60, energy);
};

describe('liquid wave line', () => {
	it('stays nearly flat and splash-free when only the wind stirs it', () => {
		const line = new WaveLine();
		let spawned = 0;
		for (let i = 0; i < 600; i++) {
			line.advance(1 / 60, 0);
			spawned = Math.max(spawned, line.dropletCount);
		}
		expect(peak(line)).toBeGreaterThan(0.005);
		expect(peak(line)).toBeLessThan(0.1);
		expect(spawned).toBe(0);
	});
	it('builds colliding swells that throw droplets under scroll energy', () => {
		const line = new WaveLine();
		let spawned = 0;
		for (let i = 0; i < 600; i++) {
			line.advance(1 / 60, 1);
			spawned = Math.max(spawned, line.dropletCount);
		}
		expect(peak(line)).toBeGreaterThan(0.5);
		expect(spawned).toBeGreaterThan(0);
	});
	it('keeps swelling but throws no droplets with spray off', () => {
		const line = new WaveLine();
		line.spray = false;
		let spawned = 0;
		for (let i = 0; i < 600; i++) {
			line.advance(1 / 60, 1);
			line.impulse(0, 6);
			spawned = Math.max(spawned, line.dropletCount);
		}
		expect(peak(line)).toBeGreaterThan(0.5);
		expect(spawned).toBe(0);
	});
	it('keeps swells off the screen edges', () => {
		const line = new WaveLine();
		run(line, 8, 1);
		const edge = Math.max(
			...[0, 1, 2, LINE_CELLS - 3, LINE_CELLS - 2, LINE_CELLS - 1].map((i) =>
				Math.abs(line.height[i])
			)
		);
		expect(edge).toBeLessThan(peak(line) * 0.5);
	});
	it('lets droplets fall back in once the energy is gone', () => {
		const line = new WaveLine();
		run(line, 6, 1);
		run(line, 8, 0);
		expect(line.dropletCount).toBe(0);
		expect(line.active).toBe(false);
	});
	it('keeps the strongest drop impact a small local dip, not a new wave', () => {
		const line = new WaveLine();
		line.impulse(0, -0.5, 0.25);
		let dip = 0,
			far = 0;
		for (let i = 0; i < 120; i++) {
			line.advance(1 / 60, 0);
			dip = Math.min(dip, line.at(0));
			far = Math.max(far, Math.abs(line.at(3)));
		}
		expect(dip).toBeGreaterThan(-0.08);
		expect(far).toBeLessThan(0.08);
	});
	it('lets spray settle on a narrow phone-width surface too', () => {
		const line = new WaveLine();
		line.setSpan(3.1);
		run(line, 6, 1);
		run(line, 10, 0);
		expect(line.dropletCount).toBe(0);
	});
	it('bounds extreme input and stays finite', () => {
		const line = new WaveLine();
		line.setSpan(3.1);
		for (let i = 0; i < 200; i++) {
			line.impulse(0, 100);
			line.advance(0.05, 100);
		}
		line.advance(60, Number.NaN);
		expect(
			[...line.height].every((value) => Number.isFinite(value) && Math.abs(value) <= 1.600001)
		).toBe(true);
		expect(line.dropletCount).toBeLessThanOrEqual(MAX_DROPLETS);
		expect(
			[...line.droplets.subarray(0, line.dropletCount * DROPLET_STRIDE)].every(Number.isFinite)
		).toBe(true);
	});
	it('ignores invalid input and resets on reframing', () => {
		const line = new WaveLine();
		line.impulse(Number.NaN, 1);
		line.impulse(100, 1);
		line.advance(-1, 1);
		expect(peak(line)).toBe(0);
		run(line, 3, 1);
		line.setSpan(5);
		expect(peak(line)).toBe(0);
		expect(line.dropletCount).toBe(0);
	});
	it('makes the surface react where falling drops land', () => {
		const line = new WaveLine();
		run(line, 3, 1);
		let impacts = 0;
		for (let i = 0; i < 360 && impacts === 0; i++) {
			line.advance(1 / 60, 0);
			impacts = line.landings.length / 3;
			if (impacts > 0) {
				const [x, , strength] = line.landings;
				expect(Math.abs(x)).toBeLessThan(8);
				expect(strength).toBeGreaterThan(0);
				expect(strength).toBeLessThanOrEqual(0.5);
			}
		}
		expect(impacts).toBeGreaterThan(0);
	});
	it('is repeatable for the same seed', () => {
		const a = new WaveLine(7),
			b = new WaveLine(7);
		run(a, 4, 1);
		run(b, 4, 1);
		expect([...a.height]).toEqual([...b.height]);
		expect(a.dropletCount).toBe(b.dropletCount);
	});
});
