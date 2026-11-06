// Lagrangian thin sheets resolve the free surface after impact. New material enters
// at the pool; each row keeps its own momentum, falls under gravity and collides
// with the fitted cup. The row lattice preserves a continuous, sub-particle film.
import { radiusAt, type Drink } from './scene';
import { GRAVITY, type ShallowWater } from './shallow-water';
import type { Fluid } from './fluid';

const PATCHES = [
	{ angle: Math.PI * 0.94, width: 0.16, energy: 0.98, lean: 0.12 },
	{ angle: -Math.PI * 0.12, width: 0.14, energy: 0.96, lean: -0.08 },
	{ angle: Math.PI * 1.26, width: 0.1, energy: 0.92, lean: 0.14 },
	{ angle: Math.PI * 0.28, width: 0.1, energy: 0.86, lean: -0.1 }
] as const;

export class ThinSheets {
	readonly vertices: Float32Array;
	readonly normals: Float32Array;
	readonly indices: Uint32Array;
	indexCount = 0;
	private readonly velocity: Float32Array;
	private readonly attached: Uint8Array;
	private readonly rows: number;
	private readonly cols: number;
	private drink: Drink | null = null;
	private newest = 0;
	private remainder = 0;
	private level = 0;
	private readonly openStrip: Uint8Array;
	private readonly entrySpeed: Float32Array;
	private readonly entryTangent: Float32Array;

	constructor(coarse: boolean) {
		this.rows = coarse ? 80 : 96;
		this.cols = coarse ? 7 : 11;
		this.openStrip = new Uint8Array(this.cols - 1);
		this.entrySpeed = new Float32Array(PATCHES.length * this.cols);
		this.entryTangent = new Float32Array(this.entrySpeed.length);
		this.vertices = new Float32Array(PATCHES.length * (this.rows + 1) * this.cols * 3);
		this.velocity = new Float32Array(this.vertices.length);
		this.normals = new Float32Array(this.vertices.length);
		this.attached = new Uint8Array(this.vertices.length / 3);
		this.indices = new Uint32Array(PATCHES.length * this.rows * (this.cols - 1) * 6);
	}

	layout(drink: Drink | null) {
		const previous = this.drink;
		this.drink = drink;
		if (!drink) return;
		if (previous) {
			const scale = drink.height / previous.height;
			for (let k = 0; k < this.vertices.length; k += 3) {
				this.vertices[k] = drink.x + (this.vertices[k] - previous.x) * scale;
				this.vertices[k + 1] = this.level + (this.vertices[k + 1] - this.level) * scale;
				this.vertices[k + 2] = drink.z + (this.vertices[k + 2] - previous.z) * scale;
				for (let j = 0; j < 3; j++) this.velocity[k + j] *= Math.sqrt(scale);
			}
		} else {
			for (let patch = 0; patch < PATCHES.length; patch++)
				for (let row = 0; row <= this.rows; row++) this.birth(patch, row, 0, null);
		}
	}

	private birth(patch: number, row: number, speed: number, field: ShallowWater | null) {
		const drink = this.drink!,
			config = PATCHES[patch];
		const radius = radiusAt(drink, this.level) + drink.height * 0.035;
		for (let col = 0; col < this.cols; col++) {
			const across = (col / (this.cols - 1)) * 2 - 1;
			const side = across * config.width * drink.height * 0.5;
			const angle = config.angle + side / radius;
			const nx = Math.cos(angle),
				nz = Math.sin(angle);
			const k = ((patch * (this.rows + 1) + row) * this.cols + col) * 3;
			const x = drink.x + nx * radius;
			const z = drink.z + nz * radius;
			this.vertices[k] = x;
			this.vertices[k + 1] = this.level + (field?.sample(x, z) ?? 0);
			this.vertices[k + 2] = z;
			const upward =
				speed *
				this.entrySpeed[patch * this.cols + col] *
				config.energy *
				(1 - 0.55 * across * across);
			const outward = upward * (0.12 + 0.02 * across);
			const tangent =
				upward * (config.lean + 0.05 * across) +
				speed * this.entryTangent[patch * this.cols + col] * 0.2;
			this.velocity[k] = nx * outward - nz * tangent;
			this.velocity[k + 1] = upward;
			this.velocity[k + 2] = nz * outward + nx * tangent;
			this.attached[k / 3] = 1;
		}
	}

	advance(dt: number, fluid: Fluid, field: ShallowWater, level: number) {
		if (!this.drink || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(level)) return;
		const fixed = 1 / 60;
		this.remainder = Math.min(this.remainder + dt, fixed * 2);
		if (this.remainder < fixed) return;
		this.remainder -= fixed;
		this.step(fixed, fluid, field, level);
	}

