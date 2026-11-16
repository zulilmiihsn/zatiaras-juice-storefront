import { describe, expect, it } from 'vitest';
import { FAQ } from './faq';
import { faqJsonLd } from '$lib/seo';

describe('FAQ', () => {
	it('tiap pertanyaan punya jawaban, tanpa harga menu atau klaim terlarang', () => {
		expect(FAQ.length).toBeGreaterThan(3);
		for (const f of FAQ) {
			expect(f.q.trim()).not.toHaveLength(0);
			expect(f.a.trim()).not.toHaveLength(0);
			expect(f.q.endsWith('.')).toBe(false);
			expect(f.a).not.toMatch(/tanpa gula tambahan|premium|sehat|menyehatkan/i);
		}
		expect(FAQ.find((f) => f.q.startsWith('Reguler'))?.a).toContain('8.000');
	});

	it('JSON-LD FAQPage sah dan memuat semua pertanyaan', () => {
		const ld = JSON.parse(faqJsonLd(FAQ));
		expect(ld['@type']).toBe('FAQPage');
		expect(ld.mainEntity).toHaveLength(FAQ.length);
		expect(ld.mainEntity[0].acceptedAnswer.text).toBe(FAQ[0].a);
	});
});
