create or replace function create_booking_atomic(
  p_customer jsonb, p_vehicle jsonb, p_booking jsonb, p_add_on_ids text[]
)
returns table (id uuid, booking_id text, status booking_status, price_snapshot numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_customer_id uuid; v_vehicle_id uuid; v_package packages%rowtype; v_addons_total numeric(10,2) := 0; v_booking bookings%rowtype;
begin
  select packages.* into v_package from packages where packages.id = p_booking->>'package_id' and packages.is_active;
  if not found then raise exception 'PACKAGE_NOT_FOUND'; end if;
  insert into customers (full_name, phone_number, email, preferred_language, source, utm_campaign)
  values (p_customer->>'full_name', p_customer->>'phone_number', p_customer->>'email', coalesce(p_customer->>'preferred_language','ar'), p_customer->>'source', p_customer->>'utm_campaign')
  on conflict (phone_number) do update set full_name=excluded.full_name, email=excluded.email, preferred_language=excluded.preferred_language, source=excluded.source, utm_campaign=excluded.utm_campaign
  returning customers.id into v_customer_id;
  insert into customer_vehicles (customer_id, vehicle_category, vehicle_size, brand, model, plate_number, color, condition)
  values (v_customer_id, (p_vehicle->>'vehicle_category')::vehicle_category, (p_vehicle->>'vehicle_size')::vehicle_size, p_vehicle->>'brand', p_vehicle->>'model', p_vehicle->>'plate_number', p_vehicle->>'color', p_vehicle->>'condition') returning customer_vehicles.id into v_vehicle_id;
  if coalesce(array_length(p_add_on_ids,1),0)>0 then
    select coalesce(sum(add_ons.price),0) into v_addons_total from add_ons where add_ons.id=any(p_add_on_ids) and add_ons.is_active;
    if (select count(*) from add_ons where add_ons.id=any(p_add_on_ids) and add_ons.is_active) <> (select count(*) from unnest(p_add_on_ids)) then raise exception 'ADDON_NOT_FOUND'; end if;
  end if;
  insert into bookings (customer_id,vehicle_id,package_id,price_snapshot,addons_total,discount_amount,latitude,longitude,location,address_text,city,requested_date,requested_time_slot,is_asap,recurrence,payment_method,payment_status,status,source,booking_source,marketing_consent,notes)
  values (v_customer_id,v_vehicle_id,v_package.id,v_package.base_price+v_addons_total,v_addons_total,0,(p_booking->>'latitude')::double precision,(p_booking->>'longitude')::double precision,st_setsrid(st_makepoint((p_booking->>'longitude')::double precision,(p_booking->>'latitude')::double precision),4326)::geography,p_booking->>'address_text',p_booking->>'city',(p_booking->>'requested_date')::date,p_booking->>'requested_time_slot',coalesce((p_booking->>'is_asap')::boolean,false),coalesce(p_booking->>'recurrence','none'),coalesce((p_booking->>'payment_method')::payment_method,'cash'),'unpaid','pending',p_booking->>'source','marketing_api',(p_booking->>'marketing_consent')::boolean,p_booking->>'notes') returning * into v_booking;
  if coalesce(array_length(p_add_on_ids,1),0)>0 then insert into booking_addons (booking_id,add_on_id,price_snapshot) select v_booking.id,add_ons.id,add_ons.price from add_ons where add_ons.id=any(p_add_on_ids) and add_ons.is_active; end if;
  insert into status_history (booking_id,old_status,new_status) values (v_booking.id,null,'pending');
  insert into booking_assignments (booking_id,status) values (v_booking.id,'proposed');
  return query select v_booking.id,v_booking.booking_id,v_booking.status,v_booking.price_snapshot;
end; $$;
revoke execute on function create_booking_atomic(jsonb,jsonb,jsonb,text[]) from public, anon, authenticated;
