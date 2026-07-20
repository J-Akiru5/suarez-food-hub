-- ===========================
-- 0007: Admin read access for rider_reviews
-- ===========================
-- Without this policy, the admin reviews page will show zero results
-- because the existing RLS only allows customers/riders to see their own reviews.

DROP POLICY IF EXISTS "admins read all reviews" ON rider_reviews;
CREATE POLICY "admins read all reviews" ON rider_reviews
  FOR SELECT USING (is_admin());

-- Staff can also read all reviews (for support purposes)
DROP POLICY IF EXISTS "staff read all reviews" ON rider_reviews;
CREATE POLICY "staff read all reviews" ON rider_reviews
  FOR SELECT USING (is_staff_or_admin());
