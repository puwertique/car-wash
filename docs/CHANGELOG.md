# CHANGELOG

## 2026-09-09 (admin data boundaries and navigation)

### Added
- Protected admin read endpoints: `GET /api/admin/workers`,
  `GET /api/admin/orders`, and `GET /api/admin/orders/:orderId`.
- Independent `/admin/workers` and `/admin/orders` pages with feature-owned
  client state and data loading.

### Changed
- The Admin sidebar now routes Dashboard, Orders, and Workers to separate
  pages. `/admin/test` no longer loads or renders worker/order list data;
  it remains the operational form dashboard.

## 2026-09-08 (order geocoding, assignment organization, navigation)

### Added
- `supabase/migrations/0006_order_location_fields.sql`: minimal
  `orders.city` and `orders.package_type` columns; applied to Supabase.
- `lib/geo/google-geocoding.ts`: server-only, one-time Google Geocoding
  lookup for `city + address` when an order has no coordinates.
- `GOOGLE_MAPS_API_KEY` documented in `.env.example`. Dispatch does not
  call Google Maps; it continues using stored PostGIS coordinates.
- Responsive role-specific sidebars in `components/navigation/sidebar.tsx`
  with `app/admin/layout.tsx` and `app/worker/layout.tsx`, reusing the
  existing admin/worker routes.
- Admin order detail view with vehicle/package/customer/order fields,
  assigned worker, stored coordinates, server-side distance, and a map
  centered on the stored customer location.

### Changed
- `POST /api/orders` now accepts `city` and optional `package_type`.
  Latitude/longitude remain supported for callers that already have
  coordinates; when omitted, Google Geocoding supplies them once.

### Notes
- Add a real `GOOGLE_MAPS_API_KEY` to `.env.local` and enable the
  Geocoding API in Google Cloud before submitting address-only orders.
- Orders without coordinates and without a configured geocoding key are
  rejected clearly rather than entering dispatch with invalid location
  data.

## 2026-09-08 (employee registration)

### Added
- `lib/validation/register-worker.ts` (Zod schema: email, password,
  first/last name, phone, city/service area optional).
- `lib/admin/register-worker.ts` (`registerWorker` — creates the
  Supabase Auth user via the service-role client with the admin-set
  password, then the matching `workers` row; rolls back (deletes) the
  auth user if the `workers` insert fails).
- `registerWorkerAction` Server Action in `app/admin/test/actions.ts`
  (admin/owner role gated via `requireAdmin()`).
- `app/admin/test/register-worker-form.tsx` + wired into `/admin/test`
  under a new "Register worker" section, above "Create test order".

### Notes
- No public self-registration (per spec §6) — an admin creates the
  account and sets an initial password directly (shared with the
  worker out of band; there's no email invite flow since no SMTP/email
  provider is configured for this MVP).
- Verified against the live database with a throwaway script
  (created + deleted a test auth user/worker row): auth user creation,
  `workers` row creation, and the `profiles` auto-create trigger
  (role `worker`) all work correctly together.

## 2026-09-08 (dispatch + GPS bug fixes, verified full order lifecycle)

### Fixed
- **Dispatch permanently excluded a worker after an offer timeout**,
  not just after an explicit rejection (`lib/dispatch/offer.ts`
  `getExcludedWorkerIds` was querying `WORKER_OFFERED` events instead
  of `WORKER_REJECTED`). With a single-worker fleet this stalled
  orders in `SEARCHING_WORKER` forever after the first missed offer.
  Now only rejections exclude a worker from future rounds for that
  order.
- **GPS tracker only sent location updates when `watchPosition`
  reported a change**, so a stationary worker's fix silently went
  stale after the 5-minute dispatch freshness window even while
  genuinely available. `components/worker/gps-tracker.tsx` now runs a
  fixed 20s heartbeat that resends the last known position
  independent of movement.

### Added
- `DISPATCH_SEARCH_RADIUS_METERS` env var (default 15000) —
  `lib/dispatch/find-worker.ts` nearest-worker radius is now
  configurable, documented in `.env.example`.
