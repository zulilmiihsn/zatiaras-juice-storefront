// Sesi kasir per outlet: PIN dicek di server, hasilnya cookie bertanda tangan HMAC.
// Tanpa akun. PIN dan kunci tanda tangan ada di secret Cloudflare, bukan di kode.
const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(secret: string, msg: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

// Perbandingan waktu-tetap untuk string pendek.
export function safeEqual(a: string, b: string): boolean {
	const x = enc.encode(a);
	const y = enc.encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diff === 0;
}

export const SESSION_MS = 12 * 60 * 60 * 1000;
export const COOKIE = 'zj_staff';

export async function signSession(secret: string, outletId: string, now: number): Promise<string> {
	const exp = now + SESSION_MS;
	const body = `${outletId}.${exp}`;
	return `${body}.${await hmac(secret, body)}`;
}

// Kembalikan outletId bila token sah dan belum kedaluwarsa, selain itu null.
export async function verifySession(
	secret: string,
	token: string | undefined,
	now: number
): Promise<string | null> {
	if (!secret || !token) return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	const [outletId, exp, sig] = parts;
	if (!/^\d+$/.test(exp) || Number(exp) < now) return null;
	if (!safeEqual(sig, await hmac(secret, `${outletId}.${exp}`))) return null;
	return outletId;
}

export interface ServerEnv {
	DB?: D1Database;
	POS_API_TOKEN?: string; // rahasia bersama dengan ZatiarasPOS (server ke server)
	POS_MENU_URL?: string; // alamat HTTPS ZatiarasPOS untuk menu hidup
	OUTLET_PINS?: string; // JSON: {"juanda":"123456",...}
	STAFF_SESSION_SECRET?: string;
}

export function pinFor(env: ServerEnv, outletId: string): string | null {
	try {
		const map = JSON.parse(env.OUTLET_PINS ?? '{}') as Record<string, string>;
		const pin = map[outletId];
		return typeof pin === 'string' && pin.length >= 4 ? pin : null;
	} catch {
		return null;
	}
}
