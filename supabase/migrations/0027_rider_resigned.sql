-- 0012: Add "resigned" to rider_status enum + delete/soft-delete for riders

-- Add resigned to the rider_status enum (safe — ALTER TYPE ... ADD VALUE is idempotent)
ALTER TYPE rider_status ADD VALUE IF NOT EXISTS 'resigned';

-- Allow RLS policy for deleting profiles (admin-only delete for obsolete riders)
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
