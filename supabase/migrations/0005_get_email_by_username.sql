-- =====================================================================
-- Suarez Food Hub — Function to look up email by username (bypasses RLS)
-- Idempotent: safe to re-run.
-- =====================================================================

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
