# Build Validation

The backend package was checked before ZIP creation.

## Passed checks

- Required-file and blank-secret placeholder validation
- TypeScript syntax bundling for every Edge Function and shared module
- Strict TypeScript type-check using Supabase JavaScript client types
- Google Apps Script JavaScript syntax check
- PostgreSQL parser check for all migrations
- PostgreSQL parser check for the Super Admin provisioning script
- ZIP extraction and file-integrity check

## Not executed

A complete local Supabase runtime was not started because this build environment did not provide Docker, a Supabase project, or your private project credentials.

After configuring the blank values, run:

```bash
npm run supabase:start
npm run db:reset
npm run functions:serve
```

Then complete the acceptance tests in the deployment and Google Form guides.
