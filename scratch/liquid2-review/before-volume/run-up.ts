// Local water run-up on the drink's cylinder. Scroll adds incoming momentum; it does
// not prescribe a crest height. Stagnation pressure converts horizontal kinetic head
// into vertical motion, potential flow carries the film around the cylinder, and a
// crest above the rim follows gravity. The distant pool has its own level and solver.

import type { Drink } from './scene';
import { GRAVITY, MAX_SUBSTEPS, SIM_STEP, type ShallowWater } from './shallow-water';

const clamp = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));

export class RunUp {
	readonly height: Float32Array;
	readonly verticalVelocity: Float32Array;
	readonly offset: Float32Array;
	readonly radialVelocity: Float32Array;
	private readonly flight: Float32Array;
	readonly cos: Float32Array;
	readonly sin: Float32Array;
	speed = 0;
	travel = 0;
	private drink: Drink | null = null;
	private readonly previous: Float32Array[];

	constructor(readonly segments: number) {
		this.height = new Float32Array(segments);
		this.verticalVelocity = new Float32Array(segments);
		this.offset = new Float32Array(segments);
		this.radialVelocity = new Float32Array(segments);
		this.flight = new Float32Array(segments);
		this.cos = Float32Array.from({ length: segments }, (_, i) =>
			Math.cos((i * 2 * Math.PI) / segments)
		);
		this.sin = Float32Array.from({ length: segments }, (_, i) =>
			Math.sin((i * 2 * Math.PI) / segments)
		);
		this.previous = Array.from({ length: 5 }, () => new Float32Array(segments));
	}

	layout(drink: Drink | null) {
		if (drink && this.drink) {
			const vertical = drink.height / this.drink.height;
			const radial = drink.radius / this.drink.radius;
			for (let i = 0; i < this.segments; i++) {
				this.height[i] *= vertical;
				this.verticalVelocity[i] *= Math.sqrt(vertical);
				this.offset[i] *= radial;
				this.radialVelocity[i] *= Math.sqrt(radial);
			}
			this.speed *= Math.sqrt(vertical);
			this.travel *= radial;
		}
		this.drink = drink;
	}

	advance(dt: number, drive: number, field: ShallowWater, level = 0) {
		if (!Number.isFinite(dt) || dt <= 0 || !this.drink) return;
		const force = Number.isFinite(drive) ? clamp(drive, 0, 1) : 0;
		let left = Math.min(dt, MAX_SUBSTEPS * SIM_STEP);
		while (left > 1e-9) {
			const step = Math.min(left, SIM_STEP);
			left -= step;
			this.step(step, force, field, level);
		}
	}

