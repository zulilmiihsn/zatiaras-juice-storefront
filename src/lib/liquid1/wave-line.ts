// Liquid 1: frozen copy of $lib/liquid for reuse. Do not edit alongside the active prototype.
// The liquid's top edge as a 1D damped wave line. Wind keeps a resting surface
// restless; scroll energy drives swells in from both sides, and where two crests
// collide and rise fast, droplets are thrown and fall back into the surface.
// Fixed steps, a seeded generator, and hard bounds keep it stable and repeatable.
export const LINE_CELLS = 192;
export const MAX_DROPLETS = 384;
/** Floats per droplet: x, y, z, radius, vx, vy, vz. */
export const DROPLET_STRIDE = 7;
const MAX_LANDINGS = 32;
const STEP = 1 / 120;
const GRAVITY = 6.5;
const LIMIT = 1.6;
const BREAK = 1.05;
// Swells start just inside each end; the ends themselves absorb outgoing waves,
// so liquid neither piles up nor reflects at the screen edges.
const SOURCE = Float32Array.from({ length: LINE_CELLS }, (_, i) =>
	Math.exp(-(((i - 16) / 6) ** 2))
);
const SPONGE = Float32Array.from({ length: LINE_CELLS }, (_, i) => {
	const edge = Math.min(i, LINE_CELLS - 1 - i);
	return Math.exp(-(0.75 + Math.max(0, 10 - edge) * 1.6) * STEP);
});
// Edge-only height relaxation; the interior keeps its momentum untouched.
const SETTLE = Float32Array.from({ length: LINE_CELLS }, (_, i) =>
	Math.exp(-Math.max(0, 10 - Math.min(i, LINE_CELLS - 1 - i)) * 1.6 * STEP)
);
/** Resting height of the top edge in world units, before any swell. */
export const CREST_BASE = -1.02;

/** Stokes-like shaping: crests sharpen and rise, troughs flatten. Shared with the shader. */
export const shapeCrest = (eta: number) =>
	eta + 0.8 * Math.max(eta, 0) ** 2 + 0.3 * Math.min(eta, 0) ** 2;

export class WaveLine {
	height = new Float32Array(LINE_CELLS);
	/** Upload layout: per cell, the edge height and its broad blur. */
	texels = new Float32Array(LINE_CELLS * 2);
	private blur = new Float32Array(LINE_CELLS);
	private blurNext = new Float32Array(LINE_CELLS);
	droplets = new Float32Array(MAX_DROPLETS * DROPLET_STRIDE);
	dropletCount = 0;
	/** Impacts since the last advance, as [x, local y, strength] triples. */
	landings: number[] = [];
	/** False stops crests from throwing droplets; the line itself is unchanged. */
	spray = true;
	version = 0;
	private velocity = new Float32Array(LINE_CELLS);
	private cooldown = new Float32Array(LINE_CELLS);
	private remainder = 0;
	private time = 0;
	private span = 8;
	private seed = 0x2f6b9a31;

	constructor(seed?: number) {
		if (seed !== undefined && Number.isFinite(seed)) this.seed = seed >>> 0 || 1;
	}

	get active() {
		return this.dropletCount > 0;
	}

	setSpan(span: number) {
		const next = Number.isFinite(span) ? Math.max(3.1, Math.min(40, span)) : 8;
		if (Math.abs(next - this.span) < 0.001) return;
		this.span = next;
		this.height.fill(0);
		this.texels.fill(0);
		this.velocity.fill(0);
		this.cooldown.fill(0);
		this.dropletCount = 0;
		this.version++;
	}

	/** World x of a cell centre. */
	private x(cell: number) {
		return (cell / (LINE_CELLS - 1)) * 2 * this.span - this.span;
	}

	/** Linearly interpolated surface displacement at world x. */
	at(x: number) {
		if (!Number.isFinite(x)) return 0;
		const c = Math.max(
			0,
			Math.min(LINE_CELLS - 1, ((x + this.span) / (2 * this.span)) * (LINE_CELLS - 1))
		);
		const i = Math.min(LINE_CELLS - 2, Math.floor(c));
		return this.height[i] + (this.height[i + 1] - this.height[i]) * (c - i);
	}

