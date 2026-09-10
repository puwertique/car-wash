# TASKS

## STATUS: MVP core operational loop implemented (EPIC 0–9 baseline)

The end-to-end flow described in `docs/PROJECT_SPEC.md` §2 (order API →
dispatch → worker offer/accept → on the way/arrived/wash → completed)
is implemented and has been **verified end-to-end with a real order**
placed via Postman and driven through the worker dashboard UI (full
event trail: `ORDER_CREATED → SEARCH_STARTED → WORKER_OFFERED →
WORKER_ACCEPTED → WORKER_ON_THE_WAY → WORKER_ARRIVED → WASH_STARTED →
WASH_COMPLETED`). See CHANGELOG.md for the full history, including two
dispatch/GPS bugs found and fixed during this verification.

### DONE — EPIC 0: Project Foundation
- [x] Next.js + TypeScript + Tailwind (App Router, ESLint), `typecheck`
      script, folder structure, Supabase client helpers (`client.ts`,
      `server.ts`, `admin.ts`), `proxy.ts` session-refresh middleware,
      `.env.example`, docs scaffolding.

### DONE — EPIC 1: Database
- [x] `.env.local` configured with real Supabase project credentials
      (project ref `ucvjqdpaexefskvsuhof`); Supabase CLI linked.
- [x] `0001_init.sql` (profiles, workers, vehicles, customers, services,
      orders, order_events, worker_current_locations, PostGIS, RLS) —
      applied.
- [x] `0004_dispatch_core.sql` seeds 4 baseline services (Basic Wash,
      Premium Wash, Interior, Full Detail) — applied.
- [ ] Remaining: no seeded demo customer beyond what the smoke test
      created; not required for MVP.

### DONE — EPIC 2: Worker Authentication
- [x] Login page (`app/(auth)/login`) — Zod-validated Server Action
      calling `supabase.auth.signInWithPassword`.
- [x] `0002_auth_profile_trigger.sql` auto-creates a `profiles` row
      (role `worker`) for every new `auth.users` insert — applied.
- [x] `lib/auth/session.ts` (`getSessionProfile`), logout Server
      Action + `LogoutButton`.
- [x] Role-based route protection in `lib/supabase/middleware.ts`
      (`/worker`, `/admin` require auth; `/admin` requires
      admin/owner role).
- [x] Verified in the browser with the demo worker account.

### DONE — EPIC 3: Worker Profile
- [x] `0003_worker_photos_storage.sql` — public `worker-photos` bucket,
      owner-only write RLS — applied.
- [x] `lib/workers/{profile,status,photo}.ts`,
      `lib/validation/workers.ts`.
- [x] `/worker/profile` — photo upload, AVAILABLE/OFFLINE status
      toggle (locked while BUSY), city/service area/vehicle display.
- [ ] Vehicle assignment has no UI (admin-only via SQL) — acceptable
      for MVP per spec; could be added to EPIC 9 later if needed.

### DONE — EPIC 4: GPS Tracking
- [x] `lib/validation/location.ts`, `lib/workers/location.ts`,
      `POST /api/locations` (upserts `worker_current_locations`).
- [x] `components/worker/gps-tracker.tsx` — `watchPosition`-based,
      throttled to ~20s, active whenever worker status ≠ OFFLINE,
      shows permission/error states.
- [ ] No location history table (by design — see PROJECT_SPEC §10).

### DONE — EPIC 5: Orders API
- [x] `lib/validation/orders.ts`, `lib/orders/create.ts` (find/create
      customer, create order, `ORDER_CREATED` event, triggers
      dispatch), `POST /api/orders` with optional `x-api-key` gate
      (`ORDERS_API_KEY` env var, unset = open for local dev).
- [x] Smoke-tested: order created via API reached `OFFERED` status
      with a `WORKER_OFFERED` event for the demo worker.

### DONE — EPIC 6: Dispatch Engine
- [x] `0004_dispatch_core.sql` — PostGIS RPC
      `find_available_workers_near_location` (AVAILABLE + fresh GPS
      fix within 15km, nearest first) — applied.
- [x] `lib/dispatch/{find-worker,offer,sweep}.ts` — offer with
      configurable timeout (`DISPATCH_OFFER_TIMEOUT_SECONDS`), atomic
      conditional updates guard against double-assignment.
