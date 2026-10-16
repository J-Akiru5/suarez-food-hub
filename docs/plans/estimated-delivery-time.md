# Estimated Delivery Time (ETA) — Implementation Plan

| | |
|---|---|
| **Status** | PROPOSED — plan only. Nothing in this document is implemented, migrated or deployed. |
| **Written** | 2026-10-16, branch `claude/eta-plan-b9ac92`, based on local `main` @ `77c83f0` |
| **Scope** | Customer-facing estimated delivery time for Suarez Food Hub (web customer app first; staff/admin/rider apps for control, instrumentation and measurement) |
| **Legend** | Effort: **S** ≤ ½ day · **M** 1–2 days · **L** 3–5 days (one developer who knows the repo). Paths are relative to the repo root. SQL/TS snippets are *illustrative*. |

---

## 0. Executive summary

- **Today customers see no time at all** — only a six-step status timeline, a rider pin, and (since `77c83f0`) a distance-based delivery *fee* estimate. The distance behind that fee is **straight-line (Haversine)**, not road distance.
- **Show a range plus a clock time** (e.g. "35–55 min · 7:35–7:55 PM"), never a single number, computed by **one pure, tested function in `packages/utils`** and recomputed on the server only. The estimate is the sum of seven stages (acceptance → kitchen → rider dispatch → rider-to-store → store handoff → travel → customer handoff). Cold start uses admin-editable priors; once ≥ 30 comparable deliveries exist, percentiles from `order_status_log` take over.
- **Travel time: ship with `Haversine × detour factor ÷ average speed`** (free, no vendor, no privacy exposure). Keep a provider interface so OpenRouteService can be added later *only if* the backtest shows a real accuracy gain. Google/Mapbox are poor fits (billing account, map-display terms, Leaflet/OSM stack).
- **Data model:** an append-only `order_eta_estimates` table (first row = the immutable **quote**, later rows = **revisions**), a kill switch + rollout mode on `business`, and SQL views/RPCs for accuracy (the 1000-row API cap rules out client-side aggregation). Live updates reach the browser via the existing Supabase Realtime pattern; per-recompute writes **never touch `orders`** (the orders page refetches everything on every `orders` event).
- **Roll out in dark launch order:** `off → shadow (record, don't show) → internal → 10% → 50% → 100%`, each gated by measured accuracy, with an instant kill switch in admin settings.
- **Four things must be fixed or decided first** (details in §10, Phase 0): the web orders page mis-renders `claimed_by_rider` / `near_customer` (shows "Pending"); the kitchen-ready moment is **unmeasurable** when a rider claims early (statuses are overwritten); `rider_locations` is world-readable and `GET /api/locations?rider_id=` is unauthenticated; and `77c83f0`, the min-order branch and the P0 CI fixes must merge in a sensible order.
- **Estimated effort:** ≈ 50 developer-days across 6 phases (0–5) by the S/M/L sizes below, or ≈ 40 on the lean path (defer the backtest script, the admin accuracy page, staff "promised-by" badges, delay notifications and the optional routing provider). Two developers (engine/data track and UI track) could finish in ≈ 6–7 calendar weeks; the ≥ 2-week shadow window overlaps Phase 2–3. 12 open questions need the owner's call (§12), each with a recommended default.

---

## 1. Decisions table

| # | Decision | Recommendation | Main alternative / trade-off | Owner |
|---|---|---|---|---|
| D1 | Display format | Range `[p30, p85]` of predicted total, rounded to 5 min (floor start / ceil end), min width 10 min, **plus** clock time in `Asia/Manila`. Never a single number. | Single "~40 min": simpler, falsely precise, and eroded trust when wrong. | Product |
| D2 | Where the logic lives | Pure `estimateEta()` in `packages/utils/src/eta.ts`, clock injected (`now` param), milestone-based (not status-based). Server-authoritative; clients never compute the quote. | Duplicate logic per app: drifts (the fee code was deliberately unified for this reason). | Dev |
| D3 | Travel-time source | `Haversine × detour_factor ÷ speed` now; `RouteProvider` interface; OpenRouteService optional in Phase 4 behind a backtest gate. | OSRM demo (non-commercial, 1 req/s, no SLA), Mapbox/Google (ToS + billing), self-hosted OSRM (ops burden). | Owner |
| D4 | Quote vs live | **Both**, in one append-only table: `kind='quote'` (immutable, exactly one per order) and `kind='revision'` rows. Customer sees the *current* estimate; original quote shown only if revised later by > 10 min. | Columns on `orders`: triggers a full refetch storm on every recompute; mutable → can't audit accuracy. | Dev |
| D5 | Delivery to clients | Realtime `INSERT` on `order_eta_estimates` (filter `user_id=eq.<uid>`) is only an **invalidate signal**; the UI re-fetches `GET /api/orders/[id]/eta`; 60 s polling fallback while the tab is visible (same pattern as the rider home page). | Render straight from the Realtime payload: two render paths, kill switch harder to enforce. | Dev |
| D6 | Feature flag | `business.eta_mode` ∈ `off · shadow · internal · percent · on`, `eta_rollout_percent` 0–100, deterministic per-user bucket. Tester allow-list in a **server env var**, *not* in `business` (that table is world-readable). | Vercel Edge Config / Flags: new vendor + SDK; an admin-editable DB flag fits the existing JSONB-settings pattern (`0025`, `0028`). | Owner |
| D7 | Historical source of truth | `order_status_log` (timestamptz) + a **new** `orders.kitchen_ready_at`. Do **not** build on `orders.confirmed_at` / `prepared_at` / `picked_up_at` — their meanings are not what the names suggest (see §3.8). | Use the `orders` columns: wrong semantics, silently skews stage durations. | Dev |
| D8 | Migration naming | Timestamp names via `pnpm db:new <name>` for **every** ETA migration; no dependency on objects from the contested `0029_*` files; statuses typed as `text` in app code and compared as `status::text` in SQL. | Pick `0029`/`0030`: collides with two unmerged `0029_*` migrations. | Dev |
| D9 | Recompute triggers | (1) placement — synchronous; (2) status change — shared best-effort helper called from every status writer; (3) customer view — throttled read-through (≥ 45 s); (4) rider location — Phase 4, `after()` + throttle (≥ 60 s **and** ≥ 200 m moved). No DB webhook in v1. | `pg_net`/DB webhook on `orders`: catches every writer incl. SQL RPCs, but adds a secret, a public internal endpoint and a failure mode. Revisit in Phase 4. | Dev |
| D10 | Notifications | App-layer, **delay only**, de-duplicated. Do *not* edit `notify_order_status_change()` (rewritten by `0010`, `0026` and the uncommitted `0029_dispatch_queue`). | Put ETA text in the status trigger: guaranteed merge conflict with the dispatch migration. | Dev |
| D11 | Rate limit / cost control | Postgres-backed fixed-window limiter RPC, used only to budget *external* routing calls. Internal ETA reads are naturally throttled by "recompute at most every 45 s per order". | Upstash/Vercel KV: extra vendor for a capstone; a Vercel WAF rule is fine as an add-on. | Dev |
| D12 | Accuracy computation | SQL views + RPCs (`percentile_cont`, `AT TIME ZONE 'Asia/Manila'`), admin-only page. | Client-side aggregation: silently wrong beyond 1000 rows (audit F4). | Dev |
| D13 | ETA never blocks ordering | Every ETA call is wrapped, has a hard 800 ms budget on the order path (1.5 s for any external provider) and degrades to *"no ETA shown"*, never to an error. | Fail the request: unacceptable for a food-ordering funnel. | Dev |
| D14 | Closed hours | Show an ETA anchored to the next opening time, labelled "we open at 10:00 AM". **Do not change ordering rules** (see Q2). | Block ordering when closed: a business-rule change outside this feature. | Owner |
| D15 | Prerequisite fixes | Fix the web status presentation and the `rider_locations` privacy hole **before** exposing ETAs (Phase 0). | Ship ETA on top: customers in `claimed_by_rider` would see "Pending" next to a confident ETA. | Dev |
| D16 | Dispatch model in v1 | Model `after_ready` dispatch (rider is sought once food is ready), the dominant flow today; measure the share of "claimed before ready" orders in Phase 0 before deciding whether to model `parallel`. | Model both now: more complexity before there is data. | Dev |

---

## 2. Product and UX specification

### 2.1 Principles

1. **Honest ranges.** The headline is a window; the clock time is secondary. Width reflects uncertainty (cold start is wider, live phase is narrower).
2. **Informational, not a guarantee.** Copy says "estimated"; no compensation promises.
3. **Absence over error.** If ETA is disabled, unavailable or the user is outside the rollout, show *nothing* extra — the existing timeline still works. Never show "ETA unavailable".
4. **One formatter.** All strings come from one function in `packages/utils` (`formatEtaWindow`, `formatEtaClock`), always with `timeZone: "Asia/Manila"`, so a customer abroad or a device in the wrong timezone still sees store-local time.

### 2.2 Where the ETA appears

| Surface | File(s) | Shows | Phase |
|---|---|---|---|
| Checkout quote (step 1 summary, step 3 review) | `apps/web/app/checkout/page.tsx` (next to the existing `FeeEstimate` display) | Window + clock + "based on your distance (4.2 km)" | 3 |
| Order confirmation ("Order Placed!") | same file, `success` branch | Server **quote** from `POST /api/orders` response | 3 |
| Active order card on `/orders` | `apps/web/app/orders/page.tsx` (new `EtaCard` above the timeline) | Current window, phase sentence, delayed state | 3 |
| Live map header | `apps/web/components/CustomerDeliveryMap.tsx` / orders page map section | "Arriving in 10–15 min" next to "Rider Location · Live" | 3 |
| Delivered state / receipt | orders page receipt modal (~L1470) | "Delivered 7:42 PM · quoted 7:35–7:55 PM" (actual from `delivered_at`) | 3 |
| Customer notification | app-layer `createNotification` (type `eta_delay`) | Only when the new window slips ≥ 10 min | 3 |
| Staff / admin order list + detail | `apps/staff/app/(dashboard)/orders/page.tsx`, `[id]/page.tsx`, admin equivalents | "Promised by 7:55 PM", red when overdue; internal components breakdown | 2 |
| `/track-order` | `apps/web/app/track-order/page.tsx` | Fix redirect to `/orders?tab=active` (today it sends `?active=true`, which the page ignores) | 0 |

### 2.3 Behaviour per order status

Status names are the DB enum plus `awaiting_rider` (arrives with the dispatch migration). Phase = what the engine reports; the UI keys off phase, never raw status.

