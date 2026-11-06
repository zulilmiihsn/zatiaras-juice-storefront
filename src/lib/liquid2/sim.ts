// Liquid 2 orchestrator: maps scroll to the mean level and swell drive, keeps the drink's
// obstacle in the field until the liquid closes over it, and drives the swirl that whirls
// around the drink while the page scrolls. There is no spray. Scrolling back drains: time only runs forward while the level follows
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
import { SIM_STEP, ShallowWater } from './shallow-water';
import { Fluid } from './fluid';
import { ThinSheets } from './sheets';

export interface SimInput {
	/** Scroll progress 0..1. */
	progress: number;
	/** Signed scroll speed in progress per second. */
	scrollVelocity: number;
}

// Calm and unhurried: the level eases toward its scroll target, and scroll speed only
// slowly builds the swell, so a light scroll does not stir the liquid up.
const RISE_RATE = 0.28;
const DRAIN_RATE = 0.6;
const DRIVE_TAU = 0.22;
const DRIVE_FLOOR = 0;
const DRIVE_PER_SPEED = 4;
/** The obstacle lifts once the level clears the rim by this much, and returns below it. */
const SUBMERGE_MARGIN = 0.05;
/** The former mean-level mound is replaced by local collision flow; distant swells stay small. */
const POOL_DRIVE = 0.06;

const sameDomain = (a: Domain, b: Domain) =>
	Math.abs(a.x0 - b.x0) + Math.abs(a.x1 - b.x1) + Math.abs(a.z0 - b.z0) + Math.abs(a.z1 - b.z1) <
	1e-3;

export class LiquidSim {
	field: ShallowWater;
	readonly fluid: Fluid;
	readonly sheets: ThinSheets;
	level = 0;
	drive = 0;
	time = 0;
	camera: Camera;
	drink: Drink | null = null;
	private readonly tier: Tier;
	private readonly seed: number;
	private submerged = false;
	private obstacleLevel = 0;

	constructor(tier: Tier, seed = 0x11a2) {
		this.tier = tier;
		this.seed = seed;
		this.fluid = new Fluid(tier.cols <= 64 ? 384 : 1280);
		this.sheets = new ThinSheets(tier.cols <= 64);
		this.camera = makeCamera(1.6);
		this.field = new ShallowWater(tier, groundDomain(this.camera), seed);
	}

	/**
	 * Place the camera and drink. When the visible floor changes (first layout, orientation
	 * change) the grid is rebuilt to cover it and the current surface is resampled into it,
	 * so the liquid keeps its shape instead of resetting to calm.
	 */
	layout(cam: Camera, drink: Drink | null) {
		this.camera = cam;
		this.drink = drink;
		this.fluid.layout(drink);
		this.sheets.layout(drink);
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
		this.field.setObstacle(this.submerged ? null : drink, this.level);
		this.obstacleLevel = this.level;
	}

	advance(dt: number, input: SimInput) {
		if (!Number.isFinite(dt) || dt <= 0) return;
		// A slow draw must not trigger an ever-growing backlog of pressure solves.
		// At most two pool steps and one 60 Hz fluid step are advanced per rendered frame.
		const step = Math.min(dt, 2 * SIM_STEP);
		const progress = Number.isFinite(input.progress) ? Math.min(1, Math.max(0, input.progress)) : 0;
		const speed = Number.isFinite(input.scrollVelocity) ? Math.max(0, input.scrollVelocity) : 0;

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
				this.field.setObstacle(submerged ? null : this.drink, this.level);
				this.obstacleLevel = this.level;
			}
			if (!submerged && Math.abs(this.level - this.obstacleLevel) > this.field.dx) {
				this.field.setObstacle(this.drink, this.level);
				this.obstacleLevel = this.level;
			}
		}

		// The rise no longer starts as a growing mound around the drink. The pool stays
		// low while incoming momentum reaches the obstacle and lifts the local film.
		// That wave follows the actual cylinder boundary, carries momentum around its
		// sides, and falls under gravity instead of dragging the entire pool upward.
		this.field.advance(step, this.drive * POOL_DRIVE);
		this.fluid.advance(step, this.drive, this.field, this.level);
		this.sheets.advance(step, this.fluid, this.field, this.level);
		this.time += step;
	}

	disturb(x: number, z: number, strength: number) {
		this.field.impulse(x, z, 0.18, strength);
	}

	/** The mean surface has climbed past the camera: every pixel looks through liquid. */
	get covered(): boolean {
		return this.level >= coverLevel(this.camera) - 1e-6;
	}
}
