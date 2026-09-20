-- ===========================
-- 0011: Customer notification triggers
-- ===========================
-- Updates the existing trigger functions so that customers also receive
-- notifications when their order status changes.

-- First, update notify_new_order to also notify the customer
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

  -- Notify the customer that their order was placed
  INSERT INTO notifications (id, user_id, type, title, message, data)
  VALUES (
    gen_random_uuid(),
    NEW.user_id,
    'order_update',
    'Order Placed Successfully',
    'Your order ' || COALESCE(NEW.order_number, '') || ' has been placed — ₱' || NEW.total::text,
    jsonb_build_object('order_id', NEW.id, 'status', NEW.status, 'order_number', NEW.order_number)
  );
  RETURN NEW;
END;
$$;

-- Second, update notify_order_status_change to also notify the customer
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rider_name TEXT;
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

    -- Get rider name if a rider is assigned
    IF NEW.rider_id IS NOT NULL THEN
      SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) INTO rider_name
      FROM profiles WHERE id = NEW.rider_id;
    END IF;

    -- Notify the customer about status change
    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (
      gen_random_uuid(),
      NEW.user_id,
      'order_update',
      CASE NEW.status
        WHEN 'confirmed' THEN 'Order Confirmed'
        WHEN 'preparing' THEN 'Preparing Your Order'
        WHEN 'ready_for_pickup' THEN 'Ready for Pickup'
        WHEN 'claimed_by_rider' THEN 'Rider on the Way'
        WHEN 'out_for_delivery' THEN 'Out for Delivery'
        WHEN 'near_customer' THEN 'Rider is Nearby'
        WHEN 'delivered' THEN 'Order Delivered'
        WHEN 'cancelled' THEN 'Order Cancelled'
        ELSE 'Order Status Updated'
      END,
      CASE NEW.status
        WHEN 'confirmed' THEN 'Your order has been confirmed and will be prepared soon'
        WHEN 'preparing' THEN 'Your food is being prepared in the kitchen'
        WHEN 'ready_for_pickup' THEN 'Your order is ready and waiting for pickup'
        WHEN 'claimed_by_rider' THEN CASE WHEN rider_name IS NOT NULL THEN rider_name || ' is heading to pick up your order' ELSE 'A rider is heading to pick up your order' END
        WHEN 'out_for_delivery' THEN CASE WHEN rider_name IS NOT NULL THEN rider_name || ' is on the way with your order!' ELSE 'Your order is out for delivery!' END
        WHEN 'near_customer' THEN 'Your rider is nearby — please prepare your payment if COD'
        WHEN 'delivered' THEN 'Your order has been delivered. Enjoy your meal!'
        WHEN 'cancelled' THEN 'Your order has been cancelled'
        ELSE 'Your order status changed to ' || REPLACE(NEW.status::text, '_', ' ')
      END,
      jsonb_build_object(
        'order_id', NEW.id,
        'status', NEW.status,
        'old_status', OLD.status,
        'order_number', NEW.order_number,
        'rider_name', rider_name,
        'rider_id', NEW.rider_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Add DELETE policy for notifications so users can delete their own
DROP POLICY IF EXISTS "users delete own notifications" ON notifications;
CREATE POLICY "users delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