	private step(dt: number, drive: number, field: ShallowWater, level: number) {
		const drink = this.drink!;
		const collision = field.obstacle !== null;
		const scale = drink.height;
		this.speed = clamp(
			this.speed + (1.35 * GRAVITY * drive - (0.45 * this.speed * this.speed) / scale) * dt,
			0,
			Math.sqrt(3.2 * GRAVITY * scale)
		);
		this.travel += this.speed * dt;
		if (this.speed < 0.005) this.travel = 0;
		const arrived = this.travel >= 2.4 * drink.radius;
		const state = [
			this.height,
			this.verticalVelocity,
			this.offset,
			this.radialVelocity,
			this.flight
		];
		for (let i = 0; i < state.length; i++) this.previous[i].set(state[i]);
		const spacing = (Math.PI * 2) / this.segments;
		const viscosity = 0.85 * Math.sqrt(GRAVITY / scale);
		const sampleRadius = drink.radius + 1.5 * Math.max(field.dx, field.dz);
		for (let i = 0; i < this.segments; i++) {
			const nx = this.cos[i],
				nz = this.sin[i];
			const ci = Math.floor((drink.x + nx * sampleRadius - field.domain.x0) / field.dx);
			const cj = Math.floor((drink.z + nz * sampleRadius - field.domain.z0) / field.dz);
			let ambientX = 0,
				ambientZ = 0;
			if (ci >= 0 && ci < field.cols && cj >= 0 && cj < field.rows) {
				const k = cj * field.cols + ci;
				const face = cj * (field.cols + 1) + ci;
				ambientX = 0.5 * (field.velX[face] + field.velX[face + 1]);
				ambientZ = 0.5 * (field.velZ[k] + field.velZ[k + field.cols]);
			}
			// A finite incoming stream strikes a patch of the cylinder rather than applying
			// uniform pressure to a half-ring. The split streams meet again in its wake.
			const inlet = Math.exp(-Math.pow(nz / 0.5, 2));
			const incomingX = (arrived ? this.speed * inlet : 0) + ambientX;
			const approach = collision ? Math.max(0, -(incomingX * nx + ambientZ * nz)) : 0;
			const wake =
				collision && arrived ? 0.35 * Math.pow(this.speed * inlet * Math.max(0, nx), 2) : 0;
			const head = Math.min(1.6 * scale, (approach * approach + wake) / (2 * GRAVITY));
			// Potential flow has zero normal velocity at the cylinder and accelerates around
			// its sides. Semi-Lagrangian transport carries height and momentum without a CFL
			// instability when a quick flick makes that tangential velocity large.
			// Viscous wall friction slows the film relative to the outer potential flow;
			// otherwise a crest circles the entire cup before gravity can bring it down.
			const tangential = 0.14 * (-2 * this.speed * inlet * nz - ambientX * nz + ambientZ * nx);
			const source =
				(((i - (tangential * dt) / drink.radius / spacing) % this.segments) + this.segments) %
				this.segments;
			const a = Math.floor(source),
				b = (a + 1) % this.segments,
				t = source - a;
			let h = this.previous[0][a] * (1 - t) + this.previous[0][b] * t;
			let vertical = this.previous[1][a] * (1 - t) + this.previous[1][b] * t;
			let radial = this.previous[2][a] * (1 - t) + this.previous[2][b] * t;
			let radialSpeed = this.previous[3][a] * (1 - t) + this.previous[3][b] * t;
			let flight = this.previous[4][a] * (1 - t) + this.previous[4][b] * t;
			const aboveRim = level + h > drink.baseY + drink.height;
			if (aboveRim && flight < 0.5) {
				flight = 1;
				radialSpeed += 0.25 * approach;
			}
			const airborne = flight > 0.5;
			let acceleration =
				airborne || head < 0.0001 * scale
					? -GRAVITY
					: clamp((GRAVITY * (head - h)) / (0.35 * scale + h), -GRAVITY, 3 * GRAVITY);
			const curvature =
				(this.previous[0][(i + 1) % this.segments] -
					2 * this.previous[0][i] +
					this.previous[0][(i + this.segments - 1) % this.segments]) /
				(drink.radius * drink.radius * spacing * spacing);
			acceleration += clamp(0.008 * GRAVITY * scale * curvature, -GRAVITY, GRAVITY);
			vertical = (vertical + acceleration * dt) * Math.exp(-(airborne ? 0.25 : viscosity) * dt);
			h += vertical * dt;
			// When the upper film leaves the wall, the redirected horizontal momentum bends
			// its lip outward. Its vertical motion above the rim remains ballistic.
			const released = clamp((h / scale - 0.35) / 0.55, 0, 1);
			const outward = airborne
				? 0
				: (released * 0.035 * (approach * approach + tangential * tangential)) / drink.radius;
			radialSpeed = (radialSpeed + outward * dt) * Math.exp(-(airborne ? 0.35 : 3) * dt);
			radial += radialSpeed * dt;
			if (h <= 0) {
				flight = 0;
				h = 0;
				vertical = 0;
				radial = 0;
				radialSpeed = 0;
			}
			if (h > 1.8 * scale) {
				h = 1.8 * scale;
				vertical = Math.min(0, vertical);
			}
			if (radial > 1.8 * drink.radius) {
				radial = 1.8 * drink.radius;
				radialSpeed = 0;
			}
			this.height[i] = h;
			this.verticalVelocity[i] = vertical;
			this.offset[i] = radial;
			this.radialVelocity[i] = radialSpeed;
			this.flight[i] = flight;
		}
	}

	get maxHeight(): number {
		return this.height.reduce((peak, h) => Math.max(peak, h), 0);
	}
}
