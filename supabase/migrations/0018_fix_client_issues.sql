-- =====================================================================
-- Suarez Food Hub — Client Issues Fix (0018)
-- Run in Supabase SQL Editor (https://app.supabase.com)
-- Idempotent: safe to re-run. Won't drop existing data.
--
-- Fixes:
--  1. rider_status enum missing 'resigned' / 'offline' values
--     (admin "Mark as Resigned" was failing with enum violation)
--  2. business.delivery_areas — town/city-level delivery restriction
--     (admin selects Iloilo City + towns instead of whole provinces)
--  3. Realtime publication missing products / product_variants
--     (admin & staff inventory didn't update live after staff confirms)
-- =====================================================================

-- ===========================
-- 1. rider_status enum — add missing values
-- ===========================
DO $$ BEGIN
  ALTER TYPE rider_status ADD VALUE IF NOT EXISTS 'resigned';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE rider_status ADD VALUE IF NOT EXISTS 'offline';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================
-- 2. business.delivery_areas
-- ===========================
ALTER TABLE business
  ADD COLUMN IF NOT EXISTS delivery_areas TEXT;

-- ===========================
-- 3. Realtime publication — add products & variants
--    (orders, notifications, order_status_log, profiles already added)
--    NOTE: ALTER PUBLICATION ... ADD TABLE does NOT support IF NOT EXISTS, so
--    each table is guarded by a check against pg_publication_tables.
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rider_locations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;
  END IF;
END $$;

-- ===========================
-- DONE
-- ===========================
