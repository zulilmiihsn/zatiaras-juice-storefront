import { describe, expect, it, vi } from 'vitest';
import { Fluid } from './fluid';
import { ThinSheets } from './sheets';
import { ShallowWater } from './shallow-water';
import { radiusAt } from './scene';

const DRINK = { x: 0, z: 0, radius: 0.28, baseRadius: 0.16, baseY: -0.15, height: 1 };
function make() {
	const field = new ShallowWater({ cols: 24, rows: 16 }, { x0: -3, x1: 3, z0: -3, z1: 3 });
	field.setObstacle(DRINK);
	const fluid = new Fluid(64);
	fluid.layout(DRINK);
	fluid.count = 32;
	fluid.speed = 5;
	vi.spyOn(fluid, 'sampleVelocity').mockImplementation((_x, _y, _z, out) => {
		out.set([0, fluid.count ? 4 : 0, 0, fluid.count ? 4 : 0, fluid.count ? 16 : 0]);
	});
	vi.spyOn(fluid, 'incidentHeadAt').mockImplementation(() => (fluid.count ? 16 : 0));
	for (let i = 0; i < fluid.count; i++) {
		const angle = (i / fluid.count) * Math.PI * 2;
		fluid.position[i * 3] = Math.cos(angle) * 0.23;
		fluid.position[i * 3 + 1] = 0.02;
		fluid.position[i * 3 + 2] = Math.sin(angle) * 0.23;
		fluid.velocity[i * 3 + 1] = 4;
	}
	const sheets = new ThinSheets(true);
	sheets.layout(DRINK);
	return { sheets, fluid, field };
}

function expectConnected(sheets: ThinSheets) {
	const parent = Int32Array.from({ length: sheets.vertices.length / 3 }, (_, i) => i);
	const find = (node: number): number => {
		while (parent[node] !== node) {
			parent[node] = parent[parent[node]];
			node = parent[node];
		}
		return node;
	};
	for (let i = 0; i < sheets.indexCount; i += 3) {
		const root = find(sheets.indices[i]);
		parent[find(sheets.indices[i + 1])] = root;
		parent[find(sheets.indices[i + 2])] = root;
	}
	const rooted = new Set<number>();
	for (let i = 0; i < sheets.indexCount; i++) {
		const node = sheets.indices[i];
		if (sheets.vertices[node * 3 + 1] <= 0.005) rooted.add(find(node));
	}
	for (let i = 0; i < sheets.indexCount; i++)
		expect(rooted.has(find(sheets.indices[i]))).toBe(true);
}

describe('liquid2 thin impact sheets', () => {
	it('distinguishes a raised quiet pool from an exposed film', () => {
		const { sheets, fluid, field } = make();
		fluid.count = 0;
		field.height.fill(0.04);
		for (let k = 1; k < sheets.vertices.length; k += 3) sheets.vertices[k] = 0.04;
		for (let i = 0; i < 5; i++) sheets.advance(1 / 60, fluid, field, 0);
		expect(sheets.maxHeight).toBeGreaterThan(0.03);
		expect(sheets.exposedHeight).toBeLessThan(0.000001);
	});
	it('keeps the same reference material area across quality tiers', () => {
		const fine = new ThinSheets(false),
			coarse = new ThinSheets(true);
		const sum = (values: Float32Array) => values.reduce((total, value) => total + value, 0);
		expect(sum(fine.referenceAreas)).toBeCloseTo(sum(coarse.referenceAreas), 6);
		expect(coarse.referenceAreas.every((value) => value > 0)).toBe(true);
	});
	it('requires local momentum, rises without raising the pool, then falls', () => {
		const { sheets, fluid, field } = make();
		const quiet = make();
		quiet.fluid.count = 0;
		for (let i = 0; i < 90; i++) {
			sheets.advance(1 / 60, fluid, field, 0);
			quiet.sheets.advance(1 / 60, quiet.fluid, quiet.field, 0);
		}
		expect(sheets.maxHeight).toBeGreaterThan(0.4);
		expect(quiet.sheets.maxHeight).toBeLessThan(0.001);
		expect(field.height.every((value) => value === 0)).toBe(true);
		fluid.count = 0;
		fluid.speed = 0;
		for (let i = 0; i < 150; i++) sheets.advance(1 / 60, fluid, field, 0);
		expect(sheets.maxHeight).toBeLessThan(0.01);
	});

	it('keeps every rendered component connected to the pool through abrupt input changes', () => {
		const { sheets, fluid, field } = make();
		for (let i = 0; i < 120; i++) {
			fluid.count = i < 40 || i > 70 ? 32 : 0;
			sheets.advance(1 / 60, fluid, field, 0);
			if (i % 10 === 0) expectConnected(sheets);
		}
	});

	it('replays the same material rows at 60 and 120 Hz', () => {
		const a = make(),
			b = make();
		for (let i = 0; i < 90; i++) {
			a.sheets.advance(1 / 60, a.fluid, a.field, 0);
			b.sheets.advance(1 / 120, b.fluid, b.field, 0);
			b.sheets.advance(1 / 120, b.fluid, b.field, 0);
		}
		expect(a.sheets.vertices).toEqual(b.sheets.vertices);
		expect(a.sheets.indexCount).toBe(b.sheets.indexCount);
	});

	it('updates surface area immediately when a live sheet is resized', () => {
		const { sheets, fluid, field } = make();
		for (let i = 0; i < 60; i++) sheets.advance(1 / 60, fluid, field, 0);
		const area = sheets.areas.reduce((sum, value) => sum + value, 0);
		const factor = 1.4;
		sheets.layout({
			...DRINK,
			x: 0.5,
			z: -0.2,
			height: DRINK.height * factor,
			radius: DRINK.radius * factor,
			baseRadius: DRINK.baseRadius * factor
		});
		expect(sheets.areas.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
			area * factor * factor,
			5
		);
	});

	it('keeps active vertices outside the tapered cup and respects fixed buffer bounds', () => {
		const { sheets, fluid, field } = make();
		for (let i = 0; i < 90; i++) sheets.advance(1 / 60, fluid, field, 0);
		for (let i = 0; i < sheets.indexCount; i++) {
			const k = sheets.indices[i] * 3;
			expect(k + 2).toBeLessThan(sheets.vertices.length);
			const y = sheets.vertices[k + 1];
			if (y < DRINK.baseY + DRINK.height)
				expect(Math.hypot(sheets.vertices[k], sheets.vertices[k + 2])).toBeGreaterThanOrEqual(
					radiusAt(DRINK, y) - 1e-6
				);
		}
		sheets.advance(60, fluid, field, 0);
		sheets.advance(Number.NaN, fluid, field, 0);
		expect(sheets.vertices.every(Number.isFinite)).toBe(true);
		expect(sheets.indexCount).toBeLessThanOrEqual(sheets.indices.length);
	});
});
