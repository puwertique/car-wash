# API

MVP API surface lives under `app/api/*` as Next.js Route Handlers.

## Conventions

- All input is validated with Zod (`lib/validation`) — never trust
  client input.
- Responses are JSON: `{ data }` on success, `{ error: { message, issues? } }`
  on failure.
- Endpoints that mutate order state log a corresponding `order_events`
  row.

## `POST /api/orders`

External order intake. Finds/creates the customer (matched by phone),
creates the order (`NEW`), logs `ORDER_CREATED`, and triggers dispatch.

Optional header: `x-api-key: <ORDERS_API_KEY>` — enforced only if
`ORDERS_API_KEY` is set in the environment (unset = open, for local
dev only; always set it in production).

Request body:

```json
{
  "customer_name": "string",
  "phone": "string",
  "city": "string",
  "address": "string",
  "latitude": -90..90 (optional if GOOGLE_MAPS_API_KEY is configured),
  "longitude": -180..180 (optional if GOOGLE_MAPS_API_KEY is configured),
  "vehicle_type": "string (optional)",
  "vehicle_size": "string (optional)",
  "package_type": "string (optional)",
  "service_id": "uuid",
  "notes": "string (optional)",
  "scheduled_at": "ISO 8601 datetime (optional)"
}
```

When coordinates are omitted, the server calls Google Geocoding once with
`city + address`, stores the returned latitude/longitude on the order,
and then dispatches using those stored coordinates. It never calls Google
Maps while searching individual workers.

Response `201`: `{ data: { id, order_number, status } }`.
Errors: `400` (invalid input / unknown service), `401` (bad API key).

## `POST /api/locations`

Upserts the calling worker's row in `worker_current_locations`.
Requires an authenticated worker session (cookie-based).

Request body: `{ "latitude": number, "longitude": number, "accuracy_meters": number (optional) }`.

Response: `{ data: { ok: true } }`. `401` if not authenticated, `400`
if the caller has no worker profile or input is invalid.

## `GET /api/worker/state`

Returns the calling worker's status plus their current offer (if any,
`OFFERED` and not expired) and current active order (if any, one of
`ACCEPTED`/`ON_THE_WAY`/`ARRIVED`/`WASHING`). Requires an authenticated
worker session. Polled every 5s by the worker dashboard.

Response: `{ data: { workerId, status, offer, currentOrder } }` where
`offer`/`currentOrder` are `null` or an order summary (id, order
number, status, address, lat/lng, notes, offer expiry, customer name/
phone, service name/price).

## `POST /api/dispatch/sweep`

Progresses dispatch without a background job runner: reclaims
`OFFERED` orders past `offer_expires_at` (logs `WORKER_OFFER_TIMEOUT`,
offers the next eligible worker) and retries any order still stuck in
`SEARCHING_WORKER`. Idempotent — safe to call repeatedly/concurrently.
No auth required (side effects are guarded by expiry timestamps).
Called via polling from the worker dashboard; see
`docs/TASKS.md` "KNOWN LIMITATIONS" for the production alternative
(a scheduled job hitting this same endpoint).

Response: `{ data: { ok: true } }`.

## Worker-session Server Actions (not HTTP endpoints)

These are Next.js Server Actions, callable only from within the app
(not external HTTP), documented here for completeness:

- `acceptCurrentOffer(orderId)` / `rejectCurrentOffer(orderId)` —
  `app/worker/dashboard/actions.ts`, backed by
  `lib/orders/offer-actions.ts`.
- `advanceOrder(orderId, nextStatus)` — advances
  `ACCEPTED → ON_THE_WAY → ARRIVED → WASHING → COMPLETED`, one step at
  a time; backed by `lib/orders/transitions.ts`.
- `uploadOrderPhotoAction(orderId, kind, formData)` — `kind` is
  `"before" | "after"`; backed by `lib/orders/photo.ts`.

## Admin feature endpoints

All admin endpoints require an authenticated `admin` or `owner` session.

- `GET /api/admin/workers` returns `{ data: AdminWorkerRow[] }` for the
  Workers page only (name, phone, city, availability status, vehicle,
  and latest location timestamp).
- `GET /api/admin/orders` returns `{ data: AdminOrderRow[] }` for the
  Orders page only (recent order summaries).
- `GET /api/admin/orders/:orderId` returns `{ data: { details, events } }`
  for the selected order. Details include the requested customer, vehicle,
  assignment, stored location, and distance fields; `events` is that order's
  event history.

The Admin sidebar routes to `/admin/workers` and `/admin/orders`.
Each page owns its own client state and only fetches the endpoint(s) for
that feature. `/admin/test` remains the operational dashboard for worker
registration and test-order creation.
