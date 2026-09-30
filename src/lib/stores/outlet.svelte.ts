// Store outlet runes + persist lokal. SSR-safe. Backend final ganti sumber.
import type { Availability, OutletLoad } from '$lib/core/contracts';
import { getAvail as getPure, setAvail as setPure, setLoad as setLoadPure } from './outlet-logic';

const LOAD_KEY = 'z-outlet-load';
const AVAIL_KEY = 'z-outlet-avail';

function read<T>(key: string, fallback: T): T {
	if (typeof localStorage === 'undefined') return fallback;
	try {
		return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
	} catch {
		return fallback;
	}
}

let loads = $state<Record<string, OutletLoad>>(read(LOAD_KEY, {}));
let avails = $state<Record<string, Availability>>(read(AVAIL_KEY, {}));

function saveLoad(): void {
	if (typeof localStorage !== 'undefined') localStorage.setItem(LOAD_KEY, JSON.stringify(loads));
}

function saveAvail(): void {
	if (typeof localStorage !== 'undefined') localStorage.setItem(AVAIL_KEY, JSON.stringify(avails));
}

export const outlet = {
	getLoad(id: string): OutletLoad {
		return loads[id] ?? 'NORMAL';
	},
	setLoad(id: string, load: OutletLoad): void {
		loads = setLoadPure(loads, id, load);
		saveLoad();
	},
	getAvail(outletId: string, menuId: string): Availability {
		return getPure(avails, outletId, menuId);
	},
	setAvail(outletId: string, menuId: string, st: Availability): void {
		avails = setPure(avails, outletId, menuId, st);
		saveAvail();
	}
};
