// Pertanyaan yang paling sering ditanyakan. Hanya fakta yang sudah dikonfirmasi pemilik
// (Brand Guidelines V1.2, keputusan 14-16 Nov 2026). Tanpa harga menu: harga mengikuti
// outlet dan ditampilkan di halaman Menu setelah diverifikasi.
import { JUMBO_UPCHARGE } from '$lib/core/options';
import { rupiah } from '$lib/core/whatsapp-order';

export interface FaqItem {
	q: string;
	a: string;
}

export const FAQ: FaqItem[] = [
	{
		q: 'Berapa harga jusnya',
		a: 'Harga mengikuti kota dan outlet, dan bisa dicari per buah di halaman Menu. Pilih outlet dulu supaya harga yang tampil sesuai.'
	},
	{
		q: 'Reguler dan Jumbo bedanya apa',
		a: `Reguler 16 oz, Jumbo 22 oz. Jumbo ${rupiah(JUMBO_UPCHARGE)} lebih mahal dan tersedia untuk jus buah, mix jus, dan kocok.`
	},
	{
		q: 'Manis dan esnya bisa diatur',
		a: 'Bisa. Saat memesan, pilih manis (normal, kurang manis, atau tanpa gula) dan es (normal, sedikit es, atau tanpa es).'
	},
	{
		q: 'Jusnya dibuat kapan',
		a: 'Saat dipesan, bukan dari stok jus jadi.'
	},
	{
		q: 'Bagaimana cara pesan dan bayarnya',
		a: 'Pilih outlet dan menu, isi nama, lalu bayar lewat QRIS sesuai nominal yang tampil di halaman pesanan. Kasir memproses pesananmu begitu pembayaran masuk, lalu kamu ambil di outlet.'
	},
	{
		q: 'Bisa pesan antar',
		a: 'Untuk diantar, cari Zatiaras Juice di GoFood dan GrabFood. Pemesanan di situs ini untuk diambil sendiri di outlet.'
	}
];
