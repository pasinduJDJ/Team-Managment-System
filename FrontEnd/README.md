# Thurstan College Old Boys Digital Diary — Angular Frontend

A responsive Angular frontend for managing School Old Boys contact records. The project follows the Lean MVP plan and is ready to connect to Supabase after the frontend is reviewed.

## Included screens

- Super Admin login and password-recovery preview
- Protected application shell with responsive sidebar
- All Old Boys directory with search, filters, sorting and pagination
- Single Old Boy profile with Call, Copy Number, WhatsApp and email actions
- Edit Profile screen using browser demo storage
- Pending Approvals screen with Verify and Reject actions
- Reports and Exports screen with filters, summaries and CSV export
- Mobile layouts for the directory, profile and administration screens
- Spaceship/cPanel Angular route fallback through `public/.htaccess`

## Demo credentials

- **Email:** `admin@thurstancollege.lk`
- **Password:** `Thurstan@123`

The current project runs with mock data and stores edits/status changes in the browser `localStorage`. This is intentional so the complete frontend can be tested before Supabase tasks are connected.

## Technology

- Angular 21 standalone components
- Angular Router and route guards
- Reactive Forms and template-driven filters
- SCSS responsive design
- No UI framework dependency

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Production build

```bash
npm run build
```

The deployable frontend is created under:

```text
dist/old-boys-digital-diary-frontend/browser/
```

## Connect Supabase later

1. Replace the mock authentication logic in `src/app/core/services/auth.service.ts` with Supabase Auth.
2. Replace `OldBoysService` browser storage with Supabase queries/RPC calls.
3. Set the project URL and anon key in `src/environments/environment.ts`.
4. Keep the Supabase service-role key and Google Sheet webhook secret out of the Angular project.
5. Apply Row Level Security and allowlisted admin checks in Supabase before disabling mock mode.

See `docs/SUPABASE_INTEGRATION_GUIDE.md` for the frontend integration map.

## Spaceship/cPanel deployment

1. Run `npm run build`.
2. Upload everything inside `dist/old-boys-digital-diary-frontend/browser/` to the selected domain document root.
3. Confirm `.htaccess` was uploaded; hidden files may need to be enabled in File Manager.
4. Set Angular/Supabase authentication redirect URLs to the final HTTPS domain.
5. Test direct refreshes on `/members`, `/approvals`, and `/reports`.

## Important production note

This package is the **frontend implementation**. Mock login and local data are not production security. Supabase authentication, database policies, server-side Google Sheet synchronization, audit logging and secure exports must be completed before real personal data is used.
