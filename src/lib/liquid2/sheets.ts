// Lagrangian thin sheets resolve the free surface after impact. New material enters
// at the pool; each row keeps its own momentum, falls under gravity and collides
// with the fitted cup. The row lattice preserves a continuous, sub-particle film.
// A compliant material lattice now follows the resolved flow directly. Stretch
// constraints preserve its connected foot; capillary tension rounds free edges.
import { radiusAt, type Drink } from './scene';
import { GRAVITY, type ShallowWater } from './shallow-water';
import type { Fluid } from './fluid';

const PATCHES = [
	{ angle: Math.PI * 0.94, width: 0.46, length: 1.6 },
	{ angle: -Math.PI * 0.12, width: 0.38, length: 1.65 },
	{ angle: Math.PI * 1.26, width: 0.22, length: 1.2 },
	{ angle: Math.PI * 0.28, width: 0.22, length: 1.1 }
] as const;

export class ThinSheets {
	readonly vertices: Float32Array;
	readonly normals: Float32Array;
	readonly areas: Float32Array;
	readonly referenceAreas: Float32Array;
	readonly indices: Uint32Array;
	readonly indexCount: number;
	exposedHeight = 0;
	private readonly velocity: Float32Array;
	private readonly old: Float32Array;
	private readonly pressure = new Float64Array(5);
	private readonly inlet: Float32Array;
	readonly rows: number;
	readonly cols: number;
	private drink: Drink | null = null;
	private remainder = 0;
	private level = 0;

	constructor(coarse: boolean) {
		this.rows = coarse ? 14 : 26;
		this.cols = coarse ? 7 : 13;
		this.inlet = new Float32Array(PATCHES.length * this.cols * 3);
		this.vertices = new Float32Array(PATCHES.length * this.rows * this.cols * 3);
		this.velocity = new Float32Array(this.vertices.length);
		this.old = new Float32Array(this.vertices.length);
		this.normals = new Float32Array(this.vertices.length);
		this.areas = new Float32Array(this.vertices.length / 3);
		this.referenceAreas = new Float32Array(this.areas.length);
		for (let patch = 0; patch < PATCHES.length; patch++)
			for (let row = 0; row < this.rows; row++)
				for (let col = 0; col < this.cols; col++) {
					this.referenceAreas[(patch * this.rows + row) * this.cols + col] =
						((PATCHES[patch].length * PATCHES[patch].width) / ((this.rows - 1) * (this.cols - 1))) *
						(row === 0 || row === this.rows - 1 ? 0.5 : 1) *
						(col === 0 || col === this.cols - 1 ? 0.5 : 1);
				}
		this.indices = new Uint32Array(PATCHES.length * (this.rows - 1) * (this.cols - 1) * 6);
		let index = 0;
		for (let patch = 0; patch < PATCHES.length; patch++)
			for (let row = 0; row < this.rows - 1; row++)
				for (let col = 0; col < this.cols - 1; col++) {
					const a = (patch * this.rows + row) * this.cols + col,
						b = a + this.cols;
					this.indices.set([a, b, a + 1, a + 1, b, b + 1], index);
					index += 6;
				}
		this.indexCount = index;
	}

