// Liquid 2 swirl: a ribbon of liquid that rises out of the pool and whirls around the
// drink while the page scrolls, its lip curling over toward the cup. The pool's height
// field cannot fold over itself, so the ribbon is its own surface. Its form is a
// parametric sheet (a spiral centre line with an arc cross-section); its motion comes from
// a small physical model: scroll speed excites an underdamped energy spring that lifts the
// sheet, and that energy spins it up against drag, so it surges, overshoots, coasts on its
// momentum after scrolling stops, and settles back into the pool.

import type { Drink, Vec3 } from './scene';

/** Angle the ribbon spans around the drink, from its outer tail to its inner head. */
export const SWIRL_TURN = 1.6 * Math.PI;

export interface SwirlInput {
	progress: number;
	scrollVelocity: number;
}

const STIFFNESS = 14;
const DAMPING = 6;
/** Scroll speed (progress per second) that fully excites the swirl. */
const FULL_SPEED = 0.4;
const SPIN_GAIN = 3;
const SPIN_DRAG = 0.9;
/** Peak height of the sheet as a share of the drink's height. */
const HEIGHT_RATIO = 1.1;
/** How far past vertical the lip folds back over, as a share of a quarter turn. */
const CURL = 1.1;
const ARC_START = -0.4 * Math.PI;
const ARC_END = 0.5 * Math.PI + CURL * 0.5 * Math.PI;
const MAX_STEP = 1 / 30;
/** Scales s^1.5 (1 - s)^0.6 to a peak of 1 (at s = 0.714). */
const ENVELOPE_NORM = 1 / (Math.pow(0.714, 1.5) * Math.pow(0.286, 0.6));

export class Swirl {
	/** Excitation 0..~1.2 (it may overshoot). */
	energy = 0;
	private energyRate = 0;
	/** Spin in radians per second. */
	omega = 0;
	phase = 0;
	time = 0;
	/** Current peak height of the sheet above the pool level. */
	height = 0;

	advance(dt: number, input: SwirlInput, drink: Drink | null) {
		if (!Number.isFinite(dt) || dt <= 0) return;
		const progress = Number.isFinite(input.progress) ? input.progress : 0;
		const speed = Number.isFinite(input.scrollVelocity) ? Math.abs(input.scrollVelocity) : 0;
		const target = progress > 0.03 && progress < 0.98 ? Math.min(1, speed / FULL_SPEED) : 0;
		let left = Math.min(dt, 0.25);
		while (left > 1e-9) {
			const step = Math.min(left, MAX_STEP);
			left -= step;
			// Semi-implicit Euler on an underdamped spring: a surge that overshoots a little.
			this.energyRate += (STIFFNESS * (target - this.energy) - DAMPING * this.energyRate) * step;
			this.energy = Math.max(0, this.energy + this.energyRate * step);
			this.omega += (SPIN_GAIN * this.energy - SPIN_DRAG * this.omega) * step;
			this.phase = (this.phase + this.omega * step) % (Math.PI * 2);
			this.time += step;
		}
		this.height = drink ? HEIGHT_RATIO * drink.height * Math.min(1.2, this.energy) : 0;
	}
}

/**
 * A point on the ribbon. `s` runs along it (0 = outer tail, 1 = inner head), `v` across
 * it (0 = base below the pool surface, 1 = the curled lip). `level` is the pool's level.
 */
