# Dataflow Diagrams — Implementation Plan

## Goal
Create a standalone HTML file with SVG-based dataflow diagrams showing how each user type navigates the Suarez Food Hub system. Light background, rich visuals, role-based color coding.

## File
`S:\Dev\Monorepo\suarez-food-hub-wvsu\docs\dataflow.html`

## Color Scheme (Role-Based)
| User Role | Color | Hex |
|-----------|-------|-----|
| Customer | Blue | #3b82f6 |
| Admin | Red | #ef4444 |
| Staff | Green | #22c55e |
| Rider | Orange | #f97316 |
| Supabase/DB | Purple | #7c3aed |
| Shared UI | Gray | #64748b |

Background: Light (#f8fafc / white gradient)
Cards: White with subtle shadows
Arrows: Dark gray (#334155) with role-colored endpoints

## Diagrams to Create (5 total)

### Diagram 1: Customer App (Web) — Port 3000
**Pages:** Home → Menu → Cart Sidebar → Checkout (3-step) → Orders → Profile
**Auth flow:** Login/Register → Supabase Auth
**Key data:** Products (Supabase) → Cart (localStorage + API) → Orders (Supabase) → Rider tracking (Realtime)

Flow:
```
Guest: Home → Menu (browse) → "Sign in to Order" prompt
Auth: Login → Home → Menu → Cart → Checkout (Address+Map → Payment → Confirm) → Orders (track, live map)
Register: Role select → Form → Supabase Auth → Profile created
```

### Diagram 2: Admin App — Port 3001
**Pages:** Login → Dashboard → Orders/OrderDetail/Inventory/Categories/Riders/Staff/Cashouts/Reports/Settings
**Auth flow:** Login (admin role check) → Dashboard
**Key data:** Orders (Realtime), Inventory CRUD, Rider approval, Staff management, Cashout processing, Reports/PDF

Flow:
```
Login (admin only) → Dashboard (stats) → 
  Orders (filter, assign rider, update status, payment) → Order Detail (timeline, map, print)
  Inventory (CRUD products, stock management)
  Categories (CRUD, reorder)
  Riders (approve/reject, view locations)
  Staff (create accounts, toggle active)
  Cashouts (approve/reject, mark paid)
  Reports (date range, charts, PDF export)
  Settings (store info, QR codes, delivery config)
```

### Diagram 3: Staff App — Port 3002
**Pages:** Login → Dashboard → Orders/OrderDetail/Inventory
**Auth flow:** Login (staff or admin role check) → Dashboard
**Key data:** Orders (Realtime), Order status updates, Inventory stock editing

Flow:
```
Login (staff/admin) → Dashboard (stats tiles, low stock alert) →
  Orders (filter tabs, assign rider, update status/payment) → Order Detail (timeline, map, print)
  Inventory (search, filter, edit stock quantities)
```

### Diagram 4: Rider App — Port 3003
**Pages:** Login → Dashboard → Deliveries/Earnings/Profile
**Auth flow:** Login (rider role check, status check) → Dashboard
**Key data:** Active order (Realtime), GPS location tracking, Earnings calculation, Delivery history

Flow:
```
Login (rider, active status) → Dashboard (online toggle, active delivery, map, mark delivered) →
  Deliveries (history list)
  Earnings (today/week/month/total, bar chart)
  Profile (info, lifetime stats, logout)
```

### Diagram 5: Comprehensive System Overview
Shows all 4 apps connected through:
- **Supabase** (center): Auth, Database, Realtime
- **Shared packages**: @repo/data-access, @repo/supabase, @repo/ui, @repo/types
- **Data flow arrows**: Customer places order → Admin/Staff see it → Rider delivers → Customer tracks
- **Realtime connections**: Rider location → Customer map, Order status → Staff/Admin dashboards

## Technical Approach
- Single standalone HTML file (no external dependencies)
- Inline SVG for each diagram
- Light theme CSS (white cards, light gray background)
- Responsive layout (scrollable on mobile)
- Section navigation (sticky nav bar)
- Each diagram in a white card with title and description
- SVG nodes: Rounded rectangles with icons/labels
- SVG arrows: Path elements with role-colored endpoints
- Legend section explaining colors and symbols

## SVG Layout Strategy
- Each app diagram: horizontal flow, left-to-right
- Nodes: 140x60 rounded rects with icon + label
- Arrows: Curved paths with arrowhead markers
- Grouping: Auth section, Main flow, Data layer
- Comprehensive diagram: Hub-and-spoke with Supabase at center
