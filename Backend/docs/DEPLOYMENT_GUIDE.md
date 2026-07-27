# Supabase Deployment Guide

## Prerequisites

- Supabase account and project
- Node.js 20 or newer
- Supabase CLI
- Docker only if local Supabase testing is required
- Angular production domain decided before authentication launch

## 1. Prepare private environment file

Copy:

```bash
cp .env.example supabase/.env.local
```

Fill the blank values. Do not commit this file.

## 2. Log in and link the project

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` remains blank until the project is created.

## 3. Apply migrations

```bash
npx supabase db push
```

The migrations create:

- `admin_users`
- `old_boys`
- `sync_records`
- `audit_records`
- `export_records`
- RLS policies
- directory search/filter/export functions

## 4. Create and allowlist the Super Admin

Create the user from Supabase Authentication.

Edit and run:

```text
scripts/provision-admin.sql
```

## 5. Set Edge Function secrets

```bash
npx supabase secrets set --env-file supabase/.env.local
```

Review the list without exposing values:

```bash
npx supabase secrets list
```

## 6. Deploy Edge Functions

```bash
npm run functions:deploy
```

Or deploy one at a time:

```bash
npx supabase functions deploy health
npx supabase functions deploy admin-api
npx supabase functions deploy google-form-intake
```

Function JWT behaviour is already declared in `supabase/config.toml`.

## 7. Check health

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/health
```

Before all blank settings are filled, the endpoint intentionally returns `configuration_required`.

## 8. Connect Google Sheet

Follow `GOOGLE_FORM_SETUP.md`.

## 9. Connect Angular

Follow `FRONTEND_CONNECTION_GUIDE.md`.

## 10. Production checks

- CORS contains only approved domains.
- Supabase Auth redirects use HTTPS.
- Public sign-up remains disabled.
- Service-role key exists only in Supabase secrets.
- Google webhook secret exists only in Supabase and Apps Script.
- Test data is removed before importing real records.
