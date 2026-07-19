-- =====================================================================
-- Suarez Food Hub — Database Infrastructure Layer
-- =====================================================================
-- This file contains ALL database constructs that Prisma does NOT manage:
--   • Custom SQL functions (is_admin, is_staff_or_admin, is_rider, etc.)
--   • Database triggers (log_order_status_change)
--   • Row-Level Security policies (all tables)
--   • Realtime publication subscriptions
--   • Storage buckets and policies
--
-- WORKFLOW: Run this file AFTER any `prisma db push` or `prisma migrate`
-- to re-apply the infrastructure layer. It is idempotent (safe to re-run).
-- =====================================================================

-- ===========================
-- 0. ENUM EXTENSIONS
-- ===========================
ALTER TYPE rider_status ADD VALUE IF NOT EXISTS 'offline';

-- ===========================
-- 1. HELPER FUNCTIONS
-- ===========================
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

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT email
    FROM profiles
    WHERE username = p_username
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username TO anon, authenticated;

-- ===========================
-- 2. STATUS LOG TRIGGER
-- ===========================
-- Ensure id column has a default (Prisma doesn't set DB-level default for @default(uuid()))
ALTER TABLE order_status_log ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO order_status_log (id, order_id, status, changed_by)
    VALUES (gen_random_uuid(), NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_status ON orders;
CREATE TRIGGER trg_log_order_status
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- ===========================
-- 3. ROW-LEVEL SECURITY
-- ===========================
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_cashouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;

-- locations
DROP POLICY IF EXISTS "locations readable by all" ON locations;
CREATE POLICY "locations readable by all" ON locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes locations" ON locations;
CREATE POLICY "admin writes locations" ON locations FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- business
DROP POLICY IF EXISTS "business readable by all" ON business;
CREATE POLICY "business readable by all" ON business FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes business" ON business;
CREATE POLICY "admin writes business" ON business FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- notifications
DROP POLICY IF EXISTS "users read own notifications" ON notifications;
CREATE POLICY "users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users update own notifications" ON notifications;
CREATE POLICY "users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "staff writes notifications" ON notifications;
CREATE POLICY "staff writes notifications" ON notifications FOR INSERT WITH CHECK (is_staff_or_admin());

-- user_carts
DROP POLICY IF EXISTS "users read own cart" ON user_carts;
CREATE POLICY "users read own cart" ON user_carts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users write own cart" ON user_carts;
CREATE POLICY "users write own cart" ON user_carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- rider_earnings
DROP POLICY IF EXISTS "riders read own earnings" ON rider_earnings;
CREATE POLICY "riders read own earnings" ON rider_earnings FOR SELECT USING (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read earnings" ON rider_earnings;
CREATE POLICY "staff read earnings" ON rider_earnings FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "riders insert own earnings" ON rider_earnings;
CREATE POLICY "riders insert own earnings" ON rider_earnings FOR INSERT WITH CHECK (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff writes earnings" ON rider_earnings;
CREATE POLICY "staff writes earnings" ON rider_earnings FOR INSERT WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS "admin updates earnings" ON rider_earnings;
CREATE POLICY "admin updates earnings" ON rider_earnings FOR UPDATE USING (is_admin());

-- rider_cashouts
DROP POLICY IF EXISTS "riders manage own cashouts" ON rider_cashouts;
CREATE POLICY "riders manage own cashouts" ON rider_cashouts FOR ALL USING (auth.uid() = rider_id) WITH CHECK (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read cashouts" ON rider_cashouts;
CREATE POLICY "staff read cashouts" ON rider_cashouts FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin updates cashouts" ON rider_cashouts;
CREATE POLICY "admin updates cashouts" ON rider_cashouts FOR UPDATE USING (is_admin());

-- order_status_log
DROP POLICY IF EXISTS "users read own order status log" ON order_status_log;
CREATE POLICY "users read own order status log" ON order_status_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "riders read assigned order log" ON order_status_log;
CREATE POLICY "riders read assigned order log" ON order_status_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.rider_id = auth.uid())
  );
DROP POLICY IF EXISTS "staff read order log" ON order_status_log;
CREATE POLICY "staff read order log" ON order_status_log FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "staff writes order log" ON order_status_log;
CREATE POLICY "staff writes order log" ON order_status_log FOR INSERT WITH CHECK (is_staff_or_admin());

-- profiles
DROP POLICY IF EXISTS "profiles public read" ON profiles;
CREATE POLICY "profiles public read" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "users insert own profile" ON profiles;
CREATE POLICY "users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users update own profile" ON profiles;
CREATE POLICY "users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "admin update profiles" ON profiles;
CREATE POLICY "admin update profiles" ON profiles FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin delete profiles" ON profiles;
CREATE POLICY "admin delete profiles" ON profiles FOR DELETE USING (is_admin());

-- orders
DROP POLICY IF EXISTS "users read own orders" ON orders;
CREATE POLICY "users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "riders read assigned orders" ON orders;
CREATE POLICY "riders read assigned orders" ON orders FOR SELECT USING (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read orders" ON orders;
CREATE POLICY "staff read orders" ON orders FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "users insert own orders" ON orders;
CREATE POLICY "users insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "riders update assigned orders" ON orders;
CREATE POLICY "riders update assigned orders" ON orders FOR UPDATE USING (auth.uid() = rider_id) WITH CHECK (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff update orders" ON orders;
CREATE POLICY "staff update orders" ON orders FOR UPDATE USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin delete orders" ON orders;
CREATE POLICY "admin delete orders" ON orders FOR DELETE USING (is_admin());

-- order_items
DROP POLICY IF EXISTS "users read own order items" ON order_items;
CREATE POLICY "users read own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
DROP POLICY IF EXISTS "riders read assigned order items" ON order_items;
CREATE POLICY "riders read assigned order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.rider_id = auth.uid())
);
DROP POLICY IF EXISTS "staff read order items" ON order_items;
CREATE POLICY "staff read order items" ON order_items FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "users insert own order items" ON order_items;
CREATE POLICY "users insert own order items" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
DROP POLICY IF EXISTS "staff update order items" ON order_items;
CREATE POLICY "staff update order items" ON order_items FOR UPDATE USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin delete order items" ON order_items;
CREATE POLICY "admin delete order items" ON order_items FOR DELETE USING (is_admin());

-- products
DROP POLICY IF EXISTS "products public read" ON products;
CREATE POLICY "products public read" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "staff write products" ON products;
CREATE POLICY "staff write products" ON products FOR INSERT WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS "staff update products" ON products;
CREATE POLICY "staff update products" ON products FOR UPDATE USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin delete products" ON products;
CREATE POLICY "admin delete products" ON products FOR DELETE USING (is_admin());

-- product_variants
DROP POLICY IF EXISTS "variants public read" ON product_variants;
CREATE POLICY "variants public read" ON product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "staff write variants" ON product_variants;
CREATE POLICY "staff write variants" ON product_variants FOR INSERT WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS "staff update variants" ON product_variants;
CREATE POLICY "staff update variants" ON product_variants FOR UPDATE USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin delete variants" ON product_variants;
CREATE POLICY "admin delete variants" ON product_variants FOR DELETE USING (is_admin());

-- categories
DROP POLICY IF EXISTS "categories public read" ON categories;
CREATE POLICY "categories public read" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "staff write categories" ON categories;
CREATE POLICY "staff write categories" ON categories FOR INSERT WITH CHECK (is_staff_or_admin());
DROP POLICY IF EXISTS "staff update categories" ON categories;
CREATE POLICY "staff update categories" ON categories FOR UPDATE USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin delete categories" ON categories;
CREATE POLICY "admin delete categories" ON categories FOR DELETE USING (is_admin());

-- rider_locations
DROP POLICY IF EXISTS "locations public read" ON rider_locations;
CREATE POLICY "locations public read" ON rider_locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "riders insert own location" ON rider_locations;
CREATE POLICY "riders insert own location" ON rider_locations FOR INSERT WITH CHECK (auth.uid() = rider_id);
DROP POLICY IF EXISTS "riders update own location" ON rider_locations;
CREATE POLICY "riders update own location" ON rider_locations FOR UPDATE USING (auth.uid() = rider_id);

-- ===========================
-- 4. REALTIME PUBLICATION
-- ===========================
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS order_status_log;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS profiles;

-- ===========================
-- 5. STORAGE BUCKETS & POLICIES
-- ===========================
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
