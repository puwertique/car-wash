-- ============================================================================
-- 0003_worker_photos_storage.sql
-- Storage bucket + RLS for worker profile photos (EPIC 3).
-- Path convention: <worker_id>/<filename>. Public read (photos are
-- shown to customers/admin), write restricted to the owning worker.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('worker-photos', 'worker-photos', true)
on conflict (id) do nothing;

create policy worker_photos_public_read on storage.objects
  for select using (bucket_id = 'worker-photos');

create policy worker_photos_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'worker-photos'
    and (storage.foldername(name))[1] in (
      select id::text from workers where auth_user_id = auth.uid()
    )
  );

create policy worker_photos_owner_update on storage.objects
  for update using (
    bucket_id = 'worker-photos'
    and (storage.foldername(name))[1] in (
      select id::text from workers where auth_user_id = auth.uid()
    )
  );

create policy worker_photos_owner_delete on storage.objects
  for delete using (
    bucket_id = 'worker-photos'
    and (storage.foldername(name))[1] in (
      select id::text from workers where auth_user_id = auth.uid()
    )
  );
