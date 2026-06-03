# Suarez Food Hub (SFH) — Capstone Project

A full-stack food ordering platform for Suarez Food Hub, a Filipino siomai and food business in Janiuay, Iloilo. Built with Next.js 15, Supabase, and Tailwind CSS in a Turborepo monorepo.

## Architecture — 4 Apps

| App | Port | URL | Description |
|-----|------|-----|-------------|
| `apps/web` | 3000 | `http://localhost:3000` | Customer app — menu browsing, basket, checkout (COD/GCash/Maya), order tracking with live rider map |
| `apps/admin` | 3001 | `http://localhost:3001` | Admin dashboard — orders, inventory, categories, riders, cashouts, staff accounts, reports, business settings |
| `apps/staff` | 3002 | `http://localhost:3002` | Staff kitchen workflow — order status advancement (pending → ready_for_pickup), inventory quick-edit |
| `apps/rider` | 3003 | `http://localhost:3003` | Rider PWA — active deliveries with map, earnings tracker, cashout requests, location broadcast |

## Packages

- `@repo/ui` — Shared UI components (Tailwind + shadcn/ui)
- `@repo/types` — TypeScript type definitions matching the Supabase schema
- `@repo/utils` — Utility functions (currency, slugify, order status config)
- `@repo/supabase` — Supabase client helpers (browser, server, middleware)

## Tech Stack

- **Framework** — Next.js 15 (App Router)
- **Language** — TypeScript (strict)
- **Database** — Supabase (PostgreSQL) with raw SQL migrations
- **Auth** — Supabase Auth (email/password) with role-based access (`customer`, `admin`, `staff`, `rider`)
- **Realtime** — Supabase Realtime (order updates, rider location, notifications)
- **Maps** — Leaflet + OpenStreetMap (no API key required)
- **Payments** — COD, GCash (QR + reference), Maya (QR + reference)
- **Monorepo** — Turborepo + pnpm workspaces
- **PWA** — `apps/rider` (manifest + service worker for installable delivery app)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- A Supabase project (free tier)

### Environment Variables

Copy `.env.example` to each app's root:

| Variable | Where Used | Description |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All apps | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All apps | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | All apps (server) | Service role key for admin operations |

### Database Setup

1. Run `supabase/migrations/0001_capstone_full.sql` in Supabase SQL Editor — creates all tables, enums, RLS policies, triggers, storage buckets.
2. Run `supabase/migrations/0002_psgc_seed.sql` — seeds Philippine regions, Iloilo province/cities/barangays.
3. Run `supabase/migrations/0003_demo_seed.sql` — inserts demo categories and products.

### Development

```bash
pnpm install

# Start all 4 apps concurrently
pnpm dev

# Or start individual apps
pnpm --filter web dev     # port 3000
pnpm --filter admin dev   # port 3001
pnpm --filter staff dev   # port 3002
pnpm --filter rider dev   # port 3003
```

## Key Design Decisions

- **Customer app is `apps/web` (port 3000)** — not a separate customer URL.
- **Guest browsing** — users can browse the menu freely; login is required on "Add to Basket".
- **Role-based access** — `customer` (self-register), `staff` (admin-created), `rider` (self-register + admin approval).
- **Order state machine**: `pending → confirmed → preparing → ready_for_pickup → claimed_by_rider → out_for_delivery → near_customer → delivered`. Customers can cancel while `pending`.
- **Low-stock alerts** — products with `quantity <= buffer_quantity` trigger notifications on order placement.
- **Delivery fee** — flat ₱40, free for orders over ₱200 (configured in `business` table).
- **Rider earnings** — auto-computed as `delivery_fee × 0.8` commission at order completion, stored in `rider_earnings`.
- **Cashouts** — riders request (min ₱100), admin marks paid with GCash reference number.
- **Live map** — Leaflet + OpenStreetMap + browser geolocation; rider broadcasts location to `rider_locations` table via Supabase Realtime.
- **Basket** — persisted in Supabase via `/api/cart`; the term "Basket" is used consistently across the UI.

## Storage Buckets

- **`images`** — Product images and menu assets.
- **`business-qr`** — GCash and Maya QR code images uploaded via admin settings.

## Project Structure

```
suarez-food-hub/
├── apps/
│   ├── web/                   # Customer app (port 3000)
│   │   ├── app/
│   │   │   ├── api/           # API routes (cart, locations, orders, etc.)
│   │   │   ├── checkout/      # Checkout with payment selection
│   │   │   ├── menu/          # Menu browsing
│   │   │   ├── orders/        # Order list + status timeline + live map
│   │   │   └── profile/       # User profile with address
│   │   └── components/        # CartSidebar, CustomerDeliveryMap, etc.
│   ├── admin/                 # Admin dashboard (port 3001)
│   │   └── app/(dashboard)/
│   │       ├── inventory/     # Product CRUD + stock edit
│   │       ├── orders/        # Full order management
│   │       ├── riders/        # Rider approval + location
│   │       ├── cashouts/      # Cashout management
│   │       ├── staff/         # Staff account creation
│   │       ├── categories/    # Category CRUD
│   │       ├── reports/       # Sales reports
│   │       └── settings/      # Business config + QR upload
│   ├── staff/                 # Staff kitchen app (port 3002)
│   │   └── app/(staff)/
│   │       ├── dashboard/     # Order stats + low-stock alerts
│   │       ├── orders/        # Kitchen workflow
│   │       └── inventory/     # Quick stock edit
│   └── rider/                 # Rider delivery app (port 3003)
│       └── app/(rider)/
│           ├── page.tsx       # Home — active delivery + live map
│           ├── deliveries/    # Delivery history
│           ├── earnings/      # Earnings + cashout requests
│           └── profile/       # Rider profile + stats
├── packages/
│   ├── ui/                    # Shared UI components + Tailwind config
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   └── supabase/              # Supabase client helpers
├── supabase/migrations/
│   ├── 0001_capstone_full.sql # Full schema + RLS + storage + realtime
│   ├── 0002_psgc_seed.sql     # PSGC address data
│   └── 0003_demo_seed.sql     # Demo products and categories
└── package.json               # Root package.json
```
