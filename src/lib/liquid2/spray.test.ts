import { describe, expect, it } from 'vitest';
import type { Domain, Drink, Tier } from './scene';
import { ShallowWater, type Breaking } from './shallow-water';
import { PARTICLE_STRIDE, Spray } from './spray';

const TIER: Tier = { cols: 80, rows: 80, maxParticles: 256 };
const DOMAIN: Domain = { x0: -2, x1: 2, z0: -2, z1: 2 };
const DRINK: Drink = { x: 0, z: 0, radius: 0.3, height: 1, baseY: -0.15 };
const event = (over: Partial<Breaking> = {}): Breaking => ({
	x: -1,
	z: 0,
	y: 0.8,
	vx: 0,
	vy: 0.5,
	vz: 0,
	strength: 0.6,
	...over
});
const run = (spray: Spray, field: ShallowWater, drink: Drink | null, seconds: number, check?: () => void) => {
	for (let i = 0; i < seconds * 120; i++) {
		spray.advance(1 / 120, field, drink);
		check?.();
	}
};

describe('liquid2 spray', () => {
	it('falls back into the surface and returns its volume', () => {
		const field = new ShallowWater(TIER, DOMAIN);
		const spray = new Spray(TIER.maxParticles);
		spray.emit([event()]);
		expect(spray.count).toBeGreaterThan(0);
		const before = field.sample(-1, 0);
		run(spray, field, null, 2);
		expect(spray.count).toBe(0);
		expect(field.sample(-1, 0)).not.toBe(before);
	});

	it('never passes through the drink', () => {
		const field = new ShallowWater(TIER, DOMAIN);
		const spray = new Spray(TIER.maxParticles);
		for (let n = 0; n < 40; n++)
			spray.emit([event({ x: -1.2, z: (n % 10) * 0.06 - 0.3, y: 0.3, vx: 4, vy: 1.5 })]);
		run(spray, field, DRINK, 1.5, () => {
			for (let p = 0; p < spray.count; p++) {
				const o = p * PARTICLE_STRIDE;
				const y = spray.data[o + 1];
				if (y >= DRINK.baseY + DRINK.height) continue;
				const dist = Math.hypot(spray.data[o] - DRINK.x, spray.data[o + 2] - DRINK.z);
				expect(dist).toBeGreaterThanOrEqual(DRINK.radius - 1e-4);
			}
		});
	});

	it('drops new particles once full instead of overwriting live ones', () => {
		const field = new ShallowWater(TIER, DOMAIN);
		const spray = new Spray(TIER.maxParticles);
		spray.emit([event({ y: 1.5, vx: 0.4 })]);
		const firstX = spray.data[0];
		const firstAge = spray.data[7];
		spray.advance(1 / 120, field, null);
		for (let n = 0; n < 100; n++) spray.emit([event({ x: 1, strength: 1 })]);
		expect(spray.count).toBe(TIER.maxParticles);
		spray.advance(1 / 120, field, null);
		expect(spray.data[0]).toBeGreaterThan(firstX);
		expect(spray.data[7]).toBeGreaterThan(firstAge);
	});

	it('slows small drops faster than large ones', () => {
		const field = new ShallowWater(TIER, DOMAIN);
		const spray = new Spray(TIER.maxParticles);
		spray.emit([event({ y: 1.5, vx: 3, vy: 0, strength: 1 })]);
		const speeds = () => {
			const out: { r: number; v: number }[] = [];
			for (let p = 0; p < spray.count; p++) {
				const o = p * PARTICLE_STRIDE;
				out.push({ r: spray.data[o + 6], v: Math.abs(spray.data[o + 3]) });
			}
			return out.sort((a, b) => a.r - b.r);
		};
		run(spray, field, null, 0.3);
		const s = speeds();
		expect(s.length).toBeGreaterThan(1);
		expect(s[0].v).toBeLessThan(s[s.length - 1].v);
	});
});
