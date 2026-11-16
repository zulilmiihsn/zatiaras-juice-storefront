// Lapisan D1 untuk pesanan jalur kasir. Server adalah otoritas status; browser hanya membaca.
import type { OrderItem, OrderState } from '$lib/core/contracts';
import { ALLOWED_ORDER_TRANSITIONS } from '$lib/core/contracts';
import { makeOrderCode } from '$lib/stores/orders';

export const RETAIN_MS = 60 * 24 * 60 * 60 * 1000; // 2 bulan, sesuai kebijakan data pelanggan
export const AWAITING_TTL_MS = 30 * 60 * 1000; // QRIS belum dicek/dibayar > 30 menit: kedaluwarsa, kode unik bebas lagi
export const MAX_UNIQUE_CODE = 99; // kode unik 1..99 per outlet, hanya untuk pesanan yang menunggu
export const MAX_PER_MINUTE = 20; // pelindung spam sederhana per outlet

// Hanya perpindahan ini yang boleh dilakukan kasir lewat panel.
export const STAFF_TARGETS: OrderState[] = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

export function staffCanMove(from: OrderState, to: OrderState): boolean {
	return STAFF_TARGETS.includes(to) && ALLOWED_ORDER_TRANSITIONS[from]?.includes(to) === true;
}

export interface StoredOrder {
	id: string;
	outletId: string;
	state: OrderState;
	name: string;
	pickupNote: string | null;
	note: string | null;
	total: number;
	uniqueCode: number;
	/** Nominal yang harus dibayar pelanggan lewat QRIS: total + kode unik. */
	payTotal: number;
	items: OrderItem[];
	createdAt: number;
}

interface Row {
	id: string;
	outlet_id: string;
	state: OrderState;
	customer_name: string;
	pickup_note: string | null;
	note: string | null;
	total: number;
	unique_code: number;
	items_json: string;
	created_at: number;
}

const fromRow = (r: Row): StoredOrder => ({
	id: r.id,
	outletId: r.outlet_id,
	state: r.state,
	name: r.customer_name,
	pickupNote: r.pickup_note,
	note: r.note,
	total: r.total,
	uniqueCode: r.unique_code,
	payTotal: r.total + r.unique_code,
	items: JSON.parse(r.items_json) as OrderItem[],
	createdAt: r.created_at
});

export type CreateResult =
	| { ok: true; id: string; uniqueCode: number; payTotal: number; expiresAt: number }
	| { ok: false; error: 'rate_limited' | 'busy' };

function pickFree(used: Set<number>): number | null {
	const free: number[] = [];
	for (let c = 1; c <= MAX_UNIQUE_CODE; c++) if (!used.has(c)) free.push(c);
	if (!free.length) return null;
	return free[crypto.getRandomValues(new Uint32Array(1))[0] % free.length];
}

