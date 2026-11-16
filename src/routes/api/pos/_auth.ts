// Otorisasi server-ke-server dari ZatiarasPOS. Token bersama, dibandingkan waktu-konstan.
import { safeEqual, type ServerEnv } from '$lib/server/staff-session';

export function posAuthorized(request: Request, env: ServerEnv | undefined): boolean {
	const token = env?.POS_API_TOKEN;
	if (!token || token.length < 24) return false; // tidak dikonfigurasi atau terlalu pendek: tertutup
	const header = request.headers.get('authorization') ?? '';
	if (!header.startsWith('Bearer ')) return false;
	return safeEqual(header.slice(7), token);
}
