-- ===========================
-- 0024: Staff only notified after admin payment verification
-- ===========================
-- Problem: Staff were receiving "Payment Verification Needed" notifications
-- for GCash orders before admin verification. This caused confusion since
-- staff cannot verify payments (admin-only action).
--
-- Fix:
-- 1. Create get_admin_only_ids() helper
-- 2. Modify notify_new_order() to send payment_verification only to admins
-- 3. Staff will only receive "new_order" after admin verifies payment

-- Helper: get admin-only user IDs
CREATE OR REPLACE FUNCTION public.get_admin_only_ids()
RETURNS TABLE (id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM profiles WHERE role = 'admin';
$$;

-- Modified: notify_new_order trigger
-- For GCash: only admin gets "Payment Verification Needed"
-- For COD: staff + admin get "New Order Received" (unchanged)
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
    -- GCash: only ADMIN gets verification notification (staff can't verify)
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT
      gen_random_uuid(),
      u.id,
      'payment_verification',
      'Payment Verification Needed',
      'GCash proof submitted for order ' || COALESCE(NEW.order_number, '') || ' — ₱' || NEW.total::text,
      jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'order_number', NEW.order_number)
    FROM public.get_admin_only_ids() u;
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
