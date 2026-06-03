# Suarez Food Hub — Capstone Database Migration

## How to apply these migrations

1. Open your Supabase project: https://app.supabase.com
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy the entire contents of `0001_capstone_full.sql` → paste → click **Run**
5. Click **New query** again
6. Copy the entire contents of `0002_psgc_seed.sql` → paste → click **Run**
7. Go to **Database** → **Replication** → enable Realtime for:
   - `orders`
   - `notifications`
   - `order_status_log`
   - `profiles`
8. Go to **Storage** → create a public bucket named `business-qr` (for GCash/Maya QR codes uploaded by admin)

## Verify

Run this in SQL Editor to verify all tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' ORDER BY table_name;
```

You should see: `business`, `categories`, `locations`, `notifications`, `order_items`, `order_status_log`, `orders`, `products`, `profiles`, `rider_cashouts`, `rider_earnings`, `user_carts`.

## What changed

### New columns on `profiles`
- `first_name`, `last_name` (split from `full_name`)
- `region_id`, `province_id`, `town_id`, `barangay_id`, `zip_code` (PSGC FK)
- `role` enum: `customer | admin | staff | rider`
- `rider_status` enum: `pending_approval | available | vacant | occupied | rejected`
- `vehicle_type`, `plate_number`, `license_number` (riders only)
- `is_active` (admin can disable accounts)

### New columns on `products`
- `quantity` (renamed from `stocks`)
- `buffer_quantity` (low-stock alert threshold, default 5)
- `low_stock_alerted_at` (avoid spam notifications)

### New columns on `orders`
- `rider_id`, `staff_id` (FKs to profiles)
- `delivery_lat`, `delivery_lng` (for live map)
- Status is now an enum with the full state machine
- `payment_method` is now an enum: `cod | gcash | maya`
- `payment_status` is now an enum: `pending | verified | rejected | refunded`
- Timestamps: `confirmed_at`, `prepared_at`, `picked_up_at`, `delivered_at`, `cancelled_at`

### New tables
- `business` — single-row config (name, QR codes, delivery fees)
- `locations` — PSGC regions/provinces/cities/barangays cache
- `rider_earnings` — auto-computed per delivered order
- `rider_cashouts` — payout requests
- `order_status_log` — full audit trail of status changes (auto-populated by trigger)
- `notifications` — in-app bell notifications
- `user_carts` — cross-device cart sync (JSONB items)

### Order state machine
```
pending → confirmed (admin/staff)
       → preparing (staff)
       → ready_for_pickup (staff)
       → claimed_by_rider (rider)
       → out_for_delivery (rider)
       → near_customer (rider)
       → delivered (rider/admin)
       → cancelled (customer if pending, admin anytime)
```

### RLS policies
- All new tables have RLS enabled
- Customers see only their own orders/notifications/cart
- Staff/admin see all orders
- Riders see only their assigned orders and earnings
- Locations are readable by everyone
- Business info is readable by everyone, writable by admin only

### Realtime
The migration enables Realtime publication for `orders`, `notifications`, `order_status_log`, and `profiles` so the apps can subscribe to live changes.

### Auto-triggers
- After any insert/update on `orders`, the new status is logged to `order_status_log` automatically.
