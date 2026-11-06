<!-- MobileNav.svelte — drawer navigasi mobile.
Akses: fokus masuk saat buka, Escape tutup, fokus balik ke pemicu, kunci scroll.
Surface Fruit Cream, aksen Heritage Magenta. Hormat reduced-motion. -->
<script lang="ts">
	import { page } from '$app/state';
	import lockup from '$lib/assets/brand/ZJ_LOGO_PRIMARY_LOCKUP_MAGENTA_FILLED_v01.svg';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	const { open, onclose }: Props = $props();

	let panel: HTMLElement | null = $state(null);
	let prevFocus: Element | null = $state(null);

	const isActive = (prefix: string) => page.url.pathname.startsWith(prefix);
	const outletActive =
		isActive('/locations') ||
		isActive('/samarinda') ||
		isActive('/berau') ||
		isActive('/balikpapan');

	function onkeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
			return;
		}
		// Kunci Tab di dalam drawer.
		if (e.key !== 'Tab' || !panel) return;
		const items = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
		if (items.length === 0) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}

	$effect(() => {
		window.dispatchEvent(new CustomEvent('zatiaras:mobile-drawer', { detail: open }));
		if (open) {
			prevFocus = document.activeElement;
			document.body.style.overflow = 'hidden';
			requestAnimationFrame(() => {
				panel?.querySelector<HTMLElement>('a[href], button')?.focus();
			});
		} else {
			document.body.style.overflow = '';
			if (prevFocus instanceof HTMLElement) prevFocus.focus();
		}
		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 md:hidden"
		role="dialog"
		aria-modal="true"
		aria-label="Menu navigasi"
		tabindex="-1"
		{onkeydown}
	>
		<button
			type="button"
			class="absolute inset-0 bg-ink/40 motion-reduce:transition-none"
			aria-label="Tutup menu"
			onclick={onclose}
			tabindex="-1"
		></button>
		<div
			bind:this={panel}
			class="absolute top-0 right-0 bottom-0 flex w-[min(88vw,24rem)] max-w-full flex-col bg-cream pb-[env(safe-area-inset-bottom)] shadow-2xl motion-reduce:transition-none"
		>
			<div class="flex items-center justify-between border-b border-black/10 px-5 py-4">
				<img src={lockup} alt="Zatiaras Juice" class="h-8 w-auto" />
				<button
					type="button"
					onclick={onclose}
					aria-label="Tutup menu navigasi"
					class="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white font-bold"
				>
					✕
				</button>
			</div>
			<nav class="flex-1 overflow-y-auto px-5 py-4" aria-label="Menu utama mobile">
				<ul class="space-y-1">
					<li>
						<a
							href="/menu"
							onclick={onclose}
							aria-current={isActive('/menu') ? 'page' : undefined}
							class="block rounded-2xl px-4 py-3.5 text-base font-bold {isActive('/menu')
								? 'bg-brand-soft text-brand'
								: 'text-ink hover:bg-black/5'}">Menu</a
						>
					</li>
					<li>
						<a
							href="/locations"
							onclick={onclose}
							aria-current={outletActive ? 'page' : undefined}
							class="block rounded-2xl px-4 py-3.5 text-base font-bold {outletActive
								? 'bg-brand-soft text-brand'
								: 'text-ink hover:bg-black/5'}">Outlet</a
						>
					</li>
					<li>
						<a
							href="/group"
							onclick={onclose}
							aria-current={isActive('/group') ? 'page' : undefined}
							class="block rounded-2xl px-4 py-3.5 text-base font-bold {isActive('/group')
								? 'bg-brand-soft text-brand'
								: 'text-ink hover:bg-black/5'}">Pesan Rame-Rame</a
						>
					</li>
				</ul>
				<p class="mt-6 mb-2 px-4 text-xs font-bold tracking-wider text-neutral-500 uppercase">
					Lainnya
				</p>
				<ul class="space-y-1">
					<li>
						<a
							href="/track"
							onclick={onclose}
							class="block rounded-2xl px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-black/5"
							>Lacak Pesanan</a
						>
					</li>
					<li>
						<a
							href="/feedback"
							onclick={onclose}
							class="block rounded-2xl px-4 py-3 text-sm font-semibold text-ink/70 hover:bg-black/5"
							>Bantuan / Feedback</a
						>
					</li>
				</ul>
			</nav>
			<div class="border-t border-black/10 p-5">
				<a
					href="/menu"
					onclick={onclose}
					class="block rounded-full bg-brand px-6 py-3.5 text-center text-sm font-bold text-white"
					>Pesan Sekarang</a
				>
			</div>
		</div>
	</div>
{/if}
