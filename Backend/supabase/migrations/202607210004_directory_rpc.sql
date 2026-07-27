begin;

create or replace function public.search_old_boys(
  p_search text default null,
  p_batch text default null,
  p_profession text default null,
  p_location text default null,
  p_status text default null,
  p_page integer default 1,
  p_page_size integer default 20,
  p_sort_by text default 'submittedAt',
  p_sort_direction text default 'desc'
)
returns table (
  member jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select ob.*
    from public.old_boys ob
    where
      (
        nullif(trim(p_search), '') is null
        or ob.full_name ilike '%' || trim(p_search) || '%'
        or ob.batch ilike '%' || trim(p_search) || '%'
        or ob.admission_number ilike '%' || trim(p_search) || '%'
        or ob.email_normalized ilike '%' || lower(trim(p_search)) || '%'
        or ob.profession ilike '%' || trim(p_search) || '%'
        or (
          public.normalize_phone(p_search) is not null
          and ob.mobile_normalized like '%' || public.normalize_phone(p_search) || '%'
        )
      )
      and (nullif(trim(p_batch), '') is null or ob.batch = trim(p_batch))
      and (
        nullif(trim(p_profession), '') is null
        or ob.profession ilike trim(p_profession)
      )
      and (
        nullif(trim(p_location), '') is null
        or ob.city ilike '%' || trim(p_location) || '%'
        or ob.country ilike '%' || trim(p_location) || '%'
      )
      and (
        nullif(trim(p_status), '') is null
        or ob.status::text = lower(trim(p_status))
      )
  ),
  ordered as (
    select
      f.*,
      count(*) over () as full_count
    from filtered f
    order by
      case when p_sort_by = 'fullName' and lower(p_sort_direction) = 'asc' then lower(f.full_name) end asc,
      case when p_sort_by = 'fullName' and lower(p_sort_direction) = 'desc' then lower(f.full_name) end desc,
      case when p_sort_by = 'batch' and lower(p_sort_direction) = 'asc' then f.batch end asc,
      case when p_sort_by = 'batch' and lower(p_sort_direction) = 'desc' then f.batch end desc,
      case when p_sort_by = 'profession' and lower(p_sort_direction) = 'asc' then lower(f.profession) end asc,
      case when p_sort_by = 'profession' and lower(p_sort_direction) = 'desc' then lower(f.profession) end desc,
      case when p_sort_by = 'country' and lower(p_sort_direction) = 'asc' then lower(f.country) end asc,
      case when p_sort_by = 'country' and lower(p_sort_direction) = 'desc' then lower(f.country) end desc,
      case when p_sort_by = 'status' and lower(p_sort_direction) = 'asc' then f.status::text end asc,
      case when p_sort_by = 'status' and lower(p_sort_direction) = 'desc' then f.status::text end desc,
      case when p_sort_by = 'updatedAt' and lower(p_sort_direction) = 'asc' then f.updated_at end asc,
      case when p_sort_by = 'updatedAt' and lower(p_sort_direction) = 'desc' then f.updated_at end desc,
      case when p_sort_by = 'submittedAt' and lower(p_sort_direction) = 'asc' then f.submitted_at end asc,
      case when p_sort_by = 'submittedAt' and lower(p_sort_direction) = 'desc' then f.submitted_at end desc,
      f.submitted_at desc,
      f.id
    limit greatest(1, least(coalesce(p_page_size, 20), 500))
    offset (greatest(coalesce(p_page, 1), 1) - 1)
      * greatest(1, least(coalesce(p_page_size, 20), 500))
  )
  select
    jsonb_build_object(
      'id', o.id,
      'fullName', o.full_name,
      'batch', o.batch,
      'admissionNumber', o.admission_number,
      'mobile', o.mobile,
      'whatsapp', o.whatsapp,
      'email', o.email,
      'profession', o.profession,
      'company', o.company,
      'city', o.city,
      'country', o.country,
      'address', o.address,
      'notes', o.notes,
      'status', o.status,
      'submittedAt', o.submitted_at,
      'updatedAt', o.updated_at,
      'source',
        case o.source
          when 'google_form' then 'Google Form'
          else 'Manual'
        end
    ) as member,
    o.full_count as total_count
  from ordered o;
