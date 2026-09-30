<script lang="ts">
	import { canonical, breadcrumbJsonLd, jsonLdTag } from '$lib/seo';
	import { KERN_MAP } from '$lib/kern';
	import zcup from '$lib/assets/brand/ZJ_CUP_STANDALONE.svg';

	const title = 'Tentang Zatiaras Juice | Buahnya Berasa';
	const desc =
		'Storefront pickup mandiri Zatiaras Juice di Samarinda, Berau, Balikpapan. Temukan menu, kota, dan outlet pilihanmu.';

	const ldCrumb = jsonLdTag(
		breadcrumbJsonLd([
			{ name: 'Home', url: canonical('/') },
			{ name: 'Tentang Kami', url: canonical('/about') }
		])
	);
</script>

{#snippet kerned(text: string)}
	{#each text.split(' ') as word, wi}
		{#if wi > 0}{' '}{/if}<span class="whitespace-nowrap" aria-hidden="true"
			>{#each [...word] as ch}<span
					class="inline-block"
					style:transform={`translateY(${KERN_MAP[ch] ?? 0}em)`}>{ch}</span
				>{/each}</span
		>
	{/each}
{/snippet}

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical('/about')} />
	{@html ldCrumb}
</svelte:head>

<div class="bg-cream py-8 sm:py-14">
	<div class="mx-auto max-w-4xl px-4 sm:px-6">
		<div class="text-left sm:text-center">
			<div
				class="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1 text-xs font-bold text-neutral-600 shadow-xs"
			>
				<span class="h-2 w-2 rounded-full bg-brand"></span>
				TENTANG KAMI
			</div>
			<h1
				class="mt-3 font-display text-3xl leading-tight font-extrabold text-ink sm:text-5xl"
				aria-label="Tentang Zatiaras Juice"
			>
				{@render kerned('Buahnya Berasa. Kentalnya Beneran.')}
			</h1>
			<div class="cup-lip-bar mt-3 w-12 sm:mx-auto"></div>
			<p class="mt-3 max-w-lg text-xs leading-relaxed text-neutral-600 sm:mx-auto sm:text-sm">
				Zatiaras Juice adalah storefront digital mandiri dan penyedia minuman buah segar harian di
				Samarinda, Berau, dan Balikpapan.
			</p>
		</div>

		<div class="mt-10 space-y-6">
			<!-- CARD 1: NILAI PRODUK -->
			<div class="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xs sm:p-8">
				<div class="flex flex-col gap-6 sm:flex-row sm:items-center">
					<div
						class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-soft"
					>
						<img src={zcup} alt="Z-Cup" class="h-14 w-auto" />
					</div>
					<div>
						<h2 class="font-display text-2xl text-ink" aria-label="Jus Buah Asli">
							{@render kerned('Bukan Sirup Perisa, Buah Asli')}
						</h2>
						<p class="mt-2 text-xs leading-relaxed text-neutral-600 sm:text-sm">
							Setiap cangkir jus Zatiaras dibuat dari potongan buah segar pilihan. Kami mengutamakan
							kekentalan alami dan rasa buah yang pekat tanpa pemanis sintetis berlebihan.
						</p>
					</div>
				</div>
			</div>

			<!-- CARD 2: OUTLET MULTI-KOTA -->
			<div class="grid gap-6 sm:grid-cols-2">
				<div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
					<h3 class="font-bold text-ink">Lima Outlet, Tiga Kota</h3>
					<p class="mt-2 text-xs leading-relaxed text-neutral-600">
						Samarinda (Juanda · Slamet Riyadi), Berau (Merah Delima), Balikpapan (Kutilang · Gatot
						Subroto). Satu pesanan untuk satu outlet pickup.
					</p>
				</div>
				<div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
					<h3 class="font-bold text-ink">Self-Order Pickup Cepat</h3>
					<p class="mt-2 text-xs leading-relaxed text-neutral-600">
						Pesan dari kantor atau rumah, pilih slot pengambilan, dan bayar lewat web. Saat kamu
						tiba di outlet, jus sudah siap tanpa antrean panjang kasir.
					</p>
				</div>
			</div>

			<!-- CARD 3: DUKUNGAN MANUSIA -->
			<div class="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
				<h3 class="font-bold text-ink">Komitmen Pelayanan: Dukungan Manusia</h3>
				<p class="mt-2 text-xs leading-relaxed text-neutral-600 sm:text-sm">
					Jika terjadi kendala ketersediaan buah setelah pesanan kamu dibayar, sistem kami tidak
					menyembunyikan masalah di balik bot kaku. Staf operasional manusia akan langsung terhubung
					lewat WhatsApp untuk menawarkan solusi penggantian menu atau pengembalian dana secepatnya.
				</p>
			</div>
		</div>

		<!-- CTA -->
		<div class="mt-10 text-center">
			<a
				href="/menu"
				class="tap-scale inline-block rounded-full bg-brand px-8 py-4 text-xs font-bold text-white shadow-xl shadow-brand/25 transition hover:bg-brand-dark"
			>
				Lihat Menu & Mulai Order →
			</a>
		</div>
	</div>
</div>
