import { optionalEnv } from '../_shared/config.ts';
import { json, optionsResponse } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return optionsResponse(request);
  if (request.method !== 'GET') {
    return json(request, {
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET for health.' },
    }, 405);
  }

  const required = {
    SUPABASE_URL: Boolean(optionalEnv('SUPABASE_URL')),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(optionalEnv('SUPABASE_SERVICE_ROLE_KEY')),
    GOOGLE_WEBHOOK_SECRET: Boolean(optionalEnv('GOOGLE_WEBHOOK_SECRET')),
    ALLOWED_ORIGINS: Boolean(optionalEnv('ALLOWED_ORIGINS')),
    GOOGLE_FIELD_FULL_NAME: Boolean(optionalEnv('GOOGLE_FIELD_FULL_NAME')),
    GOOGLE_FIELD_BATCH: Boolean(optionalEnv('GOOGLE_FIELD_BATCH')),
    GOOGLE_FIELD_MOBILE: Boolean(optionalEnv('GOOGLE_FIELD_MOBILE')),
    GOOGLE_FIELD_PROFESSION: Boolean(optionalEnv('GOOGLE_FIELD_PROFESSION')),
  };

  const missing = Object.entries(required)
    .filter(([, configured]) => !configured)
    .map(([name]) => name);

  let database = 'not_checked';
  if (required.SUPABASE_URL && required.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { error } = await adminClient()
        .from('old_boys')
        .select('id', { count: 'exact', head: true });
      database = error ? 'unavailable' : 'available';
    } catch {
      database = 'unavailable';
    }
  }

  const healthy = missing.length === 0 && database === 'available';

  return json(request, {
    service: 'bmv-old-boys-digital-diary-backend',
    status: healthy ? 'ready' : 'configuration_required',
    database,
    missingConfiguration: missing,
    time: new Date().toISOString(),
  }, healthy ? 200 : 503);
});
