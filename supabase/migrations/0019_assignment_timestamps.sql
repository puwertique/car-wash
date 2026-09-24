alter table booking_assignments
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists booking_assignments_worker_active_idx on booking_assignments (worker_id, status) where status in ('ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'WASHING');