	private step(dt: number, fluid: Fluid, field: ShallowWater, level: number) {
		const drink = this.drink;
		if (!drink) return;
		this.level = level;
		const v = this.velocity,
			p = this.vertices;
		for (let patch = 0; patch < PATCHES.length; patch++) {
			this.sampleInlet(patch, fluid, dt);
			for (let row = 0; row < this.rows; row++) {
				for (let col = 0; col < this.cols; col++) {
					const k = ((patch * (this.rows + 1) + row) * this.cols + col) * 3;
					v[k + 1] -= GRAVITY * dt;
					if (v[k + 1] < -0.3 * Math.sqrt(GRAVITY * drink.height)) this.attached[k / 3] = 0;
					for (let j = 0; j < 3; j++) p[k + j] += v[k + j] * dt;
					const dx = p[k] - drink.x,
						dz = p[k + 2] - drink.z;
					const r = Math.hypot(dx, dz);
					const solid = radiusAt(drink, p[k + 1]) + drink.height * 0.008;
					if (field.obstacle && p[k + 1] < drink.baseY + drink.height && r < solid) {
						const nx = r > 1e-6 ? dx / r : Math.cos(PATCHES[patch].angle);
						const nz = r > 1e-6 ? dz / r : Math.sin(PATCHES[patch].angle);
						p[k] = drink.x + nx * solid;
						p[k + 2] = drink.z + nz * solid;
						const inward = Math.min(0, v[k] * nx + v[k + 2] * nz);
						v[k] -= inward * nx;
						v[k + 2] -= inward * nz;
					}
					const pool = level + field.sample(p[k], p[k + 2]);
					if (p[k + 1] < pool) {
						p[k + 1] = pool;
						v[k + 1] = Math.max(0, v[k + 1]);
						v[k] *= 0.88;
						v[k + 2] *= 0.88;
					}
				}
			}
			this.birth(patch, this.newest, 1, field);
			this.birth(patch, this.rows, 0, field);
		}
		let index = 0;
		for (let patch = 0; patch < PATCHES.length; patch++) {
			const base = patch * (this.rows + 1) * this.cols;
			this.openStrip.fill(1);
			for (let age = 0; age < this.rows; age++) {
				const a = age === 0 ? this.rows : (this.newest - age + 1 + this.rows) % this.rows;
				const b = (this.newest - age + this.rows) % this.rows;
				for (let col = 0; col < this.cols - 1; col++) {
					const i = base + a * this.cols + col,
						j = base + b * this.cols + col;
					if (
						!this.attached[i] ||
						!this.attached[j] ||
						!this.attached[i + 1] ||
						!this.attached[j + 1]
					)
						this.openStrip[col] = 0;
					if (!this.openStrip[col]) continue;
					this.indices.set([i, j, i + 1, i + 1, j, j + 1], index);
					index += 6;
				}
			}
		}
		this.indexCount = index;
		this.normals.fill(0);
		for (let i = 0; i < index; i += 3) {
			const a = this.indices[i] * 3,
				b = this.indices[i + 1] * 3,
				c = this.indices[i + 2] * 3;
			const ax = p[b] - p[a],
				ay = p[b + 1] - p[a + 1],
				az = p[b + 2] - p[a + 2];
			const bx = p[c] - p[a],
				by = p[c + 1] - p[a + 1],
				bz = p[c + 2] - p[a + 2];
			const nx = ay * bz - az * by,
				ny = az * bx - ax * bz,
				nz = ax * by - ay * bx;
			for (const k of [a, b, c]) {
				this.normals[k] += nx;
				this.normals[k + 1] += ny;
				this.normals[k + 2] += nz;
			}
		}
		for (let k = 0; k < this.normals.length; k += 3) {
			const length = Math.hypot(this.normals[k], this.normals[k + 1], this.normals[k + 2]);
			if (length > 1e-9) for (let j = 0; j < 3; j++) this.normals[k + j] /= length;
			else this.normals[k + 1] = 1;
		}
		this.newest = (this.newest + 1) % this.rows;
	}

	private sampleInlet(patch: number, fluid: Fluid, dt: number) {
		const drink = this.drink!,
			config = PATCHES[patch];
		const nx = Math.cos(config.angle),
			nz = Math.sin(config.angle);
		for (let col = 0; col < this.cols; col++) {
			const side = (col / (this.cols - 1) - 0.5) * config.width * drink.height;
			const radius = radiusAt(drink, this.level) + drink.height * 0.035;
			const x = drink.x + nx * radius - nz * side,
				z = drink.z + nz * radius + nx * side;
			let weight = 0,
				energy = 0,
				tangent = 0;
			for (let i = 0; i < fluid.count; i++) {
				const k = i * 3;
				const dx = fluid.position[k] - x,
					dy = fluid.position[k + 1] - this.level,
					dz = fluid.position[k + 2] - z;
				const kernel = Math.max(
					0,
					1 - (dx * dx + dz * dz + 0.5 * dy * dy) / (drink.height * drink.height * 0.085)
				);
				const w = kernel * kernel;
				const up = Math.max(0, fluid.velocity[k + 1]);
				const incoming = Math.max(0, -fluid.velocity[k] * nx - fluid.velocity[k + 2] * nz);
				weight += w;
				energy += w * (up * up + incoming * incoming);
				tangent += w * (-fluid.velocity[k] * nz + fluid.velocity[k + 2] * nx);
			}
			const a = 1 - Math.exp(-dt / 0.12),
				index = patch * this.cols + col;
			const target =
				weight > 0.001
					? Math.min(fluid.speed, Math.sqrt(energy / weight)) * Math.min(1, weight / 1.5)
					: 0;
			this.entrySpeed[index] += (target - this.entrySpeed[index]) * a;
			this.entryTangent[index] +=
				((weight > 0.001 ? tangent / weight : 0) - this.entryTangent[index]) * a;
		}
	}

	get maxHeight() {
		let height = 0;
		for (let i = 0; i < this.indexCount; i++)
			height = Math.max(height, this.vertices[this.indices[i] * 3 + 1] - this.level);
		return height;
	}
}
