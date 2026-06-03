# Fix Plan — All Critical + High Issues

## Item 1: Fix `/api/locations` for PSGC + rider queries
**File:** `apps/web/app/api/locations/route.ts`
**Action:** Rewrite to handle:
- `?type=region` → `locations WHERE type='region'`
- `?type=province&parent=X` → `locations WHERE type='province' AND parent_id=X`
- `?type=city&parent=X` → `locations WHERE type='city' AND parent_id=X`
- `?type=barangay&parent=X` → `locations WHERE type='barangay' AND parent_id=X`
- `?rider_id=X` → existing `rider_locations` query
- Add try/catch wrapper, return `[]` for PSGC queries, `{}` for rider not found

## Item 2: Fix `@repo/types` column mismatches
**File:** `packages/types/src/index.ts`
**Actions:**
- `Order`: remove `ready_at`, add `changed_at` for `order_status_log`
- `RiderEarning`: rename `created_at` → `earned_at`
- `RiderCashout`: rename `created_at` → `requested_at`, remove `gcash_reference_no` (add it to SQL migration instead)
- `OrderStatusLog`: rename `created_at` → `changed_at`
- `Location`: rename `psgc_code` → `code`
- `Notification`: rename `is_read` → `read`
- `BusinessConfig`: rename `free_delivery_threshold` → `free_delivery_min`, remove `gcash_number`/`maya_number`/`base_lat`/`base_lng`, add `logo_url`/`registration_no`
- Add `UserCart` interface: `{ user_id: string; items: unknown; updated_at: string }`

## Item 3: Add auth to admin API routes
**Files:**
- `apps/admin/app/api/orders/route.ts`
- `apps/admin/app/api/reports/route.ts`
- `apps/admin/app/api/reports/pdf/route.ts`
**Action:** After creating supabase client, verify admin role:
```
const { data: { user } } = await supabase.auth.getUser();
if (!user) return 401;
const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
if (profile?.role !== "admin") return 403;
```

## Item 4: Add auth to public APIs
**Files:**
- `apps/web/app/api/products/route.ts` POST
- `apps/web/app/api/products/[id]/route.ts` PUT/DELETE
- `apps/web/app/api/settings/route.ts` POST
- `apps/rider/app/api/location/route.ts` POST/GET
**Action:** Add admin role check for products/settings; rider role check for location.

## Item 5: Fix rider middleware
**File:** `apps/rider/middleware.ts`
**Action:** Replace inline `createServerClient` + role DB query with:
- Import `updateSession` from `@repo/supabase/middleware`
- Use simple `getUser()` redirect check (no DB query in middleware)
- Add cookie fallback for `hasSession` like admin/staff middleware

## Item 6: Fix web middleware auth detection
**File:** `apps/web/middleware.ts`
**Action:** Change `const hasSession = !!user;` to:
```
const hasSession = user !== null ||
  request.cookies.get('sb-access-token') !== undefined ||
  request.cookies.get('sb-refresh-token') !== undefined;
```

## Item 7: Add `router.refresh()` after rider logout
**Files:**
- `apps/rider/app/(rider)/layout.tsx` (line 45-48)
- `apps/rider/app/(rider)/profile/page.tsx`
**Action:** Add `router.refresh()` after `await supabase.auth.signOut()`.

## Item 8: Add try/catch to all 17 route handlers
**Files:** All API route files across all 4 apps
**Action:** Wrap each exported handler function body in try/catch. Return `{ error: message }` with status 500 on catch.

## Item 9: Fix admin orders pagination count
**File:** `apps/admin/app/api/orders/route.ts`
**Action:** Change `.select("...")` to `.select("...", { count: 'exact' })`.
