-- =====================================================================
-- Suarez Food Hub — Client Round 3 Fixes (0022)
-- Run in Supabase SQL Editor (https://app.supabase.com)
-- Idempotent: safe to re-run. Won't drop existing data.
--
-- Fixes (matching what the client actually asked for):
--  1. Rider earnings = the DELIVERY FEE, not the food subtotal.
--     The client said it plainly: "The rider should only take from
--     admin their 'today's earnings' — that's the delivery fee. What
--     does admin get from the food sold, nothing?"
--     This migration corrects HISTORICAL rows that were recorded with
--     the food subtotal as rider earnings (the f999d10 workaround for a
--     broken delivery_fee). Going forward, the app writes the fee.
--  2. Staff notifications respect payment verification:
--       - COD orders            -> "New Order Received" immediately.
--       - GCash orders          -> "Payment Verification Needed" at
--                                  placement; the real "New Order
--                                  Received" fires only when an admin/
--                                  staff flips payment_status to
--                                  'verified'.
--     The customer's "Order Placed" confirmation stays immediate.
--  3. Server-enforced cashouts: new RPC request_rider_cashout() that
--     validates minimum amount and available balance inside the
--     database, race-safe via a per-rider advisory lock. Previously the
--     checks lived only in the rider UI and any authenticated rider
--     could insert an arbitrary rider_cashouts row directly.
-- =====================================================================

-- ===========================
-- 1. Backfill: fix earnings recorded as food subtotal
-- ===========================
-- The known-bad signature is rider_earnings = subtotal exactly (written
-- by checkout between commit 3b0a24e and this fix, because delivery_fee
-- was hardcoded to 0). Re-derive each order's fee using the current
-- business config: free when subtotal >= free_delivery_min, otherwise
-- business.delivery_fee. Rows that don't match the bad signature (i.e.
-- anything manually adjusted) are left untouched. Re-running is a no-op.

WITH cfg AS (
  SELECT
    COALESCE((SELECT MAX(delivery_fee) FROM business), 40) AS fee,
    COALESCE((SELECT MAX(free_delivery_min) FROM business), 200) AS free_min
),
fixed_orders AS (
  UPDATE orders o
  SET rider_earnings = CASE WHEN o.subtotal >= cfg.free_min THEN 0 ELSE cfg.fee END
  FROM cfg
  WHERE o.rider_earnings = o.subtotal
    AND o.subtotal > 0
  RETURNING o.id, o.rider_earnings
)
UPDATE rider_earnings re
SET amount = fixed_orders.rider_earnings
FROM fixed_orders
WHERE re.order_id = fixed_orders.id
  AND re.amount <> fixed_orders.rider_earnings;

-- ===========================
-- 2. Notification triggers — payment verification aware
-- ===========================

-- Rewrites notify_new_order (last touched by 0011):
--   * Customer "Order Placed" confirmation: immediate, both methods.
--   * COD: staff get "New Order Received" immediately.
--   * GCash: staff get "Payment Verification Needed" instead — the order
--     exists but its payment is unverified, so announcing it as a new
--     order was the client-reported bug.
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Customer: always confirm placement immediately.
  INSERT INTO notifications (id, user_id, type, title, message, data)
  VALUES (
    gen_random_uuid(),
    NEW.user_id,
    'order_update',
    'Order Placed Successfully',
    'Your order ' || COALESCE(NEW.order_number, '') || ' has been placed — ₱' || NEW.total::text,
    jsonb_build_object('order_id', NEW.id, 'status', NEW.status, 'order_number', NEW.order_number)
  );

  IF NEW.payment_method = 'gcash' THEN
    -- GCash: payment proof must be verified by staff/admin first.
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT
      gen_random_uuid(),
      u.id,
      'payment_verification',
      'Payment Verification Needed',
      'GCash proof submitted for order ' || COALESCE(NEW.order_number, '') || ' — ₱' || NEW.total::text,
      jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'order_number', NEW.order_number)
    FROM public.get_admin_and_staff_ids() u;
  ELSE
    -- COD: no verification gate — announce the new order right away.
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT
      gen_random_uuid(),
      u.id,
      'new_order',
      'New Order Received',
      'Order ' || COALESCE(NEW.order_number, '') || ' — ₱' || NEW.total::text,
      jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'order_number', NEW.order_number)
    FROM public.get_admin_and_staff_ids() u;
  END IF;
  RETURN NEW;
