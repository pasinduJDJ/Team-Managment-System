# Google Form and Google Sheet Setup

## Recommended Form fields

Required:

- Full name
- Batch number/year
- Primary mobile number
- Profession
- Current city or country
- Consent / accuracy confirmation

Optional:

- Admission number
- WhatsApp number
- Email
- Company/workplace
- Postal address
- Additional notes

Profile photo is intentionally excluded from this MVP.

## Connect the Form to a Sheet

1. Open the Google Form.
2. Go to Responses.
3. Link it to a Google Sheet.
4. Confirm the response tab name.
5. Do not rename Form response headings after mapping them to Supabase secrets without updating the secrets.

## Add Apps Script

1. Open the linked Sheet.
2. Extensions → Apps Script.
3. Copy `google-apps-script/Code.gs`.
4. Copy `google-apps-script/appsscript.json` if using the manifest editor.
5. Fill the three blank `CONFIG` values.
6. Save.
7. Run `installFormSubmitTrigger()`.
8. Approve the requested Google permissions.

## Configure exact heading mappings

Copy each exact Sheet heading to the matching Supabase secret in `.env.local`.

Example concept only:

```text
GOOGLE_FIELD_FULL_NAME=Full Name
GOOGLE_FIELD_BATCH=School Batch / Year
```

The actual values remain blank in this ZIP because your final Form has not been created.

## Test

1. Submit one test Form response.
2. Confirm these Sheet columns appear:
   - Diary Sync Status
   - Diary Sync Message
   - Diary Member ID
   - Diary Synced At
3. Confirm the status becomes `SYNCED` or `DUPLICATE`.
4. Confirm one record appears in `old_boys`.
5. Confirm one record appears in `sync_records`.
6. Submit the same row again through retry; it should be treated as an idempotent replay, not a second member.

## Retry failures

Run:

```text
retryFailedRows()
```

Rows marked `FAILED` or `RETRY` are resent. The submission key prevents the same Sheet row from being inserted repeatedly.

## Important operational rule

After synchronization, Supabase is the operational source of truth. Correct profiles in the web application rather than editing the original Form response row.
