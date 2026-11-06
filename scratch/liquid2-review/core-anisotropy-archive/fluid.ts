// Local position-based fluid for impact against the drink. A bounded reservoir feeds a
// thin, wide incoming sheet; density constraints, gravity, viscosity and the solid cylinder determine
// its shape. Rendering receives a volume of particles, never a prescribed splash mesh.

import { radiusAt, type Drink } from './scene';
import { GRAVITY, MAX_SUBSTEPS, SIM_STEP, type ShallowWater } from './shallow-water';

const STRIDE = 3;
const MAX_NEIGHBOURS = 80;
const FLUID_STEP = 1 / 60;
const NX = 48,
	NY = 28,
	NZ = 40;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Principal directions of a local parcel neighbourhood. Flattening a reconstruction
// kernel along its least-supported direction preserves a thin sheet instead of
// inflating every parcel into a round bead. This does not change the physics state.
function kernelShape(
	covariance: Float64Array,
	basis: Float64Array,
	spacing: number,
	out: Float32Array,
	offset: number
) {
	basis.fill(0);
	basis[0] = basis[4] = basis[8] = 1;
	for (let sweep = 0; sweep < 4; sweep++) {
		for (let p = 0; p < 2; p++)
			for (let q = p + 1; q < 3; q++) {
				const cross = covariance[p * 3 + q];
				if (Math.abs(cross) < spacing * spacing * 1e-7) continue;
				const theta = (covariance[q * 3 + q] - covariance[p * 3 + p]) / (2 * cross);
				const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
				const c = 1 / Math.sqrt(1 + t * t),
					s = t * c;
				covariance[p * 3 + p] -= t * cross;
				covariance[q * 3 + q] += t * cross;
				covariance[p * 3 + q] = covariance[q * 3 + p] = 0;
				for (let r = 0; r < 3; r++) {
					if (r !== p && r !== q) {
						const a = covariance[r * 3 + p],
							b = covariance[r * 3 + q];
						covariance[r * 3 + p] = covariance[p * 3 + r] = c * a - s * b;
						covariance[r * 3 + q] = covariance[q * 3 + r] = s * a + c * b;
					}
					const a = basis[r * 3 + p],
						b = basis[r * 3 + q];
					basis[r * 3 + p] = c * a - s * b;
					basis[r * 3 + q] = s * a + c * b;
				}
			}
	}
	const largest = Math.max(covariance[0], covariance[4], covariance[8], spacing * spacing * 0.2);
	for (let r = 0; r < 3; r++)
		for (let c = 0; c < 3; c++) {
			let value = 0;
			for (let axis = 0; axis < 3; axis++) {
				const stretch = clamp(
					1.35 * Math.sqrt(Math.max(0, covariance[axis * 4]) / largest),
					0.4,
					1.35
				);
				value += (basis[r * 3 + axis] * basis[c * 3 + axis]) / stretch;
			}
			out[offset + r * 3 + c] = value;
		}
}

// Integral of the poly6 kernel inside a solid half-space. Restoring this missing
// boundary density prevents low-resolution fluid from collapsing into clumps at walls.
function boundaryCap(distance: number, h: number, out: Float64Array) {
	if (distance >= h) {
		out[0] = 0;
		out[1] = 0;
		return;
	}
	const a = clamp(distance / h, 0, 1),
		a2 = a * a;
	const integral = a * (1 - a2 * (4 / 3 - a2 * (6 / 5 - a2 * (4 / 7 - a2 / 9))));
	out[0] = (128 / 315 - integral) / (256 / 315);
	const edge = 1 - a2;
	out[1] = (-edge * edge * edge * edge) / ((256 / 315) * h);
}

