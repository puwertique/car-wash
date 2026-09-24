alter type employment_status rename value 'terminated' to 'archived';

alter table workers drop constraint if exists workers_required_registration_fields;

alter table workers rename column work_vehicle_plate_number to vehicle_plate_number;
alter table workers rename column cin to cin_number;
alter table workers rename column date_of_birth to birth_date;

alter table workers drop column if exists full_name;
alter table workers drop column if exists phone_number;

delete from workers;

alter table workers alter column city set not null;
alter table workers alter column compensation_model set not null;
alter table workers alter column compensation_value set not null;
alter table workers alter column work_vehicle_type set not null;
alter table workers alter column vehicle_plate_number set not null;
alter table workers alter column eligible_package_ids type uuid[] using null;

alter table workers add constraint workers_phone_moroccan check (phone ~ '^\+212[5-7][0-9]{8}$');
alter table workers add constraint workers_city_supported check (city in ('casablanca'));
alter table workers add constraint workers_required_registration_fields check (
  first_name is not null and last_name is not null and phone is not null
  and city is not null and compensation_model is not null and compensation_value > 0
  and work_vehicle_type is not null and vehicle_plate_number is not null
  and vehicle_photo_path is not null and carte_grise_photo_path is not null
);

insert into storage.buckets (id, name, public) values
  ('worker-vehicle-photos', 'worker-vehicle-photos', false),
  ('worker-carte-grise', 'worker-carte-grise', false),
  ('worker-cin', 'worker-cin', false),
  ('worker-contracts', 'worker-contracts', false),
  ('worker-insurance', 'worker-insurance', false)
on conflict (id) do nothing;

create policy worker_vehicle_photos_admin_manage on storage.objects for all using (bucket_id = 'worker-vehicle-photos' and is_admin()) with check (bucket_id = 'worker-vehicle-photos' and is_admin());
create policy worker_carte_grise_admin_manage on storage.objects for all using (bucket_id = 'worker-carte-grise' and is_admin()) with check (bucket_id = 'worker-carte-grise' and is_admin());
create policy worker_cin_admin_manage on storage.objects for all using (bucket_id = 'worker-cin' and is_admin()) with check (bucket_id = 'worker-cin' and is_admin());
create policy worker_contracts_admin_manage on storage.objects for all using (bucket_id = 'worker-contracts' and is_admin()) with check (bucket_id = 'worker-contracts' and is_admin());
create policy worker_insurance_admin_manage on storage.objects for all using (bucket_id = 'worker-insurance' and is_admin()) with check (bucket_id = 'worker-insurance' and is_admin());
