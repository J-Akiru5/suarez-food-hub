-- =====================================================================
-- Suarez Food Hub — Client Round 2 Fixes (0020)
-- Run in Supabase SQL Editor (https://app.supabase.com)
-- Idempotent: safe to re-run. Won't drop existing data.
--
-- Fixes:
--  1. products.sort_order — admin/staff can reorder products up/down
--     within a category (like categories already support).
--  2. profiles.gcash_number — rider GCash number comes from the rider's
--     own profile (no longer typed at cashout time).
--  3. orders.created_at / updated_at — were `timestamp without time zone`
--     (Prisma default) while the app writes UTC ISO strings, so every
--     dashboard displayed the time 8h off for PHT users. Convert to
--     timestamptz so the instant is stored correctly.
--     (Also converts other displayed timestamps with the same bug.)
--  4. payment_proofs storage bucket + policies — customers upload their
--     GCash payment screenshot (proof) + reference number at checkout.
-- =====================================================================

-- ===========================
-- 1. products.sort_order
-- ===========================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_category_sort
  ON products(category_id, sort_order);

-- ===========================
-- 2. profiles.gcash_number
-- ===========================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gcash_number TEXT;

-- ===========================
-- 3. Timestamp timezone fix — interpret stored UTC wall-clock as UTC
-- ===========================
ALTER TABLE orders
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE rider_cashouts
  ALTER COLUMN requested_at TYPE timestamptz USING requested_at AT TIME ZONE 'UTC',
  ALTER COLUMN processed_at TYPE timestamptz USING processed_at AT TIME ZONE 'UTC';

ALTER TABLE rider_earnings
  ALTER COLUMN earned_at TYPE timestamptz USING earned_at AT TIME ZONE 'UTC';

ALTER TABLE feedback
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE notifications
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE order_status_log
  ALTER COLUMN changed_at TYPE timestamptz USING changed_at AT TIME ZONE 'UTC';

ALTER TABLE rider_reviews
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE product_reviews
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

-- ===========================
-- 4. payment_proofs storage bucket + policies
-- ===========================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment_proofs', 'payment_proofs', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

-- Customers can upload their own payment proof (folder = their user id)
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment_proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can view payment proofs (staff/admin verify them)
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment_proofs');

-- ===========================
-- 5. Realtime publication — guard products/variants (idempotent)
-- ===========================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_variants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
  END IF;
END $$;

-- ===========================
-- DONE
-- ===========================
