// Harga dan ketersediaan hidup dari POS (lewat /api/menu), per outlet. SSR-safe: di server tidak
// mengambil apa pun. Tanpa data hidup (POS belum tersambung / tak terjangkau) semua fungsi jatuh
// ke data statis dan `verified` mengikuti AVAILABILITY_VERIFIED, jadi perilaku lama tetap utuh.
import { browser } from '$app/environment';
import type { Availability, OutletId } from '$lib/core/contracts';
import {
	AVAILABILITY_VERIFIED,
	availabilityFor as staticAvailability,
	priceFor as staticPrice,
	type PublicMenuItem
} from '$lib/data/menu';

interface LiveItem {
	available: boolean;
	price: number | null;
	jumboPrice: number | null;
}

const REFRESH_MS = 60_000;
let byOutlet = $state<Record<string, Record<string, LiveItem>>>({});
const fetchedAt = new Map<string, number>();
const inflight = new Set<string>();

export const liveMenu = {
	/** Ambil (atau segarkan bila >60 dtk) menu hidup outlet. Aman dipanggil berulang. */
	async ensure(outletId: string | null | undefined): Promise<void> {
		if (!browser || !outletId || inflight.has(outletId)) return;
		if (Date.now() - (fetchedAt.get(outletId) ?? 0) < REFRESH_MS) return;
		inflight.add(outletId);
		try {
			const response = await fetch(`/api/menu?outlet=${encodeURIComponent(outletId)}`);
			if (!response.ok) return;
			const body = (await response.json()) as {
				live: boolean;
				items: Array<{ slug: string } & LiveItem>;
			};
			fetchedAt.set(outletId, Date.now());
			if (body.live) {
				byOutlet = {
					...byOutlet,
					[outletId]: Object.fromEntries(body.items.map(({ slug, ...rest }) => [slug, rest]))
				};
			} else {
				const { [outletId]: _drop, ...rest } = byOutlet;
				void _drop;
				byOutlet = rest;
			}
		} catch (error) {
			console.warn('[live-menu] gagal memuat menu hidup', error);
		} finally {
			inflight.delete(outletId);
		}
	},
	/** True bila data outlet ini bisa dipercaya: statis terverifikasi atau menu hidup POS tersedia. */
	verified(outletId: string | null | undefined): boolean {
		return AVAILABILITY_VERIFIED || Boolean(outletId && byOutlet[outletId]);
	},
	availabilityFor(item: PublicMenuItem, outletId: OutletId): Availability {
		const live = byOutlet[outletId];
		if (!live) return staticAvailability(item, outletId);
		return live[item.slug]?.available ? 'AVAILABLE' : 'SOLD_OUT';
	},
	priceFor(item: PublicMenuItem, outletId: OutletId): number {
		return byOutlet[outletId]?.[item.slug]?.price ?? staticPrice(item, outletId);
	}
};
