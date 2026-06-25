/**
 * Stage 5C.1 — auth smoke against cutover-preview API (VPS DB only, test user cleanup).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    let v = t.slice(i + 1).trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i)] = v;
  }
  return env;
}

const envPath = process.env.STAGE5C1_ENV_FILE || '/opt/scholarshiptop/env/site.cutover-preview.env';
const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const email = `shadow-stage5c1+${Date.now()}@invalid.scholarshiptop.test`;
const password = `Stage5C1!${randomBytes(8).toString('hex')}`;

let failed = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => {
  console.log(`  FAIL  ${m}`);
  failed += 1;
};

console.log('=== Stage 5C.1 auth smoke ===');
const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

const signUpRes = await supabase.auth.signUp({ email, password });
if (signUpRes.error) fail(`signUp ${signUpRes.error.message}`);
else pass('signUp');

const signInRes = await supabase.auth.signInWithPassword({ email, password });
if (signInRes.error) fail(`signInWithPassword ${signInRes.error.message}`);
else pass('signInWithPassword');

const getUserRes = await supabase.auth.getUser();
if (getUserRes.data.user?.id) pass('getUser');
else fail('getUser');

const userId = getUserRes.data.user?.id;
if (userId) {
  const upsert = await supabase.from('profiles').upsert({ id: userId, country_code: 'US' });
  if (upsert.error) fail(`profiles upsert ${upsert.error.message}`);
  else pass('profiles upsert');
}

const refreshToken = signInRes.data.session?.refresh_token;
if (refreshToken) {
  const refreshRes = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshRes.error) fail(`refreshSession ${refreshRes.error.message}`);
  else if (refreshRes.data.session?.access_token) pass('refreshSession');
  else fail('refreshSession no access_token');
} else {
  fail('no refresh_token');
}

await supabase.auth.signOut();
pass('signOut');

if (service && userId) {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const del = await admin.auth.admin.deleteUser(userId);
  if (del.error) fail(`cleanup deleteUser ${del.error.message}`);
  else pass('cleanup test user');
} else {
  fail('cleanup skipped');
}

console.log('');
if (failed === 0) {
  console.log('STAGE_5C1_AUTH_PASS');
  process.exit(0);
}
console.log(`STAGE_5C1_AUTH_BLOCKED (${failed})`);
process.exit(1);
