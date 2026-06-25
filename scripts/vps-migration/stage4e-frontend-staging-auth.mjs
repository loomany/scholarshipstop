/**
 * Stage 4E — frontend staging auth smoke via @supabase/ssr (Next server/middleware path).
 * Uses /opt/scholarshiptop/env/site.stage4e.env (NOT production site.env).
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

const envPath = process.env.STAGE4E_ENV_FILE || '/opt/scholarshiptop/env/site.stage4e.env';
const baseUrl = (process.env.STAGE4E_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const outFile = process.env.STAGE4E_OUT_FILE || '/opt/scholarshiptop/logs/stage4e-frontend-smoke.json';
const env = loadEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = `shadow-stage4e+${Date.now()}@invalid.scholarshiptop.test`;
const password = `Stage4E!${randomBytes(8).toString('hex')}`;

if (!url || !anon) {
  console.error('STAGE_4E_AUTH_FAIL missing staging supabase env');
  process.exit(1);
}

const cookieJar = new Map();
const cookies = {
  get(name) {
    return cookieJar.get(name);
  },
  set(name, value) {
    cookieJar.set(name, value);
  },
  remove(name) {
    cookieJar.delete(name);
  },
};

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ');
}

async function fetchAccountStatus() {
  const res = await fetch(`${baseUrl}/account`, {
    headers: { Cookie: cookieHeader() },
    redirect: 'manual',
  });
  const location = res.headers.get('location') || '';
  return { status: res.status, location };
}

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

const authChecks = [];
let refreshSessionObserved = false;
let sessionCookiePresent = false;

console.log('=== Stage 4E frontend staging auth (@supabase/ssr) ===');
console.log(`  staging_site=${baseUrl}`);
console.log(`  supabase_api=${url}`);

const supabase = createServerClient(url, anon, { cookies });

const signUpRes = await supabase.auth.signUp({ email, password });
if (signUpRes.error) fail(`signUp ${signUpRes.error.message}`);
else if (!signUpRes.data.user?.id) fail('signUp missing user id');
else {
  pass(`signUp user_id=${signUpRes.data.user.id}`);
  authChecks.push({ flow: 'signup', ok: true });
}

const getUser1 = await supabase.auth.getUser();
if (getUser1.error) fail(`getUser after signUp ${getUser1.error.message}`);
else if (!getUser1.data.user) fail('getUser empty after signUp');
else pass('getUser after signUp');

const userId = getUser1.data.user?.id;
if (userId) {
  const upsertRes = await supabase.from('profiles').upsert({ id: userId, country_code: 'US' });
  if (upsertRes.error) fail(`profiles upsert ${upsertRes.error.message}`);
  else pass('profiles upsert via frontend SSR client');
}

sessionCookiePresent = cookieJar.size > 0;
if (sessionCookiePresent) pass(`session cookies set count=${cookieJar.size}`);
else fail('no session cookies after signUp');

const account1 = await fetchAccountStatus();
if (account1.status === 200) {
  pass('middleware/account SSR accessible after signUp');
  authChecks.push({ flow: 'account_after_signup', ok: true, status: account1.status });
} else if (account1.status >= 300 && account1.status < 400 && account1.location.includes('/signin')) {
  fail(`account redirected to signin (${account1.status})`);
} else {
  fail(`account unexpected status ${account1.status}`);
}

const refreshToken = signUpRes.data.session?.refresh_token;
if (refreshToken) {
  const refreshRes = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshRes.error) warn(`refreshSession skipped (${refreshRes.error.message})`);
  else if (!refreshRes.data.session?.access_token) warn('refreshSession missing access_token');
  else {
    pass('refreshSession ok');
    refreshSessionObserved = true;
  }
} else {
  warn('refreshSession skipped (no refresh_token)');
}

const signOutRes = await supabase.auth.signOut();
if (signOutRes.error) fail(`signOut ${signOutRes.error.message}`);
else pass('signOut ok');

const accountAfterSignOut = await fetchAccountStatus();
if (accountAfterSignOut.status >= 300 && accountAfterSignOut.location.includes('/signin')) {
  pass('account redirects to signin after signOut');
} else {
  warn(`account after signOut status=${accountAfterSignOut.status}`);
}

const signInRes = await supabase.auth.signInWithPassword({ email, password });
if (signInRes.error) fail(`signInWithPassword ${signInRes.error.message}`);
else pass('signInWithPassword ok');

const getUser2 = await supabase.auth.getUser();
if (getUser2.error || !getUser2.data.user) fail('getUser after signIn');
else pass('getUser after signIn');

const account2 = await fetchAccountStatus();
if (account2.status === 200) {
  pass('middleware/account SSR accessible after signIn');
  authChecks.push({ flow: 'account_after_signin', ok: true, status: account2.status });
} else {
  fail(`account after signIn status ${account2.status}`);
}

await supabase.auth.signOut();

const result = {
  verdict:
    failed === 0
      ? warned === 0
        ? 'STAGE_4E_FRONTEND_STAGING_PASS'
        : 'STAGE_4E_FRONTEND_STAGING_PASS_WITH_WARNINGS'
      : 'STAGE_4E_FRONTEND_STAGING_BLOCKED',
  email,
  userId: userId || null,
  authChecks,
  refreshSessionObserved,
  sessionCookiePresent,
  failed,
  warned,
};

writeFileSync(outFile, JSON.stringify(result, null, 2));
try {
  chmodSync(outFile, 0o600);
} catch {
  /* ignore */
}

console.log('');
if (failed === 0 && warned === 0) {
  console.log('STAGE_4E_FRONTEND_STAGING_AUTH_PASS');
  process.exit(0);
}
if (failed === 0) {
  console.log(`STAGE_4E_FRONTEND_STAGING_AUTH_PASS_WITH_WARNINGS (${warned})`);
  process.exit(0);
}
console.log(`STAGE_4E_FRONTEND_STAGING_AUTH_BLOCKED (${failed} failures, ${warned} warnings)`);
process.exit(1);
