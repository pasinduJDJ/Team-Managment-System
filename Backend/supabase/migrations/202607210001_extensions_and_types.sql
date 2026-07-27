begin;

create schema if not exists extensions;

create extension if not exists citext with schema extensions;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_status') then
    create type public.member_status as enum (
      'pending',
      'verified',
      'inactive',
      'rejected',
      'duplicate'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'member_source') then
    create type public.member_source as enum (
      'google_form',
      'manual',
      'import'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum (
      'super_admin',
      'batch_admin'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'sync_status') then
    create type public.sync_status as enum (
      'received',
      'processed',
      'duplicate',
      'failed',
      'retry_pending'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'export_format') then
    create type public.export_format as enum (
      'csv',
      'xlsx'
    );
  end if;
end
$$;

commit;
