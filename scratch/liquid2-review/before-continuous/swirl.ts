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
const HEIGHT_RATIO = 0.85;
/** How far past vertical the lip folds back over, as a share of a quarter turn. */
const CURL = 1.1;
const ARC_START = -0.4 * Math.PI;
const ARC_END = 0.5 * Math.PI + CURL * 0.5 * Math.PI;
const MAX_STEP = 1 / 30;
/** Scales s^3 (1 - s)^2 to a peak of 1 at s = 0.6, with smooth joins at both ends. */
// A cubic rise and quadratic fall also make the slope vanish at both pool joins.
const ENVELOPE_NORM = 1 / (Math.pow(0.6, 3) * Math.pow(0.4, 2));

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
 * One sheet of the whirl. The sheets share the swirl's motion but differ in reach, height,
 * span and spin, and one turns against the others, so they cross and run into each other.
 */
export interface SwirlLayer {
	/** Radius at the head and extra radius at the tail, in drink radii. */
	reach: number;
	spread: number;
	/** Height relative to the swirl's height. */
	height: number;
	/** Angle the sheet spans, in radians. */
	turn: number;
	/** Angular offset and spin multiplier (negative turns the other way). */
	offset: number;
	spin: number;
	/** Seed for the sheet's tongues and folds. */
	seed: number;
}

export const SWIRL_LAYERS: readonly SwirlLayer[] = [
	{ reach: 1.25, spread: 1.0, height: 1.0, turn: SWIRL_TURN, offset: 0, spin: 1, seed: 0.0 },
	{
		reach: 1.05,
		spread: 0.6,
		height: 0.75,
		turn: 1.1 * Math.PI,
		offset: 2.4,
		spin: 1.35,
		seed: 1.7
	},
	{
		reach: 1.55,
		spread: 0.8,
		height: 0.6,
		turn: 1.25 * Math.PI,
		offset: Math.PI,
		spin: -0.8,
		seed: 3.1
	}
];

/** Where the crest sits across the sheet (v), and how wide the band of tongues is. */
const CREST_V = 0.62;
const TONGUE_BAND = 0.18;

interface Column {
	angle: number;
	ca: number;
	sa: number;
	h: number;
	ry: number;
	rx: number;
	centre: number;
	lift: number;
	tongue: number;
	foldSin: number;
	foldCos: number;
	inner: number;
	/** Direction of travel along the sheet (+1 or -1): tongues lean that way. */
	lean: number;
}

function column(swirl: Swirl, drink: Drink, level: number, s: number, layer: SwirlLayer): Column {
	const t = Math.min(1, Math.max(0, s));
	const angle = layer.spin * swirl.phase + layer.offset + t * layer.turn * Math.sign(layer.spin);
	// Like a breaking wave carried round: low at the tail, cresting near the head, then
	// dropping back into the pool. Zero at both ends.
	const envelope = t * t * t * (1 - t) * (1 - t) * ENVELOPE_NORM;
	const wobble = 1 + 0.12 * Math.sin(3 * angle - 2.3 * swirl.time + layer.seed);
	const h = swirl.height * layer.height * envelope * wobble;
	// A tall, thin arc (a sheet, not a tube) that rises from below the surface and folds
	// its lip back over toward the drink.
	const ry = h / 1.75;
	const rx = 0.3 * ry;
	// Tongues: irregular, travelling fingers of liquid standing up off the crest.
	const k = layer.seed;
	const wave =
		0.6 * Math.sin(7 * angle - 2.6 * swirl.time + k) +
		0.4 * Math.sin(13 * angle + 1.7 * swirl.time + 2 * k) +
		0.3 * Math.sin(19 * angle - 3.4 * swirl.time + 3 * k);
	// Rounded rather than spiky: a bounded, smooth crest keeps the fingers soft-topped.
	// Saturating the crest rounds its tips and bounds their height even when folds align.
	const crest = Math.max(0, wave) ** 2;
	const tongue = (h * 0.5 * crest) / (0.4 + crest);
	return {
		angle,
		ca: Math.cos(angle),
		sa: Math.sin(angle),
		h,
		ry,
		rx,
		centre: drink.radius * (layer.reach + layer.spread * (1 - t)) + 0.3 * rx,
		lift: level + 0.75 * ry - 0.02,
		tongue,
		foldSin: Math.sin(5 * angle - 1.9 * swirl.time + k),
		foldCos: Math.cos(5 * angle - 1.9 * swirl.time + k),
		inner: drink.radius * 1.02,
		lean: Math.sign(layer.spin)
	};
}

/** Terms that depend only on the position across the sheet. */
interface Row {
	cosPhi: number;
	sinPhi: number;
	band: number;
	cosFold: number;
	sinFold: number;
}

function row(v: number): Row {
	const phi = ARC_START + v * (ARC_END - ARC_START);
	const across = (v - CREST_V) / TONGUE_BAND;
	return {
		cosPhi: Math.cos(phi),
		sinPhi: Math.sin(phi),
		band: Math.exp(-across * across),
		cosFold: Math.cos(4 * v),
		sinFold: Math.sin(4 * v)
	};
}

function vertex(c: Column, r: Row, drink: Drink, out: Float32Array, o: number) {
	// Folds run diagonally across the sheet, so it reads as twisted liquid, not a smooth wall.
	const fold = c.foldSin * r.cosFold + c.foldCos * r.sinFold;
	const band = r.band;
	const radial = Math.max(
		c.inner,
		c.centre + c.rx * (r.cosPhi + 0.6 * fold) + 0.35 * c.tongue * band
	);
	// Tongues lean forward along the direction the sheet travels, like liquid thrown ahead.
	const ahead = 0.5 * c.lean * c.tongue * band * band;
	out[o] = drink.x + radial * c.ca - ahead * c.sa;
	out[o + 1] = c.lift + c.ry * r.sinPhi + 0.06 * c.ry * fold + c.tongue * band;
	out[o + 2] = drink.z + radial * c.sa + ahead * c.ca;
}

/**
 * A point on a sheet of the whirl. `s` runs along it (0 = outer tail, 1 = inner head),
 * `v` across it (0 = base below the pool surface, 1 = the curled lip). `level` is the
 * pool's level; `layer` indexes SWIRL_LAYERS.
 */
export function swirlPoint(
	swirl: Swirl,
	drink: Drink,
	level: number,
	s: number,
	v: number,
	layer = 0
): Vec3 {
	const out = new Float32Array(3);
	vertex(column(swirl, drink, level, s, SWIRL_LAYERS[layer]), row(v), drink, out, 0);
	return [out[0], out[1], out[2]];
}

/**
 * Fill interleaved position and normal arrays (6 floats per vertex) for an `nu` x `nv`
 * grid over one sheet. Rebuilt every frame: per-column terms are computed once, and normals
 * come from neighbouring grid points rather than extra evaluations.
 */
export function buildSwirlMesh(
	swirl: Swirl,
	drink: Drink,
	level: number,
	nu: number,
	nv: number,
	out: Float32Array,
	layer = 0
) {
	const cols = nu + 1;
	const sheet = SWIRL_LAYERS[layer];
	const rows = Array.from({ length: nv + 1 }, (_, j) => row(j / nv));
	for (let i = 0; i <= nu; i++) {
		const c = column(swirl, drink, level, i / nu, sheet);
		for (let j = 0; j <= nv; j++) vertex(c, rows[j], drink, out, (j * cols + i) * 6);
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
			// Math.hypot is markedly slower than sqrt in V8, and this runs per vertex per frame.
			const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
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
