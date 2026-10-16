-- ============================================================
-- 0029_product_packs.sql
-- Add pack tracking to products.
--
-- A product can additionally be sold as a PACK (bulk unit):
--   * pack_size  — how many pieces are in ONE pack (e.g. 6).
--                  NULL / 0 means the product does NOT sell packs.
--   * pack_stock — how many whole packs are in stock.
--   * pack price is DERIVED: base_price * pack_size (no column needed).
--
-- Run this directly in the Supabase SQL editor.
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pack_size INTEGER,
  ADD COLUMN IF NOT EXISTS pack_stock INTEGER NOT NULL DEFAULT 0;

-- Pack line items: an order_items row with is_pack = true means the customer
-- bought a whole PACK (of pack_size pieces) — so stock deduction decrements
-- products.pack_stock instead of products.quantity / variant quantity.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_pack BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN order_items.is_pack IS
  'TRUE when this line item is a whole pack (bulk unit). Deducted from products.pack_stock.';

-- Sanity: pack_size must be positive when set.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM products
    WHERE pack_size IS NOT NULL AND pack_size <= 0
  ) THEN
    RAISE EXCEPTION 'products.pack_size must be > 0 when set';
  END IF;
END $$;

COMMENT ON COLUMN products.pack_size IS
  'Pieces per pack. NULL or 0 = product does not sell packs.';
COMMENT ON COLUMN products.pack_stock IS
  'Whole packs currently in stock. Deducted when a pack line item is confirmed.';
