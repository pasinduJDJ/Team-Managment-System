import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = [
  '.env.example',
  'supabase/config.toml',
  'supabase/migrations/202607210001_extensions_and_types.sql',
  'supabase/migrations/202607210002_core_schema.sql',
  'supabase/migrations/202607210003_security_and_rls.sql',
  'supabase/migrations/202607210004_directory_rpc.sql',
  'supabase/functions/admin-api/index.ts',
  'supabase/functions/google-form-intake/index.ts',
  'supabase/functions/health/index.ts',
  'google-apps-script/Code.gs',
  'docs/CONFIGURATION_CHECKLIST.md',
];

const failures = [];

for (const relative of required) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) failures.push(`Missing required file: ${relative}`);
  else if (fs.statSync(full).size === 0) failures.push(`Empty required file: ${relative}`);
}

const envText = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
for (const key of [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ALLOWED_ORIGINS',
  'GOOGLE_WEBHOOK_SECRET',
  'GOOGLE_FIELD_FULL_NAME',
  'GOOGLE_FIELD_BATCH',
  'GOOGLE_FIELD_MOBILE',
  'GOOGLE_FIELD_PROFESSION',
]) {
  if (!new RegExp(`^${key}=`, 'm').test(envText)) {
    failures.push(`Missing .env.example placeholder: ${key}`);
  }
}

const forbiddenPatterns = [
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  /service_role\s*[:=]\s*['"][^'"]{20,}/i,
];

const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      const text = fs.readFileSync(full, 'utf8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(text)) failures.push(`Possible hard-coded secret in ${path.relative(root, full)}`);
      }
    }
  }
};
walk(root);

if (failures.length) {
  console.error('Validation failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Backend package validation passed.');
console.log(`Checked ${required.length} required files and secret placeholders.`);
