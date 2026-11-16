-- Pembayaran QRIS statis di depan: nominal dibuat unik (harga + kode unik 1-99) supaya kasir bisa
-- mencocokkan uang masuk dengan pesanan. Omzet tetap harga menu (total); kode unik dicatat terpisah.
ALTER TABLE orders ADD COLUMN unique_code INTEGER NOT NULL DEFAULT 0;

-- Dua pesanan yang sedang menunggu di outlet yang sama tidak boleh punya kode sama.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_open_code
	ON orders (outlet_id, unique_code) WHERE state = 'AWAITING_CASHIER' AND unique_code > 0;
