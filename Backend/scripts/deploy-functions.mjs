import { execFileSync } from 'node:child_process';

const functions = ['admin-api', 'google-form-intake', 'health'];

for (const functionName of functions) {
  console.log(`Deploying ${functionName}...`);
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'functions', 'deploy', functionName],
    { stdio: 'inherit' },
  );
}