export class Fluid {
	readonly position: Float32Array;
	readonly velocity: Float32Array;
	readonly densitySamples: Float32Array;
	readonly densityKernels: Float32Array;
	readonly volumeResolution: readonly [number, number, number];
	readonly volumeOrigin = new Float32Array(3);
	readonly volumeExtent = new Float32Array([1, 1, 1]);
	count = 0;
	renderCount = 0;
	speed = 0;
	radius = 0;
	private drink: Drink | null = null;
	private readonly predicted: Float32Array;
	private readonly old: Float32Array;
	private readonly correction: Float32Array;
	private readonly lambda: Float32Array;
	private readonly pressureHead: Float32Array;
	private readonly surfaceDensity: Float32Array;
	private readonly kernels: Float32Array;
	private readonly covariance = new Float64Array(9);
	private readonly basis = new Float64Array(9);
	private readonly boundaryGradient: Float32Array;
	private readonly boundarySample = new Float64Array(2);
	private readonly age: Float32Array;
	private readonly neighbours: Int32Array;
	private readonly neighbourCount: Uint8Array;
	private readonly heads = new Int32Array(NX * NY * NZ);
	private readonly next: Int32Array;
	private readonly connected: Uint8Array;
	private readonly queue: Int32Array;
	private h = 0;
	private surfaceSupport = 0;
	private spacing = 0;
	private restDensity = 1;
	private emission = 0;
	private phase = 0;
	private remainder = 0;
	private level = 0;
	private seed = 0x193ab;
	private readonly origin = [0, 0, 0];

	constructor(readonly capacity: number) {
		this.heads.fill(-1);
		this.position = new Float32Array(capacity * STRIDE);
		this.velocity = new Float32Array(capacity * STRIDE);
		this.predicted = new Float32Array(capacity * STRIDE);
		this.old = new Float32Array(capacity * STRIDE);
		this.correction = new Float32Array(capacity * STRIDE);
		this.densitySamples = new Float32Array(capacity * 4);
		this.densityKernels = new Float32Array(capacity * 9);
		this.kernels = new Float32Array(capacity * 9);
		this.volumeResolution = capacity <= 768 ? [96, 80, 80] : [112, 96, 96];
		this.lambda = new Float32Array(capacity);
		this.pressureHead = new Float32Array(capacity);
		this.surfaceDensity = new Float32Array(capacity);
		this.boundaryGradient = new Float32Array(capacity * 3);
		this.age = new Float32Array(capacity);
		this.neighbours = new Int32Array(capacity * MAX_NEIGHBOURS);
		this.neighbourCount = new Uint8Array(capacity);
		this.next = new Int32Array(capacity);
		this.connected = new Uint8Array(capacity);
		this.queue = new Int32Array(capacity);
	}

	layout(drink: Drink | null) {
		if (drink && this.drink) {
			const scale = drink.height / this.drink.height;
			for (let i = 0; i < this.count; i++) {
				const k = i * 3;
				this.position[k] = drink.x + (this.position[k] - this.drink.x) * scale;
				this.position[k + 1] = this.level + (this.position[k + 1] - this.level) * scale;
				this.position[k + 2] = drink.z + (this.position[k + 2] - this.drink.z) * scale;
				for (let j = 0; j < 3; j++) this.velocity[k + j] *= Math.sqrt(scale);
			}
			this.speed *= Math.sqrt(scale);
			this.old.set(this.position);
		}
		this.drink = drink;
		if (!drink) {
			this.count = 0;
			this.renderCount = 0;
			return;
		}
		const coarse = this.capacity <= 768;
		this.spacing = drink.height * (coarse ? 0.065 : 0.055);
		this.h = this.spacing * 2.3;
		this.surfaceSupport = this.spacing * 1.6;
		this.radius = this.spacing * 0.52;
		this.volumeOrigin.set([
			drink.x - drink.height * 1.6,
			this.level - drink.height * 0.25,
			drink.z - drink.height * 1.3
		]);
		this.volumeExtent.set([drink.height * 3.4, drink.height * 2.5, drink.height * 2.6]);
		let density = 0;
		for (let z = -3; z <= 3; z++)
			for (let y = -3; y <= 3; y++)
				for (let x = -3; x <= 3; x++) {
					const q = ((x * x + y * y + z * z) * this.spacing * this.spacing) / (this.h * this.h);
					if (q < 1) density += Math.pow(1 - q, 3);
				}
		this.restDensity = density;
	}

