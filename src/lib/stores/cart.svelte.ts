// Store cart Svelte 5 runes + persist lokal. SSR-safe.
// ADR 2026-09-25: satu cart = satu outlet; ingat outlet terakhir; switch via revalidasi.
import {
	addLine as addPure,
	revalidateForOutlet,
	setQty as setPure,
	subtotal as subPure,
	type Line,
	type RevalidationResult
} from './cart-logic';
import type { OutletId } from '$lib/core/contracts';
import { isValidOutletId } from '$lib/core/outlets';
import { rememberOutlet } from '$lib/location/suggest';

export type { Line };

const CART_KEY = 'z-cart';
const OUTLET_KEY = 'z-cart-outlet';

function loadLines(): Line[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
	} catch {
		return [];
	}
}

function loadOutlet(): string {
	if (typeof localStorage === 'undefined') return 'juanda';
	try {
		const v = localStorage.getItem(OUTLET_KEY) ?? localStorage.getItem('z-last-outlet') ?? 'juanda';
		return isValidOutletId(v) ? v : 'juanda';
	} catch {
		return 'juanda';
	}
}

let lines = $state<Line[]>(loadLines());
let outletId = $state<string>(loadOutlet());

function save(): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(CART_KEY, JSON.stringify(lines));
	localStorage.setItem(OUTLET_KEY, outletId);
}

export const cart = {
	get lines(): Line[] {
		return lines;
	},
	get count(): number {
		return lines.reduce((s, l) => s + l.qty, 0);
	},
	get outletId(): string {
		return outletId;
	},
	get subtotal(): number {
		return subPure(lines);
	},
	get empty(): boolean {
		return lines.length === 0;
	},
	setOutlet(id: string): void {
		if (id !== outletId) {
			lines = [];
			outletId = id;
			rememberOutlet(id, 'manual');
			save();
		}
	},
	// Pindah outlet dengan revalidasi: kembalikan hasil agar UI bisa tampilkan warning.
	switchOutletWithRevalidation(id: OutletId): RevalidationResult {
		const result = revalidateForOutlet(lines, id);
		lines = result.lines;
		outletId = id;
		rememberOutlet(id, 'manual');
		save();
		return result;
	},
	add(next: Line): void {
		const r = addPure(lines, next);
		if (r !== lines) {
			lines = r;
			outletId = next.outletId;
			rememberOutlet(next.outletId, 'manual');
			save();
		}
	},
	qty(menuItemId: string, qty: number): void {
		lines = setPure(lines, menuItemId, qty);
		save();
	},
	clear(): void {
		lines = [];
		save();
	}
};