	/** A local push on the surface, e.g. from a tap; collisions it causes may splash. */
	impulse(x: number, strength: number, width = 0.18) {
		if (![x, strength, width].every(Number.isFinite) || Math.abs(x) >= this.span) return;
		const centre = ((x + this.span) / (2 * this.span)) * (LINE_CELLS - 1);
		const radius = (Math.max(0.05, Math.min(0.5, width)) / (2 * this.span)) * (LINE_CELLS - 1);
		const force = Math.max(-6, Math.min(6, strength));
		for (
			let i = Math.max(1, Math.floor(centre - radius * 3));
			i <= Math.min(LINE_CELLS - 2, Math.ceil(centre + radius * 3));
			i++
		)
			this.velocity[i] = Math.max(
				-8,
				Math.min(8, this.velocity[i] + force * Math.exp(-(((i - centre) / radius) ** 2) / 2))
			);
	}

	private random() {
		// mulberry32
		let t = (this.seed = (this.seed + 0x6d2b79f5) >>> 0);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/**
	 * One emission pulse from a rising crest. Parcels leave as a sheet across the crest:
	 * the centre rises fastest and the flanks fan outward, so a stronger, wider collision
	 * throws a taller, wider sheet. Rendered as a merged liquid surface, the sheet
	 * stretches into ligaments and tears into drops as its parcels drift apart.
	 */
	private spawn(cell: number, rise: number, level: number) {
		const slope =
			(this.height[Math.min(LINE_CELLS - 1, cell + 1)] - this.height[Math.max(0, cell - 1)]) * 4;
		const width = 0.1 + 0.08 * rise;
		const count = 2 + Math.floor(rise * 1.5 + this.random() * 2);
		for (let n = 0; n < count && this.dropletCount < MAX_DROPLETS; n++) {
			const offset = (this.random() * 2 - 1) * width;
			const across = offset / width;
			const x = this.x(cell) + offset;
			const top = CREST_BASE + shapeCrest(this.at(x)) + level;
			const mist = this.random() < 0.18;
			const radius = mist ? 0.012 + this.random() * 0.012 : 0.04 + this.random() * 0.035;
			const boost = mist ? 1.35 : 1;
			const d = this.dropletCount++ * DROPLET_STRIDE;
			this.droplets.set(
				[
					x,
					top - 0.04,
					(this.random() - 0.3) * 0.5,
					radius,
					(across * (0.7 + rise * 0.55) - slope * 0.5 + (this.random() - 0.5) * 0.5) * boost,
					(rise * (0.85 + this.random() * 0.5) * (1 - 0.45 * across * across) + 0.35) * boost,
					(this.random() * 1.0 - 0.15) * boost
				],
				d
			);
		}
	}

	/**
	 * Advance the line. `energy` (0..1+) is the scroll-driven turbulence; `level` is the
	 * current world-space rise, so droplets re-enter the moving surface.
	 */
	advance(seconds: number, energy: number, level = 0) {
		if (!Number.isFinite(seconds) || seconds <= 0) return;
		const e = Number.isFinite(energy) ? Math.max(0, Math.min(1.5, energy)) : 0;
		const lift = Number.isFinite(level) ? level : 0;
		this.landings.length = 0;
		this.remainder = Math.min(0.05, this.remainder + Math.min(0.05, seconds));
		const dx = (2 * this.span) / (LINE_CELLS - 1);
		// Speed scales with the visible span so swells cross the frame in a few seconds.
		const c2 = (0.4 * this.span) ** 2;
		const h = this.height,
			v = this.velocity;
		while (this.remainder + 1e-9 >= STEP) {
			this.remainder -= STEP;
			const t = (this.time += STEP);
			// Gusts: slow, incommensurate envelopes so nothing repeats visibly.
			const gust = 0.65 + 0.35 * Math.sin(t * 0.37) * Math.sin(t * 0.23 + 1.1);
			const wind = 0.22 * gust;
			// Swells from each side with drifting, mixed frequencies; they meet and collide.
			const left =
				e *
				7.5 *
				(Math.sin(t * 3.4 + 1.4 * Math.sin(t * 0.31)) +
					0.6 * Math.sin(t * 5.3 + 0.8) +
					0.35 * Math.sin(t * 7.9 + 2.2));
			const right =
				e *
				7.5 *
				(Math.sin(t * 3.9 + 1.2 * Math.sin(t * 0.27 + 2.0)) +
					0.6 * Math.sin(t * 6.1 + 2.3) +
					0.35 * Math.sin(t * 8.6 + 0.4));
			// Turbulence: opposing travelling pushes across the body so crests meet everywhere.
			const churn = e * 1.8 * gust;
			for (let i = 1; i < LINE_CELLS - 1; i++) {
				const x = this.x(i) / this.span;
				const laplacian = (h[i - 1] - 2 * h[i] + h[i + 1]) / (dx * dx);
				const viscosity = (v[i - 1] - 2 * v[i] + v[i + 1]) / (dx * dx);
				let force = wind * (Math.sin(x * 9.0 - t * 1.9) + 0.7 * Math.sin(x * 15.0 + t * 2.6 + 1.3));
				force +=
					churn *
					(Math.sin(x * 5.0 - t * 3.3) +
						Math.sin(x * 7.5 + t * 4.4 + 1.9) +
						0.6 * Math.sin(x * 11.0 - t * 5.1 + 0.7));
				force += left * SOURCE[i] + right * SOURCE[LINE_CELLS - 1 - i];
				const value =
					(v[i] + STEP * (c2 * laplacian + 0.004 * this.span * viscosity + force)) * SPONGE[i];
				v[i] = Math.max(-8, Math.min(8, value));
			}
			// The sponge also relaxes height toward rest, so landing drops cannot slowly
			// drain or raise the level where nothing else restores it.
			for (let i = 1; i < LINE_CELLS - 1; i++)
				h[i] = Math.max(-LIMIT, Math.min(LIMIT, (h[i] + STEP * v[i]) * SETTLE[i]));
			// Open ends: copy the neighbour so swells leave the frame instead of bouncing back.
			h[0] = h[1];
			h[LINE_CELLS - 1] = h[LINE_CELLS - 2];
			// Collisions: a crest rising fast at a local maximum throws droplets.
			// A crest past BREAK cannot hold itself up: it loses momentum and sprays.
			for (let i = 2; i < LINE_CELLS - 2; i++) {
				this.cooldown[i] = Math.max(0, this.cooldown[i] - STEP);
				const peak = h[i] >= h[i - 1] && h[i] >= h[i + 1];
				const breaking = h[i] > BREAK && v[i] > 0;
				if (breaking) for (let j = i - 2; j <= i + 2; j++) v[j] *= 0.9;
				if (
					this.spray &&
					this.cooldown[i] === 0 &&
					peak &&
					((h[i] > 0.2 && v[i] > 0.85) || breaking) &&
					this.dropletCount < MAX_DROPLETS
				) {
					// Emit in short pulses for as long as the crest keeps rising, so the
					// splash grows with the collision instead of appearing as one burst.
					this.spawn(i, Math.max(v[i], 1.2), lift);
					for (let j = Math.max(0, i - 6); j <= Math.min(LINE_CELLS - 1, i + 6); j++)
						this.cooldown[j] = 0.05;
				}
			}
			this.moveDroplets(lift);
		}
		this.pack();
		this.version++;
	}

	/**
	 * Interleave the edge with a broad blur of it. The crest detail belongs to the
	 * surface only; the body below follows the blurred line, so small crest bumps
	 * do not run down the whole face as vertical ridges.
	 */
	private pack() {
		const n = LINE_CELLS,
			r = 12;
		const a = this.blur,
			b = this.blurNext;
		a.set(this.height);
		for (let pass = 0; pass < 2; pass++) {
			const src = pass === 0 ? a : b,
				dst = pass === 0 ? b : a;
			for (let i = 0; i < n; i++) {
				let sum = 0;
				for (let j = i - r; j <= i + r; j++) sum += src[Math.max(0, Math.min(n - 1, j))];
				dst[i] = sum / (2 * r + 1);
			}
		}
		// Keep the body under the edge in troughs, else the face folds over the lip,
		// then soften the kinks that the clamp leaves.
		for (let i = 0; i < n; i++) b[i] = Math.min(a[i], this.height[i]);
		for (let i = 0; i < n; i++) {
			let sum = 0;
			for (let j = i - 5; j <= i + 5; j++) sum += b[Math.max(0, Math.min(n - 1, j))];
			a[i] = sum / 11;
		}
		for (let i = 0; i < n; i++) {
			this.texels[i * 2] = this.height[i];
			this.texels[i * 2 + 1] = a[i];
		}
	}

	/**
	 * A drop hitting the surface hands over its momentum (mass ~ radius^3 times fall
	 * speed): the edge dips and rebounds, sending waves sideways, and the impact is
	 * recorded so the renderer can ring the face. It leaves a mark, not more spray:
	 * the drop merges into the liquid.
	 */
	private land(x: number, y: number, radius: number, fall: number) {
		const momentum = (radius / 0.05) ** 3 * fall;
		// A drop is tiny next to a swell: its push on the edge stays a small, local dip.
		const strength = Math.min(0.5, 0.06 * momentum);
		if (strength < 0.005) return;
		// The impact pit pushes liquid up into a rim on both sides; the net push is zero,
		// so many landings cannot sink the whole surface.
		const width = 0.1 + radius * 3;
		this.impulse(x, -strength, width);
		// Rims are twice as wide and a quarter as strong: same volume, gentle enough
		// that they do not read as new colliding crests and splash again.
		this.impulse(x - width * 2.2, strength * 0.25, width * 2);
		this.impulse(x + width * 2.2, strength * 0.25, width * 2);
		if (this.landings.length < MAX_LANDINGS * 3) this.landings.push(x, y, strength);
		// The pit's rebound and the rims are the impact's own response, not a new
		// collision: keep them from splashing again, or spray would feed itself.
		const centre = ((x + this.span) / (2 * this.span)) * (LINE_CELLS - 1);
		const reach = ((width * 4.5) / (2 * this.span)) * (LINE_CELLS - 1);
		for (
			let i = Math.max(0, Math.floor(centre - reach));
			i <= Math.min(LINE_CELLS - 1, Math.ceil(centre + reach));
			i++
		)
			this.cooldown[i] = Math.max(this.cooldown[i], 0.6);
	}

	private moveDroplets(level: number) {
		const d = this.droplets;
		for (let n = 0; n < this.dropletCount;) {
			const o = n * DROPLET_STRIDE;
			// Air drag slows fine spray much more than heavy drops.
			const drag = Math.exp(-(0.012 / d[o + 3]) * STEP);
			d[o + 4] *= drag;
			d[o + 5] = d[o + 5] * drag - GRAVITY * STEP;
			d[o + 6] *= drag;
			d[o] += d[o + 4] * STEP;
			d[o + 1] += d[o + 5] * STEP;
			d[o + 2] += d[o + 6] * STEP;
			const surface = CREST_BASE + shapeCrest(this.at(d[o])) + level;
			// Drops overtaken by a fast-rising level still count as impacts.
			const gone = Math.abs(d[o]) > this.span * 1.2;
			if (d[o + 5] < 0 && (d[o + 1] < surface || gone)) {
				const x = d[o],
					radius = d[o + 3],
					fall = -d[o + 5];
				const last = --this.dropletCount * DROPLET_STRIDE;
				d.copyWithin(o, last, last + DROPLET_STRIDE);
				if (!gone) this.land(x, surface - level, radius, fall);
				continue;
			}
			n++;
		}
	}
}