	private random() {
		this.seed ^= this.seed << 13;
		this.seed ^= this.seed >>> 17;
		this.seed ^= this.seed << 5;
		return (this.seed >>> 0) / 4294967296;
	}

	advance(dt: number, drive: number, field: ShallowWater, level: number) {
		if (!this.drink || !Number.isFinite(dt) || dt <= 0) return;
		const force = Number.isFinite(drive) ? clamp(drive, 0, 1) : 0;
		this.level = level;
		this.remainder = Math.min(this.remainder + dt, MAX_SUBSTEPS * SIM_STEP);
		while (this.remainder >= FLUID_STEP) {
			this.remainder -= FLUID_STEP;
			this.step(FLUID_STEP, force, field);
		}
		this.prepareRender();
	}

	private inletSpeed(side: number, across: number) {
		const profile = 0.25 + 0.75 * Math.sqrt(Math.max(0, 1 - across * across));
		const packet = 0.1 + 0.9 * Math.max(0, Math.sin(this.phase + side * 0.75 + across * 0.4));
		return this.speed * packet * profile;
	}

	/** Incoming kinetic head before impact dissipates the resolved normal velocity. */
	incidentHeadAt(x: number, z: number) {
		if (!this.drink || !Number.isFinite(x) || !Number.isFinite(z)) return 0;
		const side = x < this.drink.x ? -1 : 1;
		const width = Math.max(2, Math.floor((this.drink.radius * 2.6) / this.spacing)) * this.spacing;
		const across = clamp((2 * (z - this.drink.z + this.drink.radius * 0.2)) / width, -1, 1);
		const normal = this.inletSpeed(side, across) * 0.95 * (side < 0 ? 1 : 0.82);
		return normal * normal;
	}

	private emit(dt: number) {
		const drink = this.drink!;
		if (this.speed < 0.08) return;
		this.emission += (0.9 * this.speed * dt) / this.spacing;
		const columns = Math.min(3, Math.floor(this.emission));
		this.emission -= columns;
		const width = Math.max(2, Math.floor((drink.radius * 2.6) / this.spacing));
		for (let x = 0; x < columns; x++)
			for (const side of [-1, 1])
				for (let layer = 0; layer < 2; layer++)
					for (let z = 0; z <= width; z++) {
						if (this.count >= this.capacity) return;
						const px = drink.x + side * (drink.radius * 1.5 + x * this.spacing);
						const py =
							this.level -
							drink.height * 0.18 +
							this.radius +
							layer * this.spacing +
							drink.height * 0.001;
						const pz = drink.z - drink.radius * 0.2 + (z - width * 0.5) * this.spacing;
						let occupied = false;
						for (let j = 0; j < this.count && !occupied; j++) {
							const dx = this.position[j * 3] - px,
								dy = this.position[j * 3 + 1] - py,
								dz = this.position[j * 3 + 2] - pz;
							occupied = dx * dx + dy * dy + dz * dz < this.spacing * this.spacing * 0.85;
						}
						// A blocked inlet cannot create overlapping mass. Pressure may stop new emission,
						// while the existing fluid continues to receive the incoming momentum.
						if (occupied) continue;
						const i = this.count++,
							k = i * 3;
						this.position[k] = px;
						this.position[k + 1] = py;
						this.position[k + 2] = pz;
						const across = (z / width) * 2 - 1;
						const incoming = this.inletSpeed(side, across);
						this.velocity[k] = -side * incoming * 0.95 * (side < 0 ? 1 : 0.82);
						// An approaching crest carries upward orbital momentum as well as forward
						// flow. The collision and gravity determine where that momentum goes next.
						const crossWave = Math.cos((z / width) * Math.PI * 3.2 + side * 0.8);
						this.velocity[k + 1] = incoming * (0.2 + 0.1 * crossWave);
						this.velocity[k + 2] = (this.random() - 0.5) * incoming * 0.035;
						this.age[i] = 0;
					}
	}

