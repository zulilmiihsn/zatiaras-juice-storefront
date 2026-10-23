// Liquid 2 orchestrator: maps scroll to the mean level and swell drive, keeps the drink's
// obstacle in the field until the liquid closes over it, and feeds breaking crests into
// the spray. Scrolling back drains: time only runs forward while the level follows
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
import { MAX_SUBSTEPS, SIM_STEP, ShallowWater, type Breaking } from './shallow-water';
import { Spray } from './spray';

export interface SimInput {
	/** Scroll progress 0..1. */
	progress: number;
	/** Signed scroll speed in progress per second. */
	scrollVelocity: number;
}

const RISE_RATE = 1.2;
const DRAIN_RATE = 0.8;
const DRIVE_TAU = 0.25;
/** The obstacle lifts once the level clears the rim by this much, and returns below it. */
const SUBMERGE_MARGIN = 0.05;
/** Scrolling erupts the liquid around the drink: bursts per second at full drive. */
const BURST_RATE = 12;
/** Drive below which the liquid only swells, without bursting. */
const BURST_THRESHOLD = 0.25;
/** Share of each level rise that wells up around the drink before spreading out. */
const MOUND_GAIN = 6;

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
	readonly spray: Spray;
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
		this.spray = new Spray(tier.maxParticles, seed ^ 0x9e3779b9);
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

		const wanted = progress > 0.05 && progress < 0.98 ? Math.min(1, 0.15 + 3.5 * speed) : 0;
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
		// while the page scrolls the liquid bursts there, throwing splashes up and out.
		if (this.drink && rise > 0)
			this.field.impulse(this.drink.x, this.drink.z, this.drink.radius * 2.5, rise * MOUND_GAIN);
		if (this.drink && this.drive > BURST_THRESHOLD) {
			this.burstClock += step * BURST_RATE * this.drive;
			const bursts: Breaking[] = [];
			while (this.burstClock >= 1) {
				this.burstClock -= 1;
				bursts.push(this.burst(this.drink));
			}
			this.spray.emit(bursts);
		} else this.burstClock = 0;

		this.spray.emit(this.field.advance(step, this.drive));
		this.spray.advance(step, this.field, this.localDrink());
		this.time += step;
	}

	/** One eruption beside the drink: a local surge in the surface plus a thrown splash. */
	private burst(drink: Drink): Breaking {
		const rnd = this.random;
		const angle = rnd() * Math.PI * 2;
		const nx = Math.cos(angle);
		const nz = Math.sin(angle);
		const reach = drink.radius + 0.06 + 0.2 * rnd();
		const x = drink.x + nx * reach;
		const z = drink.z + nz * reach;
		const power = this.drive * (0.6 + 0.4 * rnd());
		// The surge itself is the splash: a sharp, tall lift of the surface beside the drink.
		this.field.impulse(x, z, 0.07 + 0.06 * rnd(), 0.15 + 0.3 * power);
		const out = 0.6 + 1.4 * rnd();
		return {
			x,
			z,
			y: this.field.sample(x, z) + 0.05,
			vx: nx * out * power,
			vy: (1.8 + 2.4 * rnd()) * power,
			vz: nz * out * power,
			strength: Math.min(1, 0.5 + 0.5 * power)
		};
	}

	/** The drink in the field's frame (y measured from the mean level), or null once submerged. */
	localDrink(): Drink | null {
		if (!this.drink || this.submerged) return null;
		return { ...this.drink, baseY: this.drink.baseY - this.level };
	}

	disturb(x: number, z: number, strength: number) {
		this.field.impulse(x, z, 0.18, strength);
	}

	/** The mean surface has climbed past the camera: every pixel looks through liquid. */
	get covered(): boolean {
		return this.level >= coverLevel(this.camera) - 1e-6;
	}
}
