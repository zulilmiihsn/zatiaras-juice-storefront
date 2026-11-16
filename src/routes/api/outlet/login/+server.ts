import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidOutletId } from '$lib/core/outlets';
import { COOKIE, SESSION_MS, pinFor, safeEqual, signSession, type ServerEnv } from '$lib/server/staff-session';

export const POST: RequestHandler = async ({ request, platform, cookies, url }) => {
	const env = platform?.env as unknown as ServerEnv | undefined;
	if (!env?.STAFF_SESSION_SECRET) return json({ error: 'staff_not_configured' }, { status: 503 });
	let body: { outletId?: string; pin?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad_request' }, { status: 400 });
	}
	const outletId = String(body.outletId ?? '');
	const expected = isValidOutletId(outletId) ? pinFor(env, outletId) : null;
	// Selalu bandingkan sesuatu agar waktu respons tidak membocorkan outlet mana yang punya PIN.
	const ok = safeEqual(String(body.pin ?? ''), expected ?? '\u0000no-pin');
	if (!expected || !ok) return json({ error: 'wrong_pin' }, { status: 401 });
	const token = await signSession(env.STAFF_SESSION_SECRET, outletId, Date.now());
	cookies.set(COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: url.protocol === 'https:',
		maxAge: SESSION_MS / 1000
	});
	return json({ ok: true, outletId });
};