	private step(dt: number, drive: number, field: ShallowWater) {
		const drink = this.drink!,
			scale = drink.height;
		this.speed = clamp(
			this.speed + (2.4 * GRAVITY * drive - (0.45 * this.speed * this.speed) / scale) * dt,
			0,
			Math.sqrt(5 * GRAVITY * scale)
		);
		// A gravity-wave boundary supplies finite crests rather than a steady jet.
		// Its wavelength is four drink heights; the solver owns every later trajectory.
		this.phase +=
			Math.sqrt((Math.PI * GRAVITY) / (2 * scale)) *
			dt *
			Math.min(1, this.speed / Math.sqrt(GRAVITY * scale));
		this.emit(dt);
		for (let i = 0; i < this.count;) {
			const k = i * 3;
			this.age[i] += dt;
			const underground = this.position[k + 1] < this.level - scale * 0.025 && this.age[i] > 0.18;
			const outside =
				Math.abs(this.position[k] - drink.x) > scale * 2.8 ||
				Math.abs(this.position[k + 2] - drink.z) > scale * 2.4 ||
				this.age[i] > 3;
			if (underground || outside) {
				const last = --this.count;
				for (let j = 0; j < 3; j++) {
					this.position[k + j] = this.position[last * 3 + j];
					this.velocity[k + j] = this.velocity[last * 3 + j];
				}
				this.age[i] = this.age[last];
				continue;
			}
			this.velocity[k + 1] -= GRAVITY * dt;
			for (let j = 0; j < 3; j++) {
				this.old[k + j] = this.position[k + j];
				this.predicted[k + j] = this.position[k + j] + this.velocity[k + j] * dt;
			}
			this.collide(k, field);
			i++;
		}
		this.hash();
		this.findNeighbours();
		this.pressureHead.fill(0, 0, this.count);
		for (let iteration = 0; iteration < (this.capacity <= 768 ? 2 : 3); iteration++)
			this.constrain(field);
		for (let i = 0; i < this.count; i++) {
			const k = i * 3;
			for (let j = 0; j < 3; j++) {
				this.velocity[k + j] = clamp(
					(this.predicted[k + j] - this.old[k + j]) / dt,
					-10 * Math.sqrt(scale),
					10 * Math.sqrt(scale)
				);
				this.position[k + j] = this.predicted[k + j];
			}
		}
		// XSPH viscosity damps relative velocity while preserving the stream's momentum.
		this.reconstructKernels();
		const inverseSurfaceSupport2 = 1 / (this.surfaceSupport * this.surfaceSupport);
		for (let i = 0; i < this.count; i++) {
			let surfaceDensity = 1;
			let vx = 0,
				vy = 0,
				vz = 0,
				weight = 0,
				cx = 0,
				cy = 0,
				cz = 0;
			const k = i * 3;
			for (let n = 0; n < this.neighbourCount[i]; n++) {
				const j = this.neighbours[i * MAX_NEIGHBOURS + n] * 3;
				const dx = this.position[k] - this.position[j],
					dy = this.position[k + 1] - this.position[j + 1],
					dz = this.position[k + 2] - this.position[j + 2];
				const q = (dx * dx + dy * dy + dz * dz) / (this.h * this.h);
				const kernel = Math.max(0, 1 - q);
				const w = kernel * kernel * kernel;
				vx += this.velocity[j] * w;
				vy += this.velocity[j + 1] * w;
				vz += this.velocity[j + 2] * w;
				weight += w;
				const r2 = dx * dx + dy * dy + dz * dz;
				const a = i * 9,
					transform = this.kernels;
				const tx = transform[a] * dx + transform[a + 1] * dy + transform[a + 2] * dz;
				const ty = transform[a + 3] * dx + transform[a + 4] * dy + transform[a + 5] * dz;
				const tz = transform[a + 6] * dx + transform[a + 7] * dy + transform[a + 8] * dz;
				const surfaceKernel = Math.max(
					0,
					1 - (tx * tx + ty * ty + tz * tz) * inverseSurfaceSupport2
				);
				surfaceDensity += surfaceKernel * surfaceKernel * surfaceKernel;
				if (r2 > this.spacing * this.spacing && w > 0) {
					const cohesion = (-0.3 * GRAVITY * dt * w) / (Math.sqrt(r2) * this.restDensity);
					cx += cohesion * dx;
					cy += cohesion * dy;
					cz += cohesion * dz;
				}
			}
			this.surfaceDensity[i] = surfaceDensity;
			this.correction[k] = cx + (weight ? (vx / weight - this.velocity[k]) * 0.1 : 0);
			this.correction[k + 1] = cy + (weight ? (vy / weight - this.velocity[k + 1]) * 0.1 : 0);
			this.correction[k + 2] = cz + (weight ? (vz / weight - this.velocity[k + 2]) * 0.1 : 0);
		}
		for (let i = 0; i < this.count * 3; i++) this.velocity[i] += this.correction[i];
	}

