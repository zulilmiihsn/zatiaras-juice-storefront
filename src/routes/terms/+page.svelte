<script lang="ts">
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { AVAILABILITY_VERIFIED, MENU_VERIFIED } from '$lib/data/menu';

	const title = 'Syarat & Ketentuan | Zatiaras Juice';
	const description =
		'Informasi tentang penggunaan website, pemesanan pickup, outlet, group order, dan pembayaran Zatiaras Juice.';
	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Syarat & Ketentuan', url: canonical('/terms') }
		])
	);
	const orderingEnabled = MENU_VERIFIED && AVAILABILITY_VERIFIED;
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical('/terms')} />
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<article class="mx-auto max-w-3xl px-4 sm:px-6">
		<header class="mb-8 sm:mb-10">
			<p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Informasi layanan</p>
			<h1 class="mt-2 font-display text-3xl leading-tight font-extrabold text-ink sm:text-5xl">
				Syarat & Ketentuan
			</h1>
			<p class="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
				Ketentuan penggunaan storefront Zatiaras Juice untuk penjelajahan menu dan layanan pickup.
			</p>
		</header>

		<div class="space-y-5">
			<section
				class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950 sm:p-6"
				aria-labelledby="service-status"
			>
				<h2 id="service-status" class="font-bold">Status pemesanan online</h2>
				{#if !orderingEnabled}
					<p class="mt-2">
						Harga dan ketersediaan menu per outlet masih menunggu verifikasi. Checkout online belum
						aktif, sehingga data yang tampil di browser bukan bukti bahwa pesanan sudah diterima,
						dibayar, atau sedang dibuat oleh outlet.
					</p>
				{:else}
					<p class="mt-2">
						Pesanan baru dianggap diterima setelah kasir outlet mencocokkan pembayaran QRIS dan
						statusnya berubah. Tampilan status di browser bukan konfirmasi dari outlet.
					</p>
				{/if}
				<p class="mt-2">
					Pembayaran hanya lewat QRIS outlet dengan nominal yang tampil di halaman pesanan. Jangan
					mentransfer uang atau mengirim bukti bayar ke nomor yang tidak tampil di website ini.
				</p>
			</section>

			<section class="rounded-2xl border border-black/8 bg-white p-5 sm:p-6">
				<h2 class="font-display text-xl font-bold text-ink">Cakupan layanan</h2>
				<p class="mt-3 text-sm leading-relaxed text-neutral-700">
					Website membantu pelanggan menjelajahi menu dan outlet Zatiaras Juice. V1 berfokus pada
					<strong>pickup di outlet</strong>; website ini tidak menawarkan layanan delivery.
				</p>
			</section>

			<section class="rounded-2xl border border-black/8 bg-white p-5 sm:p-6">
				<h2 class="font-display text-xl font-bold text-ink">Outlet, harga, dan ketersediaan</h2>
				<p class="mt-3 text-sm leading-relaxed text-neutral-700">
					Satu pesanan pickup ditujukan ke satu outlet. Harga dan ketersediaan mengikuti outlet yang
					dipilih dan dapat berbeda antar-outlet. Pilihan outlet dari website tidak menggantikan
					konfirmasi operasional outlet.
				</p>
			</section>

			<section class="rounded-2xl border border-black/8 bg-white p-5 sm:p-6">
				<h2 class="font-display text-xl font-bold text-ink">Pesanan dan pembayaran</h2>
				<p class="mt-3 text-sm leading-relaxed text-neutral-700">
					Pesanan dibayar lewat QRIS di depan dengan nominal persis yang tampil setelah pesanan
					dibuat: harga menu ditambah kode unik beberapa rupiah. Kode unik adalah bagian dari
					jumlah yang kamu bayar, bukan biaya tambahan, dan dipakai kasir untuk mencocokkan
					pembayaran. Kasir memproses pesanan setelah pembayaran masuk. Pesanan yang belum dibayar
					kedaluwarsa dalam 30 menit. Tampilan status di browser bukan bukti pembayaran.
				</p>
				<p class="mt-3 text-sm leading-relaxed text-neutral-700">
					Bayar dengan nominal yang sama persis. Jika nominal berbeda, pembayaran masuk setelah
					pesanan kedaluwarsa, atau pesanan ditolak outlet padahal uang sudah masuk, hubungi outlet
					lewat WhatsApp dengan menyebut kode pesanan. Uang yang tidak berujung pada pesanan
					dikembalikan ke pembayar paling lambat 3 hari kerja setelah dikonfirmasi outlet.
				</p>
			</section>

			<section class="rounded-2xl border border-black/8 bg-white p-5 sm:p-6">
				<h2 class="font-display text-xl font-bold text-ink">Group order</h2>
				<p class="mt-3 text-sm leading-relaxed text-neutral-700">
					Permintaan group order harus ditinjau outlet terlebih dahulu. Mengirim permintaan bukan
					berarti pesanan sudah disetujui atau pembayaran sudah diminta. Pada versi website saat
					ini, permintaan disimpan lokal di browser dan belum otomatis diteruskan ke outlet. Jangan
					menganggapnya sebagai konfirmasi pemesanan.
				</p>
			</section>

			<section class="rounded-2xl border border-black/8 bg-white p-5 sm:p-6">
				<h2 class="font-display text-xl font-bold text-ink">Pembatalan, kendala, dan refund</h2>
				<p class="mt-3 text-sm leading-relaxed text-neutral-700">
					Pesanan dapat dibatalkan dengan menghubungi outlet lewat WhatsApp selama belum mulai
					diracik. Minuman yang sudah diracik tidak bisa dibatalkan atau dikembalikan, kecuali ada
					kesalahan dari outlet. Outlet yang memutuskan apakah pesanan sudah mulai diracik. Jika
					terjadi kendala pada pesanan, hubungi outlet lewat WhatsApp dengan menyebut kode pesanan;
					jangan mengirim data pembayaran rahasia melalui formulir feedback.
				</p>
			</section>

			<section class="rounded-2xl border border-black/8 bg-white p-5 sm:p-6">
				<h2 class="font-display text-xl font-bold text-ink">Sengketa dan hukum yang berlaku</h2>
				<p class="mt-3 text-sm leading-relaxed text-neutral-700">
					Ketentuan ini tunduk pada hukum Republik Indonesia. Perselisihan diselesaikan lebih dulu
					dengan musyawarah lewat outlet terkait. Jika belum selesai, pelanggan dapat mengadu ke
					Badan Penyelesaian Sengketa Konsumen atau menempuh jalur pengadilan yang berwenang.
				</p>
			</section>

			<p class="px-1 text-xs text-neutral-500">Terakhir diperbarui: 16 November 2026</p>
		</div>

		<nav
			class="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold"
			aria-label="Tautan terkait"
		>
			<a class="text-brand underline underline-offset-4 hover:text-brand-dark" href="/privacy">
				Kebijakan Privasi
			</a>
			<a class="text-brand underline underline-offset-4 hover:text-brand-dark" href="/feedback">
				Feedback
			</a>
			<a class="text-brand underline underline-offset-4 hover:text-brand-dark" href="/">
				Kembali ke Beranda
			</a>
		</nav>
	</article>
</div>
