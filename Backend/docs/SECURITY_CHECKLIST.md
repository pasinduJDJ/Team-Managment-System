# Security Checklist

## Before real data

- [ ] Public sign-up is disabled.
- [ ] Super Admin exists in both Supabase Auth and `admin_users`.
- [ ] RLS migrations are applied.
- [ ] Angular uses only the anon/publishable key.
- [ ] Service-role key is stored only as a Supabase Edge Function secret.
- [ ] Google webhook secret is stored only in Supabase and Apps Script.
- [ ] Production CORS contains only approved HTTPS domains.
- [ ] Password recovery redirect uses the final HTTPS domain.
- [ ] Demo login credentials are removed from Angular.
- [ ] Mock member data and browser localStorage mode are disabled.
- [ ] Google Form consent wording is present.
- [ ] Only necessary personal information is collected.
- [ ] CSV access is limited to Super Admin.
- [ ] Admin actions produce audit records.
- [ ] Backups and ownership are documented.

## Data handling

- Avoid permanent deletion during routine use; use inactive status.
- Treat CSV files as sensitive personal data.
- Remove downloaded exports from shared computers.
- Review inactive administrator accounts.
- Rotate the webhook secret if Apps Script access is compromised.
- Rotate Supabase secret/service-role credentials if exposed.

## Future hardening

- Add rate limiting or an API gateway rule for the intake webhook.
- Add a second trusted administrator only when operationally required.
- Add scoped batch-admin policies only after the role is approved.
- Add monitoring for repeated webhook failures and unusual exports.
