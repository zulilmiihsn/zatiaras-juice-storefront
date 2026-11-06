// Liquid 2 body: linearised shallow water on a staggered (Arakawa C) grid over the floor
// plane. Heights sit at cell centres, x velocities on x faces, z velocities on z faces.
// The drink is a solid cylinder: its cells hold no water and faces touching it carry no
// flow, so waves reflect, run up against it and close behind it. Edges are absorbing.
// Scroll drive feeds swells from the left and right edges in opposite phase and churns the
// surface; at rest only a seeded wind stirs it. Steps are fixed and seeded, like Liquid 1.

import { radiusAt, type Domain, type Drink, type Tier } from './scene';

export const SIM_STEP = 1 / 120;
export const MAX_SUBSTEPS = 8;

const WAVE_SPEED = 1.6;
export const GRAVITY = 9.8;
const DEPTH = (WAVE_SPEED * WAVE_SPEED) / GRAVITY;
/** Viscous juice: waves lose energy slowly everywhere, quickly in the edge sponge. */
const BODY_DAMPING = 0.25;
const EDGE_DAMPING = 7;
const SWELL_AMPLITUDE = 0.25;
const SWELL_HZ = 0.45;
/** Surface tension and viscosity: smooths grid-scale noise, leaves long swells alone. */
const DIFFUSION = 0.003;
const WIND_BUMPS = 3;
const WIND_AMPLITUDE = 0.0015;
/** Under scroll drive the whole surface churns: extra bumps per step and their height. */
const CHOP_BUMPS = 6;
const CHOP_AMPLITUDE = 0.02;

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export class ShallowWater {
	readonly cols: number;
	readonly rows: number;
	/** Surface offset from the mean level, per cell (`cols * rows`, x fastest). */
	height: Float32Array;
	/** Velocity on x faces, `(cols + 1) * rows`. */
	velX: Float32Array;
	/** Velocity on z faces, `cols * (rows + 1)`. */
	velZ: Float32Array;
	/** 1 inside the obstacle. */
	solid: Uint8Array;
	/** Cylinder currently enforcing the no-penetration boundary, or null after submersion. */
	obstacle: Drink | null = null;
	version = 0;
	readonly dx: number;
	readonly dz: number;
	readonly domain: Domain;
	private readonly damping: Float32Array;
	private readonly dampX: Float32Array;
	private readonly dampZ: Float32Array;
	private readonly inner: number;
	private readonly innerDt: number;
	private readonly sourceLeft: number;
	private readonly sourceRight: number;
	private readonly zPhase: number;
	private readonly random: () => number;
	private readonly scratch: Float32Array;
	private readonly impulseX: Float64Array;
	private remainder = 0;
	private time = 0;

	constructor(tier: Tier, domain: Domain, seed = 0x5eed2) {
		this.cols = Math.max(8, Math.floor(tier.cols));
		this.rows = Math.max(8, Math.floor(tier.rows));
		this.domain = domain;
		this.dx = (domain.x1 - domain.x0) / this.cols;
		this.dz = (domain.z1 - domain.z0) / this.rows;
		const n = this.cols * this.rows;
		this.height = new Float32Array(n);
		this.velX = new Float32Array((this.cols + 1) * this.rows);
		this.velZ = new Float32Array(this.cols * (this.rows + 1));
		this.solid = new Uint8Array(n);
		this.scratch = new Float32Array(n);
		this.impulseX = new Float64Array(this.cols);
		this.random = mulberry32(seed >>> 0 || 1);
		this.zPhase = this.random() * Math.PI * 2;
		// Keep the CFL number at or below 0.5 whatever the domain's cell size.
		const cfl = WAVE_SPEED * SIM_STEP * Math.hypot(1 / this.dx, 1 / this.dz);
		this.inner = Math.max(1, Math.ceil(cfl / 0.5));
		this.innerDt = SIM_STEP / this.inner;
		const sponge = Math.max(4, Math.round(Math.min(this.cols, this.rows) * 0.08));
		this.sourceLeft = sponge + 1;
		this.sourceRight = this.cols - sponge - 2;
		this.damping = new Float32Array(n);
		for (let j = 0; j < this.rows; j++)
			for (let i = 0; i < this.cols; i++) {
				const edge = Math.min(i, j, this.cols - 1 - i, this.rows - 1 - j);
				const ramp = Math.max(0, (sponge - edge) / sponge);
				this.damping[j * this.cols + i] = Math.exp(
					-(BODY_DAMPING + EDGE_DAMPING * ramp * ramp) * this.innerDt
				);
			}
		this.dampX = new Float32Array(this.velX.length);
		for (let j = 0; j < this.rows; j++)
			for (let i = 0; i <= this.cols; i++)
				this.dampX[j * (this.cols + 1) + i] =
					this.damping[j * this.cols + Math.min(i, this.cols - 1)];
		this.dampZ = new Float32Array(this.velZ.length);
		for (let j = 0; j <= this.rows; j++)
			for (let i = 0; i < this.cols; i++)
				this.dampZ[j * this.cols + i] = this.damping[Math.min(j, this.rows - 1) * this.cols + i];
	}

	private cellX(i: number) {
		return this.domain.x0 + (i + 0.5) * this.dx;
	}
	private cellZ(j: number) {
		return this.domain.z0 + (j + 0.5) * this.dz;
	}

	setObstacle(drink: Drink | null, level = 0) {
		this.obstacle = drink;
		const { cols, rows } = this;
		const next = new Uint8Array(cols * rows);
		const radius = drink ? radiusAt(drink, level) : 0;
		if (drink && radius > 0)
			for (let j = 0; j < rows; j++)
				for (let i = 0; i < cols; i++) {
					const ddx = this.cellX(i) - drink.x;
					const ddz = this.cellZ(j) - drink.z;
					if (ddx * ddx + ddz * ddz <= radius * radius) next[j * cols + i] = 1;
				}
		// Water displaced by newly solid cells moves to the fluid ring around the obstacle.
		let displaced = 0;
		for (let k = 0; k < next.length; k++)
			if (next[k] && !this.solid[k]) {
				displaced += this.height[k];
				this.height[k] = 0;
			}
		this.solid = next;
		if (displaced !== 0) {
			const ring: number[] = [];
			for (let j = 0; j < rows; j++)
				for (let i = 0; i < cols; i++) {
					const k = j * cols + i;
					if (next[k]) continue;
					let near = false;
					for (let b = -2; b <= 2 && !near; b++)
						for (let a = -2; a <= 2 && !near; a++) {
							const ii = i + a;
							const jj = j + b;
							if (ii >= 0 && jj >= 0 && ii < cols && jj < rows && next[jj * cols + ii]) near = true;
						}
					if (near) ring.push(k);
				}
			if (ring.length) for (const k of ring) this.height[k] += displaced / ring.length;
		}
		this.closeSolidFaces();
		this.version++;
	}

	private closeSolidFaces() {
		const { cols, rows, solid } = this;
		for (let j = 0; j < rows; j++)
			for (let i = 0; i <= cols; i++) {
				const left = i > 0 ? solid[j * cols + i - 1] : 0;
				const right = i < cols ? solid[j * cols + i] : 0;
				if (left || right) this.velX[j * (cols + 1) + i] = 0;
			}
		for (let j = 0; j <= rows; j++)
			for (let i = 0; i < cols; i++) {
				const back = j > 0 ? solid[(j - 1) * cols + i] : 0;
				const front = j < rows ? solid[j * cols + i] : 0;
				if (back || front) this.velZ[j * cols + i] = 0;
			}
	}

	advance(dt: number, drive: number) {
		if (!Number.isFinite(dt) || dt <= 0) return;
		const d = Number.isFinite(drive) ? Math.min(1, Math.max(0, drive)) : 0;
		this.remainder = Math.min(this.remainder + dt, MAX_SUBSTEPS * SIM_STEP);
		while (this.remainder >= SIM_STEP) {
			this.remainder -= SIM_STEP;
			this.wind(d);
			for (let s = 0; s < this.inner; s++) this.substep(d);
			this.diffuse();
			this.time += SIM_STEP;
			this.version++;
		}
	}

	private wind(drive: number) {
		const bumps = WIND_BUMPS + Math.round(CHOP_BUMPS * drive);
		const amplitude = WIND_AMPLITUDE + CHOP_AMPLITUDE * drive;
		for (let n = 0; n < bumps; n++) {
			const x = this.domain.x0 + this.random() * (this.domain.x1 - this.domain.x0);
			const z = this.domain.z0 + this.random() * (this.domain.z1 - this.domain.z0);
			const sign = this.random() < 0.5 ? -1 : 1;
			this.impulse(x, z, 2.5 * Math.max(this.dx, this.dz), sign * amplitude);
		}
	}

	private substep(drive: number) {
		const { cols, rows, height: h, velX: u, velZ: w, solid, innerDt: dt, dampX, dampZ } = this;
		const gx = (GRAVITY * dt) / this.dx;
		const gz = (GRAVITY * dt) / this.dz;
		const stride = cols + 1;
		for (let j = 0; j < rows; j++) {
			const row = j * cols;
			for (let i = 1; i < cols; i++) {
				const k = row + i;
				const f = j * stride + i;
				u[f] = solid[k] | solid[k - 1] ? 0 : (u[f] - gx * (h[k] - h[k - 1])) * dampX[f];
			}
		}
		for (let j = 1; j < rows; j++) {
			const row = j * cols;
			for (let i = 0; i < cols; i++) {
				const k = row + i;
				w[k] = solid[k] | solid[k - cols] ? 0 : (w[k] - gz * (h[k] - h[k - cols])) * dampZ[k];
			}
		}
		// Line sources: a swell of amplitude a leaves each way carrying flux a * c.
		const flux = 2 * WAVE_SPEED * SWELL_AMPLITUDE * drive;
		const phase = 2 * Math.PI * SWELL_HZ * this.time;
		const envelope = 0.75 + 0.25 * Math.sin(phase * 0.23 + this.zPhase);
		const wave = Math.sin(phase);
		const hx = (DEPTH * dt) / this.dx;
		const hz = (DEPTH * dt) / this.dz;
		const damping = this.damping;
		for (let j = 0; j < rows; j++) {
			const row = j * cols;
			const face = j * stride;
			for (let i = 0; i < cols; i++) {
				const k = row + i;
				if (solid[k]) continue;
				const div = hx * (u[face + i + 1] - u[face + i]) + hz * (w[k + cols] - w[k]);
				h[k] = (h[k] - div) * damping[k];
			}
			if (flux > 0) {
				const along = 1 + 0.35 * Math.sin(1.7 * this.cellZ(j) + this.zPhase);
				const source = (dt * flux * envelope * along * wave) / this.dx;
				if (!solid[row + this.sourceLeft]) h[row + this.sourceLeft] += source;
				if (!solid[row + this.sourceRight]) h[row + this.sourceRight] -= source;
			}
		}
	}

	/** Mass-conserving Laplacian smoothing; no flux into solid cells or across the edges. */
	private diffuse() {
		const { cols, rows, height: h, solid, scratch } = this;
		const cx = Math.min(0.2, (DIFFUSION * SIM_STEP) / (this.dx * this.dx));
		const cz = Math.min(0.2, (DIFFUSION * SIM_STEP) / (this.dz * this.dz));
		scratch.set(h);
		for (let j = 0; j < rows; j++)
			for (let i = 0; i < cols; i++) {
				const k = j * cols + i;
				if (solid[k]) continue;
				const v = scratch[k];
				let change = 0;
				if (i > 0 && !solid[k - 1]) change += cx * (scratch[k - 1] - v);
				if (i < cols - 1 && !solid[k + 1]) change += cx * (scratch[k + 1] - v);
				if (j > 0 && !solid[k - cols]) change += cz * (scratch[k - cols] - v);
				if (j < rows - 1 && !solid[k + cols]) change += cz * (scratch[k + cols] - v);
				h[k] = v + change;
			}
	}

	/** Gaussian bump of peak `strength` (negative pushes down) around (x, z). */
	impulse(x: number, z: number, radius: number, strength: number) {
		if (![x, z, radius, strength].every(Number.isFinite) || radius <= 0) return;
		const { cols, rows } = this;
		const ci = (x - this.domain.x0) / this.dx - 0.5;
		const cj = (z - this.domain.z0) / this.dz - 0.5;
		const ri = Math.ceil((2.5 * radius) / this.dx);
		const rj = Math.ceil((2.5 * radius) / this.dz);
		const first = Math.max(0, Math.floor(ci - ri)),
			last = Math.min(cols - 1, Math.ceil(ci + ri)),
			inverseRadius2 = 1 / (radius * radius);
		// The Gaussian is separable: evaluate each axis once rather than an exponential per cell.
		for (let i = first; i <= last; i++) {
			const ddx = this.cellX(i) - x;
			this.impulseX[i] = Math.exp(-ddx * ddx * inverseRadius2);
		}
		for (
			let j = Math.max(0, Math.floor(cj - rj));
			j <= Math.min(rows - 1, Math.ceil(cj + rj));
			j++
		) {
			const ddz = this.cellZ(j) - z,
				along = strength * Math.exp(-ddz * ddz * inverseRadius2);
			for (let i = first; i <= last; i++) {
				const k = j * cols + i;
				if (this.solid[k]) continue;
				this.height[k] += along * this.impulseX[i];
			}
		}
	}

	/**
	 * Heights for drawing: fluid cells as simulated, solid cells filled inward from their
	 * fluid neighbours, so the mesh passes smoothly through the (hidden) cylinder instead
	 * of dropping into a stair-stepped pit around it.
	 */
	renderHeights(out: Float32Array) {
		const { cols, rows, solid } = this;
		out.set(this.height);
		const pending: number[] = [];
		for (let k = 0; k < solid.length; k++) if (solid[k]) pending.push(k);
		const known = new Uint8Array(solid.length);
		for (let k = 0; k < solid.length; k++) known[k] = solid[k] ? 0 : 1;
		while (pending.length) {
			const next: number[] = [];
			const filled: [number, number][] = [];
			for (const k of pending) {
				const i = k % cols;
				const j = (k - i) / cols;
				let sum = 0;
				let n = 0;
				if (i > 0 && known[k - 1]) {
					sum += out[k - 1];
					n++;
				}
				if (i < cols - 1 && known[k + 1]) {
					sum += out[k + 1];
					n++;
				}
				if (j > 0 && known[k - cols]) {
					sum += out[k - cols];
					n++;
				}
				if (j < rows - 1 && known[k + cols]) {
					sum += out[k + cols];
					n++;
				}
				if (n) filled.push([k, sum / n]);
				else next.push(k);
			}
			if (!filled.length) break;
			for (const [k, value] of filled) {
				out[k] = value;
				known[k] = 1;
			}
			pending.length = 0;
			pending.push(...next);
		}
	}

	/**
	 * Per cell: 0 in and within two cells of the obstacle, 0.5 at three, 1 beyond. The
	 * renderer uses it to keep crest shaping and lean off the run-up face, where one side of
	 * a cell is wall and folded quads would show as shards.
	 */
	wallMask(out: Float32Array) {
		const { cols, rows, solid } = this;
		out.fill(1);
		const reach = 3;
		for (let k = 0; k < solid.length; k++) {
			if (!solid[k]) continue;
			const i = k % cols;
			const j = (k - i) / cols;
			for (let b = -reach; b <= reach; b++)
				for (let a = -reach; a <= reach; a++) {
					const ii = i + a;
					const jj = j + b;
					if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue;
					const d = Math.max(Math.abs(a), Math.abs(b));
					const v = d <= 2 ? 0 : 0.5;
					const n = jj * cols + ii;
					if (v < out[n]) out[n] = v;
				}
		}
	}

	/** Bilinear surface offset at (x, z); 0 outside the grid. */
	sample(x: number, z: number): number {
		const fx = (x - this.domain.x0) / this.dx - 0.5;
		const fz = (z - this.domain.z0) / this.dz - 0.5;
		if (!(fx >= 0 && fz >= 0 && fx <= this.cols - 1 && fz <= this.rows - 1)) return 0;
		const i = Math.min(this.cols - 2, Math.floor(fx));
		const j = Math.min(this.rows - 2, Math.floor(fz));
		const tx = fx - i;
		const tz = fz - j;
		const k = j * this.cols + i;
		const h = this.height;
		return (
			(h[k] * (1 - tx) + h[k + 1] * tx) * (1 - tz) +
			(h[k + this.cols] * (1 - tx) + h[k + this.cols + 1] * tx) * tz
		);
	}
}
