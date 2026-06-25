/**
 * Stage 4F.1 — auth smoke with refreshSession check (production-like rehearsal).
 */
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
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

const envPath = process.env.STAGE4F_ENV_FILE || '/opt/scholarshiptop/env/site.stage4e.env';
const baseUrl = (process.env.STAGE4F_BASE_URL || 'http://127.0.0.1:3101').replace(/\/$/, '');
const outFile = process.env.STAGE4F_OUT_FILE || '/opt/scholarshiptop/logs/stage4f1-rehearsal.json';
const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = `shadow-stage4f1+${Date.now()}@invalid.scholarshiptop.test`;
const password = `Stage4F1!${randomBytes(8).toString('hex')}`;

const cookieJar = new Map();
const cookies = {
  get: (n) => cookieJar.get(n),
  set: (n, v) => cookieJar.set(n, v),
  remove: (n) => cookieJar.delete(n),
};

let failed = 0;
let warned = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => {
  console.log(`  FAIL  ${m}`);
  failed += 1;
};
const warn = (m) => {
  console.log(`  WARN  ${m}`);
  warned += 1;
};

console.log('=== Stage 4F.1 auth smoke ===');
const supabase = createServerClient(url, anon, { cookies });

const signUpRes = await supabase.auth.signUp({ email, password });
if (signUpRes.error) fail(`signUp ${signUpRes.error.message}`);
else pass('signUp');

const getUser1 = await supabase.auth.getUser();
if (getUser1.data.user) pass('getUser after signUp');
else fail('getUser after signUp');

const userId = getUser1.data.user?.id;
if (userId) {
  const upsert = await supabase.from('profiles').upsert({ id: userId, country_code: 'US' });
  if (upsert.error) fail(`profiles upsert ${upsert.error.message}`);
  else pass('profiles upsert');
}

cookieJar.size > 0 ? pass(`session cookies count=${cookieJar.size}`) : fail('no session cookies');

const accountRes = await fetch(`${baseUrl}/account`, {
  headers: { Cookie: Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ') },
  redirect: 'manual',
});
if (accountRes.status === 200) pass('account SSR 200 after signUp');
else fail(`account SSR ${accountRes.status}`);

let refreshSessionObserved = false;
let refreshSessionError = null;
const refreshToken = signUpRes.data.session?.refresh_token;
if (refreshToken) {
  const refreshRes = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshRes.error) {
    refreshSessionError = refreshRes.error.message;
    fail(`refreshSession ${refreshSessionError}`);
  } else if (refreshRes.data.session?.access_token) {
    pass('refreshSession ok');
    refreshSessionObserved = true;
  } else {
    fail('refreshSession missing access_token');
  }
} else {
  fail('refreshSession no refresh_token');
}

await supabase.auth.signOut();
pass('signOut');

writeFileSync(
  outFile,
  JSON.stringify({ email, refreshSessionObserved, refreshSessionError, failed, warned }, null, 2)
);
try {
  chmodSync(outFile, 0o600);
} catch {
  /* ignore */
}

console.log('');
if (failed === 0) {
  console.log(warned ? `STAGE_4F1_AUTH_PASS_WITH_WARNINGS (${warned})` : 'STAGE_4F1_AUTH_PASS');
  process.exit(0);
}
console.log(`STAGE_4F1_AUTH_BLOCKED (${failed})`);
process.exit(1);