- Dev-only `scripts/refresh-demo-location.mjs` (refreshes the demo
  worker's GPS timestamp for testing).
- Set up an ngrok tunnel for testing `/api/orders` from Postman
  against the local dev server (ephemeral free-tier URL, not
  persisted anywhere in the repo).

### Notes
- **Verified full order lifecycle end-to-end** via a real order placed
  through Postman (over ngrok) and driven through the worker
  dashboard in the browser: `ORDER_CREATED → SEARCH_STARTED →
  WORKER_OFFERED → WORKER_ACCEPTED → WORKER_ON_THE_WAY →
  WORKER_ARRIVED → WASH_STARTED → WASH_COMPLETED`, with the worker
  correctly reset to `AVAILABLE` afterward. Orders can now be reliably
  distributed to eligible workers.
- Three earlier smoke-test orders remain stuck in `SEARCHING_WORKER`
  in the dev database — their coordinates were simply outside the
  dispatch radius of the worker's real location at the time (~21.6km
  vs a 15km default radius), which is correct behavior, not a bug.
  Harmless test data; safe to ignore or delete.

## 2026-09-08 (EPIC 4–9: GPS, Orders API, Dispatch, Worker Order Flow, Photos, Admin Console)

### Added
- `supabase/migrations/0004_dispatch_core.sql`: `orders.offer_expires_at`,
  `before_photo_url`/`after_photo_url` columns; PostGIS RPC
  `find_available_workers_near_location` (nearest AVAILABLE worker with
  a GPS fix fresher than 5 minutes, within a radius, excluding given
  worker ids); RLS fix allowing workers to insert their own
  `order_events` and to null out `worker_id` on their own order
  (reject flow); seeded 4 baseline services. Applied via
  `supabase db push`.
- `supabase/migrations/0005_order_photos_storage.sql`: public
  `order-photos` storage bucket, write restricted to the order's
  assigned worker. Applied.
- **EPIC 4 (GPS):** `lib/validation/location.ts`, `lib/workers/location.ts`
  (`updateWorkerLocation`), `POST /api/locations`,
  `components/worker/gps-tracker.tsx` (`watchPosition`, ~20s throttle,
  active whenever status ≠ OFFLINE).
- **EPIC 5 (Orders API):** `lib/validation/orders.ts`,
  `lib/orders/create.ts` (`createOrder` — find/create customer by
  phone, create order, `ORDER_CREATED` event, triggers dispatch),
  `lib/orders/events.ts` (`recordSystemOrderEvent`),
  `POST /api/orders` (optional `x-api-key` check via `ORDERS_API_KEY`).
- **EPIC 6 (Dispatch):** `lib/dispatch/find-worker.ts`
  (`findBestWorkerForOrder`, wraps the PostGIS RPC),
  `lib/dispatch/offer.ts` (`dispatchOrder`, `offerNextWorker` — atomic
  conditional updates, configurable `DISPATCH_OFFER_TIMEOUT_SECONDS`),
  `lib/dispatch/sweep.ts` (`runDispatchSweep` — reclaims expired
  offers, retries undispatched orders), `POST /api/dispatch/sweep`.
- **EPIC 7 (Worker order flow):** `lib/orders/offer-actions.ts`
  (`acceptOffer`, `rejectOffer` — atomic, ownership+expiry checked),
  `lib/orders/transitions.ts` (`transitionOrder` — fixed chain
  ACCEPTED→ON_THE_WAY→ARRIVED→WASHING→COMPLETED, resets worker to
  AVAILABLE on completion), `lib/workers/dashboard-state.ts`
  (`getWorkerDashboardState`), `GET /api/worker/state`,
  `app/worker/dashboard/{actions.ts,order-panel.tsx}` (polls every 5s,
  renders offer card with accept/reject + countdown, current job card
  with "Open navigation" deep link and advance button).
