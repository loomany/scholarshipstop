/**
 * Stage 4D — Auth flow shadow smoke (self-host stack, NOT production frontend env).
 *
 * Uses internal shadow gateway by default (127.0.0.1:54321) so Bearer session tokens
 * are not blocked by nginx basic auth on the public shadow path.
 *
 * Env (VPS): /opt/scholarshiptop/env/shadow-api.env for anon/service keys.
 * Optional: SHADOW_AUTH_BASE_URL (default http://127.0.0.1:54321)
 *
 * Does NOT print passwords, tokens, or JWT secrets.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function loadShadowEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1).trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const shadowEnvPath = process.env.SHADOW_ENV_FILE || '/opt/scholarshiptop/env/shadow-api.env';
loadShadowEnv(shadowEnvPath);

const authBase = (process.env.SHADOW_AUTH_BASE_URL || 'http://127.0.0.1:54321').replace(/\/$/, '');
const anonKey = process.env.SHADOW_SUPABASE_ANON_KEY;
const serviceKey = process.env.SHADOW_SUPABASE_SERVICE_ROLE_KEY;
const stateFile = process.env.STAGE4D_STATE_FILE || '/tmp/stage4d-shadow-auth-state.json';

if (!anonKey || !serviceKey) {
  console.error('STAGE_4D_AUTH_FLOW_FAIL missing shadow anon/service keys');
  process.exit(1);
}

const ts = Date.now();
const testEmail = `shadow-stage4d+${ts}@invalid.scholarshiptop.test`;
const testPassword = randomBytes(24).toString('base64url');

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

const anonClient = createClient(`${authBase}/`, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const anonProbeClient = createClient(`${authBase}/`, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const serviceClient = createClient(`${authBase}/`, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

console.log('=== Stage 4D auth flow shadow smoke ===');
console.log(`  auth_base=${authBase}`);
console.log(`  test_email_domain=invalid.scholarshiptop.test`);

// --- settings inventory (no secrets) ---
const settingsRes = await fetch(`${authBase}/auth/v1/settings`);
if (!settingsRes.ok) {
  fail(`auth settings ${settingsRes.status}`);
} else {
  const settings = await settingsRes.json();
  pass(`auth settings ${settingsRes.status}`);
  const autoconfirm = settings?.mailer_autoconfirm === true || settings?.MAILER_AUTOCONFIRM === true;
  if (autoconfirm) pass('mailer_autoconfirm enabled');
  else warn('mailer_autoconfirm not enabled — password signup may need email confirm');
  const googleEnabled =
    settings?.external?.google === true ||
    settings?.EXTERNAL_GOOGLE_ENABLED === true ||
    settings?.external_google_enabled === true;
  if (googleEnabled) warn('Google OAuth enabled on shadow stack');
  else pass('Google OAuth disabled (inventory only for Stage 4D)');
}

// --- signUp ---
const { data: signUpData, error: signUpErr } = await anonClient.auth.signUp({
  email: testEmail,
  password: testPassword,
  options: { data: { full_name: 'Stage 4D Shadow Test' } },
});
if (signUpErr) fail(`signUp ${signUpErr.message}`);
else if (!signUpData.user?.id) fail('signUp missing user id');
else pass(`signUp user_id=${signUpData.user.id}`);

const testUserId = signUpData.user?.id;
if (!testUserId) {
  console.log('STAGE_4D_AUTH_FLOW_BLOCKED signUp failed');
  process.exit(1);
}

writeFileSync(stateFile, JSON.stringify({ userId: testUserId, email: testEmail }, null, 0));
try {
  chmodSync(stateFile, 0o600);
} catch {
  /* ignore on Windows dev */
}

// --- signInWithPassword ---
const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
});
if (signInErr) fail(`signInWithPassword ${signInErr.message}`);
else if (!signInData.session?.access_token) fail('signIn missing access_token');
else pass('signInWithPassword session issued');

const accessToken = signInData.session?.access_token;
const refreshToken = signInData.session?.refresh_token;

