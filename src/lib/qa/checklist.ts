// QUALITY.md gates. Checklist soft launch. Backend final wajib bukti riil.
export interface Gate {
	id: string;
	label: string;
}

export interface Section {
	id: string;
	title: string;
	gates: Gate[];
}

export const SECTIONS: Section[] = [
	{
		id: 'fungsi',
		title: 'Fungsi',
		gates: [
			{ id: 'menu', label: 'Menu browse jalan' },
			{ id: 'outlet-select', label: 'Pilih outlet jalan' },
			{ id: 'cart', label: 'Cart tambah kurang subtotal jalan' },
			{ id: 'guest-checkout', label: 'Guest checkout tanpa akun jalan' },
			{ id: 'invalid-block', label: 'Checkout invalid diblokir' },
			{ id: 'pay-verify', label: 'Payment server-verified' },
			{ id: 'webhook-dup', label: 'Duplikat webhook tidak ganda' },
			{ id: 'queue', label: 'Order bayar masuk antrian outlet' },
			{ id: 'crew-flow', label: 'Crew proses → siap → selesai jalan' },
			{ id: 'exception', label: 'Kendala bayar tampil WA manusia' },
			{ id: 'soldout', label: 'Soldout tidak bisa dipesan baru' },
			{ id: 'paused', label: 'Outlet jeda tolak order baru' }
		]
	},
	{
		id: 'payment',
		title: 'Payment',
		gates: [
			{ id: 'p-ok', label: 'Sukses' },
			{ id: 'p-fail', label: 'Gagal' },
			{ id: 'p-exp', label: 'Kedaluwarsa' },
			{ id: 'p-dup', label: 'Duplikat webhook' },
			{ id: 'p-late', label: 'Webhook telat' },
			{ id: 'p-amount', label: 'Nominal beda ditolak' },
			{ id: 'p-sig', label: 'Signature invalid ditolak' },
			{ id: 'p-fulfill', label: 'Bayar tapi gagal buat → recovery' },
			{ id: 'p-refund', label: 'Jalur refund' }
		]
	},
	{
		id: 'crew',
		title: 'Crew UAT',
		gates: [
			{ id: 'c-new', label: 'Kenali order web baru' },
			{ id: 'c-paid', label: 'Paham status bayar' },
			{ id: 'c-proses', label: 'Mulai proses' },
			{ id: 'c-ready', label: 'Tandai siap' },
			{ id: 'c-done', label: 'Selesaikan' },
			{ id: 'c-avail', label: 'Ubah availability' },
			{ id: 'c-pause', label: 'Jeda order web' },
			{ id: 'c-fail', label: 'Alur tidak bisa proses' }
		]
	},
	{
		id: 'customer',
		title: 'Customer',
		gates: [
			{ id: 'u-purpose', label: 'Paham tujuan situs' },
			{ id: 'u-menu', label: 'Temu menu harga' },
			{ id: 'u-outlet', label: 'Pilih outlet' },
			{ id: 'u-checkout', label: 'Selesai checkout' },
			{ id: 'u-pay', label: 'Paham pembayaran' },
			{ id: 'u-pickup', label: 'Paham status pickup' },
			{ id: 'u-help', label: 'Temu bantuan manusia' }
		]
	},
	{
		id: 'tech',
		title: 'Teknis',
		gates: [
			{ id: 't-lcp', label: 'LCP ≤ 2.5s p75 mobile' },
			{ id: 't-inp', label: 'INP ≤ 200ms p75' },
			{ id: 't-cls', label: 'CLS ≤ 0.1' },
			{ id: 't-a11y', label: 'Keyboard fokus label kontras motion' },
			{ id: 't-seo', label: 'Title desc canonical sitemap schema' },
			{ id: 't-brand', label: 'Aset resmi dipakai, cek PDF' }
		]
	},
	{
		id: 'nogo',
		title: 'No-go bila',
		gates: [
			{ id: 'n-pay', label: 'Payment truth goyang' },
			{ id: 'n-dup', label: 'Order ganda' },
			{ id: 'n-crew', label: 'Crew tidak bisa operasikan' },
			{ id: 'n-rec', label: 'Kendala bayar tanpa recovery' },
			{ id: 'n-data', label: 'Info cabang menu salah material' },
			{ id: 'n-mobile', label: 'Checkout mobile rusak' },
			{ id: 'n-anal', label: 'Analytics kritis absen' }
		]
	}
];

export function progress(total: number, done: number): number {
	if (total <= 0) return 0;
	return Math.round((done / total) * 100);
}
