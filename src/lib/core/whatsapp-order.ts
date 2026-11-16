// Pesan WhatsApp untuk jalur kasir (tanpa gateway). Murni, tanpa DOM, mudah dites.
// Kasir membaca pesan ini dan mengetik ulang ke POS, jadi formatnya tetap, satu baris per item.
import type { Order, Outlet } from './contracts';
import { ICE_LABEL, SIZE_LABEL, SWEET_LABEL } from './options';

export interface PickupChoice {
	id: string;
	label: string;
	minutes: number;
}

// Pilihan waktu ambil yang diajukan pelanggan. Jam siap tetap dikonfirmasi kasir.
export const PICKUP_CHOICES: PickupChoice[] = [
	{ id: 'now', label: 'Secepatnya', minutes: 0 },
	{ id: '15', label: '15 menit lagi', minutes: 15 },
	{ id: '30', label: '30 menit lagi', minutes: 30 },
	{ id: '60', label: '1 jam lagi', minutes: 60 }
];

export const WITA_OFFSET_MIN = 8 * 60;

// Jam dinding WITA (UTC+8) untuk waktu `now` ditambah `addMin`, format 'HH.MM'.
export function witaClock(now: Date, addMin = 0): string {
	const t = new Date(now.getTime() + (WITA_OFFSET_MIN + addMin) * 60_000);
	const hh = String(t.getUTCHours()).padStart(2, '0');
	const mm = String(t.getUTCMinutes()).padStart(2, '0');
	return `${hh}.${mm}`;
}

export function pickupText(choice: PickupChoice, now: Date): string {
	return choice.minutes === 0
		? choice.label
		: `${choice.label} (sekitar ${witaClock(now, choice.minutes)} WITA)`;
}

export function rupiah(n: number): string {
	return 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// '0812-3456' -> '62812...'; '+62812...' -> '62812...'. Hanya digit.
export function normalizeWaNumber(raw: string): string {
	let d = raw.replace(/\D/g, '');
	if (d.startsWith('0')) d = '62' + d.slice(1);
	return d;
}

// Nomor tujuan pesanan: telepon outlet bila ada, jika tidak nomor resmi yang sudah dikonfigurasi.
// Null = belum ada nomor terverifikasi, UI wajib menutup tombol kirim (fail-closed).
export function resolveOrderNumber(
	outlet: Pick<Outlet, 'phone'>,
	fallback: { number: string; configured: boolean }
): string | null {
	if (outlet.phone) return normalizeWaNumber(outlet.phone);
	return fallback.configured ? normalizeWaNumber(fallback.number) : null;
}

export interface MessageInput {
	order: Order;
	outletName: string;
	city: string;
	pickupLabel: string;
	note?: string;
}

function itemLine(i: Order['items'][number], n: number): string {
	const size = i.size ? `, ${SIZE_LABEL[i.size]}` : '';
	const head = `${n}. ${i.name ?? i.menuItemId}${size} x${i.qty} = ${rupiah(i.unitPrice * i.qty)}`;
	const opts: string[] = [];
	if (i.sweet) opts.push(`Manis: ${SWEET_LABEL[i.sweet]}`);
	if (i.ice) opts.push(`Es: ${ICE_LABEL[i.ice]}`);
	return opts.length ? `${head}\n   ${opts.join(', ')}` : head;
}

export function buildOrderMessage(m: MessageInput): string {
	const { order } = m;
	const lines = [
		'Halo Zatiaras Juice, saya mau pesan untuk diambil',
		'',
		`Kode: ${order.id}`,
		`Outlet: ${m.outletName} (${m.city})`,
		`Diambil: ${m.pickupLabel}`,
		`Nama: ${order.contact.name}`,
		'',
		...order.items.map((i, k) => itemLine(i, k + 1)),
		'',
		`Total: ${rupiah(order.total)}`,
		'Bayar: saat ambil di kasir, tunai atau QRIS'
	];
	if (m.note?.trim()) lines.push(`Catatan: ${m.note.trim()}`);
	return lines.join('\n');
}

export function waOrderLink(number: string, message: string): string {
	return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
