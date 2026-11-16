// Menu hidup dari ZatiarasPOS (harga dan ketersediaan per outlet), dibaca server ke server.
// Sumber kebenaran tetap POS; di sini hanya pembaca dengan cache supaya bacaan D1 POS hemat:
// satu pengambilan per outlet tiap FRESH_MS, dan hasil lama boleh dipakai sampai STALE_MS bila POS
// tidak terjangkau. Lewat STALE_MS tanpa data = null, dan pemesanan ditutup (kasir pun tak bisa Terima).
import { menuKey, type LiveMenu, type PosMenuItem } from '$lib/core/live-menu';

export { menuKey };
export type { LiveMenu, PosMenuItem };

export interface MenuEnv {
	POS_MENU_URL?: string; // alamat HTTPS ZatiarasPOS, mis. https://pos.contoh.id
	POS_API_TOKEN?: string; // rahasia bersama (sama dengan WEB_ORDERS_TOKEN di POS)
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const FRESH_MS = 2 * 60 * 1000;
export const STALE_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 4000;
const MIN_TOKEN = 24;

// Cache per-isolate. Cukup untuk menahan lonjakan kunjungan; isolate baru hanya mengambil ulang.
const memory = new Map<string, LiveMenu>();

export function clearMenuCache(): void {
	memory.clear();
}

function config(env: MenuEnv | undefined): { base: string; token: string } | null {
	const token = env?.POS_API_TOKEN?.trim() ?? '';
	if (!env?.POS_MENU_URL || token.length < MIN_TOKEN) return null;
	try {
		const url = new URL(env.POS_MENU_URL);
		const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
		if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
		return { base: url.origin, token };
	} catch {
		return null;
	}
}

function parse(outletId: string, payload: unknown, now: number): LiveMenu | null {
	if (typeof payload !== 'object' || payload === null) return null;
	const raw = (payload as { items?: unknown }).items;
	if (!Array.isArray(raw)) return null;
	const items = new Map<string, PosMenuItem | null>();
	for (const entry of raw) {
		if (typeof entry !== 'object' || entry === null) continue;
		const e = entry as Record<string, unknown>;
		const price = Number(e.price);
		if (typeof e.name !== 'string' || !Number.isFinite(price) || price <= 0) continue;
		const jumbo = Number(e.jumboPrice);
		const key = menuKey(e.name);
		items.set(
			key,
			items.has(key)
				? null
				: {
						name: e.name,
						price,
						jumboPrice: Number.isFinite(jumbo) && jumbo > 0 ? jumbo : null,
						available: e.available === true
					}
		);
	}
	return { outletId, fetchedAt: now, items };
}

/** Menu hidup outlet, atau null bila belum tersambung / POS tak terjangkau dan cache sudah basi. */
export async function getLiveMenu(
	env: MenuEnv | undefined,
	outletId: string,
	opts: { fetchImpl?: FetchLike; now?: number } = {}
): Promise<LiveMenu | null> {
	const cfg = config(env);
	if (!cfg) return null;
	const now = opts.now ?? Date.now();
	const cached = memory.get(outletId);
	if (cached && now - cached.fetchedAt < FRESH_MS) return cached;
	try {
		const response = await (opts.fetchImpl ?? fetch)(
			`${cfg.base}/api/public/menu?outlet=${encodeURIComponent(outletId)}`,
			{
				headers: { authorization: `Bearer ${cfg.token}`, accept: 'application/json' },
				signal: AbortSignal.timeout(TIMEOUT_MS)
			}
		);
		if (response.ok) {
			const fresh = parse(outletId, await response.json().catch(() => null), now);
			if (fresh) {
				memory.set(outletId, fresh);
				return fresh;
			}
		}
		console.warn('[pos-menu] respons menu POS tidak dipakai', response.status);
	} catch (error) {
		console.warn('[pos-menu] gagal mengambil menu POS', error);
	}
	return cached && now - cached.fetchedAt < STALE_MS ? cached : null;
}