| Status | Phase | Headline | Sub-line | Timeline step highlighted | ETA basis |
|---|---|---|---|---|---|
| `pending` | `awaiting_confirmation` | "Estimated arrival **7:35–7:55 PM**" | "Waiting for the restaurant to confirm. This estimate may change." | Pending | Full model, accept-wait stage open, **widened** window |
| `confirmed` | `kitchen_queue` | "Arriving **7:35–7:50 PM**" | "Your order is in the kitchen queue." | Confirmed | Remaining = queue + prep + rest |
| `preparing` | `preparing` | "Arriving **7:35–7:50 PM**" | "Your food is being prepared." | Preparing | Remaining prep = max(floor, p50 − elapsed) |
| `ready_for_pickup`, `awaiting_rider` | `finding_rider` | "Arriving **7:40–7:55 PM**" | "Ready — finding a rider." | Ready | Assign-wait + rest |
| `claimed_by_rider` | `rider_to_store` | "Arriving **7:40–7:50 PM**" | "A rider is on the way to pick up your order." | Ready (sub-state) | Rider→store + handoff + travel |
| `out_for_delivery` | `on_the_way` | "Arriving in **10–15 min**" (+ clock) | "Your order is on the way." | Out for delivery | **Live**: rider position → customer when fresh (< 120 s), else elapsed-based |
| `near_customer` | `arriving` | "Arriving in **a few minutes**" | "Your rider is nearby — prepare your payment if COD." | Out for delivery | Fixed 1–5 min window |
| `delivered` | `delivered` | "Delivered at **7:42 PM**" | "Quoted 7:35–7:55 PM" (smaller) | Delivered | Actual (`delivered_at`); no estimate |
| `cancelled` | `cancelled` | — (no ETA block) | — | — | None |
| unknown / future enum value | `unknown` | — (no ETA block) | — | — | None; never throws |

### 2.4 Special states

| State | Trigger | Behaviour |
|---|---|---|
| **Delayed** | `now > window_end` and not delivered | Headline switches to "Taking a bit longer than expected" + **new** window; calm tone, no red until severe. Original quote shown small if the new window starts ≥ 10 min after the old end. |
| **Severely delayed** | `now > window_end + 15 min` | Adds "Need help? Call the restaurant at {business.phone}" (from `GET /api/business`). One delay notification max per 20 min per order. |
| **Stuck pending** | no status change > p90 of accept stage | "The restaurant hasn't confirmed yet — we're letting them know." (also raises a staff-visible flag). |
| **Outside operating hours** | `business.operating_hours` says closed at placement | Estimate is anchored to next opening: "We open at 10:00 AM — estimated delivery **10:35–10:55 AM**". No behaviour change to ordering (Q2). |
| **Out of range** | `feeOutcome.outOfRange` | No ETA; existing "too far" message wins. |
| **No coordinates** (town centroid / flat-fee fallback) | `distanceKm == null` | ETA shown with `confidence: low`, wider window, travel from a default (20 min); copy unchanged. |
| **Rider position stale** | `rider_locations.updated_at` older than 120 s | Fall back to elapsed-based travel, widen window, `confidence` drops one level. |
| **Engine failure / timeout / flag off** | any exception, > 800 ms, `eta_mode='off'` | Block not rendered. Order flow unaffected. |

### 2.5 Copy deck (en-PH, centralised in one map for future Tagalog/Hiligaynon)

Keys live in `packages/utils/src/eta.ts` (`ETA_COPY`). Plain, warm, no jargon, no exclamation spam.

- Window: `35–55 min` (en dash) · clock: `7:35–7:55 PM` (uppercase AM/PM; ICU day-period casing differs between Node/Chrome/Safari, so the formatter builds it from `formatToParts` and a unit test pins the output).
- Under 10 min remaining: `5–10 min`; under 2 min: `Arriving now`.
- Footer disclaimer (checkout only): "Estimate only. Actual time depends on kitchen load, traffic and weather."
- Never: "ETA", "ETD", "SLA", "guaranteed", a single minute value, or seconds.

### 2.6 Accessibility and mobile

- ETA card is `role="status"` with `aria-live="polite"`; announcements fire only on **phase change or window shift ≥ 5 min**, not on every poll. No per-second countdown — text updates at most every 30 s.
- Meaning never conveyed by colour alone (delayed state has an icon + text). Contrast ≥ 4.5:1 on the cream background used by the orders page.
- Mobile-first at 360 px: ETA is the first line of the active order card, above the timeline; map stays below. The orders page already has `@media (max-width: 640px)` rules — add ETA-specific classes there.
- `prefers-reduced-motion`: no pulsing "Live" dot animation on the ETA block.
- Biome a11y rules are warnings today; new components must be warning-free (`type="button"`, labelled controls).

---

## 3. Estimation model

### 3.1 Stage decomposition

Milestone-based: the engine receives the order's *timeline* (which milestones have happened and when), not just its status. This is what makes it robust to staff skipping statuses and to riders claiming early.

| # | Stage | Starts | Ends | Signal (history) | Prior p50 / p90 (min) | Config key |
|---|---|---|---|---|---|---|
| S1 | **Acceptance wait** | order placed | first of `confirmed`/`preparing`/`ready_for_pickup` | `order_status_log` | 4 / 10 | `accept` |
| S2 | **Kitchen** (queue + prep) | accepted | food ready (`kitchen_ready_at`) | new `orders.kitchen_ready_at`; fallback log `ready_for_pickup` | 12 / 18 (+ batch/queue terms) | `prep_default`, per-category/product |
| S3 | **Rider assignment wait** | food ready (`after_ready` mode) | rider accepted (`claimed_by_rider`) | log (`ready_for_pickup`→`claimed_by_rider`, incl. `awaiting_rider` once dispatch lands) | idle rider: 3 / 8 · none idle: 10 / 20 | `assign_idle`, `assign_busy` |
| S4 | **Rider → store** | rider accepted | rider picks up (`out_for_delivery`) | log | 5 / 10 | `to_store` |
| S5 | **Store handoff** | rider at store | included in S4's end | (merged with S4 in history) | 2 / 4 | `store_handoff` |
| S6 | **Travel** | `out_for_delivery` | `near_customer`/arrival | distance × detour ÷ speed; log (`out_for_delivery`→`delivered`) | `km × 1.35 ÷ 24 km/h` / at 16 km/h, min 3 | `detour_factor`, `speed_p50`, `speed_p90` |
| S7 | **Customer handoff** | arrival | `delivered_at` | log (`near_customer`→`delivered`) | 3 / 6 | `customer_handoff` |

All priors are **starting guesses to be calibrated in shadow mode**, not facts about the business. They live in `business.eta_params` (admin-editable) and are clamped by `parseEtaParams` (same pattern as `parseDeliveryTiers` in `packages/utils/src/delivery.ts`).

### 3.2 Formulas

```
units        = Σ order_items.quantity                       // packs: see Q9
item_prep_i  = product.prep_minutes ?? category.prep_minutes ?? params.prep_default
batch_extra  = min(batch_cap, max(0, units − batch_free_units) × batch_per_unit)
queue_delay  = min(queue_cap, max(0, orders_ahead − kitchen_capacity) × queue_slot)
             // orders_ahead = orders in (pending, confirmed, preparing) created before this one

S2_p50 = max_i(item_prep_i) + batch_extra + queue_delay
S2_p90 = S2_p50 × prep_p90_mult                              // default 1.5

S6_p50 = max(min_travel, km × detour_factor / speed_p50 × 60)
S6_p90 = max(min_travel, km × detour_factor / speed_p90 × 60)
         // km = same distance the delivery fee used (resolveDeliveryFee); null → default_travel (20/32)

total_p50 = Σ stage_p50                                      // after_ready mode: strictly sequential
σ_i       = (stage_p90 − stage_p50) / 1.2816                 // 1.2816 = z(p90)
σ_total   = sqrt(Σ σ_i²)                                     // assume independent stages (documented, conservative-ish)
window    = [ total_p50 − 0.524·σ_total  (≈p30),  total_p50 + 1.036·σ_total (≈p85) ]
window    = round(floor start to 5, ceil end to 5), enforce width ≥ min_window (10)
start     ≥ physical floor (Σ stage minimums)
```

**Worked example (cold start).** 4.2 km, 3 units, 1 order ahead, idle riders, open hours, not peak:
S1 4 + S2 12 + S3 3 + S4 5 + S5 2 + S6 (4.2 × 1.35 ÷ 24 = 14.2) + S7 3 = **43.2 min** p50.
σ² = 21.9 + 21.9 + 15.2 + 15.2 + 2.4 + 30.7 + 5.5 = 112.8 → σ = 10.6 → window 37.6–54.2 → **"35–55 min"**. Wide on purpose: it narrows as real percentiles replace priors.

**Remaining time during an order** (phase-aware). For the stage in progress: `remaining_p50 = max(stage_floor, stage_p50 − elapsed_in_stage)`; later stages contribute their full values; earlier stages contribute nothing. If `elapsed > stage_p90`: `remaining_p50 = overrun_pad` (5 min), `delayed = true`, confidence drops a level. If the rider claimed *before* the food is ready (broadcast model), the kitchen branch and the rider branch are tracked separately and the pickup moment is `max(food_ready, rider_at_store)`.

### 3.3 Cold start and data-driven refinement

| Situation | Behaviour |
|---|---|
| No history (day 1) | Priors only; `confidence = low`; window as above. |
| Segment has `n < min_samples` (30) | Blend: `p = (n·p_hist + k·p_prior) / (n + k)`, `k = 20` (shrinkage; no cliff when the 30th sample arrives). |
| Segment has `n ≥ 30` | Historical p50/p80/p90 for that stage, per Manila hour-bucket; fall back to all-day bucket, then to priors. |
| Outliers | Trim durations < 30 s (status-skipping artefact) and > 120 min (forgotten order) per stage before percentiles. |
| Where computed | SQL: `get_eta_stage_stats(p_days int default 28)` → one row per stage × hour-bucket (≤ ~170 rows), `service_role` only. App caches it in module memory 5 min per instance. |
| Refresh | Lazy, no cron required (precedent: `requeue_stale_assignments()` in the dispatch migration). Optional `pg_cron` hourly if the Supabase plan allows; **do not rely on Vercel Cron** (Hobby plan cron is limited — verify current limits). |
| Confidence | `high`: live phase with fresh rider position or all stages from `n ≥ 30`. `medium`: mixed. `low`: priors, no coordinates, stale rider position, or after an overrun. |

### 3.4 Time-of-day and load factors

- v1: **data-driven buckets** (Manila hour of day; weekday vs weekend) come for free from the stage-stats RPC once data exists.
- Before data: admin-configurable `peak_windows` in `eta_params`, e.g. `[{"from":"11:00","to":"13:00","prep_mult":1.25,"assign_mult":1.5}]`, default empty (no invented peaks).
- Kitchen load = `orders_ahead` above (live count, one indexed query on `orders.status`). Rider supply = count of `profiles` with `role='rider'`, `is_active`, `rider_status in ('available','vacant')` and active deliveries below `max_active_deliveries` (default 2 once dispatch lands; configurable until then).

### 3.5 Live phase (rider position)

From `claimed_by_rider` onward the server reads the assigned rider's single row in `rider_locations` (service client; one row per rider by `onConflict: rider_id`):