	private reconstructKernels() {
		for (let i = 0; i < this.count; i++) {
			const covariance = this.covariance;
			covariance.fill(0);
			let weight = 1,
				mx = 0,
				my = 0,
				mz = 0;
			const k = i * 3;
			for (let n = 0; n < this.neighbourCount[i]; n++) {
				const j = this.neighbours[i * MAX_NEIGHBOURS + n] * 3;
				const dx = this.position[j] - this.position[k],
					dy = this.position[j + 1] - this.position[k + 1],
					dz = this.position[j + 2] - this.position[k + 2];
				const w = Math.max(0, 1 - (dx * dx + dy * dy + dz * dz) / (this.h * this.h));
				weight += w;
				mx += w * dx;
				my += w * dy;
				mz += w * dz;
				covariance[0] += w * dx * dx;
				covariance[1] += w * dx * dy;
				covariance[2] += w * dx * dz;
				covariance[4] += w * dy * dy;
				covariance[5] += w * dy * dz;
				covariance[8] += w * dz * dz;
			}
			mx /= weight;
			my /= weight;
			mz /= weight;
			covariance[0] = covariance[0] / weight - mx * mx;
			covariance[1] = covariance[3] = covariance[1] / weight - mx * my;
			covariance[2] = covariance[6] = covariance[2] / weight - mx * mz;
			covariance[4] = covariance[4] / weight - my * my;
			covariance[5] = covariance[7] = covariance[5] / weight - my * mz;
			covariance[8] = covariance[8] / weight - mz * mz;
			if (this.neighbourCount[i] === 0) {
				this.kernels.fill(0, i * 9, i * 9 + 9);
				this.kernels[i * 9] = this.kernels[i * 9 + 4] = this.kernels[i * 9 + 8] = 1 / 0.65;
			} else kernelShape(covariance, this.basis, this.spacing, this.kernels, i * 9);
		}
	}

	private collide(k: number, field: ShallowWater) {
		const drink = this.drink!,
			p = this.predicted;
		const floor = this.level + field.sample(p[k], p[k + 2]) - drink.height * 0.18 + this.radius;
		p[k + 1] = Math.max(floor, p[k + 1]);
		if (!field.obstacle) return;
		const dx = p[k] - drink.x,
			dz = p[k + 2] - drink.z;
		const r = Math.sqrt(dx * dx + dz * dz);
		const rim = drink.baseY + drink.height + this.radius;
		const solidRadius = radiusAt(drink, p[k + 1]) + this.radius;
		if (r >= solidRadius || p[k + 1] >= rim || p[k + 1] < drink.baseY - this.radius) return;
		if (rim - p[k + 1] < solidRadius - r) p[k + 1] = rim;
		else {
			p[k] = drink.x + (r > 1e-6 ? dx / r : -1) * solidRadius;
			p[k + 2] = drink.z + (r > 1e-6 ? dz / r : 0) * solidRadius;
		}
	}