	layout(drink: Drink | null) {
		const previous = this.drink;
		this.drink = drink;
		if (!drink) {
			this.vertices.fill(0);
			this.velocity.fill(0);
			this.normals.fill(0);
			this.areas.fill(0);
			this.remainder = 0;
			this.exposedHeight = 0;
			return;
		}
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
				for (let row = 0; row < this.rows; row++)
					for (let col = 0; col < this.cols; col++) {
						const angle = this.angle(patch, col),
							radius = radiusAt(drink, this.level) + drink.height * (0.035 + row * 0.008);
						const k = ((patch * this.rows + row) * this.cols + col) * 3;
						this.vertices.set(
							[drink.x + Math.cos(angle) * radius, this.level, drink.z + Math.sin(angle) * radius],
							k
						);
					}
		}
		this.updateNormals();
		this.exposedHeight = this.maxHeight;
	}

	private angle(patch: number, col: number) {
		const radius = radiusAt(this.drink!, this.level) + this.drink!.height * 0.035;
		return (
			PATCHES[patch].angle +
			((col / (this.cols - 1) - 0.5) * PATCHES[patch].width * this.drink!.height) / radius
		);
	}

	advance(dt: number, fluid: Fluid, field: ShallowWater, level: number) {
		if (!this.drink || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(level)) return;
		const fixed = 1 / 60;
		this.remainder = Math.min(this.remainder + dt, fixed * 2);
		if (this.remainder < fixed) return;
		this.remainder -= fixed;
		this.level = level;
		this.step(fixed, fluid, field);
	}

	private step(dt: number, fluid: Fluid, field: ShallowWater) {
		const p = this.vertices,
			v = this.velocity,
			drink = this.drink!,
			h = drink.height;
		this.old.set(p);
		for (let patch = 0; patch < PATCHES.length; patch++)
			for (let col = 0; col < this.cols; col++) {
				const angle = this.angle(patch, col),
					radius = radiusAt(drink, this.level) + h * 0.035,
					cos = Math.cos(angle),
					sin = Math.sin(angle),
					x = drink.x + cos * radius,
					z = drink.z + sin * radius;
				fluid.sampleVelocity(x, this.level - h * 0.03, z, this.pressure);
				const index = (patch * this.cols + col) * 3;
				const incident = fluid.incidentHeadAt(x, z);
				const traction = cos * cos;
				const incoming = incident * traction;
				const budget = Math.max(incoming, this.inlet[index] * Math.exp(-dt / 0.12));
				this.inlet[index] = Math.min(Math.max(this.pressure[4] * traction, incoming), budget);
				this.inlet[index + 1] = 1 - Math.exp(-32 * Math.min(1, this.pressure[3] / 0.25) * dt);
				this.inlet[index + 2] = radius * (-this.pressure[0] * sin + this.pressure[2] * cos);
				// Longitudinal constraints never move the anchored foot. Pin it once per step.
				const foot = (patch * this.rows * this.cols + col) * 3;
				p[foot] = x;
				p[foot + 2] = z;
				p[foot + 1] = this.level + field.sample(p[foot], p[foot + 2]);
			}
		for (let patch = 0; patch < PATCHES.length; patch++)
			for (let row = 1; row < this.rows; row++)
				for (let col = 0; col < this.cols; col++) {
					const k = ((patch * this.rows + row) * this.cols + col) * 3;
					const dx = p[k] - drink.x,
						dz = p[k + 2] - drink.z;
					const radius = Math.max(1e-6, Math.sqrt(dx * dx + dz * dz));
					const nx = dx / radius,
						nz = dz / radius;
					const inlet = (patch * this.cols + col) * 3;
					// Bernoulli pressure supplies the wall film's momentum. Gravity consumes
					// that kinetic head as it climbs; the unsupported lip remains free to fall.
					const across = (col / (this.cols - 1)) * 2 - 1;
					const energy =
						0.8 *
						Math.min(fluid.speed * fluid.speed, this.inlet[inlet]) *
						Math.max(0, 1 - across * across) ** 2;
					const available = energy - 2 * GRAVITY * Math.max(0, p[k + 1] - this.level);
					const upward = Math.sqrt(Math.max(0, available));
					const drag = available > 0 ? this.inlet[inlet + 1] : 0;
					// Wall shear slows azimuthal transport while retaining upward run-up.
					const tangent = (0.18 * this.inlet[inlet + 2]) / radius;
					const radial =
						(Math.max(0, v[k + 1]) * (drink.radius - (drink.baseRadius ?? drink.radius))) / h;
					v[k] += (nx * radial - nz * tangent - v[k]) * drag;
					v[k + 1] += (upward - v[k + 1]) * drag;
					v[k + 2] += (nz * radial + nx * tangent - v[k + 2]) * drag;
					v[k + 1] -= GRAVITY * dt;
					// Capillary curvature exchanges momentum across neighbouring material nodes.
					for (let j = 0; j < 3; j++) {
						let sum = this.old[k - this.cols * 3 + j],
							count = 1;
						if (row + 1 < this.rows) {
							sum += this.old[k + this.cols * 3 + j];
							count++;
						}
						if (col > 0) {
							sum += this.old[k - 3 + j];
							count++;
						}
						if (col + 1 < this.cols) {
							sum += this.old[k + 3 + j];
							count++;
						}
						v[k + j] += (sum / count - this.old[k + j]) * 18 * dt;
						p[k + j] += v[k + j] * dt;
					}
				}
		for (let iteration = 0; iteration < 4; iteration++) {
			for (let patch = 0; patch < PATCHES.length; patch++) {
				for (let row = 1; row < this.rows; row++)
					for (let col = 0; col < this.cols; col++) {
						const k = ((patch * this.rows + row) * this.cols + col) * 3;
						this.edge(
							k - this.cols * 3,
							k,
							(PATCHES[patch].length * h) / (this.rows - 1),
							row === 1
						);
						this.collide(k, field);
					}
			}
		}
		const speedLimit = 10 * Math.sqrt(h);
		this.exposedHeight = 0;
		for (let patch = 0; patch < PATCHES.length; patch++)
			for (let row = 1; row < this.rows; row++)
				for (let col = 0; col < this.cols; col++)
					this.exposedHeight = Math.max(
						this.exposedHeight,
						this.collide(((patch * this.rows + row) * this.cols + col) * 3, field)
					);
		for (let k = 0; k < v.length; k++)
			v[k] = Math.max(-speedLimit, Math.min(speedLimit, (p[k] - this.old[k]) / dt));
		this.updateNormals();
	}

	private edge(a: number, b: number, rest: number, anchored: boolean) {
		const p = this.vertices,
			dx = p[b] - p[a],
			dy = p[b + 1] - p[a + 1],
			dz = p[b + 2] - p[a + 2];
		const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
		const target = Math.min(rest * 1.12, length);
		if (length < 1e-8 || length === target) return;
		const correction = ((length - target) / length) * (anchored ? 1 : 0.5);
		for (let j = 0; j < 3; j++) {
			const d = (j === 0 ? dx : j === 1 ? dy : dz) * correction;
			p[b + j] -= d;
			if (!anchored) p[a + j] += d;
		}
	}

	private collide(k: number, field: ShallowWater) {
		const p = this.vertices,
			drink = this.drink!;
		const dx = p[k] - drink.x,
			dz = p[k + 2] - drink.z;
		const r2 = dx * dx + dz * dz;
		const solid = radiusAt(drink, p[k + 1]) + drink.height * 0.018;
		if (field.obstacle && p[k + 1] < drink.baseY + drink.height && r2 < solid * solid) {
			const r = Math.sqrt(r2);
			p[k] = drink.x + (r > 1e-6 ? dx / r : -1) * solid;
			p[k + 2] = drink.z + (r > 1e-6 ? dz / r : 0) * solid;
		}
		const pool = this.level + field.sample(p[k], p[k + 2]);
		p[k + 1] = Math.max(pool, p[k + 1]);
		return p[k + 1] - pool;
	}

	private updateNormals() {
		const p = this.vertices,
			n = this.normals;
		n.fill(0);
		this.areas.fill(0);
		for (let i = 0; i < this.indexCount; i += 3) {
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
			const area = Math.sqrt(nx * nx + ny * ny + nz * nz) / 6;
			for (let corner = 0; corner < 3; corner++) {
				const k = this.indices[i + corner] * 3;
				this.areas[k / 3] += area;
				n[k] += nx;
				n[k + 1] += ny;
				n[k + 2] += nz;
			}
		}
		for (let k = 0; k < n.length; k += 3) {
			const length = Math.sqrt(n[k] * n[k] + n[k + 1] * n[k + 1] + n[k + 2] * n[k + 2]);
			if (length > 1e-9) for (let j = 0; j < 3; j++) n[k + j] /= length;
			else n[k + 1] = 1;
		}
	}

	get maxHeight() {
		let height = 0;
		for (let k = 1; k < this.vertices.length; k += 3)
			height = Math.max(height, this.vertices[k] - this.level);
		return height;
	}
}