- `claimed_by_rider`: rider→store = `haversine(rider, store) × detour ÷ speed`.
- `out_for_delivery`: remaining travel = `haversine(rider, customer pin) × detour ÷ speed` + customer handoff.
- Position older than 120 s → treated as absent (elapsed-based fallback, wider window).
- Straight-line distance can **shrink while the road distance grows** (rivers, one-way streets). Guard: remaining time may not drop by more than 60 % between two consecutive revisions without a status change (monotonic smoothing), and never below the stage floor.
- Positions and rider IDs are used in memory only; **nothing derived from them that identifies the rider or reveals coordinates is stored or returned** (§9).

### 3.6 Travel-time provider comparison

| Option | Free tier / cost | ToS / privacy fit for this app | Latency & failure | Caching | Verdict |
|---|---|---|---|---|---|
| **A. Haversine × detour × speed** (in-house) | Free | No third party; no data leaves the server | ~0 ms; cannot fail | n/a | **Default (Phases 1–3).** Calibrated per distance band from history. |
| **B. OSRM public demo** | Free | "Reasonable, non-commercial" use only; ≤ 1 req/s; **no SLA/uptime guarantee** (per the OSRM demo-server wiki) | Variable | Allowed in practice | ❌ Not for production. Fine for the offline backtest only. |
| **C. OSRM/Valhalla self-hosted** (Philippines extract) | VM/container cost (est. $5–10/mo, unverified) | Full control; no sharing | Low, but you now run a service; **cannot** run inside Vercel serverless | Free | Only if A is inadequate *and* volume justifies ops work. |
| **D. OpenRouteService (hosted, HeiGIT)** | Standard plan: Directions **2,000/day, 40/min**; Matrix 500/day (per ORS plans page; re-verify at account.heigit.org/info/plans — could not be fetched here). Non-commercial "collaborative" plan has higher quotas. | Open data (OSM). Likely requires attribution — verify. Customer/destination coordinates would be sent to a Germany-hosted third party → disclosure needed (§9). No motorbike profile, no live traffic. | Network call, typically a few hundred ms (measure from the Vercel region); can fail/rate-limit (HTTP 429) | No stated ban; cache by quantised key (below) | **Optional Phase 4**, behind the adapter, only if the backtest shows ≥ 2 min MAE gain. |
| **E. Mapbox Directions/Matrix** | 100,000 Directions requests and 100,000 Matrix elements free/month (per Mapbox pricing page) | Mapbox's terms have historically tied Directions output to Mapbox maps and restricted storage — **verify current terms**; this app uses Leaflet + OSM tiles | Good | Possibly restricted | ❌ Terms risk with the current map stack; token handling overhead. |
| **F. Google Routes API** | Essentials 10,000 free events/month; Pro 5,000; ≈ $5 / $10 per 1,000 after (per Google pricing page) | Needs a Cloud **billing account** (card — awkward for a student project); Google's terms restrict showing results on non-Google maps and limit caching | Good | Restricted | ❌ Billing + ToS + map-stack mismatch. |

**Recommendation:** ship **A** and calibrate it (a per-band `detour_factor`/`speed` table is a one-line extension of `eta_params`). Add **D** only behind a feature flag with: per-day budget guard (stay ≤ 75 % of quota, i.e. ~1,500 Directions/day), quantised cache, 1.5 s timeout, automatic fallback to A. Because the public checkout preview must stay free and unabusable, **external calls happen only on authenticated, post-placement paths** (never in the public `POST /api/delivery-estimate`).

Cache key for any provider call: `provider|profile|round(lat,3)|round(lng,3)|round(lat,3)|round(lng,3)` (≈ 110 m resolution — also a privacy feature). Store in `eta_route_cache(key pk, duration_s, distance_m, fetched_at)`, TTL 7 days (road geometry is traffic-agnostic for these providers), purge job lazy on write.

### 3.7 Pickup-wait nuance (dispatch models)

| Flow | Behaviour today | Consequence for the model |
|---|---|---|
| **Broadcast** (current main): staff "invite riders" writes `pending_riders` without changing status (`apps/staff/app/(dashboard)/orders/page.tsx` ~L153–171); a rider may accept from `pending`, `confirmed`, `preparing` or `ready_for_pickup` (`RIDER_STATUS_FLOW` in `apps/rider/app/api/orders/status/route.ts` L13–21) and the accept **overwrites** the kitchen status with `claimed_by_rider` | A rider can claim before the food is ready; the `ready_for_pickup` transition may then **never be logged** | Need `kitchen_ready_at` (Phase 0). Pickup = `max(food_ready, rider_at_store)`. |
| **Direct assignment** (uncommitted `0029_dispatch_queue.sql`): `awaiting_rider` state, `rider_assigned_at`, 10-minute accept timeout with cascade, `max_active_deliveries` | Assignment wait includes decline/timeout cascades | S3 uses the history of `ready_for_pickup → claimed_by_rider` and treats `dispatch_log` actions `declined/timeout/exhausted` as an upward pressure signal (optional v2). |

### 3.8 Data-quality rules (what the existing timestamp columns *really* mean)

| Column | Looks like | Actually is (verified in code) | Use for ETA? |
|---|---|---|---|
| `orders.confirmed_at` | order accepted time | Stamped by `deductStockForOrderIfNeeded` (`packages/data-access/src/data/products.ts` L295–299) as the **stock-deducted marker**; intentionally *not* set by the staff confirm route; nulled on cancel | ❌ Use `order_status_log` |
| `orders.prepared_at` | prep finished | Set when status becomes **`preparing`** (`apps/staff/app/api/orders/route.ts` L58) = prep **start** | ❌ |
| `orders.picked_up_at` | rider picked up food | Set when the rider **accepts** (`claimed_by_rider`) (`apps/rider/app/api/orders/status/route.ts` L95–111; same in dispatch RPC) | ❌ Real pickup ≈ `out_for_delivery` log row |
| `orders.delivered_at` | delivered | Set by rider status / complete routes | ✅ Ground truth |
| `order_status_log.changed_at` | status change time | `timestamptz` (converted in `0020`), inserted by trigger `trg_log_order_status` on every status change incl. initial `pending` | ✅ Canonical |
| `orders.kitchen_ready_at` | — | **New (Phase 0):** stamped when staff marks food ready, even if a rider already claimed | ✅ |

---

## 4. Data model and migrations

### 4.1 Naming scheme (collision-safe)

- Existing: `0001`–`0028` numbered, one timestamp migration (`20260920040108_reorder_products.sql`); **two unmerged `0029_*`** (`0029_dispatch_queue.sql` uncommitted in the main checkout, `0029_product_packs.sql` in another worktree); `20261016024529_min_delivery_order.sql` in the min-order worktree.
- **Rule for this feature: only `pnpm db:new <name>` (Supabase CLI timestamps).** Suggested names: `eta_schema`, `eta_analytics`, `rider_locations_privacy`, `eta_route_cache_and_limits`.
- Every ETA migration is **order-independent of the `0029`s**: no reference to `awaiting_rider` values, `rider_assigned_at`, `dispatch_log`, `pack_size`, `is_pack`. SQL compares `status::text`.
- Heads-up (existing, not caused by ETA): timestamp names sort *after* `00xx`, so a not-yet-applied `0029_*` sorts *before* an already-applied timestamp migration and `supabase db push` will want `--include-all`. Recommend the owner renames the two `0029_*` files to timestamps before applying them. Also reconcile README guidance ("never use the dashboard SQL editor, use `db push`") with the `0028` header that says "run via the SQL editor".
- Nothing in this plan applies a migration. Each migration ships with a documented down-script (§4.7) and is applied by the owner with `npx supabase db push --dry-run` first.

### 4.2 Schema changes

| Object | Change | Notes |
|---|---|---|
| `orders.kitchen_ready_at` | `timestamptz NULL` | Phase 0. Written by staff route. Index not needed. |
| `business.eta_mode` | `text NOT NULL DEFAULT 'off' CHECK (eta_mode IN ('off','shadow','internal','percent','on'))` | Kill switch / rollout stage |
| `business.eta_rollout_percent` | `smallint NOT NULL DEFAULT 0 CHECK (between 0 and 100)` | Used when `eta_mode='percent'` |
| `business.eta_params` | `jsonb NOT NULL DEFAULT '{}'` | Merged over code defaults by `parseEtaParams` (unknown keys dropped, values clamped). Includes `version` int, bumped on admin save → `model_version`. **World-readable** (`GET /api/business` returns `select *`; RLS "business readable by all") — contains no secrets by design. |
| `categories.prep_minutes` | `smallint NULL CHECK (prep_minutes BETWEEN 0 AND 240)` | Category default prep. |
| `products.prep_minutes` | same | Per-product override; UI **deferred** until the packs/inventory work merges (hot files). |
| `order_eta_estimates` | new table (below) | Append-only |
| `eta_route_cache` | new table | Phase 4, only if provider enabled |
| `api_rate_limits` + RPC `rate_limit_hit` | new | Phase 4, only if provider enabled |
| Views/RPCs | `eta_order_milestones` (view), `get_eta_stage_stats`, `get_eta_accuracy` | `eta_analytics` migration |

### 4.3 `order_eta_estimates` (illustrative DDL)

```sql
CREATE TABLE IF NOT EXISTS order_eta_estimates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- denormalised: cheap RLS + Realtime filter
  kind            text NOT NULL CHECK (kind IN ('quote','revision')),
  trigger         text NOT NULL CHECK (trigger IN ('placement','status_change','view_refresh','rider_location','manual')),
  status_at_compute text NOT NULL,             -- text, not the enum: survives new enum values
  phase           text NOT NULL,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  window_start_at timestamptz NOT NULL,
  window_end_at   timestamptz NOT NULL,
  p50_at          timestamptz NOT NULL,
  confidence      text NOT NULL CHECK (confidence IN ('low','medium','high')),
  is_displayed    boolean NOT NULL DEFAULT false,   -- false = shadow / not in rollout cohort
  model_version   text NOT NULL,                    -- e.g. 'eta1+p3'
  route_source    text NOT NULL DEFAULT 'formula',  -- 'formula' | 'ors' | ...
  components      jsonb NOT NULL DEFAULT '{}',      -- stage minutes + flags ONLY. No coordinates, no rider ids/names.
  CHECK (window_start_at <= p50_at AND p50_at <= window_end_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_eta_quote_per_order ON order_eta_estimates(order_id) WHERE kind = 'quote';
CREATE INDEX IF NOT EXISTS idx_eta_order_time ON order_eta_estimates(order_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_eta_user_time  ON order_eta_estimates(user_id, computed_at DESC);
-- immutability: no UPDATE ever (cascade DELETE from orders still works)
CREATE FUNCTION eta_estimates_no_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'order_eta_estimates is append-only'; END $$;
CREATE TRIGGER trg_eta_no_update BEFORE UPDATE ON order_eta_estimates
  FOR EACH ROW EXECUTE FUNCTION eta_estimates_no_update();
```

*Why one table:* the quote row gives a clean accuracy baseline; revision rows give "error vs lead time" curves and the Realtime signal; Realtime on a sparse insert-only table is cheap (inserts only on *material* change: |Δp50| ≥ 3 min, or phase change, or ≥ 10 min since last).

### 4.4 RLS matrix