export function swirlPoint(swirl: Swirl, drink: Drink, level: number, s: number, v: number): Vec3 {
	const angle = swirl.phase + s * SWIRL_TURN;
	// Like a breaking wave carried round: low at the outer tail, building to a crest near
	// the head, then dropping back into the pool. Zero at both ends.
	const clamped = Math.min(1, Math.max(0, s));
	const envelope = Math.pow(clamped, 1.5) * Math.pow(1 - clamped, 0.6) * ENVELOPE_NORM;
	const wobble = 1 + 0.12 * Math.sin(3 * angle - 2.3 * swirl.time);
	const h = swirl.height * envelope * wobble;
	// Cross-section: a tall, narrow arc (a sheet, not a tube) that rises from below the
	// surface and folds its lip over toward the drink.
	const ry = h / 1.75;
	const rx = 0.45 * ry;
	const centre = drink.radius * (1.25 + (1 - s)) + 0.3 * rx;
	const lift = level + 0.75 * ry - 0.02;
	const phi = ARC_START + v * (ARC_END - ARC_START);
	// Crown: the lip breaks into fingers that travel along it.
	const crown = h * 0.18 * Math.pow(Math.max(0, Math.sin(11 * angle - 3 * swirl.time)), 3) * v ** 4;
	const radial = Math.max(drink.radius * 1.02, centre + rx * Math.cos(phi));
	return [
		drink.x + radial * Math.cos(angle),
		lift + ry * Math.sin(phi) + crown,
		drink.z + radial * Math.sin(angle)
	];
}

/**
 * Fill interleaved position and normal arrays (6 floats per vertex) for an `nu` x `nv`
 * grid over the ribbon. Rebuilt every frame, so per-column and per-row terms are computed
 * once, and normals come from neighbouring grid points rather than extra evaluations.
 */
export function buildSwirlMesh(
	swirl: Swirl,
	drink: Drink,
	level: number,
	nu: number,
	nv: number,
	out: Float32Array
) {
	const cols = nu + 1;
	const cosPhi = new Float64Array(nv + 1);
	const sinPhi = new Float64Array(nv + 1);
	const lipWeight = new Float64Array(nv + 1);
	for (let j = 0; j <= nv; j++) {
		const v = j / nv;
		const phi = ARC_START + v * (ARC_END - ARC_START);
		cosPhi[j] = Math.cos(phi);
		sinPhi[j] = Math.sin(phi);
		lipWeight[j] = v ** 4;
	}
	for (let i = 0; i <= nu; i++) {
		const s = i / nu;
		const angle = swirl.phase + s * SWIRL_TURN;
		const envelope = Math.pow(s, 1.5) * Math.pow(1 - s, 0.6) * ENVELOPE_NORM;
		const h = swirl.height * envelope * (1 + 0.12 * Math.sin(3 * angle - 2.3 * swirl.time));
		const ry = h / 1.75;
		const rx = 0.45 * ry;
		const centre = drink.radius * (1.25 + (1 - s)) + 0.3 * rx;
		const lift = level + 0.75 * ry - 0.02;
		const crown = h * 0.18 * Math.pow(Math.max(0, Math.sin(11 * angle - 3 * swirl.time)), 3);
		const ca = Math.cos(angle);
		const sa = Math.sin(angle);
		const inner = drink.radius * 1.02;
		for (let j = 0; j <= nv; j++) {
			const radial = Math.max(inner, centre + rx * cosPhi[j]);
			const o = (j * cols + i) * 6;
			out[o] = drink.x + radial * ca;
			out[o + 1] = lift + ry * sinPhi[j] + crown * lipWeight[j];
			out[o + 2] = drink.z + radial * sa;
		}
	}
	for (let j = 0; j <= nv; j++)
		for (let i = 0; i <= nu; i++) {
			const o = (j * cols + i) * 6;
			const a = (j * cols + Math.min(nu, i + 1)) * 6;
			const b = (j * cols + Math.max(0, i - 1)) * 6;
			const c = (Math.min(nv, j + 1) * cols + i) * 6;
			const d = (Math.max(0, j - 1) * cols + i) * 6;
			const ex = out[a] - out[b],
				ey = out[a + 1] - out[b + 1],
				ez = out[a + 2] - out[b + 2];
			const fx = out[c] - out[d],
				fy = out[c + 1] - out[d + 1],
				fz = out[c + 2] - out[d + 2];
			let nx = ey * fz - ez * fy;
			let ny = ez * fx - ex * fz;
			let nz = ex * fy - ey * fx;
			const len = Math.hypot(nx, ny, nz);
			if (len > 1e-12) {
				nx /= len;
				ny /= len;
				nz /= len;
			} else {
				nx = 0;
				ny = 1;
				nz = 0;
			}
			out[o + 3] = nx;
			out[o + 4] = ny;
			out[o + 5] = nz;
		}
}
