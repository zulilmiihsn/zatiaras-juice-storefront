// Liquid 2 spray: drops thrown by breaking crests. Each crest throws a chained sheet (one
// lead drop and a trail of smaller ones behind it) plus fine mist. Drops fly under gravity
// with air drag that slows small drops more, glance off the drink's cylinder, and are
// absorbed when they fall back through the surface, returning their volume to the field.
// Positions are in the field's frame: y is the offset from the mean level.

import type { Drink } from './scene';
import type { Breaking, ShallowWater } from './shallow-water';

/** Per particle: x, y, z, vx, vy, vz, radius, age. */
export const PARTICLE_STRIDE = 8;

const GRAVITY = 9.8;
const DRAG = 0.01;
const RESTITUTION = 0.15;
const FRICTION = 0.6;
const MAX_AGE = 6;

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export class Spray {
	data: Float32Array;
	count = 0;
	version = 0;
	readonly capacity: number;
	private readonly random: () => number;

	constructor(maxParticles: number, seed = 0x5b1a5) {
		this.capacity = Math.max(1, Math.floor(maxParticles));
		this.data = new Float32Array(this.capacity * PARTICLE_STRIDE);
		this.random = mulberry32(seed >>> 0 || 1);
	}

	private add(x: number, y: number, z: number, vx: number, vy: number, vz: number, r: number) {
		if (this.count >= this.capacity) return;
		const o = this.count++ * PARTICLE_STRIDE;
		const d = this.data;
		d[o] = x;
		d[o + 1] = y;
		d[o + 2] = z;
		d[o + 3] = vx;
		d[o + 4] = vy;
		d[o + 5] = vz;
		d[o + 6] = r;
		d[o + 7] = 0;
	}

	emit(events: Breaking[]) {
		const rnd = this.random;
		for (const e of events) {
			if (![e.x, e.y, e.z, e.vx, e.vy, e.vz, e.strength].every(Number.isFinite)) continue;
			const s = Math.min(1, Math.max(0, e.strength));
			const speed = Math.hypot(e.vx, e.vy, e.vz) || 1;
			const ux = e.vx / speed;
			const uy = e.vy / speed;
			const uz = e.vz / speed;
			let r = 0.022 + 0.013 * rnd();
			this.add(e.x, e.y + r, e.z, e.vx, e.vy, e.vz, r);
			// The trail hangs behind the lead drop along its path, each drop smaller and slower.
			const trail = 2 + Math.round(4 * s * rnd());
			for (let n = 1; n <= trail; n++) {
				r *= 0.8;
				const back = n * 0.02;
				const slow = 1 - 0.06 * n;
				this.add(
					e.x - ux * back,
					e.y + r - uy * back,
					e.z - uz * back,
					e.vx * slow,
					e.vy * slow,
					e.vz * slow,
					r
				);
			}
			const mist = Math.round(3 * s);
			for (let n = 0; n < mist; n++) {
				const jitter = () => 1 + 0.3 * (rnd() - 0.5);
				this.add(
					e.x + 0.04 * (rnd() - 0.5),
					e.y + 0.02,
					e.z + 0.04 * (rnd() - 0.5),
					e.vx * jitter(),
					e.vy * jitter(),
					e.vz * jitter(),
					0.004 + 0.004 * rnd()
				);
			}
		}
		if (events.length) this.version++;
	}

	advance(dt: number, field: ShallowWater, drink: Drink | null) {
		if (!Number.isFinite(dt) || dt <= 0 || this.count === 0) return;
		const d = this.data;
		const { x0, x1, z0, z1 } = field.domain;
		const top = drink ? drink.baseY + drink.height : 0;
		for (let p = 0; p < this.count; p++) {
			const o = p * PARTICLE_STRIDE;
			const r = d[o + 6];
			let vx = d[o + 3];
			let vy = d[o + 4] - GRAVITY * dt;
			let vz = d[o + 5];
			const speed = Math.hypot(vx, vy, vz);
			const slow = Math.max(0, 1 - ((DRAG * speed) / r) * dt);
			vx *= slow;
			vy *= slow;
			vz *= slow;
			let x = d[o] + vx * dt;
			const y = d[o + 1] + vy * dt;
			let z = d[o + 2] + vz * dt;
			if (drink && y < top) {
				const ox = x - drink.x;
				const oz = z - drink.z;
				const dist = Math.hypot(ox, oz);
				const reach = drink.radius + r;
				if (dist < reach) {
					const nx = dist > 1e-6 ? ox / dist : -1;
					const nz = dist > 1e-6 ? oz / dist : 0;
					x = drink.x + nx * reach;
					z = drink.z + nz * reach;
					const vn = vx * nx + vz * nz;
					if (vn < 0) {
						const tx = vx - vn * nx;
						const tz = vz - vn * nz;
						vx = tx * (1 - FRICTION) - RESTITUTION * vn * nx;
						vz = tz * (1 - FRICTION) - RESTITUTION * vn * nz;
					}
				}
			}
			const age = d[o + 7] + dt;
			const outside = x < x0 - 1 || x > x1 + 1 || z < z0 - 1 || z > z1 + 1;
			const landed = vy < 0 && y <= field.sample(x, z);
			if (landed || outside || age > MAX_AGE || !Number.isFinite(x + y + z)) {
				if (landed) field.deposit(x, z, (4 / 3) * Math.PI * r * r * r, vy);
				const last = --this.count * PARTICLE_STRIDE;
				if (last !== o) d.copyWithin(o, last, last + PARTICLE_STRIDE);
				p--;
				continue;
			}
			d[o] = x;
			d[o + 1] = y;
			d[o + 2] = z;
			d[o + 3] = vx;
			d[o + 4] = vy;
			d[o + 5] = vz;
			d[o + 7] = age;
		}
		this.version++;
	}
}
