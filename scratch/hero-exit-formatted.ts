// Scroll exit of the hero copy, from the end of the copy back to its start.
// Keep the flight in native transform/opacity animations: rewriting individual
// translate/rotate/scale styles every tick invalidates the filtered letter subtree.

const START = 0.03;
const RATE = 3.7;
const SPAN = 0.55;
const LETTER_STEP = 0.006;
const DURATION = 1000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Pose of a piece at flight progress t (0..1). Offsets are vw / vh, rotate in deg. */
export function exitPose(t: number) {
	const e = 2.70158 * t * t * t - 1.70158 * t * t;
	return {
		x: e * 55,
		y: e * -35 + t * t * -40,
		rotate: e * -8 + Math.sin(t * 3 * Math.PI) * 14,
		scale: 1 + 0.14 * Math.sin(t * Math.PI) - 0.4 * t,
		opacity: clamp01(1 - (e - 0.45) * 1.8)
	};
}

export type HeroExit = ((progress: number) => void) & { destroy(): void };

/**
 * Collect data-s pieces and KernedText letters once. Scrub paused native animations
 * with the existing hero progress; no extra ticker or scroll listener is needed.
 * The flight curve, reverse order, and the font's baseline corrections are preserved.
 */
export function createHeroExit(scope: HTMLElement): HeroExit {
	const pieces: { el: HTMLElement; s: number; t: number; animation?: Animation }[] = [];
	for (const el of scope.querySelectorAll<HTMLElement>('[data-s]')) {
		pieces.push({ el, s: Number(el.dataset.s), t: 0 });
	}
	for (const el of scope.querySelectorAll<HTMLElement>('.kl')) {
		const base = Number(el.closest<HTMLElement>('[data-s-base]')?.dataset.sBase ?? 0);
		const index = Number(el.style.getPropertyValue('--k')) || 0;
		pieces.push({ el, s: base - index * LETTER_STEP, t: 0 });
	}

	let last = 0;
	let destroyed = false;
	const update = (progress: number) => {
		if (destroyed) return;
		const q = clamp01((progress - START) * RATE);
		if (q === last) return;
		last = q;
		for (const piece of pieces) {
			const t = clamp01((q - piece.s) / SPAN);
			if (t === piece.t) continue;
			piece.t = t;
			if (t === 0) {
				// Release the effect completely at rest, including when scrolling back up.
				// This leaves the existing CSS entrance animation in charge.
				piece.animation?.cancel();
				piece.animation = undefined;
				continue;
			}
			if (!piece.animation) {
				const baseline = piece.el.style.transform;
				const frames: Keyframe[] = Array.from({ length: 61 }, (_, i) => {
					const pose = exitPose(i / 60);
					return {
						offset: i / 60,
						transform:
							`translate(${pose.x}vw, ${pose.y}vh) rotate(${pose.rotate}deg) scale(${pose.scale}) ${baseline}`.trim(),
						opacity: pose.opacity
					};
				});
				piece.animation = piece.el.animate(frames, { duration: DURATION, fill: 'both' });
				piece.animation.pause();
			}
			piece.animation.currentTime = t * DURATION;
		}
	};

	return Object.assign(update, {
		destroy() {
			destroyed = true;
			for (const piece of pieces) {
				piece.animation?.cancel();
				piece.animation = undefined;
			}
		}
	});
}
