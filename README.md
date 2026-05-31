# Suarez Food Hub

A full-stack food ordering platform for Suarez Food Hub — a Filipino siomai and food business based in Janiuay, Iloilo. Built with Next.js 14, Supabase, Prisma, and Tailwind CSS in a Turborepo monorepo.

## Apps

| App | Port | Description |
|---|---|---|
| `@repo/web` | 3000 | Public marketing site and menu preview |
| `@repo/customer` | 3001 | Customer-facing e-commerce ordering PWA |
| `@repo/admin` | 3002 | Admin dashboard — inventory, orders, reports with PDF export |
| `@repo/rider` | 3003 | Delivery rider mobile-first PWA with realtime tracking |

## Packages

| Package | Description |
|---|---|
| `@repo/ui` | Shared UI component library (shadcn/ui + Radix + Tailwind) |
| `@repo/types` | Shared TypeScript type definitions |
| `@repo/utils` | Shared utilities (currency formatting, slugify, order status config) |
| `@repo/supabase` | Supabase client helpers (browser, server, middleware) |
| `@repo/config` | Shared Tailwind and build configurations |

## Tech Stack

- **Framework** — Next.js 14 (App Router)
- **Language** — TypeScript (strict mode)
- **Database** — Supabase (PostgreSQL) via Prisma ORM
- **Auth** — Supabase Auth with role-based access (customer, admin, rider, manager)
- **Realtime** — Supabase Realtime for live order tracking and rider location
- **UI** — shadcn/ui (Radix primitives + Tailwind CSS)
- **State** — Zustand (cart with localStorage persistence)
- **Charts** — Recharts (admin analytics)
- **Maps** — Leaflet.js (order tracking, rider navigation)
- **PDF** — @react-pdf/renderer (sales reports)
- **PWA** — Service workers for all apps (installable, offline support)
- **Monorepo** — Turborepo + pnpm workspaces

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- A [Supabase](https://supabase.com) project (free tier works)

### Installation

```bash
# Clone the repo
git clone https://github.com/J-Akiru5/suarez-food-hub.git
cd suarez-food-hub

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Database Setup

```bash
# Push the Prisma schema to your Supabase database
pnpm db:push

# Seed the database with menu categories and products
pnpm db:seed

# Open Prisma Studio to view/edit data
pnpm db:studio
```

### Development

```bash
# Start all apps in dev mode
pnpm dev

# Or start individual apps
pnpm --filter @repo/web dev
pnpm --filter @repo/customer dev
pnpm --filter @repo/admin dev
pnpm --filter @repo/rider dev
```

### Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | PostgreSQL connection string (Supabase session pooler) |

## Features

### Customer App
- Browse menu with category filters and search
- Product details with variant selection (size, preparation, sugar level)
- Shopping cart with persistent state
- Checkout with COD or GCash payment
- Real-time order tracking with rider location on map
- Order history and profile management

### Admin Dashboard
- Analytics overview (daily/weekly revenue, order volume, top products)
- Inventory management with stock tracking
- Order management with status updates and rider assignment
- Category management
- Rider management with location tracking
- Sales reports with daily/weekly/monthly aggregation
- PDF and CSV report export

### Rider App
- Active delivery display with customer details and map
- One-tap actions: call customer, open in Google Maps, mark delivered
- Real-time order assignment notifications via Supabase Realtime
- GPS location tracking during active deliveries
- Delivery history and earnings tracker

## Project Structure

```
suarez-food-hub/
├── apps/
│   ├── web/              # Public marketing site
│   ├── customer/         # Customer e-commerce PWA
│   ├── admin/            # Admin dashboard PWA
│   └── rider/            # Rider delivery PWA
├── packages/
│   ├── ui/               # Shared UI components
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── supabase/         # Supabase client helpers
│   └── config/           # Shared configs
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── turbo.json            # Turborepo config
├── pnpm-workspace.yaml   # Workspace config
└── package.json          # Root package.json
```

## Database Schema

- **profiles** — User profiles with role-based access (customer, admin, rider, manager)
- **categories** — Menu categories (Dumplings, Spring Rolls, Main Dish, etc.)
- **products** — Menu items with base pricing and variant support
- **product_variants** — Size, preparation, and sugar level variants
- **orders** — Customer orders with payment, delivery, and status tracking
- **order_items** — Individual items within an order
- **rider_locations** — Real-time rider GPS coordinates

## License

Private — Suarez Food Hub
