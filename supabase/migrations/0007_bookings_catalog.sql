-- Replace the pre-launch order model with the approved booking model.
-- Existing orders are disposable test data; no data migration is intended.

drop table if exists order_events cascade;
drop table if exists orders cascade;
drop table if exists services cascade;
drop type if exists order_event_type cascade;
drop type if exists order_status cascade;

alter table customers rename column name to full_name;
alter table customers rename column phone to phone_number;
alter table customers add column if not exists email text;
alter table customers add column if not exists preferred_language text not null default 'ar';
alter table customers add column if not exists source text;
alter table customers add column if not exists utm_campaign text;
alter table customers add column if not exists customer_type text not null default 'individual';
delete from customers;
create unique index if not exists customers_phone_number_unique on customers (phone_number);

create type booking_status as enum ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
create type assignment_status as enum ('proposed', 'accepted', 'rejected', 'SEARCHING_WORKER', 'OFFERED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'WASHING', 'COMPLETED', 'CANCELLED');
create type vehicle_category as enum ('car', 'moto');
create type vehicle_size as enum ('citadine', 'berline', 'suv_medium', 'suv_large', 'moto_small', 'moto_large');
create type payment_method as enum ('cash', 'card', 'online');
create type payment_status as enum ('unpaid', 'partially_paid', 'paid');

create table packages (
  id text primary key,
  name text not null,
  description text not null,
  vehicle_category vehicle_category not null,
  vehicle_size vehicle_size not null,
  base_price numeric(10, 2) not null check (base_price >= 0),
  estimated_duration_minutes integer not null check (estimated_duration_minutes > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table add_ons (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  vehicle_category vehicle_category not null,
  vehicle_size vehicle_size not null,
  brand text,
  model text,
  plate_number text,
  color text,
  condition text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique default ('BK-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8)),
  customer_id uuid not null references customers (id),
  vehicle_id uuid not null references customer_vehicles (id),
  package_id text not null references packages (id),
  price_snapshot numeric(10, 2) not null check (price_snapshot >= 0),
  addons_total numeric(10, 2) not null default 0 check (addons_total >= 0),
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  promo_code text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location geography(Point, 4326) not null,
  address_text text not null,
  city text not null,
  location_type text,
  access_notes text,
  requested_date date not null,
  requested_time_slot text not null,
  is_asap boolean not null default false,
  recurrence text not null default 'none',
  payment_method payment_method not null default 'cash',
  payment_status payment_status not null default 'unpaid',
  status booking_status not null default 'pending',
  source text not null,
  marketing_consent boolean not null,
  notes text,
  offer_expires_at timestamptz,
  before_photo_url text,
  after_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table booking_addons (
  booking_id uuid not null references bookings (id) on delete cascade,
  add_on_id text not null references add_ons (id),
  price_snapshot numeric(10, 2) not null check (price_snapshot >= 0),
  primary key (booking_id, add_on_id)
);

create table booking_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  worker_id uuid references workers (id) on delete set null,
  status assignment_status not null default 'proposed',
  assigned_at timestamptz,
  offer_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  old_status booking_status,
  new_status booking_status not null,
  changed_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  source text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index bookings_status_idx on bookings (status);
create index bookings_location_idx on bookings using gist (location);
create index bookings_customer_id_idx on bookings (customer_id);
create index booking_assignments_booking_id_idx on booking_assignments (booking_id);
create index booking_assignments_worker_status_idx on booking_assignments (worker_id, status);
create index status_history_booking_id_idx on status_history (booking_id);

create trigger set_updated_at before update on packages for each row execute function set_updated_at();
create trigger set_updated_at before update on add_ons for each row execute function set_updated_at();
create trigger set_updated_at before update on customer_vehicles for each row execute function set_updated_at();
create trigger set_updated_at before update on bookings for each row execute function set_updated_at();
create trigger set_updated_at before update on booking_assignments for each row execute function set_updated_at();

alter table packages enable row level security;
alter table add_ons enable row level security;
alter table customer_vehicles enable row level security;
alter table bookings enable row level security;
alter table booking_addons enable row level security;
alter table booking_assignments enable row level security;
alter table status_history enable row level security;
alter table api_keys enable row level security;

create policy packages_select_all on packages for select using (auth.uid() is not null);
create policy packages_admin_manage on packages for all using (is_admin()) with check (is_admin());
create policy addons_select_all on add_ons for select using (auth.uid() is not null);
create policy addons_admin_manage on add_ons for all using (is_admin()) with check (is_admin());
create policy customer_vehicles_admin_all on customer_vehicles for all using (is_admin()) with check (is_admin());
create policy bookings_admin_all on bookings for all using (is_admin()) with check (is_admin());
create policy bookings_worker_read on bookings for select using (exists (select 1 from booking_assignments a join workers w on w.id = a.worker_id where a.booking_id = bookings.id and w.auth_user_id = auth.uid()));
create policy bookings_worker_update on bookings for update using (exists (select 1 from booking_assignments a join workers w on w.id = a.worker_id where a.booking_id = bookings.id and w.auth_user_id = auth.uid()));
create policy booking_addons_admin_all on booking_addons for all using (is_admin()) with check (is_admin());
create policy booking_assignments_admin_all on booking_assignments for all using (is_admin()) with check (is_admin());
create policy booking_assignments_worker_read on booking_assignments for select using (worker_id in (select id from workers where auth_user_id = auth.uid()));
create policy booking_assignments_worker_update on booking_assignments for update using (worker_id in (select id from workers where auth_user_id = auth.uid()));
create policy status_history_admin_all on status_history for all using (is_admin()) with check (is_admin());
create policy status_history_worker_read on status_history for select using (exists (select 1 from booking_assignments a join workers w on w.id = a.worker_id where a.booking_id = status_history.booking_id and w.auth_user_id = auth.uid()));
create policy api_keys_admin_all on api_keys for all using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;

create policy booking_photos_worker_insert on storage.objects
  for insert with check (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select b.id::text from bookings b
      join booking_assignments a on a.booking_id = b.id
      join workers w on w.id = a.worker_id
      where w.auth_user_id = auth.uid()
    )
  );

create policy booking_photos_worker_update on storage.objects
  for update using (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select b.id::text from bookings b
      join booking_assignments a on a.booking_id = b.id
      join workers w on w.id = a.worker_id
      where w.auth_user_id = auth.uid()
    )
  );

insert into packages (id, name, description, vehicle_category, vehicle_size, base_price, estimated_duration_minutes, is_active) values
('wash_express_citadine', 'غسيل سريع', 'تنظيف خارجي: هيكل + جنوط + زجاج خارجي', 'car', 'citadine', 40, 20, true),
('wash_complet_citadine', 'غسيل شامل', 'خارجي كامل + شفط الغبار الداخلي + تنظيف الطبلو', 'car', 'citadine', 70, 40, true),
('wash_extra_citadine', 'غسيل إكسترا', 'شامل + تلميع الجنوط + معطر + عناية بالمقاعد', 'car', 'citadine', 140, 60, false),
('wash_premium_citadine', 'غسيل بريميوم', 'إكسترا + بوليش الهيكل + تعقيم كامل + طبقة حماية', 'car', 'citadine', 240, 90, false),
('wash_express_berline', 'غسيل سريع', 'تنظيف خارجي: هيكل + جنوط + زجاج خارجي', 'car', 'berline', 50, 20, true),
('wash_complet_berline', 'غسيل شامل', 'خارجي كامل + شفط الغبار الداخلي + تنظيف الطبلو', 'car', 'berline', 80, 40, true),
('wash_extra_berline', 'غسيل إكسترا', 'شامل + تلميع الجنوط + معطر + عناية بالمقاعد', 'car', 'berline', 160, 60, false),
('wash_premium_berline', 'غسيل بريميوم', 'إكسترا + بوليش الهيكل + تعقيم كامل + طبقة حماية', 'car', 'berline', 270, 90, false),
('wash_express_suv_medium', 'غسيل سريع', 'تنظيف خارجي: هيكل + جنوط + زجاج خارجي', 'car', 'suv_medium', 60, 20, true),
('wash_complet_suv_medium', 'غسيل شامل', 'خارجي كامل + شفط الغبار الداخلي + تنظيف الطبلو', 'car', 'suv_medium', 100, 40, true),
('wash_extra_suv_medium', 'غسيل إكسترا', 'شامل + تلميع الجنوط + معطر + عناية بالمقاعد', 'car', 'suv_medium', 200, 60, false),
('wash_premium_suv_medium', 'غسيل بريميوم', 'إكسترا + بوليش الهيكل + تعقيم كامل + طبقة حماية', 'car', 'suv_medium', 320, 90, false),
('wash_express_suv_large', 'غسيل سريع', 'تنظيف خارجي: هيكل + جنوط + زجاج خارجي', 'car', 'suv_large', 70, 20, true),
('wash_complet_suv_large', 'غسيل شامل', 'خارجي كامل + شفط الغبار الداخلي + تنظيف الطبلو', 'car', 'suv_large', 120, 40, true),
('wash_extra_suv_large', 'غسيل إكسترا', 'شامل + تلميع الجنوط + معطر + عناية بالمقاعد', 'car', 'suv_large', 250, 60, false),
('wash_premium_suv_large', 'غسيل بريميوم', 'إكسترا + بوليش الهيكل + تعقيم كامل + طبقة حماية', 'car', 'suv_large', 380, 90, false),
('wash_standard_moto_small', 'غسيل عادي (موتو صغيرة)', 'تنظيف كامل خارجي: هيكل + عجلات', 'moto', 'moto_small', 35, 20, true),
('wash_standard_moto_large', 'غسيل عادي (موتو كبيرة)', 'تنظيف كامل خارجي: هيكل + عجلات', 'moto', 'moto_large', 55, 25, true),
('wash_premium_moto', 'غسيل بريميوم (كل الأحجام)', 'شامل + تلميع + معطر', 'moto', 'moto_small', 80, 40, false)
on conflict (id) do update set name = excluded.name, description = excluded.description, base_price = excluded.base_price, estimated_duration_minutes = excluded.estimated_duration_minutes, is_active = excluded.is_active;

insert into add_ons (id, name, price) values
('addon_tire_shine', 'تلميع الجنوط بمنتج خاص', 20),
('addon_air_freshener', 'معطر مميز', 15),
('addon_leather_care', 'عناية خاصة بالجلد', 30),
('addon_pet_hair_removal', 'إزالة شعر الحيوانات', 40),
('addon_engine_clean', 'تنظيف المحرك سطحيا', 50)
on conflict (id) do update set name = excluded.name, price = excluded.price, is_active = true;

create or replace function find_available_workers_near_location(
  p_lat double precision,
  p_lng double precision,
  p_radius_meters double precision default 15000,
  p_exclude_worker_ids uuid[] default '{}'
)
returns table (worker_id uuid, distance_meters double precision)
language sql stable as $$
  select w.id, st_distance(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
  from workers w join worker_current_locations l on l.worker_id = w.id
  where w.status = 'AVAILABLE' and not (w.id = any (p_exclude_worker_ids))
    and l.updated_at > now() - interval '5 minutes'
    and st_dwithin(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
  order by 2 asc;
$$;
