-- 0030: Staff dispatch board + fair rider queueing
-- Run manually via the Supabase SQL editor (same as 0028).
--
-- Replaces the broadcast "invite N riders, first to accept wins" model with
-- foodpanda/Grab-style direct assignment:
--   staff picks a rider (or Auto-Assign picks the fairest one) →
--   order enters 'awaiting_rider' → rider accepts or declines →
--   a decline cascades to the next rider in the fair queue →
--   queue exhausted / 10-min timeout → order returns to staff.
--
-- Fairness ranking (mirrored in apps via dispatch.ts and used here):
--   1. fewest active deliveries (awaiting + claimed + out + near)
--   2. longest time since last completed delivery
--   3. under business.max_active_deliveries cap (default 2)
--
-- Race safety: pg_advisory_xact_lock per order serializes concurrent
-- assign/accept/decline (same pattern as request_rider_cashout in 0022).
--
-- Security model: assign_rider / revoke_assignment / requeue_stale_assignments /
-- dispatch_pick_next are executable by the SERVICE ROLE ONLY (the staff API route
-- authenticates the staff session first). rider_assignment_response is the only
-- function riders can call, and it only acts on the order assigned to auth.uid().
-- The staff functions also re-check that the actor is an active staff/admin.

-- ===========================
-- 1. Schema
-- ===========================

-- New lifecycle status: a rider is assigned but hasn't accepted yet.
-- (Supabase runs PG15 — ADD VALUE in a transaction is allowed since PG12,
--  and the value is only used later inside plpgsql bodies.)
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_rider';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rider_assigned_at TIMESTAMPTZ;

-- Status the order had before dispatch took it over. Assigning a rider to a
-- kitchen order in 'confirmed'/'preparing' is allowed (pre-assign while the
-- food cooks), so exhaust/timeout/revoke must restore THIS rather than assume
-- the order was already ready for pickup.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dispatch_prev_status order_status;

ALTER TABLE business
  ADD COLUMN IF NOT EXISTS max_active_deliveries INT NOT NULL DEFAULT 2;

