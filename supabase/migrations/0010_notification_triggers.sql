-- ===========================
-- 0010: Auto-create notifications for new orders
-- ===========================
-- Creates notifications in the notifications table whenever:
-- 1. A new order is created (status = 'pending')
-- 2. An order status changes

-- Helper: get all admin and staff user IDs
CREATE OR REPLACE FUNCTION public.get_admin_and_staff_ids()
RETURNS TABLE (id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM profiles WHERE role IN ('admin', 'staff');
$$;

-- Trigger function: notify on new order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Notify all admin and staff about new order
  INSERT INTO notifications (id, user_id, type, title, message, data)
  SELECT
    gen_random_uuid(),
    u.id,
    'new_order',
    'New Order Received',
    'Order ' || COALESCE(NEW.order_number, '') || ' — ₱' || NEW.total::text,
    jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'order_number', NEW.order_number)
  FROM public.get_admin_and_staff_ids() u;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_order ON orders;
CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_new_order();

-- Trigger function: notify on status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify admin and staff
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT
      gen_random_uuid(),
      u.id,
      'status_change',
      'Order Status Updated',
      'Order ' || COALESCE(NEW.order_number, '') || ' is now ' || REPLACE(NEW.status::text, '_', ' '),
      jsonb_build_object('order_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status, 'order_number', NEW.order_number)
    FROM public.get_admin_and_staff_ids() u;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_order_status_change ON orders;
CREATE TRIGGER trg_notify_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_order_status_change();
