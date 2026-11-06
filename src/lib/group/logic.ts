// FR-GROUP. Approval threshold belum dikonfigurasi; setiap request masuk REVIEWING.
import { browser } from '$app/environment';
import type { GroupOrderState, OutletId } from '$lib/core/contracts';

export interface GroupLine {
	menuItemId: string;
	qty: number;
}

export interface GroupRequest {
	id: string;
	outletId: OutletId | string;
	name: string;
	whatsapp: string;
	schedule: string;
	lines: GroupLine[];
	state: GroupOrderState;
	note?: string;
}

export function totalCups(lines: GroupLine[]): number {
	return lines.reduce((s, l) => s + l.qty, 0);
}

const GKEY = 'z-group';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randChar(): string {
	let n: number;
	if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
		const buf = new Uint32Array(1);
		crypto.getRandomValues(buf);
		n = buf[0] % CODE_ALPHABET.length;
	} else {
		n = Math.floor(Math.random() * CODE_ALPHABET.length);
	}
	return CODE_ALPHABET[n];
}

export function makeGroupCode(existing: string[] = []): string {
	const taken = new Set(existing);
	let code: string;
	do {
		code = `GR-${Array.from({ length: 6 }, randChar).join('')}`;
	} while (taken.has(code));
	return code;
}

function uid(all: GroupRequest[] = []): string {
	return makeGroupCode(all.map((g) => g.id));
}

export function listGroups(): GroupRequest[] {
	if (!browser) return [];
	try {
		return JSON.parse(localStorage.getItem(GKEY) ?? '[]');
	} catch {
		return [];
	}
}

export function getGroup(id: string): GroupRequest | undefined {
	return listGroups().find((g) => g.id === id);
}

function persist(all: GroupRequest[]): void {
	if (browser) localStorage.setItem(GKEY, JSON.stringify(all));
}

export function submitGroupPure(
	all: GroupRequest[],
	input: Omit<GroupRequest, 'id' | 'state'>
): GroupRequest[] {
	return [...all, { ...input, id: uid(all), state: 'REVIEWING' }];
}

export function submitGroup(input: Omit<GroupRequest, 'id' | 'state'>): GroupRequest {
	const next = submitGroupPure(listGroups(), input);
	persist(next);
	return next[next.length - 1];
}

export function reviewGroupPure(
	all: GroupRequest[],
	id: string,
	ok: boolean,
	note = ''
): GroupRequest[] {
	const i = all.findIndex((g) => g.id === id);
	if (i < 0) throw new Error('group_not_found');
	if (all[i].state !== 'REQUESTED' && all[i].state !== 'REVIEWING')
		throw new Error('group_state_locked');
	const next = [...all];
	next[i] = { ...next[i], state: ok ? 'APPROVED' : 'REJECTED', note };
	return next;
}

export function reviewGroup(id: string, ok: boolean, note = ''): GroupRequest {
	const next = reviewGroupPure(listGroups(), id, ok, note);
	persist(next);
	return next.find((g) => g.id === id) as GroupRequest;
}

export function advanceGroupPure(
	all: GroupRequest[],
	id: string,
	to: GroupOrderState
): GroupRequest[] {
	const allowed: Record<string, string[]> = {
		APPROVED: ['PENDING_PAYMENT'],
		PENDING_PAYMENT: ['CONFIRMED'],
		CONFIRMED: ['SCHEDULED_PREPARATION'],
		SCHEDULED_PREPARATION: ['READY'],
		READY: ['COMPLETED']
	};
	const i = all.findIndex((g) => g.id === id);
	if (i < 0) throw new Error('group_not_found');
	if (!(allowed[all[i].state] ?? []).includes(to))
		throw new Error(`illegal-group:${all[i].state}->${to}`);
	const next = [...all];
	next[i] = { ...next[i], state: to };
	return next;
}

export function advanceGroup(id: string, to: GroupOrderState): GroupRequest {
	const next = advanceGroupPure(listGroups(), id, to);
	persist(next);
	return next.find((g) => g.id === id) as GroupRequest;
}
