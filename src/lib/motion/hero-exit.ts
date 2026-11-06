// Scroll exit of the hero copy, from the end of the copy back to its start.
// Move each headline line as one cached surface, not ten independently filtered
// glyphs. Native translation/opacity effects preserve the approved glossy lettering.

const START = 0.03;
const RATE = 3.7;
const SPAN = 0.55;
const DURATION = 1000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Translation and fade at flight progress t (0..1). Offsets are vw / vh. */
export function exitPose(t: number) {
	const e = 2.70158 * t * t * t - 1.70158 * t * t;
	return {
		x: e * 55,
		y: e * -35 + t * t * -40,
		opacity: clamp01(1 - (e - 0.45) * 1.8)
	};
}

export type HeroExit = ((progress: number) => void) & { destroy(): void };

/**
 * Collect data-s pieces and data-s-base headline lines once. Scrub paused native
 * animations with the existing hero progress; no extra ticker/listener is needed.
 * The translation path and reverse reading order remain; glyph baseline corrections
 * stay on the static child letters and the entrance remains letter-by-letter.
 */
export function createHeroExit(scope: HTMLElement): HeroExit {
	const pieces: { el: HTMLElement; s: number; t: number; animation?: Animation }[] = [];
	for (const el of scope.querySelectorAll<HTMLElement>('[data-s], [data-s-base]')) {
		pieces.push({ el, s: Number(el.dataset.s ?? el.dataset.sBase), t: 0 });
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
						// Keep the filtered glyph at its rasterized size and orientation.
						// Scaling/tumbling it forces costly new filter rasters during the flight.
						transform: `translate(${pose.x}vw, ${pose.y}vh) ${baseline}`.trim(),
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