- [x] `POST /api/dispatch/sweep` — reclaims expired offers and retries
      undispatched orders; called via polling (see ARCHITECTURE.md for
      why there's no separate background job runner in the MVP).

### DONE — EPIC 7: Worker Order Flow
- [x] `lib/orders/{offer-actions,transitions}.ts` — accept/reject
      (atomic, ownership + expiry checked) and the fixed transition
      chain ACCEPTED → ON_THE_WAY → ARRIVED → WASHING → COMPLETED
      (worker reset to AVAILABLE on completion).
- [x] `GET /api/worker/state` + `app/worker/dashboard/order-panel.tsx`
      — polls every 5s, renders offer card (accept/reject/countdown)
      and current job card (open navigation link, advance button).

### DONE — EPIC 8: Photos
- [x] `0005_order_photos_storage.sql` — public `order-photos` bucket,
      assigned-worker-only write RLS — applied.
- [x] `lib/orders/photo.ts`, before/after upload inputs on the current
      job card.

### DONE — EPIC 9: Minimal Admin/Test Console
- [x] `lib/admin/{workers,orders}.ts`, `/admin/test` — worker list
      (status/city/vehicle/last location time), orders list, manual
      test order creation form, per-order event log viewer.
- [x] `lib/validation/register-worker.ts`, `lib/admin/register-worker.ts`
      (`registerWorker` — creates the Supabase Auth user + `workers` row
      via the service-role client, rolls back the auth user if the
      `workers` insert fails), `registerWorkerAction` Server Action
      (admin-role-gated), `RegisterWorkerForm` on `/admin/test`. No
      public self-registration, per spec — admin sets the initial
      password directly. Verified against the live DB (auth user +
      worker row + auto-created `profiles` row with role `worker`).
- [ ] No visual map (would require a third-party maps API key not
      available in this environment) — worker locations are shown as
      a last-updated timestamp instead. Documented limitation, not a
      silent omission.

### DONE — follow-up organization and geocoding
- [x] Fixed stuck assignment behavior by preserving the existing
      PostGIS nearest-worker path and ensuring GPS freshness is maintained
      by the existing heartbeat. No Google request is made during worker
      matching; dispatch uses stored order/worker coordinates only.
- [x] Added `city` and `package_type` to orders (`0006_order_location_fields.sql`).
- [x] Added server-only Google Geocoding fallback for orders missing
      coordinates. Configure `GOOGLE_MAPS_API_KEY`; coordinates are
      geocoded once at creation and stored on the order.
- [x] Added responsive role-specific Admin/Worker sidebars using the
      existing routes.
- [x] Added admin order details with requested fields, stored coordinates,
      server-side distance, and customer map embed.
- [x] Split the combined admin console into independently routed Workers and
      Orders pages. Each display section fetches only its protected dedicated
      admin API endpoint; the dashboard retains worker registration and
      test-order creation.

### KNOWN LIMITATIONS / DEFERRED (documented, not oversights)
- No visual map for worker locations (EPIC 9) — needs a maps provider
  API key (Google Maps/Mapbox); out of scope without one.
- Dispatch offer timeouts and retries are progressed by client-side
  polling (`/api/dispatch/sweep`, called every 5s from the worker
  dashboard), not a real background job/cron — acceptable per spec
  §23 ("if polling is simpler... polling is acceptable") but won't
  progress if no worker/admin browser tab is open. A Vercel Cron hook
  calling the same endpoint would remove this dependency if deployed.
- `@supabase/supabase-js` now targets Node ≥22; local dev Node is
  20.17. Next.js itself is unaffected, but standalone scripts
  (`scripts/*.mjs`) need the `ws` devDependency workaround — see
  `docs/CHANGELOG.md` and repo memory.
- Vehicle assignment to a worker is admin-only via direct SQL (no UI).
- Customer-facing booking app is explicitly out of scope (per spec).

### NEXT (if continuing)
- [ ] Deploy to Vercel + a scheduled Cron hitting `/api/dispatch/sweep`
      to remove the polling dependency.
- [ ] Add a real map (worker locations, order pins) once a maps API
      key is available.
- [ ] Admin UI for vehicle creation/assignment.
