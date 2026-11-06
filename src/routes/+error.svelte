<script lang="ts">
	import { page } from '$app/state';

	const notFound = $derived(page.status === 404);
	const title = $derived(notFound ? 'Halaman tidak ditemukan' : 'Ada kendala');
</script>

<svelte:head>
	<title>{title} | Zatiaras Juice</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="bg-cream px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="error-title">
	<div
		class="mx-auto max-w-2xl rounded-3xl border border-black/8 bg-white p-7 text-center shadow-xs sm:p-12"
	>
		<p class="text-xs font-extrabold tracking-[0.18em] text-brand uppercase">
			{notFound ? '404 · Tidak ditemukan' : 'Terjadi kendala'}
		</p>
		<h1
			id="error-title"
			class="mt-3 font-display text-3xl leading-tight font-extrabold text-ink sm:text-5xl"
		>
			{title}
		</h1>
		<p class="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-neutral-600 sm:text-base">
			{notFound
				? 'Sepertinya tautan ini sudah berubah atau alamatnya tidak tepat. Kamu bisa lanjut menjelajahi menu atau mencari outlet.'
				: 'Maaf, halaman ini belum bisa ditampilkan. Coba kembali ke halaman utama atau jelajahi menu Zatiaras.'}
		</p>
		<nav class="mt-8 flex flex-col justify-center gap-3 sm:flex-row" aria-label="Pilihan halaman">
			<a
				href="/"
				class="tap-scale inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
			>
				Kembali ke Beranda
			</a>
			<a
				href="/menu"
				class="tap-scale inline-flex min-h-12 items-center justify-center rounded-full border border-brand/35 bg-white px-7 py-3 text-sm font-bold text-brand transition hover:border-brand hover:bg-brand hover:text-white"
			>
				Lihat Menu
			</a>
			<a
				href="/locations"
				class="tap-scale inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-7 py-3 text-sm font-bold text-ink transition hover:border-brand hover:text-brand"
			>
				Cari Outlet
			</a>
		</nav>
	</div>
</section>
