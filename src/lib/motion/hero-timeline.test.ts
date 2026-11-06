import { describe, expect, it } from 'vitest';
import { HERO_COPY_END, heroScrimOpacity, heroVideoProgress } from './hero-timeline';

describe('hero rendering phases', () => {
	it('keeps masked scrims static during the flight, then fades them before video motion', () => {
		expect(heroScrimOpacity(0)).toBe(1);
		expect(heroScrimOpacity(0.23)).toBe(1);
		expect(heroScrimOpacity(0.24)).toBe(1);
		expect(heroScrimOpacity(0.27)).toBeCloseTo(0.5);
		expect(heroScrimOpacity(HERO_COPY_END)).toBe(0);
		expect(heroScrimOpacity(1)).toBe(0);
	});

	it('holds the first video frame throughout the copy exit', () => {
		for (const progress of [0, 0.03, 0.1, 0.2, HERO_COPY_END]) {
			expect(heroVideoProgress(progress)).toBe(0);
		}
	});

	it('plays the complete video over the remaining track without a jump at the boundary', () => {
		expect(heroVideoProgress(HERO_COPY_END + 0.0001)).toBeCloseTo(0, 3);
		expect(heroVideoProgress(HERO_COPY_END + (1 - HERO_COPY_END) / 2)).toBeCloseTo(0.5);
		expect(heroVideoProgress(1)).toBe(1);
	});

	it('clamps overscroll and reverses continuously back to the first frame', () => {
		expect(heroVideoProgress(-0.1)).toBe(0);
		expect(heroVideoProgress(1.1)).toBe(1);
		const reverse = [1, 0.8, 0.5, HERO_COPY_END, 0].map(heroVideoProgress);
		expect(reverse).toEqual([...reverse].sort((a, b) => b - a));
	});
});