export async function createOrder(
	db: D1Database,
	o: { outletId: string; name: string; pickupNote: string; note?: string; total: number; items: OrderItem[] },
	now: number
): Promise<CreateResult> {
	const recent = await db
		.prepare('SELECT COUNT(*) AS n FROM orders WHERE outlet_id = ? AND created_at > ?')
		.bind(o.outletId, now - 60_000)
		.first<{ n: number }>();
	if ((recent?.n ?? 0) >= MAX_PER_MINUTE) return { ok: false, error: 'rate_limited' };

	// Bebaskan kode unik milik pesanan yang sudah lewat batas waktu sebelum memilih kode baru.
	await expireStale(db, o.outletId, now);

	for (let attempt = 0; attempt < 8; attempt++) {
		const { results } = await db
			.prepare(`SELECT unique_code FROM orders WHERE outlet_id = ? AND state = 'AWAITING_CASHIER'`)
			.bind(o.outletId)
			.all<{ unique_code: number }>();
		const code = pickFree(new Set((results ?? []).map((r) => r.unique_code)));
		if (code === null) return { ok: false, error: 'busy' };
		const id = makeOrderCode();
		try {
			await db.batch([
				db
					.prepare(
						`INSERT INTO orders (id, outlet_id, state, payment_mode, customer_name, pickup_note, note, total, unique_code, items_json, created_at, updated_at)
						 VALUES (?, ?, 'AWAITING_CASHIER', 'CASHIER', ?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(id, o.outletId, o.name, o.pickupNote, o.note ?? null, o.total, code, JSON.stringify(o.items), now, now),
				db
					.prepare(`INSERT INTO order_events (order_id, from_state, to_state, at) VALUES (?, 'DRAFT', 'AWAITING_CASHIER', ?)`)
					.bind(id, now)
			]);
			return { ok: true, id, uniqueCode: code, payTotal: o.total + code, expiresAt: now + AWAITING_TTL_MS };
		} catch {
			// kode pesanan atau kode unik bentrok (dua pelanggan bersamaan): ulangi dengan pilihan baru
		}
	}
	return { ok: false, error: 'busy' };
}

export async function expireStale(db: D1Database, outletId: string, now: number): Promise<void> {
	await db
		.prepare(
			`UPDATE orders SET state = 'EXPIRED', updated_at = ? WHERE outlet_id = ? AND state = 'AWAITING_CASHIER' AND created_at < ?`
		)
		.bind(now, outletId, now - AWAITING_TTL_MS)
		.run();
}

// Status publik: tanpa nama pelanggan dan catatan.
export interface PublicOrder {
	id: string;
	outletId: string;
	state: OrderState;
	total: number;
	uniqueCode: number;
	payTotal: number;
	pickupNote: string | null;
	expiresAt: number;
}

export async function getPublicOrder(db: D1Database, id: string, now: number = Date.now()): Promise<PublicOrder | null> {
	let r = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<Row>();
	if (!r) return null;
	if (r.state === 'AWAITING_CASHIER' && r.created_at < now - AWAITING_TTL_MS) {
		await expireStale(db, r.outlet_id, now);
		r = { ...r, state: 'EXPIRED' };
	}
	return {
		id: r.id,
		outletId: r.outlet_id,
		state: r.state,
		total: r.total,
		uniqueCode: r.unique_code,
		payTotal: r.total + r.unique_code,
		pickupNote: r.pickup_note,
		expiresAt: r.created_at + AWAITING_TTL_MS
	};
}

// Untuk antrean POS: pesanan yang menunggu cek QRIS di satu outlet, terlama dulu.
export async function listAwaiting(db: D1Database, outletId: string, now: number): Promise<StoredOrder[]> {
	await expireStale(db, outletId, now);
	const { results } = await db
		.prepare(`SELECT * FROM orders WHERE outlet_id = ? AND state = 'AWAITING_CASHIER' ORDER BY created_at ASC LIMIT 100`)
		.bind(outletId)
		.all<Row>();
	return (results ?? []).map(fromRow);
}

// Daftar kerja kasir. Sekaligus merapikan: kedaluwarsakan yang menggantung, hapus yang lewat 2 bulan.
export async function listActive(db: D1Database, outletId: string, now: number): Promise<StoredOrder[]> {
	await expireStale(db, outletId, now);
	await db.prepare('DELETE FROM orders WHERE created_at < ?').bind(now - RETAIN_MS).run();
	await db.prepare('DELETE FROM order_events WHERE at < ?').bind(now - RETAIN_MS).run();
	const { results } = await db
		.prepare(
			`SELECT * FROM orders WHERE outlet_id = ? AND (state IN ('AWAITING_CASHIER','CONFIRMED','PREPARING','READY') OR (state = 'COMPLETED' AND updated_at > ?)) ORDER BY created_at ASC LIMIT 100`
		)
		.bind(outletId, now - 3 * 60 * 60 * 1000)
		.all<Row>();
	return (results ?? []).map(fromRow);
}

export async function moveState(
	db: D1Database,
	id: string,
	outletId: string,
	to: OrderState,
	now: number
): Promise<'ok' | 'not_found' | 'illegal'> {
	const r = await db
		.prepare('SELECT state FROM orders WHERE id = ? AND outlet_id = ?')
		.bind(id, outletId)
		.first<{ state: OrderState }>();
	if (!r) return 'not_found';
	if (!staffCanMove(r.state, to)) return 'illegal';
	// Guard atomik: hanya berubah bila state masih sama (dua kasir menekan bersamaan).
	const res = await db
		.prepare('UPDATE orders SET state = ?, updated_at = ? WHERE id = ? AND state = ?')
		.bind(to, now, id, r.state)
		.run();
	if (!res.meta?.changes) return 'illegal';
	await db
		.prepare('INSERT INTO order_events (order_id, from_state, to_state, at) VALUES (?, ?, ?, ?)')
		.bind(id, r.state, to, now)
		.run();
	return 'ok';
}
