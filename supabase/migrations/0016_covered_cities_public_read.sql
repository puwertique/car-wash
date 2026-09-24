drop policy if exists covered_cities_select_authenticated on covered_cities;

create policy covered_cities_public_active_read on covered_cities
  for select using (is_active = true);
