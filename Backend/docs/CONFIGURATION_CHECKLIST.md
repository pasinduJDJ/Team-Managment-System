# Configuration Checklist

Every item below is intentionally blank in this backend ZIP.

## 1. Supabase project — REQUIRED

Create a Supabase project and obtain:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Supabase project reference used by `supabase link`
- [ ] Database password stored securely outside this ZIP

Fill server-side values in:

```text
supabase/.env.local
```

Create it by copying:

```text
.env.example
```

Never copy `SUPABASE_SERVICE_ROLE_KEY` into Angular.

## 2. Frontend domain — REQUIRED before production

Set `ALLOWED_ORIGINS` as a comma-separated list.

Example only:

```text
ALLOWED_ORIGINS=https://your-final-domain.example,http://localhost:4200
```

Also update Supabase Auth URL Configuration with the final HTTPS domain and password-recovery redirect.

## 3. Initial Super Admin — REQUIRED

- [ ] Decide the Super Admin Gmail address.
- [ ] Create that user in Supabase Authentication.
- [ ] Copy the Auth user UUID.
- [ ] Replace placeholders in `scripts/provision-admin.sql`.
- [ ] Run the SQL once.
- [ ] Keep public sign-up disabled.

Blank placeholders:

```text
PASTE_AUTH_USER_UUID_HERE
PASTE_ADMIN_GMAIL_HERE
```

## 4. Google webhook — REQUIRED for synchronization

Create a long random value for:

```text
GOOGLE_WEBHOOK_SECRET=
```

Use exactly the same value in:

```text
google-apps-script/Code.gs → CONFIG.WEBHOOK_SECRET
```

Never put this value in Angular.

## 5. Google Form / Sheet headings — REQUIRED later

After the Google Form is finalized, copy the exact response headings from row 1 of the linked Sheet.

Fill these Edge Function secrets:

```text
GOOGLE_FIELD_FULL_NAME=
GOOGLE_FIELD_BATCH=
GOOGLE_FIELD_ADMISSION_NUMBER=
GOOGLE_FIELD_MOBILE=
GOOGLE_FIELD_WHATSAPP=
GOOGLE_FIELD_EMAIL=
GOOGLE_FIELD_PROFESSION=
GOOGLE_FIELD_COMPANY=
GOOGLE_FIELD_CITY=
GOOGLE_FIELD_COUNTRY=
GOOGLE_FIELD_LOCATION=
GOOGLE_FIELD_ADDRESS=
GOOGLE_FIELD_NOTES=
GOOGLE_FIELD_CONSENT=
```

Required minimum mappings:

- `GOOGLE_FIELD_FULL_NAME`
- `GOOGLE_FIELD_BATCH`
- `GOOGLE_FIELD_MOBILE`
- `GOOGLE_FIELD_PROFESSION`

At least one location approach is recommended:

- separate City and Country headings, or
- one combined Location heading

## 6. Google Apps Script — REQUIRED later

Open `google-apps-script/Code.gs` and fill:

```javascript
INTAKE_FUNCTION_URL: ''
WEBHOOK_SECRET: ''
RESPONSE_SHEET_NAME: ''
```

Then run `installFormSubmitTrigger()`.

## 7. Angular frontend — REQUIRED when connecting

Fill only the public browser values:

```text
supabaseUrl
supabaseAnonKey
backendFunctionsBaseUrl
```

Switch:

```text
useMockData: false
```

Replace mock auth and browser `localStorage` member service using the connection map in `FRONTEND_CONNECTION_GUIDE.md`.
