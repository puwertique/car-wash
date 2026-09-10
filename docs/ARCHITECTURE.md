# ARCHITECTURE

## Overview

Next.js App Router application acting as both the UI and the API/backend
boundary for the MVP. Supabase (Postgres + PostGIS + Auth + Storage +
Realtime) is the sole backend service. No separate backend server.

## Folder structure

```
app/
  (auth)/login/        # worker login page
  worker/               # dashboard, orders, map, profile (protected)
  admin/                # dashboard plus independent workers/orders pages
  api/
    admin/               # protected worker/order admin read endpoints
    orders/             # POST /api/orders — external order intake
    workers/            # worker-related endpoints
    locations/          # worker GPS location updates
    dispatch/           # dispatch-triggering endpoints

components/
  ui/                   # shadcn/ui primitives
  worker/               # worker dashboard components
  orders/               # order-related components
  maps/                 # map/location components

lib/
  supabase/             # client.ts (browser), server.ts (RSC/route
                        # handlers), admin.ts (service role, server-only),
                        # middleware.ts (session refresh + route guard)
  auth/                 # auth helper functions
  orders/               # order creation/state transition logic
  workers/              # worker profile/status logic
  dispatch/             # findBestWorkerForOrder, offer flow
  geo/                  # geo helpers (PostGIS RPC wrappers)
  validation/            # Zod schemas

types/                  # shared TypeScript types

supabase/
  migrations/           # SQL migrations (source of truth for schema)
  functions/            # Supabase Edge Functions / DB functions (if any)

docs/                   # PROJECT_SPEC, TASKS, ARCHITECTURE, API, CHANGELOG
```

## Supabase client usage rules

- `lib/supabase/client.ts` — Client Components only. Anon key.
- `lib/supabase/server.ts` — Server Components, Route Handlers, Server
  Actions. Anon key + user's cookie session. RLS applies.
- `lib/supabase/admin.ts` — Server-only, service-role key, bypasses RLS.
  Never imported from anything that ships to the browser. Use sparingly
  for trusted admin/background operations.
- `proxy.ts` (Next.js 16's replacement for the deprecated `middleware.ts`
  convention) — refreshes the auth session cookie on every request and
  redirects unauthenticated users away from `/worker` and `/admin`.

## Data model

See [PROJECT_SPEC.md](./PROJECT_SPEC.md#6-data-model-mvp) for table
definitions. Schema source of truth is
[../supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql).

Key decisions:
- `workers.vehicle_id` is a nullable FK to `vehicles`, not embedded data,
  so a worker's assigned vehicle can change over time.
- `worker_current_locations` holds exactly one row per worker (upsert on
  `worker_id`) — no per-tick history table in MVP.
- `order_events` is append-only and is the audit trail for the entire
  order lifecycle; nothing is deleted or overwritten.
- Geography columns use PostGIS `geography(Point, 4326)` with a GiST
  index for nearest-worker queries.

## Dispatch flow (implemented, EPIC 6)

1. `POST /api/orders` (`lib/orders/create.ts`) creates the order
   (`NEW`) and an `ORDER_CREATED` event, then calls
   `lib/dispatch/offer.ts#dispatchOrder`.
2. `dispatchOrder` sets the order to `SEARCHING_WORKER`, logs
   `SEARCH_STARTED`, and calls `offerNextWorker`, which queries
   `find_available_workers_near_location` (PostGIS RPC — AVAILABLE
   workers with a GPS fix fresher than 5 minutes, within 15km, ranked
   by distance, excluding worker ids already offered for this order)
   and atomically sets `status='OFFERED'` + `worker_id` +
   `offer_expires_at` (guarded by `.eq('status','SEARCHING_WORKER')`),
   logging `WORKER_OFFERED`.
3. Worker accepts within the timeout window
   (`lib/orders/offer-actions.ts#acceptOffer`) → atomic conditional
   update (`.eq('status','OFFERED').eq('worker_id', me).gt('offer_expires_at', now)`)
   → `ACCEPTED`, `WORKER_ACCEPTED` event, worker status → `BUSY`. Reject
   (`rejectOffer`) atomically releases the order to `SEARCHING_WORKER`
   and immediately calls `offerNextWorker` again, excluding the
   rejecting worker.
4. **No background job runner in the MVP** (per spec — no
   Redis/Kafka/queues). Instead, `POST /api/dispatch/sweep`
   (`lib/dispatch/sweep.ts#runDispatchSweep`) is polled every 5s by the
   worker dashboard (`order-panel.tsx`): it reclaims `OFFERED` orders
   past `offer_expires_at` (`WORKER_OFFER_TIMEOUT` event, then offers
   the next worker) and retries any order still stuck in
   `SEARCHING_WORKER`. This only progresses while a worker/admin tab
   is open — see `docs/TASKS.md` "KNOWN LIMITATIONS" for the
   production fix (a scheduled job hitting the same endpoint).
5. Worker drives the order through `ON_THE_WAY → ARRIVED → WASHING →
   COMPLETED` via `lib/orders/transitions.ts#transitionOrder`: each
   step is an atomic conditional update guarded by the required
   current status (so a stale/duplicate request can't replay or skip a
   step), logs the matching event, and resets the worker to
   `AVAILABLE` on `COMPLETED`.
6. The worker dashboard (`GET /api/worker/state`,
   `lib/workers/dashboard-state.ts`) polls for the current offer and
   active order and renders them in `order-panel.tsx`, including an
   "Open navigation" link (external maps deep link — no in-app
   routing, per spec §21) and before/after photo upload
   (`lib/orders/photo.ts`, `order-photos` storage bucket).

## Auth

Supabase Auth (SSR via `@supabase/ssr`). Workers are created/invited by
an admin — no public self-registration. `profiles` table links
`auth.users` to an application role (`worker` / `admin` / `owner`); a
database trigger (`0002_auth_profile_trigger.sql`) auto-creates this
row with role `worker` whenever a new `auth.users` row is inserted.
Promoting a user to `admin`/`owner` is a manual SQL update in MVP.

Login (`app/(auth)/login`) is a Zod-validated Server Action
(`actions.ts`) calling `supabase.auth.signInWithPassword`, redirecting
to `/admin/test` for admin/owner or `/worker/dashboard` for workers.
Logout is a Server Action calling `supabase.auth.signOut()`, triggered
from the `LogoutButton` client component.

## Admin UI data boundaries

`/admin/test` is limited to operational server actions (worker registration
and test-order creation). Worker display state lives only in
`components/admin/workers-section.tsx`, which fetches
`GET /api/admin/workers` from `/admin/workers`. Order display and selected
order details state live only in `components/admin/orders-section.tsx`, which
fetches `GET /api/admin/orders` and, on selection,
`GET /api/admin/orders/:orderId` from `/admin/orders`. This keeps endpoint
responses and navigation boundaries independent while preserving the shared
admin layout and authentication controls.

`lib/supabase/middleware.ts` (used by `proxy.ts`) redirects
unauthenticated users away from `/worker/*` and `/admin/*` to `/login`,
and additionally redirects authenticated non-admin/owner users away
from `/admin/*` to `/worker/dashboard`.

## Status

This document reflects the state as of EPIC 0. Update as EPICs 1–9 are
implemented.
