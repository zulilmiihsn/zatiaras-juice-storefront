// Menguji SQL D1 sungguhan lewat node:sqlite (Node 22.13+/24). Tanpa mock logika, hanya shim antarmuka D1.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
import { readFileSync } from 'node:fs';
import { createOrder, getPublicOrder, listActive, moveState, staffCanMove } from './orders-db';
import { signSession, verifySession, safeEqual } from './staff-session';

// Shim D1 minimal di atas node:sqlite, cukup untuk menguji SQL sungguhan.
function d1() {
	const db = new DatabaseSync(':memory:');
	for (const file of ['0001_orders.sql', '0002_unique_code.sql']) {
		db.exec(readFileSync(new URL(`../../../migrations/${file}`, import.meta.url), 'utf8'));
	}
	const stmt = (sql: string, args: unknown[] = []) => ({
		bind: (...a: unknown[]) => stmt(sql, a),
		first: async () => (db.prepare(sql).get(...(args as never[])) as never) ?? null,
		all: async () => ({ results: db.prepare(sql).all(...(args as never[])) as never[] }),
		run: async () => ({
			meta: { changes: Number(db.prepare(sql).run(...(args as never[])).changes) }
		}),
		_run: () => db.prepare(sql).run(...(args as never[]))
	});
	return {
		prepare: (sql: string) => stmt(sql),
		batch: async (list: { _run: () => unknown }[]) => list.map((s) => s._run())
	} as unknown as D1Database;
}

const items = [{ menuItemId: 'jus-alpukat', name: 'Jus Alpukat', qty: 1, unitPrice: 22000 }];
const mk = (db: D1Database, now: number, outletId = 'juanda') =>
	createOrder(db, { outletId, name: 'Iil', pickupNote: 'Secepatnya', total: 22000, items }, now);

describe('orders-db (SQL sungguhan)', () => {
	it('alur kasir penuh dan status publik tanpa nama', async () => {
		const db = d1();
		const r = await mk(db, 1000);
		expect(r.ok).toBe(true);
		const id = (r as { id: string }).id;
		expect((await getPublicOrder(db, id, 1500))?.state).toBe('AWAITING_CASHIER');
		expect(await getPublicOrder(db, id, 1500)).not.toHaveProperty('name');
		for (const to of ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'] as const)
			expect(await moveState(db, id, 'juanda', to, 2000)).toBe('ok');
		expect((await getPublicOrder(db, id, 2500))?.state).toBe('COMPLETED');
	});

	it('menolak loncat status, outlet lain, dan target non-kasir', async () => {
		const db = d1();
		const id = ((await mk(db, 1000)) as { id: string }).id;
		expect(await moveState(db, id, 'juanda', 'READY', 2000)).toBe('illegal');
		expect(await moveState(db, id, 'juanda', 'PAID', 2000)).toBe('illegal');
		expect(await moveState(db, id, 'slamet-riyadi', 'CONFIRMED', 2000)).toBe('not_found');
		expect(staffCanMove('AWAITING_CASHIER', 'PAID')).toBe(false);
	});

	it('daftar kasir: hanya outlet sendiri, kedaluwarsa 1 jam, hapus lewat 2 bulan', async () => {
		const db = d1();
		const now = 100 * 86400e3;
		const a = ((await mk(db, now - 61 * 60e3)) as { id: string }).id; // menggantung > 1 jam
		const b = ((await mk(db, now - 60e3)) as { id: string }).id;
		await mk(db, now - 60e3, 'merah-delima');
		const old = ((await mk(db, now - 61 * 86400e3)) as { id: string }).id;
		const list = await listActive(db, 'juanda', now);
		expect(list.map((o) => o.id)).toEqual([b]);
		expect((await getPublicOrder(db, a))?.state).toBe('EXPIRED');
		expect(await getPublicOrder(db, old)).toBeNull();
	});

	it('pembatas laju: 20 pesanan per menit per outlet', async () => {
		const db = d1();
		for (let i = 0; i < 20; i++) expect((await mk(db, 5000)).ok).toBe(true);
		expect(await mk(db, 5000)).toEqual({ ok: false, error: 'rate_limited' });
	});
});

describe('staff-session', () => {
	it('token sah, kedaluwarsa, dan dipalsukan', async () => {
		const t = await signSession('rahasia', 'juanda', 1000);
		expect(await verifySession('rahasia', t, 2000)).toBe('juanda');
		expect(await verifySession('rahasia', t, 1000 + 13 * 3600e3)).toBeNull();
		expect(await verifySession('lain', t, 2000)).toBeNull();
		expect(await verifySession('rahasia', t.replace('juanda', 'berau'), 2000)).toBeNull();
		expect(await verifySession('rahasia', undefined, 2000)).toBeNull();
		expect(safeEqual('1234', '1234')).toBe(true);
		expect(safeEqual('1234', '12345')).toBe(false);
	});
});
