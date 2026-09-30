import { describe, expect, it } from 'vitest';
import { SECTIONS, progress } from './checklist';

describe('qa checklist', () => {
	it('semua gate ada id unik', () => {
		const ids = SECTIONS.flatMap((s) => s.gates.map((g) => g.id));
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.length).toBeGreaterThan(40);
	});

	it('progres bulat', () => {
		expect(progress(0, 0)).toBe(0);
		expect(progress(4, 1)).toBe(25);
		expect(progress(3, 3)).toBe(100);
	});
});
