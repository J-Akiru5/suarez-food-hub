-- ===========================
-- 0011: Add deleted_at column to products table
-- ===========================
-- Enables proper soft-delete so admin inventory can filter out deleted products

ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
