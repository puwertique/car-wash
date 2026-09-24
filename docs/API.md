# API

MVP API surface lives under `app/api/*` as Next.js Route Handlers.

## Conventions

- All input is validated with Zod (`lib/validation`) — never trust
  client input.
- Responses are JSON: `{ data }` on success, `{ error: { message, issues? } }`
  on failure.
- Endpoints that mutate order state log a corresponding `order_events`
  row.

## `POST /api/v1/bookings`

External booking intake. Requires `Authorization: Bearer <api-key>`.
The key is matched by SHA-256 hash against the active `api_keys` row; its
stored `source` is written to the booking and cannot be overridden by the
request body.

Request body:

```json
{
  "full_name": "string",
  "phone_number": "+212612345678",
  "source": "wordpress",
  "vehicle_category": "car",
  "vehicle_size": "suv_medium",
  "package_id": "wash_complet_suv_medium",
  "add_ons": ["addon_tire_shine"],
  "latitude": 33.5731,
  "longitude": -7.5898,
  "address_text": "string",
  "city": "casablanca",
  "requested_date": "2026-09-15",
  "requested_time_slot": "10:00-12:00",
  "payment_method": "cash",
  "marketing_consent": true,
  "notes": "string (optional)"
}
```

The server ignores any client price and calculates the final price from the
active package plus active add-ons. The transaction stores `price_snapshot`
and add-on price snapshots before dispatch. Promo codes are reserved in the
contract but currently rejected until a promo catalog is introduced.

Response `201`: `{ data: { id, booking_id, status, price } }`.
Errors: `400` (invalid input), `401` (`INVALID_API_KEY`), `422` (business
rules such as `PACKAGE_NOT_FOUND`, `ADDON_NOT_FOUND`, `CITY_NOT_COVERED`, or
`INVALID_SCHEDULE`).

## `GET /api/v1/packages`

Returns active packages for booking forms and marketing integrations. It
uses the same `Authorization: Bearer <api-key>` as the booking endpoint.
Inactive packages are never returned.

Optional filters:

```text
/api/v1/packages?vehicle_category=car&vehicle_size=suv_medium
```

Response `200`:

```json
{
  "data": [
    {
      "id": "wash_complet_suv_medium",
      "name": "غسيل شامل",
      "description": "...",
      "vehicle_category": "car",
      "vehicle_size": "suv_medium",
      "base_price": 100,
      "estimated_duration_minutes": 40
    }
  ],
  "source": "wordpress"
}
```

Errors: `401` (`INVALID_API_KEY`), `400` (`INVALID_FILTER`), or `500`
(`PACKAGE_LIST_FAILED`).

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
