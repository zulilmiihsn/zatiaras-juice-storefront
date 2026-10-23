import { describe, expect, it } from 'vitest';
import type { Domain, Drink, Tier } from './scene';
import { ShallowWater } from './shallow-water';

const TIER: Tier = { cols: 120, rows: 120, maxParticles: 512 };
const DOMAIN: Domain = { x0: -3, x1: 3, z0: -3, z1: 3 };
const DRINK: Drink = { x: 0, z: 0, radius: 0.3, height: 1, baseY: -0.15 };

const peak = (w: ShallowWater) => w.height.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const sum = (a: Float32Array) => a.reduce((s, v) => s + v, 0);

describe('liquid2 shallow water', () => {
	it('stays calm and splash-free when only the wind stirs it', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		let events = 0;
		for (let i = 0; i < 600; i++) events += w.advance(1 / 60, 0).length;
		expect(peak(w)).toBeGreaterThan(0.002);
		expect(peak(w)).toBeLessThan(0.08);
		expect(events).toBe(0);
	}, 20000);

	it('builds colliding swells that break under full drive', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		let events = 0;
		let highest = 0;
		for (let i = 0; i < 600; i++) {
			events += w.advance(1 / 60, 1).length;
			highest = Math.max(highest, peak(w));
		}
		expect(highest).toBeGreaterThan(0.35);
		expect(events).toBeGreaterThan(0);
	}, 20000);

	it('shadows the water behind the drink', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		w.setObstacle(DRINK);
		w.impulse(-0.6, 0, 0.12, 0.2);
		let shadow = 0;
		let open = 0;
		for (let i = 0; i < 90; i++) {
			w.advance(1 / 60, 0);
			shadow = Math.max(shadow, Math.abs(w.sample(0.6, 0)));
			open = Math.max(open, Math.abs(w.sample(-0.6, 1.2)));
		}
		expect(shadow).toBeLessThan(open);
		for (let k = 0; k < w.solid.length; k++) if (w.solid[k]) expect(w.height[k]).toBe(0);
	});

	it('preserves volume when the obstacle moves', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		w.impulse(0, 0, 0.5, 0.1);
		const before = sum(w.height);
		w.setObstacle(DRINK);
		expect(Math.abs(sum(w.height) - before) / before).toBeLessThan(1e-3);
	});

	it('stays bounded after a huge time step', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		w.setObstacle(DRINK);
		w.advance(30, 1);
		for (let i = 0; i < 60; i++) w.advance(1 / 60, 1);
		for (const v of w.height) {
			expect(Number.isFinite(v)).toBe(true);
			expect(Math.abs(v)).toBeLessThan(3);
		}
	});

	it('is deterministic for the same seed and inputs', () => {
		const a = new ShallowWater(TIER, DOMAIN, 7);
		const b = new ShallowWater(TIER, DOMAIN, 7);
		for (let i = 0; i < 600; i++) {
			a.advance(1 / 60, i % 200 < 100 ? 1 : 0.2);
			b.advance(1 / 60, i % 200 < 100 ? 1 : 0.2);
		}
		expect(Array.from(a.height)).toEqual(Array.from(b.height));
	}, 20000);
});

describe('liquid2 shallow water back edge', () => {
	it('keeps waves alive along the back edge, the silhouette against the page', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		let back = 0;
		let mid = 0;
		for (let i = 0; i < 360; i++) {
			w.advance(1 / 60, 1);
			const row = (w.rows >> 1) * w.cols;
			for (let c = 0; c < w.cols; c++) {
				back = Math.max(back, Math.abs(w.height[c]));
				mid = Math.max(mid, Math.abs(w.height[row + c]));
			}
		}
		expect(back).toBeGreaterThan(0.6 * mid);
	});
});

describe('liquid2 shallow water smoothing', () => {
	it('damps grid-scale noise while long swells keep travelling', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		const roughness = () => {
			let sum = 0;
			for (let j = 40; j < 80; j++)
				for (let i = 40; i < 80; i++) {
					const k = j * w.cols + i;
					sum += (w.height[k] - w.height[k + 1]) ** 2;
				}
			return sum;
		};
		for (let j = 40; j < 81; j++)
			for (let i = 40; i < 81; i++) w.height[j * w.cols + i] = (i + j) % 2 ? 0.05 : -0.05;
		const before = roughness();
		for (let i = 0; i < 30; i++) w.advance(1 / 60, 0);
		expect(roughness()).toBeLessThan(before * 0.1);
	});
});

describe('liquid2 shallow water render heights', () => {
	it('fills solid cells from their fluid neighbours so the drawn surface has no pit', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		w.setObstacle(DRINK);
		w.height.fill(0.2);
		for (let k = 0; k < w.solid.length; k++) if (w.solid[k]) w.height[k] = 0;
		const out = new Float32Array(w.height.length);
		w.renderHeights(out);
		for (let k = 0; k < w.solid.length; k++) expect(out[k]).toBeCloseTo(0.2, 5);
	});
});

describe('liquid2 shallow water wall mask', () => {
	it('is 0 at and beside the obstacle and 1 away from it', () => {
		const w = new ShallowWater(TIER, DOMAIN);
		w.setObstacle(DRINK);
		const mask = new Float32Array(w.height.length);
		w.wallMask(mask);
		const at = (x: number, z: number) =>
			mask[Math.floor((z - DOMAIN.z0) / w.dz) * w.cols + Math.floor((x - DOMAIN.x0) / w.dx)];
		expect(at(0, 0)).toBe(0);
		expect(at(DRINK.radius + w.dx, 0)).toBe(0);
		expect(at(2, 2)).toBe(1);
		for (const v of mask) expect(v >= 0 && v <= 1).toBe(true);
	});
});