END;
$$;

-- New: fires when payment verification happens (payment_status flip).
-- This is where GCash orders earn their "New Order Received".
CREATE OR REPLACE FUNCTION public.notify_payment_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'verified' AND OLD.payment_status IS DISTINCT FROM 'verified' THEN
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT
      gen_random_uuid(),
      u.id,
      'new_order',
      'New Order Received (Payment Verified)',
      'Order ' || COALESCE(NEW.order_number, '') || ' — ₱' || NEW.total::text || ' — payment verified',
      jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'order_number', NEW.order_number)
    FROM public.get_admin_and_staff_ids() u;

    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (
      gen_random_uuid(),
      NEW.user_id,
      'order_update',
      'Payment Verified',
      'Your payment for order ' || COALESCE(NEW.order_number, '') || ' has been verified.',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status, 'order_number', NEW.order_number)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_order ON orders;
CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_new_order();

DROP TRIGGER IF EXISTS trg_notify_payment_verified ON orders;
CREATE TRIGGER trg_notify_payment_verified
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION public.notify_payment_verified();

-- ===========================
-- 3. Server-enforced cashout RPC
-- ===========================
-- Balance semantics (single source of truth, mirrored in the apps):
--   total_earned = SUM(rider_earnings.amount)
--   paid         = SUM(cashouts WHERE status = 'paid')
--   locked       = SUM(cashouts WHERE status IN ('requested','approved'))
--   available    = GREATEST(0, total_earned - paid - locked)
-- Earnings rows intentionally never change status; cashout state lives
-- entirely in rider_cashouts. A rejected request frees its amount.

CREATE OR REPLACE FUNCTION public.request_rider_cashout(p_amount NUMERIC)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rider_id UUID := auth.uid();
  v_total_earned NUMERIC;
  v_paid NUMERIC;
  v_locked NUMERIC;
  v_available NUMERIC;
  v_gcash TEXT;
BEGIN
  IF v_rider_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount IS NULL OR p_amount < 50 THEN
    RAISE EXCEPTION 'Minimum cashout is ₱50';
  END IF;

  -- Serialize concurrent requests per rider so two simultaneous calls
  -- can't both pass the balance check (double-spend race).
  PERFORM pg_advisory_xact_lock(hashtextextended(v_rider_id::text, 0));

  SELECT COALESCE(SUM(amount), 0) INTO v_total_earned FROM rider_earnings WHERE rider_id = v_rider_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM rider_cashouts WHERE rider_id = v_rider_id AND status = 'paid';
  SELECT COALESCE(SUM(amount), 0) INTO v_locked
    FROM rider_cashouts WHERE rider_id = v_rider_id AND status IN ('requested', 'approved');

  v_available := GREATEST(0, v_total_earned - v_paid - v_locked);

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'Amount exceeds available balance (₱%)', v_available;
  END IF;

  -- Snapshot the rider's own GCash number from their profile (0020 moved
  -- ownership of that number here); paid personally by admin, not via app.
  SELECT gcash_number INTO v_gcash FROM profiles WHERE id = v_rider_id;

  INSERT INTO rider_cashouts (id, rider_id, amount, gcash_number, status)
  VALUES (gen_random_uuid(), v_rider_id, p_amount, v_gcash, 'requested');

  RETURN jsonb_build_object('success', true, 'available', v_available - p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_rider_cashout(NUMERIC) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_rider_cashout(NUMERIC) FROM anon;

-- ===========================
-- 4. RLS: riders read their cashouts, but can no longer write them
-- ===========================
-- All writes go through request_rider_cashout() (SECURITY DEFINER), which
-- enforces the balance server-side. The old blanket FOR ALL policy let any
-- authenticated rider insert arbitrary amounts directly.
DROP POLICY IF EXISTS "riders manage own cashouts" ON rider_cashouts;
DROP POLICY IF EXISTS "riders read own cashouts" ON rider_cashouts;
CREATE POLICY "riders read own cashouts"
  ON rider_cashouts FOR SELECT
  USING (auth.uid() = rider_id);

-- "staff read cashouts" and "admin updates cashouts" policies from 0001
-- are kept as-is (admin still processes/approves/pays/rejects).

-- ===========================
-- DONE
-- ===========================
