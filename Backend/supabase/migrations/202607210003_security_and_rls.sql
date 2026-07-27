begin;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.auth_user_id = (select auth.uid())
      and au.is_active = true
      and au.role = 'super_admin'
  );
$$;

revoke all on function public.is_active_admin() from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.is_active_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_active_admin() to service_role;
grant execute on function public.is_super_admin() to service_role;

alter table public.admin_users enable row level security;
alter table public.old_boys enable row level security;
alter table public.sync_records enable row level security;
alter table public.audit_records enable row level security;
alter table public.export_records enable row level security;

revoke all on public.admin_users from anon;
revoke all on public.old_boys from anon;
revoke all on public.sync_records from anon;
revoke all on public.audit_records from anon;
revoke all on public.export_records from anon;

grant select on public.admin_users to authenticated;
grant select on public.old_boys to authenticated;
grant insert, update on public.old_boys to authenticated;
grant select on public.sync_records to authenticated;
grant select on public.audit_records to authenticated;
grant select on public.export_records to authenticated;

drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select
on public.admin_users
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or public.is_super_admin()
);

drop policy if exists old_boys_select on public.old_boys;
create policy old_boys_select
on public.old_boys
for select
to authenticated
using (public.is_active_admin());

drop policy if exists old_boys_insert on public.old_boys;
create policy old_boys_insert
on public.old_boys
for insert
to authenticated
with check (public.is_super_admin());

drop policy if exists old_boys_update on public.old_boys;
create policy old_boys_update
on public.old_boys
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists sync_records_select on public.sync_records;
create policy sync_records_select
on public.sync_records
for select
to authenticated
using (public.is_super_admin());

drop policy if exists audit_records_select on public.audit_records;
create policy audit_records_select
on public.audit_records
for select
to authenticated
using (public.is_super_admin());

drop policy if exists export_records_select on public.export_records;
create policy export_records_select
on public.export_records
for select
to authenticated
using (public.is_super_admin());

-- Normal application writes to sync/audit/export tables are performed by
-- Edge Functions with the service-role key. No authenticated insert policy
-- is intentionally provided for these tables.

commit;
