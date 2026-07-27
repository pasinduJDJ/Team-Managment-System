import { corsHeaders } from '../_shared/cors.ts';
import { buildCsv } from '../_shared/csv.ts';
import { HttpError, errorResponse, json, optionsResponse, readJson } from '../_shared/http.ts';
import {
  assertStatus,
  mapDatabaseMember,
  normalizeEmail,
  normalizePhone,
  patchToDatabase,
} from '../_shared/mapping.ts';
import {
  authenticateAdmin,
  requireSuperAdmin,
  type AdminContext,
} from '../_shared/supabase.ts';
import type { FrontendOldBoy } from '../_shared/types.ts';

type Filters = {
  search?: string;
  batch?: string;
  profession?: string;
  location?: string;
  status?: string;
};

function routeSegments(url: URL): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const index = parts.lastIndexOf('admin-api');
  return index >= 0 ? parts.slice(index + 1) : parts;
}

function queryFilters(url: URL): Filters {
  return {
    search: url.searchParams.get('search') || '',
    batch: url.searchParams.get('batch') || '',
    profession: url.searchParams.get('profession') || '',
    location: url.searchParams.get('location') || '',
    status: url.searchParams.get('status') || '',
  };
}

function rpcFilters(filters: Filters): Record<string, unknown> {
  return {
    p_search: filters.search || null,
    p_batch: filters.batch || null,
    p_profession: filters.profession || null,
    p_location: filters.location || null,
    p_status: filters.status || null,
  };
}

async function listMembers(request: Request, url: URL, context: AdminContext): Promise<Response> {
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 20)));
  const sortBy = url.searchParams.get('sortBy') || 'submittedAt';
  const sortDirection = url.searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc';

  const { data, error } = await context.client.rpc('search_old_boys', {
    ...rpcFilters(queryFilters(url)),
    p_page: page,
    p_page_size: pageSize,
    p_sort_by: sortBy,
    p_sort_direction: sortDirection,
  });

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Members could not be loaded.', 'MEMBER_LIST_FAILED');
  }

  const rows = (data || []) as Array<{ member: FrontendOldBoy; total_count: number | string }>;
  const total = rows.length ? Number(rows[0].total_count) : 0;

  return json(request, {
    data: rows.map(row => row.member),
    pagination: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  });
}

async function getMember(request: Request, id: string, context: AdminContext): Promise<Response> {
  const { data, error } = await context.client
    .from('old_boys')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Member could not be loaded.', 'MEMBER_READ_FAILED');
  }
  if (!data) throw new HttpError(404, 'Member was not found.', 'MEMBER_NOT_FOUND');

  return json(request, { data: mapDatabaseMember(data) });
}

async function duplicateWarnings(
  context: AdminContext,
  memberId: string,
  patch: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const warnings: Array<Record<string, unknown>> = [];

  if (patch.mobile) {
    const normalized = normalizePhone(patch.mobile);
    if (normalized) {
      const { data } = await context.client
        .from('old_boys')
        .select('id,full_name,batch,mobile')
        .eq('mobile_normalized', normalized)
        .neq('id', memberId)
        .limit(10);
      for (const row of data || []) warnings.push({ reason: 'mobile', ...row });
    }
  }

  if (patch.email) {
    const normalized = normalizeEmail(patch.email);
    if (normalized) {
      const { data } = await context.client
        .from('old_boys')
        .select('id,full_name,batch,email')
        .eq('email_normalized', normalized)
        .neq('id', memberId)
        .limit(10);
      for (const row of data || []) warnings.push({ reason: 'email', ...row });
    }
  }

  return warnings;
}

async function updateMember(request: Request, id: string, context: AdminContext): Promise<Response> {
  requireSuperAdmin(context);
  const body = await readJson<Record<string, unknown>>(request);
  const patch = patchToDatabase(body);

  const { data: before, error: beforeError } = await context.client
    .from('old_boys')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (beforeError) throw new HttpError(500, 'Member could not be loaded.', 'MEMBER_READ_FAILED');
  if (!before) throw new HttpError(404, 'Member was not found.', 'MEMBER_NOT_FOUND');

  const warnings = await duplicateWarnings(context, id, patch);

  const { data: updated, error: updateError } = await context.client
    .from('old_boys')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    console.error(updateError);
    throw new HttpError(500, 'Member could not be updated.', 'MEMBER_UPDATE_FAILED');
  }

  await context.client.from('audit_records').insert({
    member_id: id,
    admin_user_id: context.user.id,
    action: 'profile_updated',
    changed_fields: Object.keys(patch),
    old_values: before,
    new_values: updated,
    request_id: crypto.randomUUID(),
  });

  return json(request, {
    data: mapDatabaseMember(updated),
    duplicateWarnings: warnings,
  });
}

