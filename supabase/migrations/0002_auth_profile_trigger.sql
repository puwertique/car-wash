-- ============================================================================
-- 0002_auth_profile_trigger.sql
-- Auto-create a `profiles` row (default role 'worker') whenever a new
-- Supabase Auth user is created. Admins can promote a user's role later
-- via the SQL editor or a future admin API.
-- ============================================================================

create or replace function handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'worker')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
