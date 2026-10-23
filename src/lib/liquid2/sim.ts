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
import { MAX_SUBSTEPS, SIM_STEP, ShallowWater } from './shallow-water';
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

const sameDomain = (a: Domain, b: Domain) =>
	Math.abs(a.x0 - b.x0) + Math.abs(a.x1 - b.x1) + Math.abs(a.z0 - b.z0) + Math.abs(a.z1 - b.z1) <
	1e-6;

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
	private laidOut = false;
	private submerged = false;

	constructor(tier: Tier, seed = 0x11a2) {
		this.tier = tier;
		this.seed = seed;
		this.camera = makeCamera(1.6);
		this.field = new ShallowWater(tier, groundDomain(this.camera), seed);
		this.spray = new Spray(tier.maxParticles, seed ^ 0x9e3779b9);
	}

	/** Place the camera and drink. The first call sizes the grid; later calls keep its state. */
	layout(cam: Camera, drink: Drink | null) {
		this.camera = cam;
		this.drink = drink;
		if (!this.laidOut) {
			const domain = groundDomain(cam);
			if (!sameDomain(domain, this.field.domain))
				this.field = new ShallowWater(this.tier, domain, this.seed);
			this.laidOut = true;
		}
		this.field.setObstacle(this.submerged ? null : drink);
	}

	advance(dt: number, input: SimInput) {
		if (!Number.isFinite(dt) || dt <= 0) return;
		const step = Math.min(dt, MAX_SUBSTEPS * SIM_STEP);
		const progress = Number.isFinite(input.progress) ? Math.min(1, Math.max(0, input.progress)) : 0;
		const speed = Number.isFinite(input.scrollVelocity) ? Math.abs(input.scrollVelocity) : 0;

		const target = levelForProgress(progress, coverLevel(this.camera));
		this.level += Math.min(RISE_RATE * step, Math.max(-DRAIN_RATE * step, target - this.level));

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

		this.spray.emit(this.field.advance(step, this.drive));
		this.spray.advance(step, this.field, this.localDrink());
		this.time += step;
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
