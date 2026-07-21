# Supabase Frontend Integration Guide

## Current frontend mode

The application is intentionally configured as a self-contained frontend prototype:

- `AuthService` provides demo Super Admin authentication.
- `OldBoysService` loads sample members and persists changes to browser storage.
- All screens and interactions can be reviewed without a backend.

## Recommended connection sequence

### 1. Authentication

Replace the demo login with Supabase email/password authentication. Keep public registration disabled and allow only approved administrator accounts. Connect password recovery to the administrator Gmail address and configure the final domain redirect URL.

### 2. Directory data

Replace `OldBoysService.members()` with server-side paginated Supabase reads. Preserve the current component-facing model so the screen code needs minimal change.

### 3. Search and filters

Move search, batch, profession, location, status, sorting and pagination to Supabase queries for large datasets. The current client-side logic demonstrates the expected behaviour and UI states.

### 4. Profile actions

Connect Edit, Verify, Reject and Deactivate actions to protected database updates. Add audit records for every profile/status change before these controls are used with live data.

### 5. Reports and exports

For a large directory, generate exports through a protected server-side function so the complete filtered result can be exported without exposing unrestricted database access in the browser.

### 6. Google Form synchronization

Google Apps Script should call a protected Supabase Edge Function. The Angular frontend should only read the resulting database records; it should never contain the webhook secret or service-role key.

## Main files to replace or extend

- `src/app/core/services/auth.service.ts`
- `src/app/core/services/old-boys.service.ts`
- `src/environments/environment.ts`
- `src/app/core/guards/auth.guard.ts`

The screen components can remain largely unchanged if the service methods keep the current return shapes.