| Table | customer | rider | staff/admin | anon | writes |
|---|---|---|---|---|---|
| `order_eta_estimates` | `SELECT` where `auth.uid() = user_id AND is_displayed` | none | `SELECT` all via `is_staff_or_admin()` | none | service role only (API routes); `BEFORE UPDATE` trigger blocks updates |
| `eta_route_cache`, `api_rate_limits` | none | none | none | none | service role only (RLS enabled, no policies) |
| `rider_locations` (Phase 0 hardening) | `SELECT` only for the rider on **their own active order**: `EXISTS (SELECT 1 FROM orders o WHERE o.rider_id = rider_locations.rider_id AND o.user_id = auth.uid() AND o.status::text IN ('claimed_by_rider','out_for_delivery','near_customer'))` | own row | all | **none** (today: `USING (true)`) | rider writes own row |
| `business` | public read (unchanged) | | admin write (unchanged) | | no secrets stored here |

Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.order_eta_estimates` guarded by the same `pg_publication_tables` check used in `0001` and `0018`.

### 4.5 Indexes (accuracy and stage-stat queries)

The audit (F4) found no index on `orders(created_at)`, `orders(user_id)`, `order_items(order_id)`. ETA adds only what its own queries need:

- `order_status_log (order_id, status, changed_at)` — milestone pivot.
- `order_status_log (status, changed_at)` — stage stats windowed by days.
- `orders (delivered_at) WHERE status = 'delivered'` (partial) — accuracy RPC.
- the two `order_eta_estimates` indexes above.

Recommend (but do not bundle) `orders(user_id, created_at DESC)` and `order_items(order_id)` as part of the audit's pagination work.

### 4.6 Timestamps and timezone (explicit handling)

| Rule | Detail |
|---|---|
| Storage | All new columns are `timestamptz`. Never persist wall-clock strings. |
| Computation | Epoch milliseconds / UTC only inside `estimateEta`. Clock is a parameter (`now`), never `Date.now()` inside the engine. |
| Display | Only at the UI boundary, always `timeZone: "Asia/Manila"` (UTC+8, no DST), via the one formatter. |
| `operating_hours` | `"HH:mm"` strings in the JSON (0025) are **business-local wall-clock**. `openingWindow(now, hours, tz)` converts using `Intl` with `timeZone: "Asia/Manila"`, handles close-after-midnight, closed days, and "next open" lookahead up to 7 days. |
| Legacy `orders.created_at` | Was `timestamp without time zone` holding UTC wall-clock; migration `0020` converts it to `timestamptz` (`AT TIME ZONE 'UTC'`) **if applied** — status in production is unknown from the repo. `parseServerDate` (`packages/utils/src/index.ts` L42–48) already tolerates both shapes. **ETA code and SQL avoid `orders.created_at`**: use `order_status_log` (first `pending` row) or the quote's `computed_at` instead. Preflight query in Appendix B confirms the column type. |
| SQL grouping | Hour/day buckets always `... AT TIME ZONE 'Asia/Manila'`; never rely on session time zone. |
| Clock skew | `createOrder` sets `created_at` from the app server clock while logs use DB `now()`; skew of seconds is ignored, minutes would show up as a data-quality alert (quote `computed_at` vs first log row). |

### 4.7 Backfill and rollback

- **Backfill:** none needed. Historical stage statistics come from existing `order_status_log` rows through the view; there are no past quotes to invent (the accuracy report simply starts when shadow mode starts). Backtest (`scripts/eta-backtest.ts`) replays history without writing.
- **Rollback levels:** (L1) `UPDATE business SET eta_mode='off'` — hides + stops compute within ~60 s, no deploy. (L2) revert the code PR. (L3) down-script, in this order: `DROP TABLE order_eta_estimates, eta_route_cache, api_rate_limits CASCADE; DROP FUNCTION get_eta_accuracy, get_eta_stage_stats, rate_limit_hit; DROP VIEW eta_order_milestones; ALTER TABLE business DROP COLUMN eta_mode, eta_rollout_percent, eta_params; ALTER TABLE categories/products DROP COLUMN prep_minutes;` `orders.kitchen_ready_at` is harmless and can stay. All objects are additive, so L1/L2 never need a schema rollback.

---

## 5. Architecture and API

### 5.1 Flow

```
 Customer browser ──POST /api/delivery-estimate──▶ web API ─┐   (fee always; `eta` block only for signed-in users)
 Customer browser ──POST /api/orders ──────────────▶ web API ─┤
 Customer browser ──GET  /api/orders/[id]/eta ─────▶ web API ─┤──▶ estimateEta()  ◀── packages/utils (pure, tested)
 Staff/Rider/Admin status routes ─(best-effort)────▶ refreshOrderEta() ──┘          ▲
 Rider app POST /api/location ─(Phase 4, after())──▶ refreshOrderEta()              │ inputs gathered by
                                                                                     │ packages/data-access/src/data/eta.ts:
 Supabase: order_eta_estimates ◀── INSERT (service role)                             │  business + eta_params, stage stats RPC,
      │                                                                              │  queue/rider-supply counts, order milestones,
      └── Realtime INSERT (user_id filter) ──▶ browser: "invalidate" ──▶ GET /eta    │  distance (resolveDeliveryFee), rider position
