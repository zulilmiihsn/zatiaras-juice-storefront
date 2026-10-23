// Liquid 2 orchestrator: maps scroll to the mean level and swell drive, keeps the drink's
// obstacle in the field until the liquid closes over it, and stirs the surface around the
// drink while the page scrolls. There is no spray. Scrolling back drains: time only runs forward while the level follows
// progress down, so the liquid recedes with new motion instead of replaying in reverse.

import {
	coverLevel,
	groundDomain,
	levelForProgress,
	makeCamera,
	type Camera,
	type Domain,
	type Drink,
	type Tier
} from './scene';
import { MAX_SUBSTEPS, SIM_STEP, ShallowWater } from './shallow-water';

export interface SimInput {
	/** Scroll progress 0..1. */
	progress: number;
	/** Signed scroll speed in progress per second. */
	scrollVelocity: number;
}

// Calm and unhurried: the level eases toward its scroll target, and scroll speed only
// slowly builds the swell, so a light scroll does not stir the liquid up.
const RISE_RATE = 0.6;
const DRAIN_RATE = 0.6;
const DRIVE_TAU = 0.5;
const DRIVE_FLOOR = 0.1;
const DRIVE_PER_SPEED = 1.6;
/** The obstacle lifts once the level clears the rim by this much, and returns below it. */
const SUBMERGE_MARGIN = 0.05;
/** Scrolling erupts the liquid around the drink: bursts per second at full drive. */
const BURST_RATE = 6;
/** Drive below which the liquid only swells, without bursting. */
const BURST_THRESHOLD = 0.35;
/** Share of each level rise that wells up around the drink before spreading out. */
const MOUND_GAIN = 3;

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const sameDomain = (a: Domain, b: Domain) =>
	Math.abs(a.x0 - b.x0) + Math.abs(a.x1 - b.x1) + Math.abs(a.z0 - b.z0) + Math.abs(a.z1 - b.z1) <
	1e-3;

export class LiquidSim {
	field: ShallowWater;
	level = 0;
	drive = 0;
	time = 0;
	camera: Camera;
	drink: Drink | null = null;
	private readonly tier: Tier;
	private readonly seed: number;
	private submerged = false;
	private burstClock = 0;
	private readonly random: () => number;

	constructor(tier: Tier, seed = 0x11a2) {
		this.tier = tier;
		this.seed = seed;
		this.camera = makeCamera(1.6);
		this.field = new ShallowWater(tier, groundDomain(this.camera), seed);
		this.random = mulberry32((seed ^ 0xb0757) >>> 0 || 1);
	}

	/**
	 * Place the camera and drink. When the visible floor changes (first layout, orientation
	 * change) the grid is rebuilt to cover it and the current surface is resampled into it,
	 * so the liquid keeps its shape instead of resetting to calm.
	 */
	layout(cam: Camera, drink: Drink | null) {
		this.camera = cam;
		this.drink = drink;
		const domain = groundDomain(cam);
		if (!sameDomain(domain, this.field.domain)) {
			const old = this.field;
			const next = new ShallowWater(this.tier, domain, this.seed);
			for (let j = 0; j < next.rows; j++)
				for (let i = 0; i < next.cols; i++)
					next.height[j * next.cols + i] = old.sample(
						domain.x0 + (i + 0.5) * next.dx,
						domain.z0 + (j + 0.5) * next.dz
					);
			this.field = next;
		}
		this.field.setObstacle(this.submerged ? null : drink);
	}

	advance(dt: number, input: SimInput) {
		if (!Number.isFinite(dt) || dt <= 0) return;
		const step = Math.min(dt, MAX_SUBSTEPS * SIM_STEP);
		const progress = Number.isFinite(input.progress) ? Math.min(1, Math.max(0, input.progress)) : 0;
		const speed = Number.isFinite(input.scrollVelocity) ? Math.abs(input.scrollVelocity) : 0;

		const target = levelForProgress(progress, coverLevel(this.camera));
		const rise = Math.min(RISE_RATE * step, Math.max(-DRAIN_RATE * step, target - this.level));
		this.level += rise;

		const wanted =
			progress > 0.05 && progress < 0.98 ? Math.min(1, DRIVE_FLOOR + DRIVE_PER_SPEED * speed) : 0;
		this.drive += (wanted - this.drive) * (1 - Math.exp(-step / DRIVE_TAU));

		if (this.drink) {
			const rim = this.drink.baseY + this.drink.height;
			const submerged = this.submerged
				? this.level > rim - SUBMERGE_MARGIN
				: this.level > rim + SUBMERGE_MARGIN;
			if (submerged !== this.submerged) {
				this.submerged = submerged;
				this.field.setObstacle(submerged ? null : this.drink);
			}
		}

		// The rise starts at the drink: a mound wells up around it and spreads outward, and
		// while the page scrolls briskly the surface surges up beside it.
		if (this.drink && rise > 0)
			this.field.impulse(this.drink.x, this.drink.z, this.drink.radius * 2.5, rise * MOUND_GAIN);
		if (this.drink && this.drive > BURST_THRESHOLD) {
			this.burstClock += step * BURST_RATE * this.drive;
			while (this.burstClock >= 1) {
				this.burstClock -= 1;
				this.surge(this.drink);
			}
		} else this.burstClock = 0;

		this.field.advance(step, this.drive);
		this.time += step;
	}

	/** A local surge of the surface beside the drink. */
	private surge(drink: Drink) {
		const rnd = this.random;
		const angle = rnd() * Math.PI * 2;
		const reach = drink.radius + 0.06 + 0.2 * rnd();
		const power = this.drive * (0.6 + 0.4 * rnd());
		this.field.impulse(
			drink.x + Math.cos(angle) * reach,
			drink.z + Math.sin(angle) * reach,
			0.08 + 0.06 * rnd(),
			0.08 + 0.14 * power
		);
	}

	disturb(x: number, z: number, strength: number) {
		this.field.impulse(x, z, 0.18, strength);
	}

	/** The mean surface has climbed past the camera: every pixel looks through liquid. */
	get covered(): boolean {
		return this.level >= coverLevel(this.camera) - 1e-6;
	}
}
