-- Pesanan web jalur kasir (WhatsApp, bayar saat ambil). Tanpa nomor WhatsApp pelanggan:
-- pelanggan mengirim dari WhatsApp-nya sendiri, jadi tidak ada data kontak yang perlu disimpan.
CREATE TABLE IF NOT EXISTS orders (
	id            TEXT PRIMARY KEY,
	outlet_id     TEXT NOT NULL,
	state         TEXT NOT NULL,
	payment_mode  TEXT NOT NULL DEFAULT 'CASHIER',
	customer_name TEXT NOT NULL,
	pickup_note   TEXT,
	note          TEXT,
	total         INTEGER NOT NULL,
	items_json    TEXT NOT NULL,
	created_at    INTEGER NOT NULL,
	updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_state ON orders (outlet_id, state, created_at);

CREATE TABLE IF NOT EXISTS order_events (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	order_id   TEXT NOT NULL,
	from_state TEXT,
	to_state   TEXT NOT NULL,
	at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_order ON order_events (order_id);
