-- ================================================================
-- REQUIRED MANUAL SETUP
-- ================================================================
-- 1. In Supabase Dashboard → Authentication → Users, create the admin.
-- 2. Copy that user's UUID.
-- 3. Replace BOTH blank placeholders below.
-- 4. Run this statement in the Supabase SQL Editor.
-- ================================================================

insert into public.admin_users (
  auth_user_id,
  email,
  role,
  is_active,
  display_name
)
values (
  'PASTE_AUTH_USER_UUID_HERE'::uuid,
  'PASTE_ADMIN_GMAIL_HERE',
  'super_admin',
  true,
  'Super Admin'
)
on conflict (auth_user_id)
do update set
  email = excluded.email,
  role = 'super_admin',
  is_active = true,
  updated_at = now();