	private hash() {
		const drink = this.drink!;
		this.origin[0] = drink.x - this.h * NX * 0.5;
		this.origin[1] = this.level - drink.height * 0.3;
		this.origin[2] = drink.z - this.h * NZ * 0.5;
		this.heads.fill(-1);
		for (let i = 0; i < this.count; i++) {
			const k = i * 3;
			const x = clamp(Math.floor((this.predicted[k] - this.origin[0]) / this.h), 0, NX - 1);
			const y = clamp(Math.floor((this.predicted[k + 1] - this.origin[1]) / this.h), 0, NY - 1);
			const z = clamp(Math.floor((this.predicted[k + 2] - this.origin[2]) / this.h), 0, NZ - 1);
			const cell = (z * NY + y) * NX + x;
			this.next[i] = this.heads[cell];
			this.heads[cell] = i;
		}
	}

	private findNeighbours() {
		const p = this.predicted,
			h2 = this.h * this.h;
		for (let i = 0; i < this.count; i++) {
			const k = i * 3;
			const cx = Math.floor((p[k] - this.origin[0]) / this.h),
				cy = Math.floor((p[k + 1] - this.origin[1]) / this.h),
				cz = Math.floor((p[k + 2] - this.origin[2]) / this.h);
			let count = 0;
			for (let z = Math.max(0, cz - 1); z <= Math.min(NZ - 1, cz + 1); z++)
				for (let y = Math.max(0, cy - 1); y <= Math.min(NY - 1, cy + 1); y++)
					for (let x = Math.max(0, cx - 1); x <= Math.min(NX - 1, cx + 1); x++)
						for (
							let j = this.heads[(z * NY + y) * NX + x];
							j >= 0 && count < MAX_NEIGHBOURS;
							j = this.next[j]
						) {
							if (j === i) continue;
							const o = j * 3,
								dx = p[k] - p[o],
								dy = p[k + 1] - p[o + 1],
								dz = p[k + 2] - p[o + 2];
							if (dx * dx + dy * dy + dz * dz < h2)
								this.neighbours[i * MAX_NEIGHBOURS + count++] = j;
						}
			this.neighbourCount[i] = count;
		}
	}

	private constrain(field: ShallowWater) {
		const p = this.predicted,
			h2 = this.h * this.h,
			invDensity = 1 / this.restDensity;
		const inverseH2 = 1 / h2,
			gradientScale = -6 * inverseH2 * invDensity;
		for (let i = 0; i < this.count; i++) {
			const k = i * 3;
			const boundary = this.boundary(k, field);
			let density = 1 + boundary * this.restDensity,
				gx = this.boundaryGradient[k],
				gy = this.boundaryGradient[k + 1],
				gz = this.boundaryGradient[k + 2],
				squared = 0;
			for (let n = 0; n < this.neighbourCount[i]; n++) {
				const j = this.neighbours[i * MAX_NEIGHBOURS + n] * 3;
				const dx = p[k] - p[j],
					dy = p[k + 1] - p[j + 1],
					dz = p[k + 2] - p[j + 2];
				const w = Math.max(0, 1 - (dx * dx + dy * dy + dz * dz) * inverseH2);
				density += w * w * w;
				const grad = gradientScale * w * w;
				gx += grad * dx;
				gy += grad * dy;
				gz += grad * dz;
				squared += grad * grad * (dx * dx + dy * dy + dz * dz);
			}
			this.lambda[i] =
				-Math.max(0, density * invDensity - 1) /
				(squared + gx * gx + gy * gy + gz * gz + 0.002 / h2);
			this.pressureHead[i] -= (2 * this.lambda[i]) / (FLUID_STEP * FLUID_STEP);
		}
		for (let i = 0; i < this.count; i++) {
			const k = i * 3;
			let x = this.lambda[i] * this.boundaryGradient[k],
				y = this.lambda[i] * this.boundaryGradient[k + 1],
				z = this.lambda[i] * this.boundaryGradient[k + 2];
			for (let n = 0; n < this.neighbourCount[i]; n++) {
				const other = this.neighbours[i * MAX_NEIGHBOURS + n],
					j = other * 3;
				const dx = p[k] - p[j],
					dy = p[k + 1] - p[j + 1],
					dz = p[k + 2] - p[j + 2];
				const w = Math.max(0, 1 - (dx * dx + dy * dy + dz * dz) * inverseH2);
				const ratio = w / 0.91,
					square = ratio * ratio,
					fourth = square * square;
				const correction = 0.0002 * h2 * fourth * fourth * fourth;
				const force = (this.lambda[i] + this.lambda[other] - correction) * gradientScale * w * w;
				x += force * dx;
				y += force * dy;
				z += force * dz;
			}
			const length = Math.sqrt(x * x + y * y + z * z),
				cap = this.h * 0.25;
			const scale = length > cap ? cap / length : 1;
			this.correction[k] = x * scale;
			this.correction[k + 1] = y * scale;
			this.correction[k + 2] = z * scale;
		}
		for (let i = 0; i < this.count; i++) {
			for (let j = 0; j < 3; j++) p[i * 3 + j] += this.correction[i * 3 + j];
			this.collide(i * 3, field);
		}
	}

