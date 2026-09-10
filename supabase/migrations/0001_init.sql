-- ============================================================================
-- 0001_init.sql
-- Mobile Car Wash MVP — initial schema (EPIC 1)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists postgis;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type app_role as enum ('worker', 'admin', 'owner');
create type worker_status as enum ('OFFLINE', 'AVAILABLE', 'BUSY');
create type order_status as enum (
  'NEW',
  'SEARCHING_WORKER',
  'OFFERED',
  'ACCEPTED',
  'ON_THE_WAY',
  'ARRIVED',
  'WASHING',
  'COMPLETED',
  'CANCELLED'
);
create type order_event_type as enum (
  'ORDER_CREATED',
  'SEARCH_STARTED',
  'WORKER_OFFERED',
  'WORKER_ACCEPTED',
  'WORKER_REJECTED',
  'WORKER_OFFER_TIMEOUT',
  'WORKER_ASSIGNED',
  'WORKER_ON_THE_WAY',
  'WORKER_ARRIVED',
  'WASH_STARTED',
  'WASH_COMPLETED',
  'ORDER_CANCELLED'
);

-- ----------------------------------------------------------------------------
-- profiles — links auth.users to an application role
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null default 'worker',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- vehicles
-- ----------------------------------------------------------------------------
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  brand text,
  model text,
  registration_number text unique,
  photo_url text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- workers
-- ----------------------------------------------------------------------------
create table workers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  profile_photo_url text,
  city text,
  service_area text,
  vehicle_id uuid references vehicles (id) on delete set null,
  status worker_status not null default 'OFFLINE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workers_status_idx on workers (status);
create index workers_vehicle_id_idx on workers (vehicle_id);

-- ----------------------------------------------------------------------------
-- worker_current_locations — one row per worker, latest GPS fix only
-- ----------------------------------------------------------------------------
create table worker_current_locations (
  worker_id uuid primary key references workers (id) on delete cascade,
  location geography(Point, 4326) not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  updated_at timestamptz not null default now()
);

create index worker_current_locations_location_idx
  on worker_current_locations using gist (location);

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  address text,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_phone_idx on customers (phone);

-- ----------------------------------------------------------------------------
-- services
-- ----------------------------------------------------------------------------
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  estimated_duration_minutes integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('OW-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8)),
  customer_id uuid not null references customers (id),
  service_id uuid not null references services (id),
  worker_id uuid references workers (id),
  vehicle_id uuid references vehicles (id),
  customer_vehicle_type text,
  customer_vehicle_size text,
  price numeric(10, 2) not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  location geography(Point, 4326) not null,
  notes text,
  scheduled_at timestamptz,
  status order_status not null default 'NEW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_idx on orders (status);
create index orders_worker_id_idx on orders (worker_id);
create index orders_customer_id_idx on orders (customer_id);
create index orders_location_idx on orders using gist (location);

-- ----------------------------------------------------------------------------
-- order_events — append-only audit log
-- ----------------------------------------------------------------------------
create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  actor_user_id uuid references auth.users (id),
  worker_id uuid references workers (id),
  event_type order_event_type not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index order_events_order_id_idx on order_events (order_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger set_updated_at before update on vehicles
  for each row execute function set_updated_at();
create trigger set_updated_at before update on workers
  for each row execute function set_updated_at();
create trigger set_updated_at before update on customers
  for each row execute function set_updated_at();
create trigger set_updated_at before update on services
  for each row execute function set_updated_at();
create trigger set_updated_at before update on orders
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table workers enable row level security;
alter table vehicles enable row level security;
alter table customers enable row level security;
alter table services enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table worker_current_locations enable row level security;

-- Helper: is the current user an admin/owner?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$ language sql stable security definer set search_path = public;

-- profiles: a user can read their own profile; admins can read all.
create policy profiles_select_own on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_admin_manage on profiles
  for all using (is_admin()) with check (is_admin());

-- workers: a worker can read/update their own row; admins manage all.
create policy workers_select_own on workers
  for select using (auth_user_id = auth.uid() or is_admin());
create policy workers_update_own on workers
  for update using (auth_user_id = auth.uid() or is_admin())
  with check (auth_user_id = auth.uid() or is_admin());
create policy workers_admin_insert on workers
  for insert with check (is_admin());
create policy workers_admin_delete on workers
  for delete using (is_admin());

-- vehicles: workers can read vehicles (needed to see their assignment);
-- only admins manage them.
create policy vehicles_select_all on vehicles
  for select using (auth.uid() is not null);
create policy vehicles_admin_manage on vehicles
  for insert with check (is_admin());
create policy vehicles_admin_update on vehicles
  for update using (is_admin()) with check (is_admin());
create policy vehicles_admin_delete on vehicles
  for delete using (is_admin());

-- customers: admins manage; workers can read customers tied to their
-- own orders (kept simple in MVP — admin-only reads, server-side code
-- using the service role handles order/customer joins for workers).
create policy customers_admin_all on customers
  for all using (is_admin()) with check (is_admin());

-- services: readable by any authenticated user; admin-managed.
create policy services_select_all on services
  for select using (auth.uid() is not null);
create policy services_admin_manage on services
  for insert with check (is_admin());
create policy services_admin_update on services
  for update using (is_admin()) with check (is_admin());
create policy services_admin_delete on services
  for delete using (is_admin());

-- orders: a worker can read/update only their own assigned/offered
-- order; admins manage all.
create policy orders_select_own on orders
  for select using (
    is_admin() or worker_id in (
      select id from workers where auth_user_id = auth.uid()
    )
  );
create policy orders_update_own on orders
  for update using (
    is_admin() or worker_id in (
      select id from workers where auth_user_id = auth.uid()
    )
  ) with check (
    is_admin() or worker_id in (
      select id from workers where auth_user_id = auth.uid()
    )
  );
create policy orders_admin_insert on orders
  for insert with check (is_admin());
create policy orders_admin_delete on orders
  for delete using (is_admin());

-- order_events: a worker can read events for their own orders; admins
-- read all. Inserts happen via server-side trusted code (service role
-- or admin), not directly from worker clients.
create policy order_events_select_own on order_events
  for select using (
    is_admin() or worker_id in (
      select id from workers where auth_user_id = auth.uid()
    )
  );
create policy order_events_admin_insert on order_events
  for insert with check (is_admin());

-- worker_current_locations: a worker can read/update only their own
-- location row; admins can read all.
create policy worker_locations_select_own on worker_current_locations
  for select using (
    is_admin() or worker_id in (
      select id from workers where auth_user_id = auth.uid()
    )
  );
create policy worker_locations_upsert_own on worker_current_locations
  for insert with check (
    worker_id in (select id from workers where auth_user_id = auth.uid())
  );
create policy worker_locations_update_own on worker_current_locations
  for update using (
    worker_id in (select id from workers where auth_user_id = auth.uid())
  ) with check (
    worker_id in (select id from workers where auth_user_id = auth.uid())
  );
