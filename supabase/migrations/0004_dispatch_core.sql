-- ============================================================================
-- 0004_dispatch_core.sql
-- Dispatch engine support: offer expiry, nearest-worker RPC, RLS fixes
-- for worker-driven order events, seed services, order photo columns.
-- ============================================================================

alter table orders add column offer_expires_at timestamptz;
alter table orders add column before_photo_url text;
alter table orders add column after_photo_url text;

-- ----------------------------------------------------------------------------
-- Nearest eligible AVAILABLE worker lookup (server-side/service-role only).
-- Freshness window: 5 minutes. Excludes worker ids already offered/rejected
-- for the order being dispatched.
-- ----------------------------------------------------------------------------
create or replace function find_available_workers_near_location(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 15000,
  p_exclude_worker_ids uuid[] default '{}'
)
returns table (worker_id uuid, distance_meters double precision)
language sql
stable
as $$
  select
    w.id as worker_id,
    st_distance(
      l.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance_meters
  from workers w
  join worker_current_locations l on l.worker_id = w.id
  where w.status = 'AVAILABLE'
    and not (w.id = any (p_exclude_worker_ids))
    and l.updated_at > now() - interval '5 minutes'
    and st_dwithin(
      l.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_meters
    )
  order by distance_meters asc;
$$;

-- ----------------------------------------------------------------------------
-- Allow a worker to log events for their own orders (accept/reject/status
-- transitions). System-generated events (created/offered/timeout) are
-- still written via the service-role admin client.
-- ----------------------------------------------------------------------------
create policy order_events_worker_insert on order_events
  for insert with check (
    worker_id in (select id from workers where auth_user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Allow a worker to clear worker_id on their own order (reject flow) in
-- addition to the existing "stays assigned to me" update case.
-- ----------------------------------------------------------------------------
drop policy orders_update_own on orders;
create policy orders_update_own on orders
  for update using (
    is_admin() or worker_id in (
      select id from workers where auth_user_id = auth.uid()
    )
  ) with check (
    is_admin() or worker_id is null or worker_id in (
      select id from workers where auth_user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Seed baseline services (idempotent).
-- ----------------------------------------------------------------------------
insert into services (name, description, price, estimated_duration_minutes, active)
select * from (values
  ('Basic Wash', 'Exterior hand wash and dry.', 80.00, 30, true),
  ('Premium Wash', 'Exterior wash, wheels, and interior vacuum.', 150.00, 45, true),
  ('Interior', 'Full interior cleaning and vacuum.', 120.00, 40, true),
  ('Full Detail', 'Complete interior and exterior detailing.', 350.00, 120, true)
) as seed(name, description, price, estimated_duration_minutes, active)
where not exists (select 1 from services where services.name = seed.name);