	private boundary(k: number, field: ShallowWater): number {
		const p = this.predicted,
			drink = this.drink!,
			result = this.boundarySample;
		const floor = this.level + field.sample(p[k], p[k + 2]) - drink.height * 0.18;
		boundaryCap(p[k + 1] - floor, this.h, result);
		let density = result[0],
			gx = 0,
			gy = result[1],
			gz = 0;
		const solid = field.obstacle;
		if (solid) {
			const dx = p[k] - solid.x,
				dz = p[k + 2] - solid.z;
			const radius = Math.sqrt(dx * dx + dz * dz);
			const rim = solid.baseY + solid.height;
			if (p[k + 1] >= solid.baseY && p[k + 1] <= rim && radius > 0.00001) {
				boundaryCap(radius - radiusAt(solid, p[k + 1]), this.h, result);
				density += result[0];
				gx += (result[1] * dx) / radius;
				gz += (result[1] * dz) / radius;
				gy -= (result[1] * (solid.radius - (solid.baseRadius ?? solid.radius))) / solid.height;
			} else if (radius < solid.radius && p[k + 1] > rim) {
				boundaryCap(p[k + 1] - rim, this.h, result);
				density += result[0];
				gy += result[1];
			}
		}
		this.boundaryGradient[k] = gx;
		this.boundaryGradient[k + 1] = gy;
		this.boundaryGradient[k + 2] = gz;
		return density;
	}

	private prepareRender() {
		// The pressure step's neighbourhood is also the fluid's connectivity graph.
		// Reusing it avoids a second spatial search just to prepare the same frame.
		this.connected.fill(0);
		let head = 0,
			tail = 0;
		for (let i = 0; i < this.count; i++)
			if (this.position[i * 3 + 1] <= this.level + this.surfaceSupport * 0.35) {
				this.connected[i] = 1;
				this.queue[tail++] = i;
			}
		while (head < tail) {
			const i = this.queue[head++];
			for (let n = 0; n < this.neighbourCount[i]; n++) {
				const j = this.neighbours[i * MAX_NEIGHBOURS + n];
				const dx = this.position[i * 3] - this.position[j * 3],
					dy = this.position[i * 3 + 1] - this.position[j * 3 + 1],
					dz = this.position[i * 3 + 2] - this.position[j * 3 + 2];
				const a = i * 9,
					b = j * 9,
					transform = this.kernels;
				const ax = transform[a] * dx + transform[a + 1] * dy + transform[a + 2] * dz;
				const ay = transform[a + 3] * dx + transform[a + 4] * dy + transform[a + 5] * dz;
				const az = transform[a + 6] * dx + transform[a + 7] * dy + transform[a + 8] * dz;
				const bx = transform[b] * dx + transform[b + 1] * dy + transform[b + 2] * dz;
				const by = transform[b + 3] * dx + transform[b + 4] * dy + transform[b + 5] * dz;
				const bz = transform[b + 6] * dx + transform[b + 7] * dy + transform[b + 8] * dz;
				if (
					!this.connected[j] &&
					Math.max(ax * ax + ay * ay + az * az, bx * bx + by * by + bz * bz) <
						1.44 * this.surfaceSupport * this.surfaceSupport
				) {
					this.connected[j] = 1;
					this.queue[tail++] = j;
				}
			}
		}
		this.renderCount = 0;
		const alpha = this.remainder / FLUID_STEP;
		let highest = this.level;
		for (let i = 0; i < this.count; i++) {
			if (!this.connected[i]) continue;
			const o = this.renderCount++ * 4;
			this.densitySamples[o] = this.old[i * 3] * (1 - alpha) + this.position[i * 3] * alpha;
			this.densitySamples[o + 1] =
				this.old[i * 3 + 1] * (1 - alpha) + this.position[i * 3 + 1] * alpha;
			this.densitySamples[o + 2] =
				this.old[i * 3 + 2] * (1 - alpha) + this.position[i * 3 + 2] * alpha;
			this.densitySamples[o + 3] = 1 / Math.max(1, this.surfaceDensity[i]);
			for (let j = 0; j < 9; j++)
				this.densityKernels[(this.renderCount - 1) * 9 + j] = this.kernels[i * 9 + j];
			highest = Math.max(highest, this.densitySamples[o + 1] + this.surfaceSupport);
		}

		const scale = this.drink!.height;
		this.volumeOrigin[1] = this.level - scale * 0.25;
		this.volumeExtent[1] = clamp(
			Math.ceil((highest - this.volumeOrigin[1] + scale * 0.1) / (scale * 0.25)) * scale * 0.25,
			scale * 0.75,
			scale * 2.5
		);
	}

