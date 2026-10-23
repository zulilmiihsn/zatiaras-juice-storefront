import { describe, expect, it } from 'vitest';
import {
	coverLevel,
	groundDomain,
	levelForProgress,
	makeCamera,
	placeDrink,
	project,
	qualityTier,
	unprojectToPlane
} from './scene';

describe('liquid2 scene', () => {
	it.each([1.6, 0.46])('unprojects and projects back to the same point at aspect %f', (aspect) => {
		const cam = makeCamera(aspect);
		const hit = unprojectToPlane(cam, 0.7, 0.8, -0.15);
		expect(hit).not.toBeNull();
		const back = project(cam, hit!);
		expect(back.x).toBeCloseTo(0.7, 6);
		expect(back.y).toBeCloseTo(0.8, 6);
		expect(back.depth).toBeGreaterThan(0);
	});

	it('returns null for rays above the horizon', () => {
		// Pitched 18° down with a 16.4° half field of view, the horizon sits just above the
		// canvas top; a point well above the canvas looks into the sky.
		expect(unprojectToPlane(makeCamera(1.6), 0.5, -0.3, 0)).toBeNull();
	});

	it('places the drink so its projected height matches size', () => {
		const cam = makeCamera(1.6);
		const drink = placeDrink(cam, 0.72, 0.85, 0.5, 0.81);
		expect(drink.baseY).toBe(-0.15);
		const base = project(cam, [drink.x, drink.baseY, drink.z]);
		const top = project(cam, [drink.x, drink.baseY + drink.height, drink.z]);
		expect(base.y - top.y).toBeCloseTo(0.5, 2);
		expect(base.x).toBeCloseTo(0.72, 4);
		expect(drink.radius).toBeGreaterThan(0);
	});

	it('maps progress to a monotone level from 0 to the cover level', () => {
		const cover = coverLevel(makeCamera(1.6));
		expect(levelForProgress(0, cover)).toBe(0);
		expect(levelForProgress(1, cover)).toBe(cover);
		expect(levelForProgress(Number.NaN, cover)).toBe(0);
		let prev = -Infinity;
		for (let p = 0; p <= 1.0001; p += 0.01) {
			const level = levelForProgress(p, cover);
			expect(level).toBeGreaterThanOrEqual(prev);
			prev = level;
		}
	});

	it('gives touch devices a smaller simulation', () => {
		const touch = qualityTier(true);
		const desk = qualityTier(false);
		expect(touch.cols * touch.rows).toBeLessThan(desk.cols * desk.rows);
		expect(touch.maxParticles).toBeLessThan(desk.maxParticles);
	});

	it('covers the visible floor with a domain that contains the drink', () => {
		const cam = makeCamera(0.46);
		const domain = groundDomain(cam);
		const drink = placeDrink(cam, 0.68, 0.82, 0.5, 0.81);
		expect(domain.x0).toBeLessThan(drink.x - drink.radius);
		expect(domain.x1).toBeGreaterThan(drink.x + drink.radius);
		expect(domain.z0).toBeLessThan(drink.z - drink.radius);
		expect(domain.z1).toBeGreaterThan(drink.z + drink.radius);
		expect(domain.z1).toBeLessThan(cam.pos[2]);
	});
});
