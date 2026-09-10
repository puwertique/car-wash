-- Add fields needed by the operational order details and one-time geocoding flow.
alter table orders add column if not exists city text;
alter table orders add column if not exists package_type text;

create index if not exists orders_city_idx on orders (city);