```

### 5.2 Module and file map

| Layer | New / changed | Responsibility |
|---|---|---|
| `packages/utils/src/eta.ts` (new) + export in `index.ts` | types, `ETA_DEFAULTS`, `parseEtaParams`, `phaseForStatus`, `timelineIndexForStatus`, `buildMilestones`, `estimateEta`, `openingWindow`, `hashBucket`, `isEtaVisibleTo`, `formatEtaWindow`, `formatEtaClock`, `ETA_COPY` | Pure; no I/O; deterministic given `now` |
| `packages/utils/src/__tests__/eta.test.ts` (new) | Vitest | §6 |
| `packages/data-access/src/data/eta.ts` (new) | `loadEtaInputs`, `computeAndStoreEta`, `refreshOrderEta(supabase, orderId, trigger)`, `getEtaForOrder`, stage-stats cache | All DB access; used by all four apps |
| `packages/data-access/src/types.ts` | add `order_eta_estimates`, new business/category/product/orders columns, `eta_*` RPC signatures | Hand-maintained and already stale (no `operating_hours`, no `awaiting_rider`) — add what ETA needs only |
| `apps/web/lib/delivery-fee.ts` | unchanged in v1; ETA consumes `distanceKm` and `source` it already returns | Single source of truth for distance stays here |
| `apps/web/app/api/orders/[id]/eta/route.ts` (new) | `GET` | Customer-auth, owner-only |
| `apps/web/components/EtaCard.tsx` + `apps/web/lib/use-order-eta.ts` (new) | UI + hook (Realtime invalidate + 60 s poll) | Shared by checkout, confirmation, orders page |
| `apps/admin/app/api/eta/accuracy/route.ts` + `apps/admin/app/(dashboard)/eta/page.tsx` (new) | Accuracy report | New page = no conflicts with busy dashboard files |
| `scripts/eta-backtest.ts` (new) | Offline replay (tsx, like `scripts/seed-users.ts`) | Pre-launch validation |
| `e2e/tests/web/eta.spec.ts`, `e2e/fixtures/eta.ts` (new) | Playwright | §6 |

### 5.3 API contracts (envelope `{ success, data | error }` everywhere)

| Route | Method | Auth | Contract |
|---|---|---|---|
| `apps/web/app/api/delivery-estimate/route.ts` | POST (existing) | Fee: public as today. `eta` block: **requires a valid session** (cookie) so abuse is bounded to registered users and rate limits have a key | Request adds optional `cart: [{ id, quantity }]`. Response adds `eta` (below). Additive: existing `FeeEstimate` consumers ignore it. ETA computed with the *same* `resolveDeliveryFee` outcome; **no external provider**. Any ETA error → response unchanged minus `eta`. |
| `apps/web/app/api/orders/route.ts` | POST (existing) | Customer | After the order + items are inserted: compute server-side quote (never accept ETA from the body), insert `kind='quote'` row, return `{ orderId, eta? }`. Wrapped in try/catch + 800 ms race. |
| `apps/web/app/api/orders/[id]/eta/route.ts` | GET (new) | Customer; `order.user_id === user.id` else 403; unknown id 404 | Returns latest visible estimate + quote + state. Read-through refresh if latest `computed_at` > 45 s old and order active. `Cache-Control: no-store`. |
| `apps/admin/app/api/eta/accuracy/route.ts` | GET (new) | Admin (`requireAdmin`) | Calls `get_eta_accuracy`; ≤ a few hundred rows. |
| `apps/admin/app/api/settings/route.ts` | PUT (existing, no field allow-list today) | Admin | Add validation: `eta_mode`, `eta_rollout_percent`, `eta_params` through `parseEtaParams`; reject out-of-range instead of storing. |
| `apps/web/app/api/locations/route.ts` | GET (existing, **unauthenticated**) | Phase 0: require session and an active order of the caller assigned to that `rider_id`; else 403 | Also stops leaking any rider's position to anyone with a UUID. |
| `apps/rider/app/api/location/route.ts` | POST (existing) | Rider | Phase 4: `after(() => refreshOrderEta(..., 'rider_location'))` with throttle. |

`eta` object (shared by checkout preview and order responses; **instants as ISO, minutes as numbers, strings built client-side**):

```json
{
  "available": true,
  "phase": "awaiting_confirmation",
  "window_start_at": "2026-10-16T11:35:00.000Z",
  "window_end_at":   "2026-10-16T11:55:00.000Z",
  "p50_at":          "2026-10-16T11:43:00.000Z",
  "range_min": [35, 55],
  "confidence": "low",
  "state": "on_time",
  "anchored_to_open_at": null,
  "model_version": "eta1+p1"
}
```

`GET /eta` adds `{ visible, quote: {window_start_at, window_end_at}, current: {...}, state: "on_time" | "delayed" | "severely_delayed", help_phone }`. **Forbidden keys** in any customer response (enforced by a contract test): `rider_id`, `rider_name`, `latitude`, `longitude`, `lat`, `lng`, `phone` (except the *business* help phone), `components`.

### 5.4 Recompute triggers and the writers that must call the helper

`refreshOrderEta(serviceSupabase, orderId, trigger)` is **idempotent, best-effort and never throws** (returns a result object). It inserts a revision only on material change.

| Writer of `orders.status` | File | Calls helper |
|---|---|---|
| Staff kitchen status + new "food ready" action | `apps/staff/app/api/orders/route.ts` (PATCH) | after successful update; also stamps `kitchen_ready_at` |
| Rider claim / out / near / delivered / reject | `apps/rider/app/api/orders/status/route.ts` | after update |
| Rider complete | `apps/rider/app/api/orders/complete/route.ts` | after update (delivered → no new estimate; just closes the loop for metrics) |
| Admin status / payment verification | `apps/admin/app/api/orders/route.ts` | after update |
| Customer cancel | `apps/web/app/api/orders/[id]/route.ts` (PATCH) | after update (no-op for cancelled; keeps one code path) |
| Staff "invite riders" (writes `pending_riders`, no status change) | `apps/staff/app/(dashboard)/orders/page.tsx` direct Supabase update | not needed in v1 |
| Dispatch RPCs (`assign_rider`, `rider_assignment_response`, `requeue_stale_assignments`, `revoke_assignment`) once merged | their API routes (not yet in repo) | add the call when those routes land; until then the 45 s view-refresh catches changes |
| Anything else (SQL editor edits, scripts) | — | covered by view-refresh read-through |

Because writers are many and distributed across four apps, **correctness never depends on the helper being called**: the customer-view read-through (45 s) is the safety net, and shadow-mode accuracy depends only on the placement quote.

### 5.5 Delivery to clients (Realtime)

- Browser subscribes to `postgres_changes` `INSERT` on `order_eta_estimates` with `filter: user_id=eq.<uid>` — mirrors the existing `user-orders-<uid>` channel in `apps/web/app/orders/page.tsx` L196–210.
- Payload is **not rendered**; it triggers `GET /api/orders/[id]/eta`. Keeps one render path, lets the kill switch override instantly, and tolerates schema drift.
- Why not write live ETA onto `orders`: the orders page subscribes to **all** `orders` events for the user and refetches the full order list + two review queries each time (L105–215). Per-minute ETA writes would multiply that.
- Supabase notes: Postgres Changes is single-threaded and evaluates RLS per subscriber; our policy is a column compare (`auth.uid() = user_id`) — deliberately no join — and rows are sparse.
- Fallback: `visibilitychange`-aware 60 s poll; stops when the tab is hidden or the order is terminal.

### 5.6 Caching, rate limiting, cost control

| Concern | Control |
|---|---|
| Public preview abuse | `eta` block only for signed-in users; fee-only path unchanged. In-memory 15 s micro-cache per instance keyed by `round(lat,3),round(lng,3),cartHash`. |
| Recompute storm | Max one recompute per order per 45 s (read-through) / 60 s + 200 m (location); material-change gate before insert. |
| Rider GPS flood (existing) | `apps/rider/app/(rider)/page.tsx` L394–443 posts **every** `watchPosition` fix. Phase 4 adds client throttle (≥ 5 s and ≥ 15 m) — also cuts Supabase writes/Realtime traffic. |
| External provider budget | `rate_limit_hit('ors:YYYY-MM-DD', 86400, 1500)` before each call; global + per-user (30/min) keys; over budget → formula, `route_source='formula'`, metric `eta.budget_exceeded`. |
| Stage-stats | Module cache 5 min; RPC returns ≤ ~170 rows. |
| API key | `ORS_API_KEY` server env only; never `NEXT_PUBLIC_*`, never in `business`, never logged. |
| Vercel | No Cron dependency; function work is short; set `maxDuration` ≤ 10 s on the ETA route. |

### 5.7 Authorization and privacy matrix

| Data | Customer | Rider | Staff/Admin | Anyone else |
|---|---|---|---|---|
| Own order ETA (window, phase, confidence) | ✅ | — | ✅ all | ❌ |
| Quote vs revisions history | quote + current only | ❌ | ✅ | ❌ |
| `components` (stage minutes) | ❌ | ❌ | ✅ | ❌ |
| Rider live position | only own active order's rider (map pin — existing behaviour, now RLS-enforced) | own | ✅ | ❌ (today: ✅ everyone — fix in Phase 0) |
| Rider identity in ETA payloads | ❌ never | — | ✅ | ❌ |
| Accuracy report | ❌ | ❌ | admin only | ❌ |

### 5.8 Graceful degradation

| Failure | Result |
|---|---|
| `eta_mode='off'` or user not in cohort | No ETA block; everything else unchanged |
| Engine exception / 800 ms timeout on order path | Order succeeds; no quote row (counted as `quote_missing`) |
| Stage-stats RPC fails | Priors |
| No `base_lat/base_lng`, no pin, no centroid | Default travel, `confidence: low` |
| Rider position missing/stale | Elapsed-based travel, wider window |
| Realtime disconnected | 60 s poll |
| External provider error / 429 / over budget | Formula, `route_source='formula'` |
| Unknown future status | Phase `unknown`, no ETA, no crash |
| DB write of revision fails | Customer still gets a computed value from the read-through response |

---

## 6. Testing strategy

### 6.1 Unit (Vitest, `packages/utils/src/__tests__/eta.test.ts`) — runs in CI today (`pnpm --filter @repo/utils test`)

Table-driven; the engine takes `now` so every test is deterministic.

| Group | Cases |
|---|---|
| Distance/travel | 0 km (min travel applies), exactly `max_km`, just over (out of range → no ETA), `null` distance (default travel, `low`), very long distance, `detour_factor`/`speed` clamping |
| Kitchen | empty cart (reject), 1 item, many items (batch cap), queue 0 / = capacity / ≫ capacity (cap), per-product > category > default prep precedence |
| Dispatch | idle riders vs none, stale rider position at 119/120/121 s, rider claimed before food ready (`max()` pickup), cascade overrun |
| Phase math | every status in the enum + `awaiting_rider` + unknown string; skipped statuses (pending → ready directly); elapsed < p50, between p50–p90, > p90 (overrun → delayed) |
| Window | start < p50 < end invariant (seeded loop of 1,000 random inputs), 5-min grid, min width, monotonic smoothing (no >60 % drop), floor |
| Params | `parseEtaParams` with `null`, strings, negatives, NaN, unknown keys, partial objects → always valid, defaults filled |
| Rollout | `hashBucket` determinism; `percent=0` nobody, `100` everybody; monotonic (in at 10 % ⇒ in at 20 %); internal mode roles; `off` always hidden |
| Timezone | order at 23:50 PHT (UTC date differs from PH date), close after midnight, closed day → next open, 16:00–23:59 UTC window, device TZ ≠ Manila (formatter ignores it), naive timestamp string input through `parseServerDate`, `Asia/Manila` fixed offset sanity |
| Formatting | en-PH snapshot: `35–55 min`, `7:35–7:55 PM`, `5–10 min`, `Arriving now`; ICU-casing guard |
| Privacy | `components` key allow-list test: serialises an estimate and asserts no `lat`/`lng`/`rider` keys |

Target: ≥ 80 cases, ≥ 95 % line coverage on `eta.ts` (`@vitest/coverage-v8` is already a root dev dep).

### 6.2 API contract tests

- Location: `apps/web/**/__tests__` with the project's `vitest` (web has a `vitest.config.ts`; CI doesn't run it yet → add `test` scripts to `apps/web` and `packages/data-access` and extend the CI step — audit F9).
- Mock `@repo/data-access/client` (same hand-rolled `makeChainable` pattern as `packages/data-access/src/data/orders.test.ts`).
- Assertions: envelope shape; 401 (no session), 403 (other user's order), 404, 400 (bad body); `eta` omitted not errored when engine throws; deep-scan for the forbidden keys (§5.3); `Cache-Control: no-store`; kill switch (`off`) returns `visible:false`.

### 6.3 SQL checks

- Fixture: ~40 synthetic orders with known log timelines → known-answer assertions for `get_eta_stage_stats` (p50/p80/p90 by stage) and `get_eta_accuracy` (MAE, hit-rate, bias) including a night-time order to prove `Asia/Manila` bucketing.
- RLS: two JWT users — A cannot `SELECT` B's estimate; shadow rows (`is_displayed=false`) invisible to the owner; customer cannot read `rider_locations` of an unrelated rider; staff can.
- Run in a **local Supabase** (`supabase start`) or a throwaway project — never production.

### 6.4 Playwright (`e2e/tests/web/eta.spec.ts`; existing projects `web/admin/staff/rider` in `e2e/playwright.config.ts`)

| Test | Notes |
|---|---|
| Checkout shows window + clock when `eta_mode='on'`; shows nothing when `off` | Toggle via service-role fixture |
| Order confirmation shows the quote returned by the server | Re-uses `registerCustomer`/`completeCheckout` helpers from `purchase-flow.spec.ts` |
| Orders page shows correct phase sentence for every status | Fixture inserts orders at each status with service role (`e2e/fixtures/eta.ts`) — no flaky UI-driven status walking |
| Delayed state | Playwright `page.clock` to move past `window_end` |
| Mobile 360 px layout, no horizontal scroll | `Pixel 7`-class device project (new, ETA spec only) |
| Realtime update | Insert a revision row → card updates without reload (poll fallback verified by blocking WebSocket) |
| Authorization | Customer B requests `/api/orders/<A's id>/eta` → 403 |
| a11y | Optional `@axe-core/playwright` (new dev dep; owner's call) |

### 6.5 Shadow-mode validation

1. `scripts/eta-backtest.ts`: replay every delivered order's real milestones through `estimateEta` at each checkpoint with the *then-available* information; report MAE/hit-rate/bias by phase. Runs read-only against a DB export. Gate to enter shadow: backtest MAE ≤ 10 min.
2. Shadow mode (`eta_mode='shadow'`): quotes + revisions recorded with `is_displayed=false`; nothing shown. Min 2 weeks **or** 100 delivered orders, whichever is later.
3. Exit criteria to `internal`: coverage ≥ 98 %, MAE ≤ 8 min, within-window ≥ 70 %, late-beyond-end ≤ 15 %, |bias| ≤ 5 min (proposed; owner ratifies — Q7).

---

## 7. Observability and accuracy

### 7.1 Metric definitions (all computed in SQL)

| Metric | Definition |
|---|---|
| Quote error (min) | `delivered_at − quote.p50_at`, signed (+ = late) |
| **MAE** | `avg(abs(error))` (also median AE and p90 AE) |
| **Bias** | `avg(error)` — by hour (Manila), weekday/weekend, distance band, payment method |
| **Within window %** | `delivered_at BETWEEN window_start_at AND window_end_at` |
| Early % / Late % | before start / after end; **Late > 10 %** = after end + 10 min |
| Coverage | delivered orders with a quote ÷ delivered orders |
| Error by phase | for each phase, error of the last revision computed while in that phase (lead-time curve) |
| Stage drift | actual stage p50 vs configured prior p50 (tells which parameter to retune) |
| Exclusions | cancelled; delivered > 3 h after placement (reported separately as "stuck"); closed-hours orders measured from opening time |

### 7.2 SQL objects

- `eta_order_milestones` (view, `security_invoker = on`): one row per delivered order with pivoted `placed_at, accepted_at, prep_started_at, ready_at (= kitchen_ready_at else first ready_for_pickup), claimed_at, out_at, near_at, delivered_at`. Uses `MIN(changed_at) FILTER (WHERE l.status::text = '…')` so it works before and after `awaiting_rider` exists.
- `get_eta_stage_stats(p_days)` — percentiles per stage × Manila hour-bucket (`percentile_cont(ARRAY[0.5,0.8,0.9]) WITHIN GROUP`), outlier-trimmed, `service_role` only.
- `get_eta_accuracy(p_from, p_to, p_group)` — `SECURITY DEFINER`, checks `is_admin()` inside, `REVOKE ... FROM PUBLIC`, returns grouped rows (+ an `alerts` array). Aggregates run in Postgres so the 1000-row cap never applies.

### 7.3 Admin report (new page `apps/admin/app/(dashboard)/eta/page.tsx`)

Tiles: MAE, within-window %, late %, bias, coverage; charts: error by hour, stage drift table, last-7-days trend; status chip per threshold below; "Model version" filter (`model_version` from `eta_params.version`).

### 7.4 Alerts (no alerting infra exists; v1 = admin page chips + weekly review; optional Vercel log-drain alerts)

| Signal | Amber | Red | Action |
|---|---|---|---|
| Within-window % (7 d, n ≥ 30) | < 70 | < 60 for 2 days | Retune, or set `eta_mode='shadow'` |
| \|Bias\| | > 5 min | > 8 min | Adjust the stage with largest drift |
| Late > 10 min % | > 5 | > 10 | Widen upper percentile / investigate ops |
| Quote coverage | < 98 % | < 90 % | Check logs for `eta.compute` failures |
| Provider fallback rate (Phase 4) | > 10 %/h | > 30 %/h | Check budget/key |
| Compute p95 | > 500 ms | > 1,500 ms | Look at stage-stats RPC / DB |

### 7.5 Structured logs

JSON lines prefixed `[eta]`: `eta.compute {order_id, trigger, phase, ms, model_version, route_source, material}`, `eta.error {where, message}`, `eta.provider_error`, `eta.budget_exceeded`, `eta.flag_hidden`. **Never** log coordinates, addresses, phone numbers or rider IDs. Query in Vercel Runtime Logs / log drain.

### 7.6 Feedback loop

Weekly (first month) → monthly: open the admin page; for any stage whose actual p50 differs from its prior by > 3 min with n ≥ 30, update `eta_params` (bumps `version`); history percentiles already self-correct, so this mainly tunes cold-start priors and the detour/speed for each distance band. Optional later: a one-tap customer "Was this accurate?" prompt on delivered orders (adds a table; out of scope here).

---

## 8. Rollout and operations

### 8.1 Phases and gates

| Stage | `eta_mode` | Who sees it | Min duration | Go criteria to next stage |
|---|---|---|---|---|
| 0. Dark | `off` | nobody; code deployed | — | Phase 1–2 acceptance met; backtest MAE ≤ 10 |
| 1. **Shadow** | `shadow` | nobody (rows recorded, `is_displayed=false`) | ≥ 2 weeks / ≥ 100 delivered | coverage ≥ 98 %, MAE ≤ 8, within-window ≥ 70 %, \|bias\| ≤ 5 |
| 2. **Internal** | `internal` | staff/admin + `ETA_TESTER_USER_IDS` | ≥ 1 week | no sev-1 bugs; staff confirm copy/UX; metrics hold |
| 3. **10 %** | `percent`, 10 | deterministic cohort by `hashBucket(user_id)` | ≥ 3 days | metrics hold; no complaint spike |
| 4. **50 %** | `percent`, 50 | cohort | ≥ 3 days | same |
| 5. **100 %** | `on` | everyone | — | post-launch review at +2 weeks |

### 8.2 Kill switch and rollback

Admin → Settings → "Delivery time estimate" → mode `off` (or SQL `UPDATE business SET eta_mode='off'`). Effective on the next request (≤ 60 s for open tabs). No deploy, no data loss. Escalation ladder in §4.7.

### 8.3 Runbook (promote to `docs/runbooks/eta.md` in Phase 5)

| Symptom | Check | Action |
|---|---|---|
| Customers report wildly wrong times | Admin ETA page: bias/MAE; `model_version` | Set `shadow`; adjust params; backtest |
| No ETA shown for everyone | `eta_mode`, `eta_rollout_percent`; browser console `GET /eta` | Verify migration applied; check logs for `eta.error` |
| ETA stuck / not updating | Realtime status; poll fallback; last `computed_at` | Check `order_eta_estimates` in publication; ordering unaffected |
| Missing quotes | Logs `eta.compute` failures; engine timeout | Check business row (`base_lat/lng`), DB latency |
| Provider errors/429 (Phase 4) | `eta.budget_exceeded`, key validity | Auto-falls back; rotate key if leaked |
| One customer disputes | Query quote + revisions + milestones for that order | Appendix B query 5 |

### 8.4 Documentation updates (Phase 5)

`docs/workflows.html` and `docs/dataflow.html` (order lifecycle + new data flow), `docs/system-overview.html` (new tables/functions), `docs/tech-stack.html` (only if a routing provider is added), `supabase/migrations/README.md` (history table — currently stale at 0028 "reorder_products" — plus the naming rule), new `docs/runbooks/eta.md`, `.env.example` entries (`ORS_API_KEY`, `ETA_TESTER_USER_IDS`).

---

## 9. Security, privacy and compliance

> Engineering view, **not legal advice**. Have the school adviser / data-protection officer review before real customers are involved.

### 9.1 Data inventory

| Data | Classification (RA 10173, Data Privacy Act of 2012) | Where | Retention |
|---|---|---|---|
| Customer delivery pin + address | Personal information (location of an identifiable person) | `orders.delivery_lat/lng/address` (existing) | Existing order retention policy; ETA adds **no new copies** |
| Rider live position | Personal information of riders; safety-sensitive | `rider_locations` — **one row per rider, overwritten** (no history) | Keep it that way: ETA must not store breadcrumbs |
| Estimates | Derived, no coordinates/identifiers by contract (`components` allow-list) | `order_eta_estimates` | 12 months, then purge/aggregate |
| Route cache keys | Coordinates rounded to ~110 m | `eta_route_cache` | 7-day TTL |
| Provider requests (if D enabled) | Origin/destination coordinates (rounded) → third party | ORS (HeiGIT, Germany) | Provider policy; disclose |

### 9.2 Principles applied

- **Transparency:** update the privacy notice/consent text: location is used to estimate delivery time; if a provider is added, name it and the cross-border transfer.
- **Proportionality / data minimisation:** the default design (formula) shares **nothing** with third parties. If ORS is added: send only rounded coordinates; never customer name, address, phone, user/order/rider IDs.
- **Security measures:** RLS on every new table; service-role writes only; secrets in Vercel env; no secrets in `business` (public-read); keys restricted/rotated; contract tests for no-PII responses.
- **Rider safety:** the Phase 0 `rider_locations` fix closes today's exposure (anyone with the anon key can read every rider's live position, and `GET /api/locations?rider_id=` serves it to unauthenticated callers).
- **Data-subject rights:** deleting a profile cascades to `order_eta_estimates` (`ON DELETE CASCADE`); no extra manual steps.
- **Accountability for transfers:** a provider agreement/ToS review before enabling D; prefer self-hosted (C) if the owner objects to cross-border transfer.
- NPC registration thresholds are unlikely to apply at this scale but confirm with the adviser.

