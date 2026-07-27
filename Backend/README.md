# BMV Old Boys Digital Diary — Supabase Backend

This ZIP contains a backend designed for the Angular frontend previously created for the Old Boys Digital Diary.

## Included

- Versioned PostgreSQL migrations for Supabase
- Old Boys, administrator, sync, audit and export data areas
- Row Level Security policies
- Search, filter, pagination, summary and export database functions
- Authenticated `admin-api` Supabase Edge Function
- Protected `google-form-intake` Edge Function
- Public, non-sensitive `health` Edge Function
- Google Apps Script connector for Google Form / Sheet submissions
- Initial Super Admin provisioning template
- Frontend API contract and connection guide
- Configuration, deployment and security checklists

## Project-specific values are intentionally blank

The following values are **not** filled in:

- Supabase project URL
- Supabase anon/publishable key
- Supabase service-role/secret key
- Supabase project reference
- Production frontend domain
- Super Admin Gmail address
- Super Admin Auth user UUID
- Google webhook secret
- Google Sheet name and Google Form response headings

See `docs/CONFIGURATION_CHECKLIST.md`.

## Backend shape

```text
Angular frontend
    │ authenticated Supabase access token
    ▼
admin-api Edge Function
    ▼
Supabase PostgreSQL + RLS

Google Form → Google Sheet
    │ Apps Script + webhook secret
    ▼
google-form-intake Edge Function
    ▼
Old Boys + Sync Records
```

## Main API endpoints

After deployment:

```text
GET    /functions/v1/health
GET    /functions/v1/admin-api/members
GET    /functions/v1/admin-api/members/:id
PATCH  /functions/v1/admin-api/members/:id
POST   /functions/v1/admin-api/members/:id/status
GET    /functions/v1/admin-api/filters
GET    /functions/v1/admin-api/stats
POST   /functions/v1/admin-api/exports/csv
POST   /functions/v1/google-form-intake
```

`admin-api` requires a signed-in Supabase user who also exists as an active record in `public.admin_users`.

`google-form-intake` does not use a user JWT. It requires the private `x-webhook-secret` header.

## Local validation

The ZIP includes a structural validation script:

```bash
npm run validate
```

For full local Supabase testing, install Docker and use the Supabase CLI:

```bash
npm run supabase:start
npm run db:reset
npm run functions:serve
```

## Production warning

Do not use real personal information until:

- the initial admin is allowlisted,
- RLS migrations are applied,
- private secrets are configured server-side,
- the Angular demo login and localStorage service are replaced,
- HTTPS and approved CORS origins are configured,
- Google Form consent wording is reviewed.