	get smoothingRadius(): number {
		return this.surfaceSupport;
	}

	/** Sample the resolved flow for its sub-particle free-surface reconstruction. */
	sampleVelocity(x: number, y: number, z: number, out: Float64Array) {
		out.fill(0);
		if (!this.drink || this.count === 0) return;
		const cx = Math.floor((x - this.origin[0]) / this.h);
		const cy = Math.floor((y - this.origin[1]) / this.h);
		const cz = Math.floor((z - this.origin[2]) / this.h);
		for (let iz = Math.max(0, cz - 2); iz <= Math.min(NZ - 1, cz + 2); iz++)
			for (let iy = Math.max(0, cy - 2); iy <= Math.min(NY - 1, cy + 2); iy++)
				for (let ix = Math.max(0, cx - 2); ix <= Math.min(NX - 1, cx + 2); ix++)
					for (let i = this.heads[(iz * NY + iy) * NX + ix]; i >= 0; i = this.next[i]) {
						const k = i * 3,
							dx = this.position[k] - x,
							dy = this.position[k + 1] - y,
							dz = this.position[k + 2] - z;
						const kernel = Math.max(
							0,
							1 - (dx * dx + dy * dy + dz * dz) / (3.24 * this.h * this.h)
						);
						const w = kernel * kernel * kernel;
						for (let j = 0; j < 3; j++) out[j] += w * this.velocity[k + j];
						out[3] += w;
						// Total hydraulic head includes stagnation pressure and gravitational
						// potential relative to the pool, even where impact has stopped the flow.
						out[4] +=
							w *
							Math.max(
								0,
								this.velocity[k] ** 2 +
									Math.max(0, this.velocity[k + 1]) ** 2 +
									this.velocity[k + 2] ** 2 +
									this.pressureHead[i] +
									2 * GRAVITY * (this.position[k + 1] - this.level)
							);
					}
		if (out[3] > 0) {
			for (let j = 0; j < 3; j++) out[j] /= out[3];
			out[4] /= out[3];
		}
	}

	get maxHeight(): number {
		let height = 0;
		for (let i = 0; i < this.count; i++)
			height = Math.max(height, this.position[i * 3 + 1] - this.level);
		return height;
	}

	/** Highest connected fluid-parcel centre above the reservoir. */
	get visibleHeight(): number {
		let height = 0;
		for (let i = 0; i < this.renderCount; i++)
			height = Math.max(height, this.densitySamples[i * 4 + 1] - this.level);
		return height;
	}
}
