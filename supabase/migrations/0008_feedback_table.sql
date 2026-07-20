-- ===========================
-- 0008: Feedback table
-- ===========================
-- Stores feedback submitted from the FeedbackFab widget and /feedback page.
-- Admins can view all feedback in the admin dashboard.

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert feedback
DROP POLICY IF EXISTS "users insert feedback" ON feedback;
CREATE POLICY "users insert feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anyone can insert feedback even without auth (for anonymous users)
-- But for security, we'll allow insert with any user_id
DROP POLICY IF EXISTS "anyone can insert feedback" ON feedback;
CREATE POLICY "anyone can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- Only admins can read all feedback
DROP POLICY IF EXISTS "admins read all feedback" ON feedback;
CREATE POLICY "admins read all feedback" ON feedback
  FOR SELECT USING (is_admin());

-- Only admins can delete feedback
DROP POLICY IF EXISTS "admins delete feedback" ON feedback;
CREATE POLICY "admins delete feedback" ON feedback
  FOR DELETE USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
