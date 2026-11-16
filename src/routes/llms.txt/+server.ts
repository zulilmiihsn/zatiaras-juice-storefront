// Ringkasan situs untuk asisten AI (llms.txt). Dibuat dari data outlet yang sama dengan situs,
// jadi tidak bisa menyimpang. Alamat yang belum terverifikasi sengaja tidak ditulis.
import { CITIES, OUTLETS, formatOutletHours } from '$lib/core/outlets';
import { SITE_NAME, SITE_URL } from '$lib/seo';

export function GET(): Response {
	const lines: string[] = [
		`# ${SITE_NAME}`,
		'',
		'> Kedai jus dan minuman buah di Kalimantan Timur, Indonesia. Outlet di Samarinda, Berau, dan Balikpapan. Jus dibuat saat dipesan. Pesan lewat situs lalu ambil di outlet. Ukuran Reguler 16 oz dan Jumbo 22 oz, manis dan es bisa diatur.',
		'',
		'## Halaman utama',
		`- [Menu](${SITE_URL}/menu): daftar menu dan harga per outlet`,
		`- [Outlet](${SITE_URL}/locations): semua outlet, alamat, dan jam buka`,
		`- [Tentang](${SITE_URL}/about)`,
		'',
		'## Kota'
	];
	for (const c of CITIES) lines.push(`- [Jus di ${c.name}](${SITE_URL}/${c.id}): ${c.tagline}`);
	lines.push('', '## Outlet');
	for (const o of OUTLETS) {
		const addr = o.address.startsWith('VERIFY') ? '' : `${o.address}. `;
		lines.push(`- [${SITE_NAME} ${o.name}, ${o.city}](${SITE_URL}/${o.cityId}/${o.id}): ${addr}Jam: ${formatOutletHours(o.hours)}`);
	}
	return new Response(lines.join('\n') + '\n', {
		headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
	});
}