async function changeStatus(request: Request, id: string, context: AdminContext): Promise<Response> {
  requireSuperAdmin(context);
  const body = await readJson<{ status?: unknown; note?: unknown }>(request);
  const status = assertStatus(body.status);

  const { data: before, error: beforeError } = await context.client
    .from('old_boys')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (beforeError) throw new HttpError(500, 'Member could not be loaded.', 'MEMBER_READ_FAILED');
  if (!before) throw new HttpError(404, 'Member was not found.', 'MEMBER_NOT_FOUND');

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    reviewed_at: now,
    reviewed_by: context.user.id,
  };

  if (status === 'inactive') {
    patch.deactivated_at = now;
    patch.deactivated_by = context.user.id;
  } else {
    patch.deactivated_at = null;
    patch.deactivated_by = null;
  }

  const { data: updated, error: updateError } = await context.client
    .from('old_boys')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    console.error(updateError);
    throw new HttpError(500, 'Member status could not be updated.', 'STATUS_UPDATE_FAILED');
  }

  await context.client.from('audit_records').insert({
    member_id: id,
    admin_user_id: context.user.id,
    action: `status_changed_to_${status}`,
    changed_fields: ['status', 'reviewed_at', 'reviewed_by'],
    old_values: { status: before.status },
    new_values: { status },
    note: typeof body.note === 'string' ? body.note.trim() : null,
    request_id: crypto.randomUUID(),
  });

  return json(request, { data: mapDatabaseMember(updated) });
}

async function filters(request: Request, context: AdminContext): Promise<Response> {
  const { data, error } = await context.client.rpc('directory_filter_options');
  if (error) throw new HttpError(500, 'Filter options could not be loaded.', 'FILTERS_FAILED');
  return json(request, { data });
}

async function stats(request: Request, context: AdminContext): Promise<Response> {
  const { data, error } = await context.client.rpc('directory_stats');
  if (error) throw new HttpError(500, 'Directory statistics could not be loaded.', 'STATS_FAILED');
  return json(request, { data });
}

async function exportCsv(request: Request, context: AdminContext): Promise<Response> {
  requireSuperAdmin(context);
  const body = await readJson<{
    filters?: Filters;
    selectedFields?: string[];
  }>(request);

  const { data, error } = await context.client.rpc('export_old_boys', {
    ...rpcFilters(body.filters || {}),
  });

  if (error) {
    console.error(error);
    throw new HttpError(500, 'Export data could not be loaded.', 'EXPORT_QUERY_FAILED');
  }

  const members = ((data || []) as Array<{ member: FrontendOldBoy }>).map(row => row.member);
  const output = buildCsv(members, body.selectedFields);
  const fileName = `old-boys-${new Date().toISOString().slice(0, 10)}.csv`;

  await context.client.from('export_records').insert({
    admin_user_id: context.user.id,
    format: 'csv',
    filters: body.filters || {},
    selected_fields: output.fields,
    row_count: members.length,
    file_name: fileName,
  });

  return new Response(output.csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'Access-Control-Expose-Headers': 'Content-Disposition',
      ...corsHeaders(request),
    },
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return optionsResponse(request);

  try {
    const context = await authenticateAdmin(request);
    const url = new URL(request.url);
    const segments = routeSegments(url);

    if (request.method === 'GET' && segments.length === 1 && segments[0] === 'members') {
      return await listMembers(request, url, context);
    }

    if (request.method === 'GET' && segments.length === 2 && segments[0] === 'members') {
      return await getMember(request, segments[1], context);
    }

    if (request.method === 'PATCH' && segments.length === 2 && segments[0] === 'members') {
      return await updateMember(request, segments[1], context);
    }

    if (
      request.method === 'POST'
      && segments.length === 3
      && segments[0] === 'members'
      && segments[2] === 'status'
    ) {
      return await changeStatus(request, segments[1], context);
    }

    if (request.method === 'GET' && segments.length === 1 && segments[0] === 'filters') {
      return await filters(request, context);
    }

    if (request.method === 'GET' && segments.length === 1 && segments[0] === 'stats') {
      return await stats(request, context);
    }

    if (
      request.method === 'POST'
      && segments.length === 2
      && segments[0] === 'exports'
      && segments[1] === 'csv'
    ) {
      return await exportCsv(request, context);
    }

    throw new HttpError(404, 'API route was not found.', 'ROUTE_NOT_FOUND');
  } catch (error) {
    return errorResponse(request, error);
  }
});