### 9.3 Secrets

| Secret | Where | Rule |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | existing, server env | unchanged; ETA code runs server-side only |
| `ORS_API_KEY` | Vercel env (web project only) | not `NEXT_PUBLIC_`; not logged; domain-restricted if the provider supports it |
| `ETA_TESTER_USER_IDS` | Vercel env | comma-separated UUIDs; never in DB |
| (optional) `ETA_INTERNAL_SECRET` | only if a DB webhook is added later | HMAC-verified |

Note the pre-commit `secrets` hook ends with `|| true` (audit F9), so it cannot block a leaked key — review diffs manually.

---

## 10. Delivery plan

Effort assumes one developer who knows the repo (S = 0.5 d, M = 1.5 d, L = 4 d for totals). Totals: Phase 0 ≈ 4.5 · Phase 1 ≈ 18 · Phase 2 ≈ 5.5 · Phase 3 ≈ 14 · Phase 4 ≈ 6.5 (2.5 without the optional provider) · Phase 5 ≈ 2 → **≈ 50 dev-days; ≈ 40 on the lean path.** Phases 1 and 3 can be split across two developers once the `eta` contract (§5.3) is fixed. The shadow window is calendar time, not effort.

### Phase 0 — Prerequisites and instrumentation (≈ 4.5 dev-days; independently mergeable, no ETA visible)

| ID | Task | Files | Size |
|---|---|---|---|
| 0.1 | Run data-audit queries (Appendix B): `created_at` type, log coverage, share of "claimed before ready", median stage durations. Record results in the PR. | SQL only | S |
| 0.2 | Fix web status presentation: add `claimed_by_rider`, `near_customer`, `awaiting_rider` to `statusConfig`, `activeStatuses`, timeline mapping via shared `timelineIndexForStatus`; fix `/track-order` → `/orders?tab=active` | `apps/web/app/orders/page.tsx` L59–69, L259–271, `apps/web/app/track-order/page.tsx`, `packages/utils/src/eta.ts` (helper) | S |
| 0.3 | `orders.kitchen_ready_at` migration; staff PATCH stamps it on `ready_for_pickup` **and** accepts `{ kitchen_ready: true }` without status change; staff order page "Food ready" button usable after a rider claimed | `supabase/migrations/<ts>_eta_kitchen_ready.sql`, `apps/staff/app/api/orders/route.ts`, `apps/staff/app/(dashboard)/orders/[id]/page.tsx`, `packages/data-access/src/types.ts` | M |
| 0.4 | `rider_locations` privacy: replace `USING (true)` with owner/active-order/staff policy; require session on `GET /api/locations?rider_id=`; fix `CustomerDeliveryMap` (unwrap `{success,data}` envelope: today it reads `d.latitude` instead of `d.data.latitude`, so the first position only appears after the first Realtime UPDATE; default store coords are Cebu, `10.3157, 123.8854`, instead of the business pin) | `supabase/migrations/<ts>_rider_locations_privacy.sql`, `apps/web/app/api/locations/route.ts`, `apps/web/components/CustomerDeliveryMap.tsx` | M |
| 0.5 | CI: add `test` script to `apps/web` and `packages/data-access`, run all in CI (audit F9) | `package.json`, `.github/workflows/*.yml` | S |

**Acceptance:** customers in `claimed_by_rider`/`near_customer` see correct label + timeline; staff can mark food ready after a claim and `kitchen_ready_at` is populated; unauthenticated `GET /api/locations?rider_id=` returns 401/403; a customer cannot read an unrelated rider's row via the Supabase client; audit queries attached.

### Phase 1 — Engine, schema, shadow recording (≈ 18 dev-days)

