-- ============================================================================
-- 0005_order_photos_storage.sql
-- Storage bucket + RLS for order before/after photos (EPIC 8).
-- Path convention: <order_id>/<before|after>.<ext>. Public read, write
-- restricted to the worker currently assigned to that order.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;

create policy order_photos_public_read on storage.objects
  for select using (bucket_id = 'order-photos');

create policy order_photos_worker_insert on storage.objects
  for insert with check (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select o.id::text from orders o
      join workers w on w.id = o.worker_id
      where w.auth_user_id = auth.uid()
    )
  );

create policy order_photos_worker_update on storage.objects
  for update using (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] in (
      select o.id::text from orders o
      join workers w on w.id = o.worker_id
      where w.auth_user_id = auth.uid()
    )
  );
