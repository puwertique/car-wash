create type booking_source as enum ('marketing_api', 'worker_direct');

alter table bookings add column booking_source booking_source;
update bookings set booking_source = 'marketing_api' where booking_source is null;
alter table bookings alter column booking_source set not null;

create or replace function create_worker_direct_booking_atomic(
  p_worker_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_package_id text,
  p_vehicle_size vehicle_size,
  p_payment_method payment_method,
  p_latitude double precision,
  p_longitude double precision,
  p_city text
)
returns table (id uuid, booking_id text, status booking_status, price_snapshot numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_vehicle_id uuid;
  v_booking bookings%rowtype;
  v_package packages%rowtype;
  v_category vehicle_category;
  v_today date := current_date;
begin
  select workers.id into strict p_worker_id from workers where workers.id = p_worker_id and workers.employment_status = 'active';
  select packages.* into v_package from packages where packages.id = p_package_id and packages.is_active and packages.vehicle_size = p_vehicle_size;
  if not found then raise exception 'PACKAGE_NOT_FOUND'; end if;
  v_category := v_package.vehicle_category;

  insert into customers (full_name, phone_number, preferred_language, source)
  values (p_customer_name, p_customer_phone, 'ar', 'worker_direct')
  on conflict (phone_number) do update set full_name = excluded.full_name, source = excluded.source
  returning customers.id into v_customer_id;

  insert into customer_vehicles (customer_id, vehicle_category, vehicle_size)
  values (v_customer_id, v_category, p_vehicle_size)
  returning customer_vehicles.id into v_vehicle_id;

  insert into bookings (
    customer_id, vehicle_id, package_id, price_snapshot, addons_total, discount_amount,
    latitude, longitude, location, address_text, city, requested_date, requested_time_slot,
    is_asap, recurrence, payment_method, payment_status, status, source, booking_source,
    marketing_consent, notes
  ) values (
    v_customer_id, v_vehicle_id, p_package_id, v_package.base_price, 0, 0,
    p_latitude, p_longitude,
    st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography,
    'Worker direct booking', p_city, v_today, 'ASAP', true, 'none',
    p_payment_method, 'unpaid', 'in_progress', 'worker_direct', 'worker_direct',
    false, 'Created directly by worker'
  ) returning * into v_booking;

  insert into status_history (booking_id, old_status, new_status) values (v_booking.id, null, 'in_progress');
  insert into booking_assignments (booking_id, worker_id, status, assigned_at) values (v_booking.id, p_worker_id, 'ACCEPTED', now());

  return query select v_booking.id, v_booking.booking_id, v_booking.status, v_booking.price_snapshot;
exception
  when no_data_found then raise exception 'WORKER_NOT_ACTIVE';
end;
$$;

revoke execute on function create_worker_direct_booking_atomic(uuid, text, text, text, vehicle_size, payment_method, double precision, double precision, text) from public, anon, authenticated;
