# Suarez Food Hub — Database Migrations

## Architecture

This project uses **Supabase CLI migrations** as the single source of truth for the database.

All schema changes, functions, RLS policies, triggers, and storage are managed via SQL migration
files in `supabase/migrations/`. The CLI tracks which migrations have been applied to the remote
database.

**Never edit an applied migration.** Always create a new migration for changes.
**Never apply SQL through the dashboard editor.** Use `supabase db push --db-url` instead.

## Workflow

### Creating a new migration

```bash
# Create a new timestamped migration file
pnpm db:new <migration_name>

# Example:
pnpm db:new add_feature_x
# Creates: supabase/migrations/<timestamp>_add_feature_x.sql
```

### Applying migrations to the remote database

```bash
# Dry-run first (recommended)
npx supabase db push --dry-run --db-url "$DATABASE_URL"

# Apply for real
npx supabase db push --db-url "$DATABASE_URL"
```

**PowerShell:**
```powershell
npx supabase db push --dry-run --db-url $env:DATABASE_URL
npx supabase db push --db-url $env:DATABASE_URL
```

### Checking migration status

```bash
npx supabase migration list --db-url "$DATABASE_URL"
```

### Repairing migration history

If the remote history gets out of sync:

```bash
# Mark a migration as applied
npx supabase migration repair --status applied <version> --db-url "$DATABASE_URL"

# Mark a migration as reverted
npx supabase migration repair --status reverted <version> --db-url "$DATABASE_URL"
```

## Migration History

| Version | Name | Description |
|---|---|---|
| 0001 | capstone_full | Initial full schema, enums, RLS, functions, trigger, storage |
| 0002 | psgc_seed | PSGC location data (regions, provinces, cities, barangays) |
| 0003 | demo_seed | Demo products and categories |
| 0004 | username_field | Added username column to profiles |
| 0005 | get_email_by_username | Function for username to email lookup |
| 0006 | rider_reviews | Rider review system |
| 0007 | admin_reviews_policy | Admin policy for rider reviews |
| 0008 | feedback_table | Customer feedback system |
| 0009 | cashout_gcash_number | GCash number on cashouts |
| 0010 | notification_triggers | Order notification trigger functions |
| 0011 | add_deleted_at_to_products | Soft-delete support for products |
| 0012 | add_delivery_provinces | Delivery area restrictions |
| 0013 | product_reviews | Product review system |
| 0014 | add_valid_id_url | Valid ID upload for riders |
| 0015 | add_pending_riders | Pending riders JSONB on orders |
| 0016 | add_delivery_proof | Delivery proof URL on orders |
| 0017 | category_soft_delete | Soft-delete support for categories |
| 0018 | fix_client_issues | Enum fixes, delivery_areas, realtime |
| 0019 | rider_read_invited_orders | RLS for rider to read invited orders |
| 0020 | client_round2 | sort_order, gcash_number, timestamp fixes, storage |
| 0021 | business_location | Restaurant base_lat/base_lng coordinates |
| 0022 | client_round3 | Payment references, delivery contact, rider earnings |
| 0023 | product_reorder_performance | Covering index + move_product() RPC |
| 0024 | staff_notification_after_verification | Admin-only payment verification notifications |
| 0025 | business_hours_about | Operating hours + About Us JSONB columns |
| 0026 | customer_notification_triggers | Customer notification triggers + delete policy |
| 0027 | rider_resigned | Resigned enum value + admin delete policy |
| 0028 | distance_pricing | Distance-based delivery tiers + location centroids |
| 0029 | product_packs | Product pack size/stock + pack order items |
| 0030 | dispatch_queue | Awaiting-rider dispatch, fair queue RPCs, dispatch log |
| 20260920040108 | reorder_products | reorder_products() bulk reorder RPC |
| 20260920062827 | fix_notify_payment_verified | Skip COD payment-verification notifications |
| 20260920062840 | fix_reorder_products | Correct reorder position computation |
| 20261016024529 | min_delivery_order | business.delivery_min_order_amount |
| 20261016113500 | products_restock_lead_time | products.restock_lead_time_days |
| 20261019120000 | location_district_level | District location type + profiles.district_id |
| 20261019120100 | seed_iloilo_city_districts | Iloilo City districts + 180 PSGC barangays |

### Applied out-of-band (recorded 2026-10-20)

The migrations below were applied manually to the live database before the CLI
history was reconciled. On 2026-10-20 every resulting object was verified
directly against the live schema (columns, enum values, `dispatch_log` RLS and
policies, function bodies and grants), then the versions were recorded with
`supabase migration repair --status applied ...`.

They are **deprecated as pending migrations** — do not run them manually again.
The SQL files are intentionally retained: a fresh database still needs them to
replay the schema from `0001` onward.

| Version | Name | Live verification |
|---|---|---|
| 0028 | distance_pricing | `business.delivery_tiers`, `business.max_delivery_km`, `locations.centroid_lat/lng` present |
| 0029 | product_packs | `products.pack_size/pack_stock`, `order_items.is_pack` present |
| 0030 | dispatch_queue | `awaiting_rider` enum, orders/business columns, `dispatch_log` + RLS/policies, all dispatch functions + grants, updated notification function |
| 20260920062827 | fix_notify_payment_verified | COD guard present in `notify_payment_verified()` |
| 20260920062840 | fix_reorder_products | fixed `reorder_products()` body present |
| 20261016024529 | min_delivery_order | `business.delivery_min_order_amount` + check constraint present |
| 20261016113500 | products_restock_lead_time | `products.restock_lead_time_days` present |

The `products.restock_lead_time_days` CHECK constraint was initially missing
(the original `ADD COLUMN IF NOT EXISTS` cannot add an inline check to an
existing column). It was added and validated on 2026-10-20.

## Key Details

### Order state machine
```
pending → confirmed → preparing → ready_for_pickup
       → claimed_by_rider → out_for_delivery → near_customer → delivered
       → cancelled (anytime by admin, from pending by customer)
```

### Auto-trigger
After any insert or update on `orders`, the new status is automatically logged to `order_status_log`
via `trg_log_order_status`. This provides a full audit trail of all status changes.

### RLS policies
All application tables have RLS enabled with granular policies:
- Customers see only their own orders, notifications, and cart
- Riders see their assigned orders, own earnings, and customer info
- Staff and admin have broader read/write access
- Products, categories, locations, and business info are publicly readable
