-- =====================================================================
-- fix_notify_payment_verified — skip COD orders (stop notification spam)
-- =====================================================================
-- Problem: Commit 4d02e73 auto-sets payment_status='verified' for COD orders
-- when the rider marks delivered. The trigger trg_notify_payment_verified fires
-- on ANY flip to 'verified' and inserts "New Order Received (Payment Verified)"
-- for ALL admins+staff plus "Payment Verified" for the customer. For COD orders
-- this is spam — they were already announced at insert (0024).
--
-- Fix: Add a condition to skip COD orders. GCash flips must still insert 3 rows.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.notify_payment_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'verified' AND OLD.payment_status IS DISTINCT FROM 'verified'
     AND NEW.payment_method IS DISTINCT FROM 'cod' THEN
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT gen_random_uuid(), u.id, 'new_order', 'New Order Received (Payment Verified)',
      'Order ' || COALESCE(NEW.order_number, '') || ' — ₱' || NEW.total::text || ' — payment verified',
      jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'order_number', NEW.order_number)
    FROM public.get_admin_and_staff_ids() u;

    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (gen_random_uuid(), NEW.user_id, 'order_update', 'Payment Verified',
      'Your payment for order ' || COALESCE(NEW.order_number, '') || ' has been verified.',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status, 'order_number', NEW.order_number));
  END IF;
  RETURN NEW;
END;
$$;
