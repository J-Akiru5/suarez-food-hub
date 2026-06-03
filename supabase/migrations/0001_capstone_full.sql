-- =====================================================================
-- Suarez Food Hub — Capstone Migration
-- Run this file in Supabase SQL Editor (https://app.supabase.com)
-- Idempotent: safe to re-run. Won't drop existing data.
-- =====================================================================

-- ===========================
-- 1. ENUMS
-- ===========================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin', 'staff', 'rider');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rider_status AS ENUM (
    'pending_approval', 'available', 'vacant', 'occupied', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'preparing', 'ready_for_pickup',
    'claimed_by_rider', 'out_for_delivery', 'near_customer', 'delivered', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cod', 'gcash', 'maya');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('region', 'province', 'city', 'barangay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE earning_status AS ENUM ('pending', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cashout_status AS ENUM ('requested', 'approved', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================
-- 2. EXTEND profiles
-- ===========================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS region_id TEXT,
  ADD COLUMN IF NOT EXISTS province_id TEXT,
  ADD COLUMN IF NOT EXISTS town_id TEXT,
  ADD COLUMN IF NOT EXISTS barangay_id TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS rider_status rider_status,
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
  ADD COLUMN IF NOT EXISTS plate_number TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Backfill first/last_name from existing full_name
UPDATE profiles
  SET first_name = split_part(coalesce(full_name, ''), ' ', 1),
      last_name  = NULLIF(substring(coalesce(full_name, '') FROM position(' ' in coalesce(full_name, '')) + 1), '')
  WHERE first_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_rider_status ON profiles(rider_status);

-- ===========================
-- 3. EXTEND products
-- ===========================
-- Rename stocks -> quantity (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stocks')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='quantity') THEN
    ALTER TABLE products RENAME COLUMN stocks TO quantity;
  END IF;
END $$;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS buffer_quantity INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS low_stock_alerted_at TIMESTAMPTZ;

-- ===========================
-- 4. EXTEND orders
-- ===========================
-- Ensure status is the enum (cast if needed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status' AND data_type='text') THEN
    -- Add new column as enum, copy data, drop old
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_new order_status;
    UPDATE orders SET status_new = status::order_status WHERE status_new IS NULL;
    ALTER TABLE orders DROP COLUMN IF EXISTS status;
    ALTER TABLE orders RENAME COLUMN status_new TO status;
    ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
    ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END $$;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maya_reference_no TEXT;

-- Update payment_method to enum
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method' AND data_type='text') THEN
    ALTER TABLE orders ALTER COLUMN payment_method TYPE payment_method USING payment_method::payment_method;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status' AND data_type='text') THEN
    ALTER TABLE orders ALTER COLUMN payment_status TYPE payment_status USING payment_status::payment_status;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_rider ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ===========================
-- 5. NEW: business
-- ===========================
CREATE TABLE IF NOT EXISTS business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Suarez Food Hub',
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  registration_no TEXT,
  gcash_qr_url TEXT,
  maya_qr_url TEXT,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 40,
  free_delivery_min NUMERIC(10,2) NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default business row
INSERT INTO business (id, name) VALUES (gen_random_uuid(), 'Suarez Food Hub')
  ON CONFLICT DO NOTHING;

-- ===========================
-- 6. NEW: locations (PSGC cache)
-- ===========================
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  type location_type NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  parent_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);

-- ===========================
-- 7. NEW: rider_earnings
-- ===========================
CREATE TABLE IF NOT EXISTS rider_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status earning_status NOT NULL DEFAULT 'pending',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_earnings_rider ON rider_earnings(rider_id);

-- ===========================
-- 8. NEW: rider_cashouts
-- ===========================
CREATE TABLE IF NOT EXISTS rider_cashouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status cashout_status NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cashouts_rider ON rider_cashouts(rider_id);

-- ===========================
-- 9. NEW: order_status_log
-- ===========================
CREATE TABLE IF NOT EXISTS order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_log_order ON order_status_log(order_id);

-- ===========================
-- 10. NEW: notifications
-- ===========================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ===========================
-- 11. NEW: user_carts (cross-device sync)
-- ===========================
CREATE TABLE IF NOT EXISTS user_carts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================
-- 12. ROW-LEVEL SECURITY
-- ===========================
-- Enable RLS on new tables
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_cashouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin() reads from profiles table
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_rider() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rider'
  );
$$;

-- Policies
DROP POLICY IF EXISTS "locations readable by all" ON locations;
CREATE POLICY "locations readable by all" ON locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes locations" ON locations;
CREATE POLICY "admin writes locations" ON locations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "business readable by all" ON business;
CREATE POLICY "business readable by all" ON business FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes business" ON business;
CREATE POLICY "admin writes business" ON business FOR ALL USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "users read own notifications" ON notifications;
CREATE POLICY "users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users update own notifications" ON notifications;
CREATE POLICY "users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service writes notifications" ON notifications;
CREATE POLICY "service writes notifications" ON notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "users read own cart" ON user_carts;
CREATE POLICY "users read own cart" ON user_carts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users write own cart" ON user_carts;
CREATE POLICY "users write own cart" ON user_carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "riders read own earnings" ON rider_earnings;
CREATE POLICY "riders read own earnings" ON rider_earnings FOR SELECT USING (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read earnings" ON rider_earnings;
CREATE POLICY "staff read earnings" ON rider_earnings FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "service writes earnings" ON rider_earnings;
CREATE POLICY "service writes earnings" ON rider_earnings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "admin updates earnings" ON rider_earnings;
CREATE POLICY "admin updates earnings" ON rider_earnings FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "riders manage own cashouts" ON rider_cashouts;
CREATE POLICY "riders manage own cashouts" ON rider_cashouts FOR ALL USING (auth.uid() = rider_id) WITH CHECK (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read cashouts" ON rider_cashouts;
CREATE POLICY "staff read cashouts" ON rider_cashouts FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin updates cashouts" ON rider_cashouts;
CREATE POLICY "admin updates cashouts" ON rider_cashouts FOR UPDATE USING (is_admin());

DROP POLICY IF EXISTS "users read own order status log" ON order_status_log;
CREATE POLICY "users read own order status log" ON order_status_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.customer_id = auth.uid())
  );
DROP POLICY IF EXISTS "riders read assigned order log" ON order_status_log;
CREATE POLICY "riders read assigned order log" ON order_status_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.rider_id = auth.uid())
  );
DROP POLICY IF EXISTS "staff read order log" ON order_status_log;
CREATE POLICY "staff read order log" ON order_status_log FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "service writes order log" ON order_status_log;
CREATE POLICY "service writes order log" ON order_status_log FOR INSERT WITH CHECK (true);

-- ===========================
-- 13. ENABLE REALTIME
-- ===========================
-- (You may also need to enable these in Supabase Dashboard > Database > Replication)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS order_status_log;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS profiles;

-- ===========================
-- 14. TRIGGER: log order status changes
-- ===========================
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_status_log (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_status ON orders;
CREATE TRIGGER trg_log_order_status
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ===========================
-- 15. STORAGE: business-qr + images buckets
-- ===========================
-- "business-qr": for GCash/Maya QR codes (admin uploads)
-- "images":      for product images (admin uploads, public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('business-qr', 'business-qr', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('images', 'images', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies for `images` bucket
DROP POLICY IF EXISTS "images_public_read" ON storage.objects;
CREATE POLICY "images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "images_admin_write" ON storage.objects;
CREATE POLICY "images_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND public.is_admin());

DROP POLICY IF EXISTS "images_admin_update" ON storage.objects;
CREATE POLICY "images_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'images' AND public.is_admin());

DROP POLICY IF EXISTS "images_admin_delete" ON storage.objects;
CREATE POLICY "images_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'images' AND public.is_admin());

-- Storage policies for `business-qr` bucket
DROP POLICY IF EXISTS "business_qr_public_read" ON storage.objects;
CREATE POLICY "business_qr_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'business-qr');

DROP POLICY IF EXISTS "business_qr_admin_write" ON storage.objects;
CREATE POLICY "business_qr_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'business-qr' AND public.is_admin());

DROP POLICY IF EXISTS "business_qr_admin_update" ON storage.objects;
CREATE POLICY "business_qr_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'business-qr' AND public.is_admin());

DROP POLICY IF EXISTS "business_qr_admin_delete" ON storage.objects;
CREATE POLICY "business_qr_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'business-qr' AND public.is_admin());

-- ===========================
-- DONE
-- ===========================
-- After running, verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