| ID | Task | Files | Size |
|---|---|---|---|
| 1.1 | Types, defaults, `parseEtaParams`, `phaseForStatus`, `buildMilestones`, `openingWindow`, `hashBucket`, `isEtaVisibleTo` | `packages/utils/src/eta.ts`, `index.ts` | M |
| 1.2 | `estimateEta` (stages, window, live refinement, smoothing, confidence) | `packages/utils/src/eta.ts` | L |
| 1.3 | Formatters + `ETA_COPY` (Manila tz) | same | S |
| 1.4 | Unit tests per §6.1 | `packages/utils/src/__tests__/eta.test.ts` | M |
| 1.5 | Migration `eta_schema`: business cols, `prep_minutes`, `order_eta_estimates` + RLS + trigger + publication | `supabase/migrations/<ts>_eta_schema.sql` | M |
| 1.6 | Migration `eta_analytics`: indexes, `eta_order_milestones`, `get_eta_stage_stats`, `get_eta_accuracy` | `supabase/migrations/<ts>_eta_analytics.sql` | M |
| 1.7 | Data-access: loaders, `refreshOrderEta`, stage-stats cache, types | `packages/data-access/src/data/eta.ts`, `types.ts` | L |
| 1.8 | Hook quote into `POST /api/orders` (shadow-aware, 800 ms race, try/catch) | `apps/web/app/api/orders/route.ts` | S |
| 1.9 | Call `refreshOrderEta` from the five status writers (§5.4) | staff/rider/admin/web routes | M |
| 1.10 | `scripts/eta-backtest.ts` | `scripts/` | M |
| 1.11 | Structured logging | data-access + routes | S |

**Acceptance:** with `eta_mode='shadow'` every new order has exactly one quote row (`is_displayed=false`) and sensible revisions; injected engine failure and DB failure never fail `POST /api/orders`; unit tests green with ≥ 95 % coverage on `eta.ts`; backtest report produced; zero customer-visible change; no PII keys in stored `components`.

### Phase 2 — Controls and internal visibility (≈ 5.5 dev-days)

| ID | Task | Files | Size |
|---|---|---|---|
| 2.1 | Admin Settings "Delivery time estimate" card (mode, rollout %, key params with defaults and help text) + server validation | `apps/admin/app/(dashboard)/settings/page.tsx`, `apps/admin/app/api/settings/route.ts` | M |
| 2.2 | Category `prep_minutes` field | `apps/admin/app/(dashboard)/categories/page.tsx`, `apps/staff/app/(dashboard)/categories/page.tsx` | S |
| 2.3 | Admin accuracy page + API | `apps/admin/app/(dashboard)/eta/page.tsx`, `apps/admin/app/api/eta/accuracy/route.ts`, nav entry in admin layout | M |
| 2.4 | "Promised by / overdue" on staff and admin order list + detail | `apps/staff/app/(dashboard)/orders/**`, `apps/admin/app/(dashboard)/orders/**` | M |
| 2.5 | Contract tests for admin routes | tests | S |

**Acceptance:** admin can switch modes and edit params; invalid values rejected; accuracy page matches SQL known-answer fixture; staff see promised-by in `shadow`/`internal` without customers seeing anything.

### Phase 3 — Customer experience (≈ 14 dev-days)

| ID | Task | Files | Size |
|---|---|---|---|
| 3.1 | `GET /api/orders/[id]/eta` | `apps/web/app/api/orders/[id]/eta/route.ts` | M |
| 3.2 | Extend `POST /api/delivery-estimate` with `eta` block (signed-in only) | `apps/web/app/api/delivery-estimate/route.ts` | S |
| 3.3 | `EtaCard` + `useOrderEta` (Realtime invalidate + 60 s poll, a11y) | `apps/web/components/EtaCard.tsx`, `apps/web/lib/use-order-eta.ts` | L |
| 3.4 | Checkout integration (steps 1 and 3) | `apps/web/app/checkout/page.tsx` | M |
| 3.5 | Confirmation screen shows server quote | same | S |
| 3.6 | Orders page: ETA card, delayed copy, delivered line, receipt line | `apps/web/app/orders/page.tsx` | M |
| 3.7 | Delay notification (app-layer, de-duplicated, ≥ 10 min slip) | `packages/data-access/src/data/eta.ts` (+ existing `createNotification`) | S |
| 3.8 | Playwright suite + mobile + (optional) axe | `e2e/**` | L |

**Acceptance:** all §2.3 states render correctly in `internal` mode on 360 px and desktop; kill switch hides within 60 s; contract tests prove no rider PII; e2e green locally; no regression in checkout flow (fee, min-order, out-of-range).

### Phase 4 — Live refinement, optional routing provider (≈ 6.5 dev-days; start only after ≥ 2 weeks of shadow data)

| ID | Task | Files | Size |
|---|---|---|---|
| 4.1 | Live rider-position refinement, throttled `after()` refresh | `packages/data-access/src/data/eta.ts`, `apps/rider/app/api/location/route.ts` | M |
| 4.2 | Rider GPS client throttle | `apps/rider/app/(rider)/page.tsx` L394–443 | S |
| 4.3 | **Optional:** `RouteProvider` interface + ORS adapter + cache + budget + fallback (gated by backtest ≥ 2 min MAE gain) | `packages/data-access/src/data/route-provider.ts`, migration `eta_route_cache_and_limits` | L |
| 4.4 | Retune `eta_params` / per-band detour from real data | admin settings | S |

**Acceptance:** on-the-way MAE improves vs elapsed-only baseline in the accuracy page; GPS posts per delivery drop ≥ 70 %; with the provider disabled/over budget, behaviour equals Phase 3.

### Phase 5 — Rollout and operations (≈ 2 dev-days + calendar)

| ID | Task | Size |
|---|---|---|
| 5.1 | Walk the gates in §8.1 (internal → 10 % → 50 % → 100 %) | S each |
| 5.2 | Runbook `docs/runbooks/eta.md`; update `docs/*.html`, migrations README, `.env.example` | M |
| 5.3 | Privacy notice update (owner/adviser) | S |
| 5.4 | Post-launch review at +2 weeks; set the retune cadence | S |

### Sequencing and conflict risks against parallel work

| Parallel work | Overlap with ETA | Risk | Merge-order / mitigation |
|---|---|---|---|
| `77c83f0` distance pricing — **local `main`, unpushed** | ETA depends on `calculateDistance`, `resolveDeliveryFee`, `base_lat/lng`, tiers | **Hard dependency** | Branch Phase 1 from local `main` (`77c83f0`); the owner must push/merge it before any ETA PR is opened |
| `feat/min-delivery-order` | Edits `apps/web/app/checkout/page.tsx`, `apps/web/app/api/orders/route.ts` (business select), `packages/types/src/index.ts`, `packages/data-access/src/types.ts` (business Row/Insert/Update), admin Settings page, adds staff Settings page + `PATCH /api/settings` | Medium in Phase 1 (types, orders route), **High in Phase 2–3** (checkout, admin settings) | Merge min-order first. Phase 0–1 pure-lib/migration work may proceed in parallel; Phase 1.8 and everything in Phases 2–3 rebase after. Keep ETA type additions in separate hunks. |
| P0 fix branch (`claude/sleepy-nightingale-28c634`: register page, staff `riders/create` auth, `biome.json`/`knip.json`) | Low file overlap; but **CI is red on `main`** (Biome on `docs/`), so CI cannot gate ETA PRs until merged | Process risk | Merge it first; until then run `biome check` + `turbo typecheck` + `vitest` locally |
| `0029_dispatch_queue.sql` (uncommitted, main checkout) | Adds `awaiting_rider`, `rider_assigned_at`, `dispatch_log`; **rewrites `notify_order_status_change()`**; will add new status-writing API routes | Medium | ETA is string-typed, never edits that trigger (D10), adds `refreshOrderEta` calls to the new routes when they land; rename to a timestamp before applying |
| `0029_product_packs.sql` (opencode worktree) | `order_items.is_pack`, `products.pack_size/pack_stock`; edits admin/staff inventory pages and `apps/web/app/menu/page.tsx` | Low–medium | Per-product `prep_minutes` UI deferred until it merges; category-level prep only in v1; decide pack handling in the kitchen formula (Q9) |
| Any branch editing `apps/web/app/orders/page.tsx` (1,649 lines) | Phase 0.2 and 3.6 | Medium | Keep ETA UI in `EtaCard.tsx`; touch the page in two small hunks |

---

## 11. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Inaccurate ETAs erode trust | M | H | Ranges, conservative upper bound, 2-week shadow, backtest gate, kill switch, delayed-state copy |
| Low order volume ⇒ noisy percentiles | H | M | Priors + shrinkage (k = 20), min 30 samples, time-boxed shadow, backtest on history |
| Status data quality (staff skip/forget statuses; early rider claim hides "ready") | H | H | `kitchen_ready_at`, milestone-based engine, outlier trimming, stuck-order flags, staff nudge |
| Kitchen/rider behaviour changes after launch (ETA changes behaviour) | M | M | Keep monitoring bias; model version slicing |
| Realtime refetch storm on `orders` | M | M | ETA in its own table/channel; never write per-recompute to `orders` |
| Merge conflicts with min-order / dispatch / packs | H | M | §10 sequencing; separate files (`EtaCard`, `eta/page.tsx`); small hunks |
| Enum drift (`awaiting_rider`) breaks exhaustive TS maps or SQL casts | M | M | String-typed statuses; `status::text` in SQL; test with unknown values |
| Rider location privacy exposure (existing) | H | H | Phase 0.4 before any ETA exposure; no coordinate storage |
| External API outage/cost/ToS | L (v1: no provider) | M | Formula default, adapter + budget + timeout + fallback; ToS review before enabling |
| Serverless background work not guaranteed | M | L | Use `after()` only for optional refresh; correctness via read-through |
| CI red / tests not run (audit F2, F9) | H | M | Merge P0 branch first; add test scripts; local pre-merge checklist |
| Timezone mistakes (naive `created_at`, device TZ) | M | H | Rules in §4.6; avoid `created_at`; explicit `Asia/Manila`; tests for midnight/16:00 UTC edges |
| 1000-row API cap | M | M | All metrics in SQL; stage-stats returns small result sets |
| Hosting plan terms (Vercel Hobby is non-commercial per its terms — verify) | M | M | Flag to owner (Q11); plan uses no Vercel Cron |

---

## 12. Open questions (need the owner's decision)

