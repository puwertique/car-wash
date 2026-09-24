-- City validity is enforced in application code against the dynamic
-- covered_cities table; a static check constraint can't reference it
-- and became stale once cities beyond 'casablanca' were added.
alter table workers drop constraint if exists workers_city_supported;
