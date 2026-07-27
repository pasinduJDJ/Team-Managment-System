# Backend API Reference

Base:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1
```

## Authentication

### Admin routes

Browser headers:

```text
Authorization: Bearer SUPABASE_ACCESS_TOKEN
apikey: SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

The user must also be active in `public.admin_users`.

### Google intake route

Header:

```text
x-webhook-secret: YOUR_PRIVATE_SECRET
```

## Health

### `GET /health`

Returns readiness without returning secret values.

## Members

### `GET /admin-api/members`

Query parameters:

- `search`
- `batch`
- `profession`
- `location`
- `status`
- `page`
- `pageSize`
- `sortBy`
- `sortDirection`

### `GET /admin-api/members/:id`

Returns one frontend-shaped member.

### `PATCH /admin-api/members/:id`

Editable fields:

- `fullName`
- `batch`
- `admissionNumber`
- `mobile`
- `whatsapp`
- `email`
- `profession`
- `company`
- `city`
- `country`
- `address`
- `notes`

The response can contain `duplicateWarnings` when the new exact mobile or email matches another member.

### `POST /admin-api/members/:id/status`

Body:

```json
{
  "status": "verified",
  "note": "Optional admin note"
}
```

Allowed statuses:

- `pending`
- `verified`
- `inactive`
- `rejected`
- `duplicate`

## Filters and summaries

### `GET /admin-api/filters`

Returns batch, profession, country and status options.

### `GET /admin-api/stats`

Returns status totals.

## Export

### `POST /admin-api/exports/csv`

Body:

```json
{
  "filters": {
    "search": "",
    "batch": "",
    "profession": "",
    "location": "",
    "status": ""
  },
  "selectedFields": [
    "fullName",
    "batch",
    "mobile",
    "profession"
  ]
}
```

Returns a downloadable UTF-8 CSV. Phone numbers are protected from spreadsheet leading-zero loss.

## Google Form intake

### `POST /google-form-intake`

The supplied Apps Script sends:

```json
{
  "submissionId": "SPREADSHEET:SHEET:ROW",
  "submittedAt": "ISO_DATE",
  "sheetId": "...",
  "sheetName": "Form Responses 1",
  "rowNumber": 2,
  "values": {
    "Exact Sheet Header": "Response"
  }
}
```

The backend maps the exact headings using blank `GOOGLE_FIELD_*` environment variables that you configure later.