| # | Question | Recommended default |
|---|---|---|
| Q1 | Show an ETA while the order is still `pending` (restaurant hasn't confirmed)? | **Yes**, widened window + "may change" sub-line |
| Q2 | Can customers order while the business is closed? Today `operating_hours` is not enforced anywhere. | **No rule change**; show ETA anchored to next opening, labelled |
| Q3 | Keep "rider may claim before food is ready" (broadcast) or move to the dispatch model (rider sought when ready)? | Decide after Phase 0 audit; model supports `after_ready` only in v1 |
| Q4 | Routing provider beyond the formula? | **None until the backtest shows ≥ 2 min MAE gain**; then ORS behind the flag; never Google/Mapbox |
| Q5 | Any promise/compensation tied to the ETA (late = voucher)? | **No** — informational only |
| Q6 | Who edits prep times? | Admin edits category defaults; staff may later set per-product overrides |
| Q7 | Accuracy targets (MAE ≤ 8 min, within-window ≥ 70 %, late-beyond-end ≤ 15 %)? | Adopt as proposed, revisit after shadow data |
| Q8 | Send a delay notification to customers? | **Yes**: one per delay episode, ≥ 10 min slip |
| Q9 | Packs (`is_pack`) in the kitchen formula: count a pack as 1 unit or `pack_size` units? | 1 unit (pre-packaged assembly), revisit with staff input |
| Q10 | Migration naming and the two `0029_*` files | Timestamp names for all new work; rename the two `0029_*` before applying them |
| Q11 | Vercel Hobby vs Pro given terms for commercial use | Check Vercel's current Fair Use terms; Pro if the shop operates commercially |
| Q12 | Language: English only, or add Tagalog/Hiligaynon strings? | English (en-PH) now; copy is centralised so translation is a data change later |

---

## 13. Definition of Done

**Product**
- [ ] ETA shown as range + Manila clock time on checkout, confirmation, orders page, delivered receipt; per-status behaviour in §2.3 verified
- [ ] Delayed / severe / closed / out-of-range / no-coordinates / stale-position states verified
- [ ] 360 px layout, screen-reader announcements throttled, no colour-only meaning

**Engine and data**
- [ ] `estimateEta` pure, deterministic, ≥ 95 % covered; all tests in §6.1 pass in CI
- [ ] Quote immutable; one quote per order enforced by index and trigger
- [ ] Stage stats, accuracy and milestone views correct against the SQL known-answer fixture
- [ ] All timestamps `timestamptz`; no ETA logic uses `orders.created_at`; Manila grouping in SQL

**Platform and security**
- [ ] `rider_locations` no longer world-readable; `GET /api/locations` authenticated
- [ ] Customers can only read their own displayed estimates; contract tests prove no rider PII / coordinates
- [ ] Every new API route authenticates itself; envelope `{ success, data | error }` everywhere
- [ ] No secrets in `business` or in `NEXT_PUBLIC_*`; `ORS_API_KEY` (if used) server-only
- [ ] Order placement succeeds under injected ETA failure and under 800 ms timeout

**Operations**
- [ ] Kill switch tested end-to-end; rollback ladder rehearsed on a staging DB
- [ ] Shadow exit criteria met and recorded before any customer exposure
- [ ] Runbook, docs, migrations README and `.env.example` updated; privacy notice reviewed
- [ ] `pnpm check` (Biome + typecheck), `pnpm test`, `pnpm knip`, `turbo build`, Playwright ETA spec all pass
- [ ] Post-launch review scheduled; retune cadence owned

---

## Appendix A — Current-state evidence (verified in this worktree, 2026-10-16)

| Claim | Verdict | Evidence |
|---|---|---|
| Customers see no ETA anywhere | ✅ confirmed | `apps/web/app/orders/page.tsx` timeline (L259–266) has labels only; no time fields in `Order` interface (L40–57); notification texts in `0010`/`0026` contain no times |
| Distance behind the fee is straight-line | ✅ **Haversine** | `packages/utils/src/delivery.ts` L35–44 `calculateDistance`; `apps/web/lib/delivery-fee.ts` L90; sources: pin → town centroid → flat fee (L56–88) |
| `/api/delivery-estimate` shared resolver | ✅ | `apps/web/app/api/delivery-estimate/route.ts` L13–59; `apps/web/app/api/orders/route.ts` L207–227 |
| `/track-order` redirects to `/orders?active=true` | ✅, **but the param is ignored** | `track-order/page.tsx`; orders page reads `searchParams.get("tab")` (L78) |
| Order status enum | ✅ 9 values; `awaiting_rider` only in uncommitted `0029_dispatch_queue.sql` L26 | `0001` L21–24; `packages/data-access/src/types.ts` L243–252, L687–696 |
| **Web orders page lacks `claimed_by_rider` / `near_customer`** | 🆕 bug | `statusConfig` L59–67 falls back to Pending (L548); `activeStatuses` L69; `getTimelineProgress` returns −1 |
| `orders.created_at` stored without timezone | ⚠️ **only until `0020`** | `0020` L39–40 converts to `timestamptz`; production status unknown; `parseServerDate` handles both (`packages/utils/src/index.ts` L42–48) |
| `confirmed_at`, `prepared_at`, `picked_up_at` semantics | 🆕 surprising | §3.8 table (`products.ts` L295–299; staff route L53–64; rider route L95–111) |
| `order_status_log` records transitions | ✅ | `0001` L206–215 table, L475–489 trigger; `changed_at` → `timestamptz` in `0020` L56 |
| Rider claims can precede kitchen-ready | 🆕 | `RIDER_STATUS_FLOW` L13–21; accept overwrites status (L101–111) |
| Rider location pipeline | ✅ one overwritten row per rider; rider app posts every GPS fix | `upsertRiderLocation` (`packages/data-access/src/data/locations.ts` L26–44); `apps/rider/app/(rider)/page.tsx` L394–443 |
| `rider_locations` readable by everyone | 🆕 privacy issue | `0001` L439–440 `USING (true)`; `GET /api/locations?rider_id=` unauthenticated (`apps/web/app/api/locations/route.ts` L43–53) |
| `CustomerDeliveryMap` initial fetch bug / wrong default | 🆕 | L53–58 reads `d.latitude` from `{success,data}`; defaults L44–45 are Cebu |
| `business` has `base_lat/base_lng` (Janiuay, Iloilo) | ✅ | `0021`; `operating_hours` JSON `0025`; **not enforced** at checkout |
| `business` is world-readable and `GET /api/business` returns `*` | ✅ | `0001` L282–283; `apps/web/app/api/business/route.ts` L7–16 |
| Admin settings PUT has no field allow-list | ✅ | `apps/admin/app/api/settings/route.ts` L19–58 |
| No rate limiter in repo | ✅ | repo-wide search: no `ratelimit`/Upstash/KV |
| Status writers | ✅ five routes (§5.4) | staff `api/orders`, rider `api/orders/status` + `complete`, admin `api/orders`, web `api/orders/[id]` |
| Migration state | ✅ `0001`–`0028` + `20260920040108`; `0029_dispatch_queue.sql` untracked in main checkout; `0029_product_packs.sql` in `…/inventory-packs-column`; `20261016024529_min_delivery_order.sql` in min-order worktree | `git worktree list` |
| Dispatch migration facts | ✅ read-only review of `S:\Dev\Monorepo\suarez-food-hub-wvsu\supabase\migrations\0029_dispatch_queue.sql` | `awaiting_rider` L26, `rider_assigned_at` L29, 10-min timeout L316–363, rewrites `notify_order_status_change` L438–502, `max_active_deliveries` L32 |
| Types file stale vs DB | ✅ | `business` Row (L393–412) lacks `operating_hours`; no `awaiting_rider` |
| CI runs only `@repo/utils` tests; CI red on `main` | ✅ | `.github/workflows` (CI runs `pnpm --filter @repo/utils test`); `docs/audit-2026-10-16-origin-main.md` F2, F9 (untracked in the main checkout) |
| Realtime patterns to reuse | ✅ | orders page L196–210 (`user_id` filter); rider home page polling fallback L376–381; publications `0001` L451–470, `0018` |

## Appendix B — Pre-flight and diagnostic SQL (read-only; run against staging or a replica first)

```sql
-- 1. Is orders.created_at timestamptz (0020 applied) or naive?
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('created_at','updated_at','delivered_at','confirmed_at');

-- 2. How many delivered orders have a usable log timeline? (sample size for priors)
SELECT count(*) FILTER (WHERE has_ready)  AS with_ready,
       count(*) FILTER (WHERE has_claim)  AS with_claim,
       count(*)                           AS delivered
FROM (
  SELECT o.id,
         bool_or(l.status::text = 'ready_for_pickup') AS has_ready,
         bool_or(l.status::text = 'claimed_by_rider') AS has_claim
  FROM orders o JOIN order_status_log l ON l.order_id = o.id
  WHERE o.status = 'delivered' GROUP BY o.id) t;

-- 3. Share of orders where the rider claimed BEFORE the food was marked ready (or ready never logged)
SELECT count(*) FILTER (WHERE ready_at IS NULL OR claimed_at < ready_at) * 100.0 / NULLIF(count(*),0) AS pct_claim_before_ready
FROM (
  SELECT o.id,
         min(l.changed_at) FILTER (WHERE l.status::text = 'ready_for_pickup') AS ready_at,
         min(l.changed_at) FILTER (WHERE l.status::text = 'claimed_by_rider') AS claimed_at
  FROM orders o JOIN order_status_log l ON l.order_id = o.id
  WHERE o.status = 'delivered' GROUP BY o.id) t;

-- 4. Median placement→delivery by Manila hour (sanity check for priors)
SELECT extract(hour FROM (o.delivered_at AT TIME ZONE 'Asia/Manila')) AS hour_ph,
       count(*) AS n,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (o.delivered_at - p.placed_at))/60) AS p50_min
FROM orders o
JOIN (SELECT order_id, min(changed_at) AS placed_at FROM order_status_log GROUP BY order_id) p ON p.order_id = o.id
WHERE o.status = 'delivered' AND o.delivered_at IS NOT NULL
GROUP BY 1 ORDER BY 1;

-- 5. One disputed order: quote, revisions and actuals
SELECT e.kind, e.trigger, e.phase, e.computed_at, e.window_start_at, e.window_end_at, e.confidence, e.model_version
FROM order_eta_estimates e WHERE e.order_id = '<order uuid>' ORDER BY e.computed_at;
SELECT status::text, changed_at FROM order_status_log WHERE order_id = '<order uuid>' ORDER BY changed_at;
```

## Appendix C — Default `eta_params` (cold-start priors; all admin-editable and clamped)

| Key | Default | Range |
|---|---|---|
| `version` | 1 | int, bumped on save |
| `accept` p50 / p90 (min) | 4 / 10 | 0–60 |
| `prep_default` p50 / `prep_p90_mult` | 12 / 1.5 | 1–120 / 1–3 |
| `batch_free_units` / `batch_per_unit` / `batch_cap` | 4 / 0.75 / 10 | 0–50 / 0–5 / 0–60 |
| `kitchen_capacity` / `queue_slot` / `queue_cap` | 3 / 4 / 25 | 1–20 / 0–15 / 0–90 |
| `assign_idle` p50/p90 · `assign_busy` p50/p90 | 3/8 · 10/20 | 0–60 |
| `to_store` p50/p90 · `store_handoff` p50/p90 | 5/10 · 2/4 | 0–60 |
| `detour_factor` | 1.35 | 1.0–2.5 |
| `speed_p50` / `speed_p90` (km/h) | 24 / 16 | 5–60 |
| `min_travel` / `default_travel` p50/p90 | 3 / 20/32 | 0–30 / 5–90 |
| `customer_handoff` p50/p90 | 3/6 | 0–30 |
| `window_low_z` / `window_high_z` | 0.524 (≈p30) / 1.036 (≈p85) | 0–2 |
| `min_window` / `round_to` | 10 / 5 | 5–30 / 1–15 |
| `stale_position_s` | 120 | 30–600 |
| `delayed_severe_after_min` | 15 | 5–60 |
| `history_min_samples` / `shrink_k` / `lookback_days` | 30 / 20 / 28 | 10–200 / 0–100 / 7–90 |
| `peak_windows` | `[]` | up to 6 entries |
| `dispatch_mode` | `after_ready` | `after_ready` only in v1 |
