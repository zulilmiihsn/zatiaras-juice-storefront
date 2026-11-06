// The copy's flight finishes before 0.3 of the hero track. Keep the video at its
// first frame during that phase so text compositing and video decode do not compete.
export const HERO_COPY_END = 0.3;
const SCRIM_FADE_START = 0.24;

export function heroScrimOpacity(progress: number): number {
	return Math.min(1, Math.max(0, (HERO_COPY_END - progress) / (HERO_COPY_END - SCRIM_FADE_START)));
}

export function heroVideoProgress(progress: number): number {
	return Math.min(1, Math.max(0, (progress - HERO_COPY_END) / (1 - HERO_COPY_END)));
}
