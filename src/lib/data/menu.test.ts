import { describe, expect, it } from 'vitest';
import { AVAILABILITY_VERIFIED, MENU, MENU_VERIFIED, getMenuItem } from './menu';
import { canonical, productJsonLd, localBusinessJsonLd } from '../seo';

describe('discovery data', () => {
	it('menu mock bertanda belum verified', () => {
		expect(MENU.length).toBeGreaterThan(0);
		expect(getMenuItem('hero-signature')?.hero).toBe(true);
		expect(MENU_VERIFIED).toBe(false);
		expect(AVAILABILITY_VERIFIED).toBe(false);
	});

	it('canonical + jsonld valid', () => {
		expect(canonical('/menu')).toContain('/menu');
		expect(() =>
			JSON.parse(
				productJsonLd({
					name: 'x',
					description: 'y',
					url: canonical('/menu/x'),
					price: 1,
					availability: 'InStock'
				})
			)
		).not.toThrow();
		expect(() =>
			JSON.parse(
				localBusinessJsonLd({
					name: 'Juanda',
					url: canonical('/samarinda/juanda'),
					hours: 'Mo-Su 07:00-23:00'
				})
			)
		).not.toThrow();
	});
});
