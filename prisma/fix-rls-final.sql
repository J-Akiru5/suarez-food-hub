-- ===========================
-- Comprehensive RLS fix for all tables
-- ===========================

-- Helper functions (already exist, just in case)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'));
$$;

CREATE OR REPLACE FUNCTION public.is_rider() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'rider');
$$;

-- ===========================
-- categories table
-- ===========================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories readable by all" ON categories;
CREATE POLICY "categories readable by all" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes categories" ON categories;
CREATE POLICY "admin writes categories" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ===========================
-- products table
-- ===========================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products readable by all" ON products;
CREATE POLICY "products readable by all" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes products" ON products;
CREATE POLICY "admin writes products" ON products FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ===========================
-- product_variants table
-- ===========================
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "variants readable by all" ON product_variants;
CREATE POLICY "variants readable by all" ON product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes variants" ON product_variants;
CREATE POLICY "admin writes variants" ON product_variants FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ===========================
-- orders table
-- ===========================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own orders" ON orders;
CREATE POLICY "users read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "riders read assigned orders" ON orders;
CREATE POLICY "riders read assigned orders" ON orders FOR SELECT USING (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read orders" ON orders;
CREATE POLICY "staff read orders" ON orders FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "customers insert orders" ON orders;
CREATE POLICY "customers insert orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admin updates orders" ON orders;
CREATE POLICY "admin updates orders" ON orders FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "staff updates orders" ON orders;
CREATE POLICY "staff updates orders" ON orders FOR UPDATE USING (is_staff_or_admin());

-- ===========================
-- order_items table
-- ===========================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items readable by owner" ON order_items;
CREATE POLICY "order_items readable by owner" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
);

-- ===========================
-- rider_locations table
-- ===========================
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riders manage own location" ON rider_locations;
CREATE POLICY "riders manage own location" ON rider_locations FOR ALL USING (auth.uid() = rider_id) WITH CHECK (auth.uid() = rider_id);

-- ===========================
-- order_status_log table
-- ===========================
ALTER TABLE order_status_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_log readable by customer" ON order_status_log;
CREATE POLICY "status_log readable by customer" ON order_status_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
);
DROP POLICY IF EXISTS "status_log readable by rider" ON order_status_log;
CREATE POLICY "status_log readable by rider" ON order_status_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_id AND orders.rider_id = auth.uid())
);
DROP POLICY IF EXISTS "status_log readable by staff" ON order_status_log;
CREATE POLICY "status_log readable by staff" ON order_status_log FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "service writes status_log" ON order_status_log;
CREATE POLICY "service writes status_log" ON order_status_log FOR INSERT WITH CHECK (true);

-- ===========================
-- user_carts table
-- ===========================
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own cart" ON user_carts;
CREATE POLICY "users read own cart" ON user_carts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users write own cart" ON user_carts;
CREATE POLICY "users write own cart" ON user_carts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===========================
-- rider_earnings table
-- ===========================
ALTER TABLE rider_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riders read own earnings" ON rider_earnings;
CREATE POLICY "riders read own earnings" ON rider_earnings FOR SELECT USING (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read earnings" ON rider_earnings;
CREATE POLICY "staff read earnings" ON rider_earnings FOR SELECT USING (is_staff_or_admin());

-- ===========================
-- notifications table
-- ===========================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own notifications" ON notifications;
CREATE POLICY "users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users update own notifications" ON notifications;
CREATE POLICY "users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service writes notifications" ON notifications;
CREATE POLICY "service writes notifications" ON notifications FOR INSERT WITH CHECK (true);
