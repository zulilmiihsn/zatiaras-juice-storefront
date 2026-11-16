import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FRESH_MS, STALE_MS, clearMenuCache, getLiveMenu, type MenuEnv } from './pos-menu';

const env: MenuEnv = { POS_MENU_URL: 'https://pos.example.test', POS_API_TOKEN: 'x'.repeat(24) };
const payload = {
	items: [
		{ name: 'Jus Alpukat', price: 24000, jumboPrice: 31000, available: true },
		{ name: 'jus  mangga', price: 20000, jumboPrice: null, available: false },
		{ name: 'Ganda', price: 1000, jumboPrice: null, available: true },
		{ name: 'GANDA', price: 2000, jumboPrice: null, available: true },
		{ name: 'Rusak', price: -5, available: true }
	]
};
const ok = () => Response.json(payload);

beforeEach(() => clearMenuCache());

describe('getLiveMenu', () => {
	it('null bila belum tersambung atau URL bukan HTTPS', async () => {
		expect(await getLiveMenu(undefined, 'juanda')).toBeNull();
		expect(await getLiveMenu({ ...env, POS_API_TOKEN: 'pendek' }, 'juanda')).toBeNull();
		expect(
			await getLiveMenu({ ...env, POS_MENU_URL: 'http://pos.example.test' }, 'juanda')
		).toBeNull();
	});

	it('mengurai menu: nama dinormalisasi, nama ganda = null, data rusak dibuang', async () => {
		const fetchImpl = vi.fn(async () => ok());
		const menu = await getLiveMenu(env, 'juanda', { fetchImpl, now: 1000 });
		expect(menu?.items.get('jus alpukat')).toMatchObject({
			price: 24000,
			jumboPrice: 31000,
			available: true
		});
		expect(menu?.items.get('jus mangga')?.available).toBe(false);
		expect(menu?.items.get('ganda')).toBeNull();
		expect(menu?.items.has('rusak')).toBe(false);
		const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://pos.example.test/api/public/menu?outlet=juanda');
		expect((init.headers as Record<string, string>).authorization).toBe(
			`Bearer ${env.POS_API_TOKEN}`
		);
	});

	it('cache: satu pengambilan dalam FRESH_MS, ambil ulang sesudahnya (hemat baca D1 POS)', async () => {
		const fetchImpl = vi.fn(async () => ok());
		await getLiveMenu(env, 'juanda', { fetchImpl, now: 0 });
		await getLiveMenu(env, 'juanda', { fetchImpl, now: FRESH_MS - 1 });
		expect(fetchImpl).toHaveBeenCalledTimes(1);
		await getLiveMenu(env, 'juanda', { fetchImpl, now: FRESH_MS + 1 });
		expect(fetchImpl).toHaveBeenCalledTimes(2);
		await getLiveMenu(env, 'merah-delima', { fetchImpl, now: 0 });
		expect(fetchImpl).toHaveBeenCalledTimes(3); // cache per outlet
	});

	it('POS mati: pakai cache lama sampai STALE_MS, setelah itu null', async () => {
		await getLiveMenu(env, 'juanda', { fetchImpl: async () => ok(), now: 0 });
		const down = async () => {
			throw new Error('jaringan mati');
		};
		const stale = await getLiveMenu(env, 'juanda', { fetchImpl: down, now: STALE_MS - 1 });
		expect(stale?.items.size).toBeGreaterThan(0);
		expect(await getLiveMenu(env, 'juanda', { fetchImpl: down, now: STALE_MS + 1 })).toBeNull();
	});

	it('respons 401/tak valid tidak pernah dianggap menu', async () => {
		expect(
			await getLiveMenu(env, 'juanda', {
				fetchImpl: async () => new Response('{}', { status: 401 })
			})
		).toBeNull();
		expect(
			await getLiveMenu(env, 'juanda', { fetchImpl: async () => Response.json({ x: 1 }) })
		).toBeNull();
	});
});
