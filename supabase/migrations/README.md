# Suarez Food Hub — Database Management

## Architecture

This project uses a **dual-layer** database management approach:

### Layer 1: Prisma (Schema & Client)
- **Prisma schema** (`prisma/schema.prisma`) is the source of truth for **table structure**
- Generates the TypeScript client (`@prisma/client`) used by the app
- Run `npx prisma db push` for schema changes (not `prisma migrate`)
- Run `npx prisma generate` after any schema change to update the client

### Layer 2: Infrastructure SQL (Functions, RLS, Triggers, Storage)
- **`supabase/infra.sql`** contains everything Prisma does NOT manage:
  - Custom SQL functions (`is_admin`, `is_staff_or_admin`, `is_rider`, `get_email_by_username`)
  - Database trigger (`trg_log_order_status` — auto-logs order status changes)
  - Row-Level Security policies (all 14 tables)
  - Realtime publication subscriptions
  - Storage buckets and policies

## Workflow

### Making a schema change (add a column, new table, etc.):
```bash
# 1. Edit prisma/schema.prisma
# 2. Push schema to database
npx prisma db push

# 3. Re-apply infrastructure via Supabase SQL Editor
#    Open https://app.supabase.com → SQL Editor → New query
#    Paste contents of supabase/infra.sql → Run
```

### Making an infra change (new RLS policy, function, etc.):
1. Edit `supabase/infra.sql`
2. Apply via Supabase SQL Editor: copy-paste the file and run

### Why Supabase SQL Editor?
`prisma db execute` cannot handle multi-statement SQL with dollar-quoted function bodies (`$$`). Always use the Supabase dashboard SQL Editor for the `infra.sql` file.

## Migration History

- `0001_capstone_full.sql` — Initial full schema, enums, RLS, functions, trigger, storage
- `0002_psgc_seed.sql` — PSGC location data (17 regions, sample provinces/cities/barangays)
- `0003_demo_seed.sql` — Demo products and categories
- `0004_username_field.sql` — Added username column to profiles
- `0005_get_email_by_username.sql` — Function for username to email lookup

## Verify

Run this in SQL Editor to verify all tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' ORDER BY table_name;
```

You should see: `business`, `categories`, `locations`, `notifications`, `order_items`, `order_status_log`, `orders`, `product_variants`, `products`, `profiles`, `rider_cashouts`, `rider_earnings`, `rider_locations`, `user_carts`.

## Key Details

### Order state machine
```
pending → confirmed → preparing → ready_for_pickup
       → claimed_by_rider → out_for_delivery → near_customer → delivered
       → cancelled (anytime by admin, from pending by customer)
```

### Auto-trigger
After any insert or update on `orders`, the new status is automatically logged to `order_status_log` via `trg_log_order_status`. This provides a full audit trail of all status changes.

### RLS policies
All 14 application tables have RLS enabled with granular policies:
- Customers see only their own orders, notifications, and cart
- Riders see their assigned orders, own earnings, and customer info
- Staff and admin have broader read/write access
- Products, categories, locations, and business info are publicly readable
