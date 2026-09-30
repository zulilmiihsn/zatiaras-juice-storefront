// Slot pickup. Kapasitas OPEN, configurable. MOCK jadwal.
// ADR 2026-09-25: slot generik per outlet (5 outlet); label fallback bila belum dikonfig.
import { OUTLETS } from '$lib/core/outlets';

export interface Slot {
	id: string;
	outletId: string;
	label: string;
}

export const SLOTS: Slot[] = [
	{ id: 'juanda-sekarang', outletId: 'juanda', label: 'Secepatnya (±20 mnt)' },
	{ id: 'juanda-1jam', outletId: 'juanda', label: '+1 jam' },
	{ id: 'slamet-sekarang', outletId: 'slamet-riyadi', label: 'Secepatnya (±20 mnt)' },
	{ id: 'slamet-1jam', outletId: 'slamet-riyadi', label: '+1 jam' },
	{ id: 'merah-delima-sekarang', outletId: 'merah-delima', label: 'Secepatnya (±20 mnt)' },
	{ id: 'merah-delima-1jam', outletId: 'merah-delima', label: '+1 jam' },
	{ id: 'kutilang-sekarang', outletId: 'kutilang', label: 'Secepatnya (±20 mnt)' },
	{ id: 'kutilang-1jam', outletId: 'kutilang', label: '+1 jam' },
	{ id: 'gatot-subroto-sekarang', outletId: 'gatot-subroto', label: 'Secepatnya (±20 mnt)' },
	{ id: 'gatot-subroto-1jam', outletId: 'gatot-subroto', label: '+1 jam' }
];

export function slotsFor(outletId: string): Slot[] {
	const found = SLOTS.filter((s) => s.outletId === outletId);
	if (found.length > 0) return found;
	if (!OUTLETS.some((o) => o.id === outletId)) return [];
	return [
		{ id: `${outletId}-sekarang`, outletId, label: 'Secepatnya (±20 mnt)' },
		{ id: `${outletId}-1jam`, outletId, label: '+1 jam' }
	];
}
