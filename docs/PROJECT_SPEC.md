# PROJECT SPEC — Mobile Car Wash MVP

This file is the canonical product/architecture spec for the project. It is
derived from `Mobile_Car_Wash_Copilot_Master_Prompt.md` and must be kept in
sync as decisions are made. When in doubt, the original master prompt takes
precedence; update this file to reflect the current understanding.

## 1. Product

Mobile car-wash / detailing-at-home platform. Workers operate three-wheel
motorcycles equipped for mobile washing. MVP-0.1 builds the **operational
core** only — worker auth, worker profile, availability, GPS tracking, an
order-intake API, order lifecycle, automatic dispatch to the nearest
eligible worker, and a minimal admin/test console. The customer-facing
booking app is out of scope for this milestone.

## 2. Core flow (the heart of the product)

```
EXTERNAL ORDER API → CREATE ORDER → FIND ELIGIBLE AVAILABLE WORKERS →
CALCULATE DISTANCE → OFFER TO NEAREST WORKER → WORKER ACCEPTS →
WORKER NAVIGATES → ARRIVES → STARTS WASH → COMPLETES → ORDER COMPLETED
```

## 3. Stack

Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui (as needed) +
Supabase (Postgres, Auth, Storage, Realtime where useful) + `@supabase/ssr`
+ `@supabase/supabase-js` + Zod + browser Geolocation API + PostGIS.

No Redux/Zustand/NestJS/Express/separate backend/Docker/microservices/
Redis/Kafka/custom WebSocket server unless a concrete MVP requirement
proves necessary.

## 4. Architecture rules

- Business logic lives in `lib/*` modules (`lib/auth`, `lib/orders`,
  `lib/workers`, `lib/dispatch`, `lib/geo`, `lib/validation`,
  `lib/supabase`), never inline in React components.
- API-first: orders are created via `POST /api/orders`. Any frontend
  (customer site, WhatsApp bot, call center) can call the same API later.
- Database-first integrity: constraints, foreign keys, indexes, RLS in
  Postgres — never rely only on frontend validation.
- Security: service-role key is server-only, RLS enforced, workers scoped
  to their own data.

## 5. Roles

- **Worker** — performs washes; profile includes assigned vehicle, city/
  service area, status (`OFFLINE` / `AVAILABLE` / `BUSY`).
- **Admin** — manages workers/vehicles/orders via a minimal protected
  console.
- **Owner** — conceptual higher-level role; not over-engineered in MVP.

## 6. Data model (MVP)

- `profiles` — link to Supabase Auth users + role.
- `workers` — worker profile, status, assigned vehicle FK, city/service
  area.
- `vehicles` — fleet vehicles, referenced by workers (not embedded).
- `customers` — name, phone, address, lat/lng, notes.
- `services` — name, description, price, estimated duration, active flag.
- `orders` — customer/service/worker/vehicle FKs, status, price, address,
  lat/lng, scheduled_at, timestamps.
- `order_events` — append-only audit log of lifecycle events.
- `worker_current_locations` — one row per worker, latest GPS fix only
  (no unbounded history table in MVP).

Order statuses: `NEW → SEARCHING_WORKER → OFFERED → ACCEPTED →
ON_THE_WAY → ARRIVED → WASHING → COMPLETED`, plus `CANCELLED`. Status
transitions are enforced server-side, never arbitrary from the UI.

## 7. Dispatch

`lib/dispatch` — `findBestWorkerForOrder(order)`. Eligibility: AVAILABLE,
recent+accurate GPS fix, correct city/service area, required vehicle/
service capability, not already assigned elsewhere. Nearest eligible
worker wins (no ML/optimization in MVP). Offer flow uses a configurable
timeout window; server-side atomic assignment prevents double acceptance.

## 8. Deferred (do not build unless explicitly requested)

Customer account/app, payments, subscriptions, coupons, loyalty, reviews,
analytics, CRM, WhatsApp/SMS automation, AI, route optimization, advanced
scheduling, payroll, fleet maintenance, multi-country, complex owner
permissions, advanced notifications.

## 9. Roadmap

See [TASKS.md](./TASKS.md) for the live task board and
[ARCHITECTURE.md](./ARCHITECTURE.md) for structure/decisions. Full detail
lives in `Mobile_Car_Wash_Copilot_Master_Prompt.md` at the repo root's
parent folder (original spec document).
