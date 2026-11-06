// Liquid 2 wave motion: scroll speed excites an underdamped energy spring that lifts a
// rolling crest out of the pool and carries it around the drink. That energy spins the
// pressure footprint up against drag, so it surges, overshoots, coasts on its momentum
// after scrolling stops, and settles back into the pool. Geometry now lives in surface.ts:
// the crest deforms the pool's own grid and shares its vertices and normals. The previous
// independent parametric ribbon and its arc cross-section are preserved in the local
// before-continuous review archive; they are no longer drawn over the water surface.

import type { Drink } from './scene';

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
/** Peak height of the continuous rolling crest as a share of the drink's height. */
const HEIGHT_RATIO = 0.85;
const MAX_STEP = 1 / 30;

export class Swirl {
	/** Excitation 0..~1.2 (it may overshoot). */
	energy = 0;
	private energyRate = 0;
	/** Spin in radians per second. */
	omega = 0;
	phase = 0;
	time = 0;
	/** Current peak height available to the rolling wave above its local pool surface. */
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
