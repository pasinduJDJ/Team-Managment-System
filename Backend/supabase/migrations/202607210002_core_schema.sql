begin;

create or replace function public.normalize_phone(value text)
returns text
language sql
immutable
parallel safe
as $$
  select nullif(regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g'), '');
$$;

create or replace function public.normalize_email(value text)
returns text
language sql
immutable
parallel safe
as $$
  select nullif(lower(trim(coalesce(value, ''))), '');
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email extensions.citext not null unique,
  role public.admin_role not null default 'super_admin',
  batch_scope text[] not null default '{}',
  is_active boolean not null default true,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_users_touch_updated_at
before update on public.admin_users
for each row execute function public.touch_updated_at();

create table if not exists public.old_boys (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  batch text not null,
  admission_number text,
  mobile text not null,
  mobile_normalized text,
  whatsapp text,
  whatsapp_normalized text,
  email extensions.citext,
  email_normalized text,
  profession text not null,
  company text,
  city text not null default '',
  country text not null default '',
  address text,
  notes text,
  status public.member_status not null default 'pending',
  source public.member_source not null default 'manual',
  consent_confirmed boolean not null default false,
  consent_at timestamptz,
  source_submission_id text,
  source_row_number integer,
  source_payload jsonb not null default '{}'::jsonb,
  duplicate_of uuid references public.old_boys(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  deactivated_at timestamptz,
  deactivated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint old_boys_full_name_not_blank check (length(trim(full_name)) > 0),
  constraint old_boys_batch_not_blank check (length(trim(batch)) > 0),
  constraint old_boys_mobile_not_blank check (length(trim(mobile)) > 0),
  constraint old_boys_profession_not_blank check (length(trim(profession)) > 0)
);

create or replace function public.prepare_old_boy_record()
returns trigger
language plpgsql
as $$
begin
  new.full_name := trim(new.full_name);
  new.batch := trim(new.batch);
  new.mobile := trim(new.mobile);
  new.whatsapp := nullif(trim(coalesce(new.whatsapp, '')), '');
  new.email := nullif(trim(coalesce(new.email::text, '')), '')::extensions.citext;
  new.profession := trim(new.profession);
  new.company := nullif(trim(coalesce(new.company, '')), '');
  new.city := trim(coalesce(new.city, ''));
  new.country := trim(coalesce(new.country, ''));
  new.mobile_normalized := public.normalize_phone(new.mobile);
  new.whatsapp_normalized := public.normalize_phone(new.whatsapp);
  new.email_normalized := public.normalize_email(new.email::text);
  new.updated_at := now();

  if new.consent_confirmed and new.consent_at is null then
    new.consent_at := coalesce(new.submitted_at, now());
  end if;

  return new;
end;
$$;

create trigger old_boys_prepare_record
before insert or update on public.old_boys
for each row execute function public.prepare_old_boy_record();

create unique index if not exists old_boys_source_submission_unique
  on public.old_boys (source_submission_id)
  where source_submission_id is not null;

create index if not exists old_boys_full_name_idx
  on public.old_boys (lower(full_name));

create index if not exists old_boys_batch_idx
  on public.old_boys (batch);

create index if not exists old_boys_mobile_normalized_idx
  on public.old_boys (mobile_normalized);

create index if not exists old_boys_email_normalized_idx
  on public.old_boys (email_normalized);

create index if not exists old_boys_profession_idx
  on public.old_boys (lower(profession));

create index if not exists old_boys_country_idx
  on public.old_boys (lower(country));

create index if not exists old_boys_status_idx
  on public.old_boys (status);

create index if not exists old_boys_submitted_at_idx
  on public.old_boys (submitted_at desc);

create table if not exists public.sync_records (
  id uuid primary key default gen_random_uuid(),
  submission_key text not null unique,
  source_sheet_id text,
  source_sheet_name text,
  source_row_number integer,
  request_id text,
  payload_hash text not null,
  payload jsonb not null,
  status public.sync_status not null default 'received',
  member_id uuid references public.old_boys(id) on delete set null,
  duplicate_member_ids uuid[] not null default '{}',
  duplicate_reasons text[] not null default '{}',
  attempt_count integer not null default 1,
  error_code text,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_attempt_at timestamptz not null default now()
);

create index if not exists sync_records_status_idx
  on public.sync_records (status, received_at desc);

create index if not exists sync_records_member_id_idx
  on public.sync_records (member_id);

create table if not exists public.audit_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.old_boys(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  changed_fields text[] not null default '{}',
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  note text,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_records_member_idx
  on public.audit_records (member_id, created_at desc);

create table if not exists public.export_records (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  format public.export_format not null,
  filters jsonb not null default '{}'::jsonb,
  selected_fields text[] not null default '{}',
  row_count integer not null default 0,
  file_name text,
  created_at timestamptz not null default now()
);

create index if not exists export_records_created_idx
  on public.export_records (created_at desc);

comment on table public.old_boys is
  'Operational Old Boys directory. Google Sheet remains an intake/recovery source only.';

comment on column public.old_boys.source_payload is
  'Original intake payload retained for troubleshooting. Avoid adding unnecessary personal data.';

commit;