-- Audit trail for dispatch actions (also feeds the staff board's log strip).
CREATE TABLE IF NOT EXISTS dispatch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- assigned | accepted | declined | cascaded | revoked | timeout | exhausted
  actor UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_log_order ON dispatch_log(order_id, created_at DESC);

ALTER TABLE dispatch_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read dispatch log" ON dispatch_log;
CREATE POLICY "staff read dispatch log" ON dispatch_log FOR SELECT USING (is_staff_or_admin());
DROP POLICY IF EXISTS "staff insert dispatch log" ON dispatch_log;
CREATE POLICY "staff insert dispatch log" ON dispatch_log FOR INSERT WITH CHECK (is_staff_or_admin());

-- ===========================
-- 2. Fair-queue picker (internal)
-- ===========================
-- Picks the fairest eligible rider for an order and offers it to them.
--
-- A dispatch "cycle" runs from the last time the order left dispatch
-- (accepted / revoked / exhausted) until now. Riders who already declined or
-- timed out inside the current cycle are never offered the order again —
-- otherwise two decliners would bounce it between them forever — and after 5
-- declines/timeouts the order goes back to staff. If no eligible rider is left
-- the order returns to the status it had before dispatch and staff are paged.

CREATE OR REPLACE FUNCTION public.dispatch_pick_next(
  p_order_id UUID,
  p_declined UUID[] DEFAULT '{}'::UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max INT;
  v_order_no TEXT;
  v_declined UUID[] := COALESCE(p_declined, '{}'::UUID[]);
  v_cycle_start TIMESTAMPTZ;
  v_tries INT := 0;
  v_rider UUID;
BEGIN
  SELECT COALESCE(MAX(max_active_deliveries), 2) INTO v_max FROM business;
  SELECT COALESCE(order_number, '') INTO v_order_no FROM orders WHERE id = p_order_id;

  SELECT COALESCE(MAX(created_at), '-infinity'::timestamptz) INTO v_cycle_start
  FROM dispatch_log
  WHERE order_id = p_order_id AND action IN ('accepted', 'revoked', 'exhausted');

  SELECT v_declined || COALESCE(array_agg(DISTINCT rider_id), '{}'::UUID[]), COUNT(*)
  INTO v_declined, v_tries
  FROM dispatch_log
  WHERE order_id = p_order_id
    AND action IN ('declined', 'timeout')
    AND created_at > v_cycle_start
    AND rider_id IS NOT NULL;

  IF v_tries < 5 THEN
    -- Fair order: least loaded first, then longest idle (never delivered = longest).
    -- Ordering and the capacity filter live in the same query level on purpose.
    SELECT p.id INTO v_rider
    FROM profiles p
    LEFT JOIN (
      SELECT rider_id, COUNT(*) AS active_count
      FROM orders
      WHERE rider_id IS NOT NULL
        AND status IN ('awaiting_rider', 'claimed_by_rider', 'out_for_delivery', 'near_customer')
      GROUP BY rider_id
    ) o ON o.rider_id = p.id
    LEFT JOIN (
      SELECT rider_id, MAX(delivered_at) AS last_delivered_at
      FROM orders
      WHERE rider_id IS NOT NULL AND delivered_at IS NOT NULL
      GROUP BY rider_id
    ) d ON d.rider_id = p.id
    WHERE p.role = 'rider'
      AND p.is_active = true
      AND p.rider_status IN ('available', 'vacant')
      AND p.id <> ALL (v_declined)
      AND COALESCE(o.active_count, 0) < v_max
    ORDER BY COALESCE(o.active_count, 0) ASC, d.last_delivered_at ASC NULLS FIRST, p.id
    LIMIT 1;
  END IF;

  IF v_rider IS NOT NULL THEN
    UPDATE orders
    SET rider_id = v_rider,
        rider_assigned_at = now(),
        dispatch_prev_status = CASE WHEN status = 'awaiting_rider' THEN dispatch_prev_status ELSE status END,
        status = 'awaiting_rider',
        pending_riders = '[]'::jsonb,
        updated_at = now()
    WHERE id = p_order_id;

    INSERT INTO dispatch_log (id, order_id, rider_id, action, actor)
    VALUES (gen_random_uuid(), p_order_id, v_rider,
            CASE WHEN v_tries = 0 THEN 'assigned' ELSE 'cascaded' END, NULL);

    -- Notify the rider they have a delivery waiting for acceptance.
    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (
      gen_random_uuid(), v_rider, 'delivery_assignment',
      'New Delivery Assigned',
      'Order #' || v_order_no || ' is assigned to you. Accept or decline within 10 minutes.',
      jsonb_build_object('order_id', p_order_id, 'order_number', v_order_no, 'auto_assigned', true)
    );

    RETURN jsonb_build_object('success', true, 'rider_id', v_rider, 'attempt', v_tries + 1);
  END IF;

  -- No eligible rider left: hand the order back to staff at the kitchen
  -- status it had BEFORE dispatch took it (not necessarily ready_for_pickup).
  UPDATE orders
  SET rider_id = NULL,
      rider_assigned_at = NULL,
      status = COALESCE(dispatch_prev_status, 'ready_for_pickup'::order_status),
      dispatch_prev_status = NULL,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO dispatch_log (id, order_id, rider_id, action, actor)
  VALUES (gen_random_uuid(), p_order_id, NULL, 'exhausted', NULL);

  INSERT INTO notifications (id, user_id, type, title, message, data)
  SELECT gen_random_uuid(), u.id, 'dispatch_exhausted',
         'No Riders Available',
         'Order #' || v_order_no || ' has no eligible riders — please assign manually.',
         jsonb_build_object('order_id', p_order_id, 'order_number', v_order_no)
  FROM public.get_admin_and_staff_ids() u;

  RETURN jsonb_build_object('success', false, 'reason', 'no_eligible_riders');
END;
$$;

-- ===========================
-- 3. assign_rider — staff assign / auto-assign
-- ===========================

CREATE OR REPLACE FUNCTION public.assign_rider(
  p_order_id UUID,
  p_rider_id UUID,
  p_assigned_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status order_status;
  v_prev_rider UUID;
  v_max INT;
  v_active INT;
  v_eligible BOOLEAN;
  v_order_no TEXT;
BEGIN
  -- Only an active staff/admin may dispatch. EXECUTE is additionally limited to
  -- the service role (section 7); this is the second lock if grants ever regress.
  IF p_assigned_by IS NULL OR NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_assigned_by AND role IN ('staff', 'admin') AND is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Serialize concurrent assignments for the same order.
  PERFORM pg_advisory_xact_lock(hashtextextended('assign:' || p_order_id::text, 0));

  SELECT status, rider_id, COALESCE(order_number, '') INTO v_status, v_prev_rider, v_order_no
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  -- Only kitchen-stage orders can be dispatched (or re-assigned while waiting).
  -- Pending orders are not confirmed yet; claimed / out-for-delivery orders must be revoked first.
  IF v_status NOT IN ('confirmed', 'preparing', 'ready_for_pickup', 'awaiting_rider') THEN
    RAISE EXCEPTION 'Order cannot be dispatched (status: %)', v_status;
  END IF;

  -- Rider must be active and available (vacant = available, never-used alias).
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_rider_id AND role = 'rider' AND is_active = true
      AND rider_status IN ('available', 'vacant')
  ) INTO v_eligible;
  IF NOT v_eligible THEN
    RAISE EXCEPTION 'Rider is not available';
  END IF;

  -- Stacking cap: this order itself does not count against the rider.
  SELECT COALESCE(MAX(max_active_deliveries), 2) INTO v_max FROM business;
  SELECT COUNT(*) INTO v_active
  FROM orders
  WHERE rider_id = p_rider_id
    AND id <> p_order_id
    AND status IN ('awaiting_rider', 'claimed_by_rider', 'out_for_delivery', 'near_customer');
  IF v_active >= v_max THEN
    RAISE EXCEPTION 'Rider already has % active deliveries (max %)', v_active, v_max;
  END IF;

  UPDATE orders
  SET rider_id = p_rider_id,
      rider_assigned_at = now(),
      -- Re-assigning an already-waiting order must not clobber the original.
      dispatch_prev_status = CASE WHEN status = 'awaiting_rider' THEN dispatch_prev_status ELSE status END,
      status = 'awaiting_rider',
      pending_riders = '[]'::jsonb,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO dispatch_log (id, order_id, rider_id, action, actor)
  VALUES (gen_random_uuid(), p_order_id, p_rider_id, 'assigned', p_assigned_by);

  INSERT INTO notifications (id, user_id, type, title, message, data)
  VALUES (
    gen_random_uuid(), p_rider_id, 'delivery_assignment',
    'New Delivery Assigned',
    'Order #' || v_order_no || ' is assigned to you. Accept or decline within 10 minutes.',
    jsonb_build_object('order_id', p_order_id, 'order_number', v_order_no, 'auto_assigned', false)
  );

  -- A different rider was holding this offer: tell them it moved on.
  IF v_status = 'awaiting_rider' AND v_prev_rider IS NOT NULL AND v_prev_rider <> p_rider_id THEN
    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (
      gen_random_uuid(), v_prev_rider, 'assignment_revoked',
      'Delivery Assignment Removed',
      'Order #' || v_order_no || ' was reassigned to another rider by staff.',
      jsonb_build_object('order_id', p_order_id, 'order_number', v_order_no)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'rider_id', p_rider_id);
END;
$$;

-- ===========================
-- 4. rider_assignment_response — accept / decline (+ cascade)
-- ===========================

CREATE OR REPLACE FUNCTION public.rider_assignment_response(
  p_order_id UUID,
  p_accept BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rider UUID := auth.uid();
  v_status order_status;
  v_assigned_rider UUID;
  v_order_no TEXT;
  v_result JSONB;
BEGIN
  IF v_rider IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Serialize with assign_rider / other riders responding to the same order.
  PERFORM pg_advisory_xact_lock(hashtextextended('assign:' || p_order_id::text, 0));

  SELECT status, rider_id, COALESCE(order_number, '')
  INTO v_status, v_assigned_rider, v_order_no
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_assigned_rider IS DISTINCT FROM v_rider THEN
    RAISE EXCEPTION 'This order is no longer assigned to you';
  END IF;
  IF v_status <> 'awaiting_rider' THEN
    RAISE EXCEPTION 'Order already answered (status: %)', v_status;
  END IF;

  IF p_accept THEN
    UPDATE orders
    SET status = 'claimed_by_rider',
        picked_up_at = now(),
        dispatch_prev_status = NULL, -- dispatch cycle over, no state to restore
        updated_at = now()
    WHERE id = p_order_id;

    INSERT INTO dispatch_log (id, order_id, rider_id, action, actor)
    VALUES (gen_random_uuid(), p_order_id, v_rider, 'accepted', v_rider);

    RETURN jsonb_build_object('success', true, 'action', 'accepted');
  END IF;

  -- Decline: detach, then cascade to the next rider in the fair queue.
  UPDATE orders
  SET rider_id = NULL,
      rider_assigned_at = NULL,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO dispatch_log (id, order_id, rider_id, action, actor)
  VALUES (gen_random_uuid(), p_order_id, v_rider, 'declined', v_rider);

  v_result := public.dispatch_pick_next(p_order_id, ARRAY[v_rider]);

  -- Tell staff who bounced the order (cascade/exhaust already notified on failure).
  IF v_result->>'success' = 'true' THEN
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT gen_random_uuid(), u.id, 'rider_rejected',
           'Rider Declined Delivery',
           'Rider declined order #' || v_order_no || ' — reassigned automatically to the next rider.',
           jsonb_build_object('order_id', p_order_id, 'order_number', v_order_no, 'declined_by', v_rider)
    FROM public.get_admin_and_staff_ids() u;
  END IF;

  RETURN v_result;
END;
$$;

-- ===========================
-- 5. Timeout: stale assignments (lazy, no cron required)
-- ===========================
-- A rider who never responds within 10 minutes loses the order and it
-- cascades. Called from the dispatch board fetch (service role).

CREATE OR REPLACE FUNCTION public.requeue_stale_assignments()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
  v_count INT := 0;
  v_order_no TEXT;
BEGIN
  FOR rec IN
    SELECT id, rider_id
    FROM orders
    WHERE status = 'awaiting_rider'
      AND rider_assigned_at IS NOT NULL
      AND rider_assigned_at < now() - interval '10 minutes'
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('assign:' || rec.id::text, 0));

    -- Re-check under the lock — it may have been answered meanwhile.
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM orders
      WHERE id = rec.id AND status = 'awaiting_rider'
        AND rider_assigned_at < now() - interval '10 minutes'
    );

    UPDATE orders SET rider_id = NULL, rider_assigned_at = NULL, updated_at = now()
    WHERE id = rec.id;

    INSERT INTO dispatch_log (id, order_id, rider_id, action, actor)
    VALUES (gen_random_uuid(), rec.id, rec.rider_id, 'timeout', NULL);

    SELECT COALESCE(order_number, '') INTO v_order_no FROM orders WHERE id = rec.id;

    -- Let the declined rider take other work again + tell them why.
    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (
      gen_random_uuid(), rec.rider_id, 'assignment_expired',
      'Delivery Assignment Expired',
      'You did not respond to order #' || v_order_no || ' in time — it was reassigned.',
      jsonb_build_object('order_id', rec.id, 'order_number', v_order_no)
    );

    PERFORM public.dispatch_pick_next(rec.id, ARRAY[rec.rider_id]);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('requeued', v_count);
END;
$$;

-- ===========================
-- 6. revoke_assignment — staff override
-- ===========================
-- Detaches the rider and puts the order back in the dispatch queue:
--   awaiting_rider                         -> the status it had before dispatch
--   claimed / out_for_delivery / near      -> ready_for_pickup (food is handed to the next rider)
--   confirmed / preparing / ready (legacy) -> unchanged, rider detached
-- It never leaves an active-delivery status with no rider.

CREATE OR REPLACE FUNCTION public.revoke_assignment(
  p_order_id UUID,
  p_actor UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rider UUID;
  v_status order_status;
  v_order_no TEXT;
BEGIN
  IF p_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_actor AND role IN ('staff', 'admin') AND is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('assign:' || p_order_id::text, 0));

  SELECT rider_id, status, COALESCE(order_number, '')
  INTO v_rider, v_status, v_order_no
  FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_rider IS NULL THEN
    RAISE EXCEPTION 'Order has no assigned rider';
  END IF;
  IF v_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Order is already %', v_status;
  END IF;

  UPDATE orders
  SET rider_id = NULL,
      rider_assigned_at = NULL,
      status = CASE
        WHEN v_status = 'awaiting_rider' THEN COALESCE(dispatch_prev_status, 'ready_for_pickup'::order_status)
        WHEN v_status IN ('claimed_by_rider', 'out_for_delivery', 'near_customer') THEN 'ready_for_pickup'::order_status
        ELSE v_status
      END,
      -- A taken-back order was not actually picked up by the next rider yet.
      picked_up_at = CASE
        WHEN v_status IN ('claimed_by_rider', 'out_for_delivery', 'near_customer') THEN NULL
        ELSE picked_up_at
      END,
      dispatch_prev_status = NULL,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO dispatch_log (id, order_id, rider_id, action, actor)
  VALUES (gen_random_uuid(), p_order_id, v_rider, 'revoked', p_actor);

  INSERT INTO notifications (id, user_id, type, title, message, data)
  VALUES (
    gen_random_uuid(), v_rider, 'assignment_revoked',
    'Delivery Assignment Removed',
    'Your assignment for order #' || v_order_no || ' was removed by staff.',
    jsonb_build_object('order_id', p_order_id, 'order_number', v_order_no)
  );

  RETURN jsonb_build_object('success', true, 'rider_id', v_rider);
END;
$$;

-- ===========================
-- 7. Grants
-- ===========================
-- Supabase grants every new function in "public" to anon / authenticated directly,
-- so REVOKE ... FROM PUBLIC alone does NOT close them: revoke those roles by name.
-- Staff-side functions are for the service role only (the staff API route checks the
-- staff session first, then calls these with the service client).
REVOKE ALL ON FUNCTION public.dispatch_pick_next(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_rider(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_stale_assignments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_assignment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_pick_next(UUID, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_rider(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.requeue_stale_assignments() TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_assignment(UUID, UUID) TO service_role;

-- Riders answer through their own session; the function only acts on the order
-- assigned to auth.uid().
REVOKE ALL ON FUNCTION public.rider_assignment_response(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_assignment_response(UUID, BOOLEAN) TO authenticated, service_role;

-- ===========================
-- 8. Customer-facing copy for the new status
-- ===========================
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rider_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (id, user_id, type, title, message, data)
    SELECT
      gen_random_uuid(),
      u.id,
      'status_change',
      'Order Status Updated',
      'Order ' || COALESCE(NEW.order_number, '') || ' is now ' || REPLACE(NEW.status::text, '_', ' '),
      jsonb_build_object('order_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status, 'order_number', NEW.order_number)
    FROM public.get_admin_and_staff_ids() u;

    IF NEW.rider_id IS NOT NULL THEN
      SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) INTO rider_name
      FROM profiles WHERE id = NEW.rider_id;
    END IF;

    INSERT INTO notifications (id, user_id, type, title, message, data)
    VALUES (
      gen_random_uuid(),
      NEW.user_id,
      'order_update',
      CASE NEW.status
        WHEN 'confirmed' THEN 'Order Confirmed'
        WHEN 'preparing' THEN 'Preparing Your Order'
        WHEN 'ready_for_pickup' THEN 'Ready for Pickup'
        WHEN 'awaiting_rider' THEN 'Finding Your Rider'
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
        WHEN 'awaiting_rider' THEN CASE
          WHEN rider_name IS NOT NULL THEN rider_name || ' has been assigned to your order and is confirming'
          ELSE 'A rider has been assigned to your order and is confirming' END
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
