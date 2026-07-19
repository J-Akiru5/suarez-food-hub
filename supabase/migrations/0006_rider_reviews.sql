-- =====================================================================
-- Suarez Food Hub — Migration 0006: Rider Reviews
-- =====================================================================
-- Adds rider_reviews table so customers can rate their delivery experience
-- after an order is marked as delivered.
-- =====================================================================

-- ===========================
-- 1. RIDER REVIEWS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS rider_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_rider ON rider_reviews(rider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON rider_reviews(user_id);

-- ===========================
-- 2. ROW-LEVEL SECURITY
-- ===========================
ALTER TABLE rider_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own reviews" ON rider_reviews;
CREATE POLICY "users read own reviews" ON rider_reviews FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "riders read own reviews" ON rider_reviews;
CREATE POLICY "riders read own reviews" ON rider_reviews FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "users insert own reviews" ON rider_reviews;
CREATE POLICY "users insert own reviews" ON rider_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