- **EPIC 8 (Photos):** `lib/orders/photo.ts` (`uploadOrderPhoto`),
  before/after photo upload inputs on the current job card.
- **EPIC 9 (Admin console):** `lib/admin/{workers.ts,orders.ts}`,
  rewritten `/admin/test` — worker list (status/city/vehicle/last
  location time), recent orders list, manual test-order creation form
  (calls `createOrder` directly, admin-role-gated Server Action), and
  a per-order event log viewer (`?order=<id>`).
- Dev-only scripts: `scripts/seed-demo-location.mjs` (sets the demo
  worker AVAILABLE with a GPS fix for testing).
- Removed the `prefers-color-scheme: dark` override in
  `app/globals.css` — components use fixed black/white utility
  classes, so dark mode made text invisible against a dark background.

### Fixed
- Two `react-hooks/set-state-in-effect` lint errors (Next 16's bundled
  eslint-plugin-react-hooks flags any `setState`-calling function
  invoked directly and synchronously at the top level of a `useEffect`
  body, even if the function is itself `async`). Fixed by deferring
  those calls via `setTimeout(..., 0)` in `gps-tracker.tsx` and
  `order-panel.tsx` — the interval-callback calls were already fine.

### Notes
- **Smoke-tested end-to-end** against the live Supabase project: set
  the demo worker AVAILABLE with a GPS fix, POSTed a test order to
  `/api/orders`, and confirmed the order reached `OFFERED` status with
  `worker_id` set to the demo worker, with `ORDER_CREATED` →
  `SEARCH_STARTED` → `WORKER_OFFERED` events recorded in order.
- Known limitations (see `docs/TASKS.md` "KNOWN LIMITATIONS" section):
  no visual map (no maps API key available), dispatch timeout/retry
  progression relies on client-side polling rather than a real
  scheduled job (acceptable per spec §23, but requires an open worker/
  admin tab; a Vercel Cron hitting `/api/dispatch/sweep` would remove
  this dependency in production), vehicle assignment is admin-only via
  SQL (no UI).
- `build`/`typecheck`/`lint` all pass.

## 2026-09-08 (continued)

### Added
- Added `supabase/migrations/0003_worker_photos_storage.sql`: public
  `worker-photos` storage bucket with RLS (owner-only write via
  `<worker_id>/...` path convention, public read) — pushed to remote.
- Added `lib/validation/workers.ts` (manual status Zod schema),
  `lib/workers/profile.ts` (`getWorkerProfileByAuthUserId`),
  `lib/workers/status.ts` (`setWorkerManualStatus`, blocks changes
  while `BUSY`), `lib/workers/photo.ts` (`uploadWorkerPhoto`).
- Added `app/worker/profile/{page.tsx,actions.ts,status-toggle.tsx,
  photo-upload-form.tsx}`: worker profile view with photo upload and
  AVAILABLE/OFFLINE status toggle.
- Updated `next.config.ts` to allow `next/image` to load photos from
  the Supabase Storage public URL host.
- Linked `/worker/dashboard` ↔ `/worker/profile`.

### Notes
- EPIC 3 (worker profile) baseline implemented and verified via
  `build`/`typecheck`/`lint` plus a manual dev-server check. Vehicle
  assignment itself is still admin-only (no UI yet — EPIC 9); the demo
  worker currently has no vehicle assigned, so the profile page shows
  "Not assigned".

## 2026-09-08

### Added
- Created `.env.local` with real Supabase project URL, anon key, and
  service-role key (project ref `ucvjqdpaexefskvsuhof`).
- Ran `supabase init` to add local CLI config (`supabase/config.toml`).
- Logged in to the Supabase CLI, ran `supabase link --project-ref
  ucvjqdpaexefskvsuhof`, and applied `supabase/migrations/0001_init.sql`
  to the live project via `supabase db push`. Verified with
  `supabase migration list` (local 0001 == remote 0001).
