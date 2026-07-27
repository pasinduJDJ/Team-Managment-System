import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';
import { requireEnv } from './config.ts';
import { HttpError } from './http.ts';
import type { AdminRecord } from './types.ts';

export function adminClient(): SupabaseClient {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

export type AdminContext = {
  user: User;
  admin: AdminRecord;
  client: SupabaseClient;
};

export async function authenticateAdmin(request: Request): Promise<AdminContext> {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new HttpError(401, 'A Supabase access token is required.', 'AUTH_REQUIRED');
  }

  const client = adminClient();
  const { data: userData, error: userError } = await client.auth.getUser(match[1]);

  if (userError || !userData.user) {
    throw new HttpError(401, 'The Supabase access token is invalid or expired.', 'INVALID_TOKEN');
  }

  const { data: admin, error: adminError } = await client
    .from('admin_users')
    .select('auth_user_id,email,role,batch_scope,is_active,display_name')
    .eq('auth_user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminError) {
    console.error(adminError);
    throw new HttpError(500, 'Administrator access could not be checked.', 'ADMIN_CHECK_FAILED');
  }

  if (!admin) {
    throw new HttpError(403, 'This account is not an active administrator.', 'ADMIN_NOT_ALLOWLISTED');
  }

  return {
    user: userData.user,
    admin: admin as AdminRecord,
    client,
  };
}

export function requireSuperAdmin(context: AdminContext): void {
  if (context.admin.role !== 'super_admin') {
    throw new HttpError(403, 'This action requires Super Admin access.', 'SUPER_ADMIN_REQUIRED');
  }
}
