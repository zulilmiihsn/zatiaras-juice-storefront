// A small damped wave field transports local pressure across the visible liquid.
// Fixed steps, absorbing edges, and bounded impulses keep it stable under rapid input.
export const FIELD_WIDTH = 64;
export const FIELD_HEIGHT = 40;
export const FIELD_BOTTOM = -5;
export const FIELD_TOP = 3;
const STEP = 1 / 120;
// Fast, well-damped ripples that drift with the current read as a thin liquid;
// slow, lightly damped ones that stay in place read as an elastic jelly.
const SPEED_SQUARED = 3.6 * 3.6;
const DRIFT_X = 0.35;

export class SurfaceWaves {
	data = new Float32Array(FIELD_WIDTH * FIELD_HEIGHT);
	private next = new Float32Array(this.data.length);
	private velocity = new Float32Array(this.data.length);
	private nextVelocity = new Float32Array(this.data.length);
	private readonly damping = new Float32Array(this.data.length);
	private remainder = 0;
	private span = 8;
	active = false;
	version = 0;

	constructor() {
		for (let y = 0; y < FIELD_HEIGHT; y++)
			for (let x = 0; x < FIELD_WIDTH; x++) {
				const edge = Math.min(x, y, FIELD_WIDTH - 1 - x, FIELD_HEIGHT - 1 - y);
				this.damping[y * FIELD_WIDTH + x] = Math.exp(-(2.6 + Math.max(0, 5 - edge) * 3.5) * STEP);
			}
	}

	setSpan(span: number) {
		const next = Number.isFinite(span) ? Math.max(3.1, Math.min(40, span)) : 8;
		if (Math.abs(next - this.span) < 0.001) return;
		this.span = next;
		this.clear();
	}

	clear() {
		this.data.fill(0);
		this.next.fill(0);
		this.velocity.fill(0);
		this.nextVelocity.fill(0);
		this.remainder = 0;
		this.active = false;
		this.version++;
	}

	impulse(x: number, y: number, strength: number) {
		if (
			![x, y, strength].every(Number.isFinite) ||
			Math.abs(x) >= this.span ||
			y <= FIELD_BOTTOM ||
			y >= FIELD_TOP
		)
			return;
		const dx = (2 * this.span) / (FIELD_WIDTH - 1);
		const dy = (FIELD_TOP - FIELD_BOTTOM) / (FIELD_HEIGHT - 1);
		const cx = (x + this.span) / dx,
			cy = (y - FIELD_BOTTOM) / dy;
		const radius = 0.16;
		const rx = Math.ceil((radius * 3) / dx),
			ry = Math.ceil((radius * 3) / dy);
		const force = Math.max(-2, Math.min(2, strength));
		for (
			let row = Math.max(1, Math.floor(cy) - ry);
			row <= Math.min(FIELD_HEIGHT - 2, Math.ceil(cy) + ry);
			row++
		) {
			for (
				let col = Math.max(1, Math.floor(cx) - rx);
				col <= Math.min(FIELD_WIDTH - 2, Math.ceil(cx) + rx);
				col++
			) {
				const d2 = ((col - cx) * dx) ** 2 + ((row - cy) * dy) ** 2;
				if (d2 > 9 * radius * radius) continue;
				const i = row * FIELD_WIDTH + col;
				this.velocity[i] = Math.max(
					-3,
					Math.min(3, this.velocity[i] + force * Math.exp(-d2 / (2 * radius * radius)))
				);
			}
		}
		this.active = true;
	}

	advance(seconds: number, scrollFlow = 0) {
		if (!this.active || !Number.isFinite(seconds) || seconds <= 0) return;
		this.remainder = Math.min(0.05, this.remainder + Math.min(0.05, seconds));
		const dx = (2 * this.span) / (FIELD_WIDTH - 1);
		const dy = (FIELD_TOP - FIELD_BOTTOM) / (FIELD_HEIGHT - 1);
		const flow = Number.isFinite(scrollFlow) ? Math.max(-1, Math.min(1, scrollFlow)) : 0;
		const driftY = -0.6 - Math.max(0, flow) * 0.8;
		let advanced = false;
		while (this.remainder + 1e-9 >= STEP) {
			this.remainder -= STEP;
			const h = this.data,
				v = this.velocity,
				nh = this.next,
				nv = this.nextVelocity;
			let activity = 0;
			for (let y = 1; y < FIELD_HEIGHT - 1; y++)
				for (let x = 1; x < FIELD_WIDTH - 1; x++) {
					const i = y * FIELD_WIDTH + x;
					const laplacian =
						(h[i - 1] - 2 * h[i] + h[i + 1]) / (dx * dx) +
						(h[i - FIELD_WIDTH] - 2 * h[i] + h[i + FIELD_WIDTH]) / (dy * dy);
					const transportV =
						(DRIFT_X * (v[i] - v[i - 1])) / dx + (driftY * (v[i + FIELD_WIDTH] - v[i])) / dy;
					const transportH =
						(DRIFT_X * (h[i] - h[i - 1])) / dx + (driftY * (h[i + FIELD_WIDTH] - h[i])) / dy;
					let velocity = (v[i] + STEP * (SPEED_SQUARED * laplacian - transportV)) * this.damping[i];
					const height = h[i] + STEP * (velocity - transportH);
					if (Math.abs(height) > 0.14) velocity *= 0.5;
					nh[i] = Math.max(-0.14, Math.min(0.14, height));
					nv[i] = Math.max(-3, Math.min(3, velocity));
					activity = Math.max(activity, Math.abs(nh[i]), Math.abs(nv[i]) * 0.1);
				}
			this.data = nh;
			this.next = h;
			this.velocity = nv;
			this.nextVelocity = v;
			advanced = true;
			if (activity < 0.00015) {
				this.clear();
				break;
			}
		}
		if (advanced) this.version++;
	}
}