- Added `supabase/migrations/0002_auth_profile_trigger.sql` (auto-
  creates a `profiles` row with role `worker` on new `auth.users`
  insert) and applied it via `supabase db push`.
- Added `lib/validation/auth.ts` (Zod login schema).
- Added `lib/auth/session.ts` (`getSessionProfile()`).
- Added `app/(auth)/login/page.tsx` + `actions.ts` (login/logout Server
  Actions using `useActionState`).
- Added role-based redirect logic to `lib/supabase/middleware.ts`:
  unauthenticated users are redirected to `/login`; non-admin/owner
  users are redirected away from `/admin/*` to `/worker/dashboard`.
- Added `components/worker/logout-button.tsx`.
- Added minimal protected pages `app/worker/dashboard/page.tsx` and
  `app/admin/test/page.tsx` showing the signed-in user/role.
- Root `app/page.tsx` now redirects to `/login`.

### Notes
- EPIC 1 (database) is now applied to a real Supabase project. EPIC 2
  (worker/admin authentication) baseline is implemented and verified
  via `build`/`typecheck`/`lint`, and manually via a demo worker
  account (see below). `/login` responds 200 with `npm run dev`.

### Added (demo/testing)
- Added `scripts/create-demo-user.mjs` (dev-only): creates a demo
  Supabase Auth user + matching `workers` row via the admin
  (service-role) client. Run with
  `node --env-file=.env.local scripts/create-demo-user.mjs`.
- Installed `ws` as a dev dependency — `@supabase/supabase-js`'s
  realtime client requires a WebSocket implementation under Node 20
  (native support requires Node 22+; this repo currently runs Node
  20.17). The script passes `realtime: { transport: ws }` to
  `createClient` to work around this.
- Created a demo worker account: `demo.worker@example.com` /
  `DemoPass123!` (role `worker`, auth user id
  `069538a9-c9b2-448b-bd82-78468d9594ef`).

## 2026-09-07

### Added
- Initialized Next.js 16 (App Router) project with TypeScript, Tailwind
  CSS, and ESLint.
- Installed `@supabase/supabase-js`, `@supabase/ssr`, `zod`.
- Added `typecheck` npm script (`tsc --noEmit`).
- Created project folder structure per spec: `app/(auth)/login`,
  `app/worker/{dashboard,orders,map,profile}`, `app/admin/test`,
  `app/api/{orders,workers,locations,dispatch}`,
  `components/{ui,worker,orders,maps}`,
  `lib/{supabase,auth,orders,workers,dispatch,geo,validation}`, `types`,
  `supabase/{migrations,functions}`, `docs`.
- Added Supabase client helpers: `lib/supabase/client.ts` (browser),
  `lib/supabase/server.ts` (Server Components/Route Handlers),
  `lib/supabase/admin.ts` (service-role, server-only),
  `lib/supabase/middleware.ts` + root `proxy.ts` (session refresh and
  route protection for `/worker` and `/admin`; this project's Next.js
  version deprecates `middleware.ts` in favor of `proxy.ts` — migrated
  via `npx @next/codemod middleware-to-proxy`).
- Added `.env.example` documenting required Supabase and dispatch env
  vars.
- Added initial Supabase migration `supabase/migrations/0001_init.sql`
  covering `profiles`, `workers`, `vehicles`, `customers`, `services`,
  `orders`, `order_events`, `worker_current_locations`, PostGIS
  extension, spatial index, and baseline RLS policies.
- Created continuity docs: `docs/PROJECT_SPEC.md`, `docs/TASKS.md`,
  `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/CHANGELOG.md`.

### Changed
- N/A (first entry).

### Fixed
- N/A (first entry).

### Notes
- `create-next-app` could not scaffold directly into a folder named
  "car wash" (npm naming restriction on the derived package name), so
  the project was generated into a temp `mobile-car-wash` subfolder and
  its contents were moved up to the workspace root.
- Migration has not yet been applied to a live Supabase project —
  requires the user to provide project credentials in `.env.local`. See
  `docs/TASKS.md` BLOCKED section.
