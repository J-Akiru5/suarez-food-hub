-- =====================================================================
-- Suarez Food Hub — Migration 0013: Product Reviews
-- =====================================================================
-- Adds product_reviews table so customers can rate each product/item
-- in their delivered orders.
-- =====================================================================

-- ===========================
-- 1. PRODUCT REVIEWS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order ON product_reviews(order_id);

-- ===========================
-- 2. ROW-LEVEL SECURITY
-- ===========================
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own product reviews" ON product_reviews;
CREATE POLICY "users read own product reviews" ON product_reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "anyone can view product ratings" ON product_reviews;
CREATE POLICY "anyone can view product ratings" ON product_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users insert own product reviews" ON product_reviews;
CREATE POLICY "users insert own product reviews" ON product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
