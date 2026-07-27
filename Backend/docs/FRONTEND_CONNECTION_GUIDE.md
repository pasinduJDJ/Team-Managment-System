# Angular Frontend Connection Guide

This backend matches the frontend `OldBoy` interface and member statuses.

## 1. Install Supabase JavaScript client in Angular

```bash
npm install @supabase/supabase-js
```

## 2. Fill public Angular settings

Use `frontend-integration/environment.example.ts` as the guide.

Required browser-safe values:

- Supabase URL
- Supabase anon/publishable key
- Functions base URL

Do not use the service-role key or webhook secret.

## 3. Replace demo authentication

Replace the frontend mock `AuthService` with Supabase Auth:

- email/password sign-in,
- password recovery to the Super Admin Gmail,
- session restoration,
- sign-out,
- auth state listener.

Keep registration disabled.

## 4. Replace the mock Old Boys service

The frontend currently expects:

- member list
- one profile
- profile update
- status update
- filtered CSV export

Map those operations to:

```text
GET    admin-api/members
GET    admin-api/members/:id
PATCH  admin-api/members/:id
POST   admin-api/members/:id/status
POST   admin-api/exports/csv
```

For direct browser `fetch` calls, send both browser-safe headers:

```text
Authorization: Bearer ACCESS_TOKEN
apikey: SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

The private service-role key is never sent by Angular.

## 5. List query parameters

```text
search
batch
profession
location
status
page
pageSize
sortBy
sortDirection
```

Example route shape:

```text
/functions/v1/admin-api/members?page=1&pageSize=20&status=pending
```

## 6. API response shapes

List:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "pageCount": 0
  }
}
```

Single/update/status:

```json
{
  "data": {
    "id": "...",
    "fullName": "...",
    "status": "pending"
  }
}
```

Errors:

```json
{
  "error": {
    "code": "ADMIN_NOT_ALLOWLISTED",
    "message": "This account is not an active administrator."
  }
}
```

## 7. Keep the current frontend model

The backend converts database snake_case columns into the frontend camelCase model. The current screen components can remain mostly unchanged.

## 8. Recommended connection order

1. Supabase authentication
2. Member list and filters
3. Single profile
4. Edit profile
5. Verify/reject/deactivate actions
6. CSV export
7. Remove demo credentials and mock data