$$;

create or replace function public.directory_filter_options()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'batches',
      coalesce((
        select jsonb_agg(value order by value)
        from (
          select distinct batch as value
          from public.old_boys
          where batch <> ''
        ) x
      ), '[]'::jsonb),
    'professions',
      coalesce((
        select jsonb_agg(value order by value)
        from (
          select distinct profession as value
          from public.old_boys
          where profession <> ''
        ) x
      ), '[]'::jsonb),
    'countries',
      coalesce((
        select jsonb_agg(value order by value)
        from (
          select distinct country as value
          from public.old_boys
          where country <> ''
        ) x
      ), '[]'::jsonb),
    'statuses',
      to_jsonb(enum_range(null::public.member_status))
  );
$$;

create or replace function public.directory_stats()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'verified', count(*) filter (where status = 'verified'),
    'inactive', count(*) filter (where status = 'inactive'),
    'rejected', count(*) filter (where status = 'rejected'),
    'duplicate', count(*) filter (where status = 'duplicate')
  )
  from public.old_boys;
$$;

create or replace function public.export_old_boys(
  p_search text default null,
  p_batch text default null,
  p_profession text default null,
  p_location text default null,
  p_status text default null
)
returns table (member jsonb)
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'id', ob.id,
    'fullName', ob.full_name,
    'batch', ob.batch,
    'admissionNumber', ob.admission_number,
    'mobile', ob.mobile,
    'whatsapp', ob.whatsapp,
    'email', ob.email,
    'profession', ob.profession,
    'company', ob.company,
    'city', ob.city,
    'country', ob.country,
    'address', ob.address,
    'notes', ob.notes,
    'status', ob.status,
    'submittedAt', ob.submitted_at,
    'updatedAt', ob.updated_at,
    'source',
      case ob.source
        when 'google_form' then 'Google Form'
        else 'Manual'
      end
  )
  from public.old_boys ob
  where
    (
      nullif(trim(p_search), '') is null
      or ob.full_name ilike '%' || trim(p_search) || '%'
      or ob.batch ilike '%' || trim(p_search) || '%'
      or ob.admission_number ilike '%' || trim(p_search) || '%'
      or ob.email_normalized ilike '%' || lower(trim(p_search)) || '%'
      or ob.profession ilike '%' || trim(p_search) || '%'
      or (
        public.normalize_phone(p_search) is not null
        and ob.mobile_normalized like '%' || public.normalize_phone(p_search) || '%'
      )
    )
    and (nullif(trim(p_batch), '') is null or ob.batch = trim(p_batch))
    and (
      nullif(trim(p_profession), '') is null
      or ob.profession ilike trim(p_profession)
    )
    and (
      nullif(trim(p_location), '') is null
      or ob.city ilike '%' || trim(p_location) || '%'
      or ob.country ilike '%' || trim(p_location) || '%'
    )
    and (
      nullif(trim(p_status), '') is null
      or ob.status::text = lower(trim(p_status))
    )
  order by ob.full_name
  limit 50000;
$$;

revoke all on function public.search_old_boys(text, text, text, text, text, integer, integer, text, text) from public;
revoke all on function public.directory_filter_options() from public;
revoke all on function public.directory_stats() from public;
revoke all on function public.export_old_boys(text, text, text, text, text) from public;

grant execute on function public.search_old_boys(text, text, text, text, text, integer, integer, text, text) to authenticated;
grant execute on function public.directory_filter_options() to authenticated;
grant execute on function public.directory_stats() to authenticated;
grant execute on function public.export_old_boys(text, text, text, text, text) to authenticated;

grant execute on function public.search_old_boys(text, text, text, text, text, integer, integer, text, text) to service_role;
grant execute on function public.directory_filter_options() to service_role;
grant execute on function public.directory_stats() to service_role;
grant execute on function public.export_old_boys(text, text, text, text, text) to service_role;

commit;
