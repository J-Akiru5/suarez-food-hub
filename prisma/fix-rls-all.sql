-- Recreate the is_admin helper function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Also recreate is_staff_or_admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

-- Business table policies
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business readable by all" ON business;
CREATE POLICY "business readable by all" ON business FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin writes business" ON business;
CREATE POLICY "admin writes business" ON business FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- rider_cashouts table policies
ALTER TABLE rider_cashouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "riders manage own cashouts" ON rider_cashouts;
CREATE POLICY "riders manage own cashouts" ON rider_cashouts FOR ALL USING (auth.uid() = rider_id) WITH CHECK (auth.uid() = rider_id);
DROP POLICY IF EXISTS "staff read cashouts" ON rider_cashouts;
CREATE POLICY "staff read cashouts" ON rider_cashouts FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "admin updates cashouts" ON rider_cashouts;
CREATE POLICY "admin updates cashouts" ON rider_cashouts FOR UPDATE USING (is_admin());
