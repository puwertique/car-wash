create type compensation_model as enum ('percentage', 'fixed_per_booking', 'salary');
create type work_vehicle_type as enum ('tricycle_motorcycle', 'van');
create type employment_status as enum ('active', 'suspended', 'terminated');

alter table workers add column if not exists full_name text;
alter table workers add column if not exists phone_number text;
alter table workers add column if not exists compensation_model compensation_model;
alter table workers add column if not exists compensation_value numeric(10, 2);
alter table workers add column if not exists work_vehicle_type work_vehicle_type;
alter table workers add column if not exists work_vehicle_plate_number text;
alter table workers add column if not exists vehicle_photo_path text;
alter table workers add column if not exists carte_grise_photo_path text;
alter table workers add column if not exists employment_status employment_status not null default 'active';
alter table workers add column if not exists cin text;
alter table workers add column if not exists cin_photo_path text;
alter table workers add column if not exists full_address text;
alter table workers add column if not exists date_of_birth date;
alter table workers add column if not exists eligible_package_ids text[];
alter table workers add column if not exists employment_contract_path text;
alter table workers add column if not exists insurance_photo_path text;

delete from workers;
update workers set full_name = trim(first_name || ' ' || last_name) where full_name is null;
update workers set phone_number = phone where phone_number is null;

alter table workers add constraint workers_compensation_value_positive check (compensation_value is null or compensation_value > 0);
alter table workers add constraint workers_percentage_range check (compensation_model <> 'percentage' or compensation_value between 0.01 and 100);
alter table workers add constraint workers_required_registration_fields check (
  full_name is not null and phone_number is not null and compensation_model is not null
  and compensation_value is not null and work_vehicle_type is not null
  and work_vehicle_plate_number is not null and vehicle_photo_path is not null
  and carte_grise_photo_path is not null
);
create unique index if not exists workers_phone_number_unique on workers (phone_number);

create table if not exists covered_cities (
  id text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into covered_cities (id) values ('casablanca') on conflict (id) do nothing;
alter table covered_cities enable row level security;
create policy covered_cities_select_authenticated on covered_cities for select using (auth.uid() is not null);
create policy covered_cities_admin_manage on covered_cities for all using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public)
values ('worker-documents', 'worker-documents', false)
on conflict (id) do nothing;

create policy worker_documents_admin_read on storage.objects
  for select using (bucket_id = 'worker-documents' and is_admin());
create policy worker_documents_admin_insert on storage.objects
  for insert with check (bucket_id = 'worker-documents' and is_admin());
create policy worker_documents_admin_update on storage.objects
  for update using (bucket_id = 'worker-documents' and is_admin());
create policy worker_documents_admin_delete on storage.objects
  for delete using (bucket_id = 'worker-documents' and is_admin());
