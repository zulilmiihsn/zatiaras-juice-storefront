import { describe, expect, it } from 'vitest';
import { liquidBackingSize } from './wave';

describe('liquid render budget', () => {
	it.each([
		[1920, 1080, false, 900000],
		[3840, 2160, false, 900000],
		[390, 844, true, 450000]
	] as const)('caps a %i x %i high-density viewport', (width, height, coarse, budget) => {
		const backing = liquidBackingSize(width, height, 3, 1, coarse);
		expect(backing.width * backing.height).toBeLessThanOrEqual(budget);
		expect(Math.abs(backing.width / backing.height - width / height)).toBeLessThan(0.01);
	});
	it('lowers work when quality adapts without changing the aspect ratio', () => {
		const full = liquidBackingSize(1440, 900, 2, 1, false);
		const reduced = liquidBackingSize(1440, 900, 2, 0.55, false);
		expect(reduced.width * reduced.height).toBeLessThan(full.width * full.height * 0.31);
		expect(Math.abs(reduced.width / reduced.height - 1.6)).toBeLessThan(0.01);
	});
	it('keeps a valid drawing buffer during zero-sized or invalid layout measurements', () => {
		expect(liquidBackingSize(0, Number.NaN, Number.NaN, Number.NaN, false)).toEqual({
			width: 2,
			height: 2
		});
	});
});