// --- auth.getUser with access token ---
const sessionClient = createClient(`${authBase}/`, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
if (!accessToken || !refreshToken) {
  fail('signIn missing tokens for session client');
} else {
  const { error: setSessionErr } = await sessionClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (setSessionErr) fail(`setSession ${setSessionErr.message}`);
}

const { data: userData, error: getUserErr } = await sessionClient.auth.getUser();
if (getUserErr) fail(`getUser ${getUserErr.message}`);
else if (userData.user?.id !== testUserId) fail('getUser id mismatch');
else pass('getUser matches test user');

// --- profiles: create/link id = auth.users.id ---
const { error: profileUpsertErr } = await sessionClient.from('profiles').upsert({
  id: testUserId,
  country_code: 'US',
});
if (profileUpsertErr) fail(`profiles upsert ${profileUpsertErr.message}`);
else pass('profiles upsert own row');

const { data: ownProfile, error: ownProfileErr } = await sessionClient
  .from('profiles')
  .select('id,country_code')
  .eq('id', testUserId)
  .maybeSingle();
if (ownProfileErr) fail(`profiles select own ${ownProfileErr.message}`);
else if (ownProfile?.id !== testUserId) fail('profiles own row not readable');
else pass('profiles id matches auth user');

// --- RLS: anon cannot read test profile ---
const { data: anonProfile, error: anonProfileErr } = await anonProbeClient
  .from('profiles')
  .select('id')
  .eq('id', testUserId)
  .maybeSingle();
if (anonProfileErr) fail(`anon profiles probe ${anonProfileErr.message}`);
else if (anonProfile) fail('anon can read test profile');
else pass('anon cannot read test profile');

// --- service_role can read test profile ---
const { data: svcProfile, error: svcProfileErr } = await serviceClient
  .from('profiles')
  .select('id')
  .eq('id', testUserId)
  .maybeSingle();
if (svcProfileErr) fail(`service_role profiles ${svcProfileErr.message}`);
else if (svcProfile?.id !== testUserId) fail('service_role cannot read test profile');
else pass('service_role reads test profile');

// --- authenticated cannot read arbitrary other profile (if one exists) ---
const { data: otherRows, error: otherSvcErr } = await serviceClient
  .from('profiles')
  .select('id')
  .neq('id', testUserId)
  .limit(1);
if (otherSvcErr || !otherRows?.length) {
  warn('skipped other-profile RLS probe (no other profile row)');
} else {
  const otherId = otherRows[0].id;
  const { data: leaked, error: leakErr } = await sessionClient
    .from('profiles')
    .select('id')
    .eq('id', otherId)
    .maybeSingle();
  if (leakErr) fail(`authenticated other profile probe ${leakErr.message}`);
  else if (leaked) fail('authenticated can read other user profile');
  else pass('authenticated cannot read other user profile');
}

// --- existing migrated user read-only compatibility ---
let existingId = null;
const { data: migratedUsers, error: migratedErr } = await serviceClient.auth.admin.listUsers({
  page: 1,
  perPage: 50,
});
if (!migratedErr) {
  const existing = (migratedUsers?.users ?? []).find(
    (u) => u.id !== testUserId && !String(u.email ?? '').includes('shadow-stage4d+'),
  );
  if (existing) existingId = existing.id;
}
if (!existingId) {
  const { data: profRow } = await serviceClient
    .from('profiles')
    .select('id')
    .neq('id', testUserId)
    .limit(1)
    .maybeSingle();
  if (profRow?.id) existingId = profRow.id;
}
if (!existingId) {
  warn('no existing migrated user/profile found for read-only check');
} else {
  const { data: existingProfile, error: existingProfErr } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('id', existingId)
    .maybeSingle();
  if (existingProfErr) fail(`existing user profile read ${existingProfErr.message}`);
  else if (!existingProfile) warn(`existing user ${existingId} has no profiles row`);
  else pass(`existing migrated user profile readable via service_role id=${existingId}`);
  const { data: leakedExisting } = await sessionClient
    .from('profiles')
    .select('id')
    .eq('id', existingId)
    .maybeSingle();
  if (leakedExisting) fail('authenticated can read existing migrated profile');
  else pass('authenticated cannot read existing migrated profile');
}

// --- magic link: skip (no mass email) ---
warn('magic link / OTP sign-in not tested (avoid mass email on shadow stack)');

// --- session refresh smoke (in-memory, not production cookies) ---
if (refreshToken) {
  const refreshClient = createClient(`${authBase}/`, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: refreshData, error: refreshErr } = await refreshClient.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (refreshErr) warn(`refreshSession skipped (${refreshErr.message})`);
  else if (!refreshData.session?.access_token) warn('refreshSession missing access_token');
  else pass('refreshSession ok');
} else {
  warn('refreshSession skipped (no refresh_token)');
}

// --- logout ---
const { error: signOutErr } = await sessionClient.auth.signOut();
if (signOutErr) fail(`signOut ${signOutErr.message}`);
else pass('signOut ok');

const { data: sessionAfter, error: sessionAfterErr } = await sessionClient.auth.getSession();
if (sessionAfterErr) fail(`getSession after signOut ${sessionAfterErr.message}`);
else if (!sessionAfter?.session) pass('session cleared after signOut');
else fail('session still present after signOut');

console.log('');
if (failed === 0 && warned === 0) {
  console.log('STAGE_4D_AUTH_FLOW_PASS');
  process.exit(0);
}
if (failed === 0) {
  console.log(`STAGE_4D_AUTH_FLOW_PASS_WITH_WARNINGS (${warned})`);
  process.exit(0);
}
console.log(`STAGE_4D_AUTH_FLOW_BLOCKED (${failed} failures, ${warned} warnings)`);
process.exit(1);
