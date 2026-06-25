/**
 * Stage 4C — supabase-js shadow smoke (NOT production frontend env).
 * Requires shadow-api.env on VPS or env vars:
 *   SHADOW_SUPABASE_URL, SHADOW_SUPABASE_ANON_KEY,
 *   SHADOW_API_BASIC_AUTH_USER, SHADOW_API_BASIC_AUTH_PASS
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';

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

const url = process.env.SHADOW_SUPABASE_URL;
const anonKey = process.env.SHADOW_SUPABASE_ANON_KEY;
const basicUser = process.env.SHADOW_API_BASIC_AUTH_USER;
const basicPass = process.env.SHADOW_API_BASIC_AUTH_PASS;
const serviceKey = process.env.SHADOW_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !basicUser || !basicPass) {
  console.error('STAGE_4C_JS_SHADOW_FAIL missing shadow env');
  process.exit(1);
}

const basic = Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
const shadowFetch = (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Basic ${basic}`);
  // PostgREST role JWT travels in apikey; nginx shadow route forwards apikey → Bearer.
  return fetch(input, { ...init, headers });
};

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: shadowFetch },
});

let failed = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => {
  console.log(`  FAIL  ${m}`);
  failed += 1;
};

console.log('=== supabase-js shadow smoke ===');

const healthRes = await shadowFetch(`${url.replace(/\/$/, '')}/auth/v1/health`);
if (healthRes.ok) pass(`auth health ${healthRes.status}`);
else fail(`auth health ${healthRes.status}`);

const settingsRes = await shadowFetch(`${url.replace(/\/$/, '')}/auth/v1/settings`);
if (settingsRes.ok) pass(`auth settings ${settingsRes.status}`);
else fail(`auth settings ${settingsRes.status}`);

const { data: scholarships, error: schErr } = await supabase
  .from('scholarships_safe_listing')
  .select('id,slug')
  .eq('is_active', true)
  .limit(3);

if (schErr) fail(`scholarships_safe_listing ${schErr.message}`);
else if ((scholarships?.length ?? 0) >= 1) pass(`scholarships_safe_listing count=${scholarships.length}`);
else fail('scholarships_safe_listing empty');

const { data: profiles, error: profErr } = await supabase.from('profiles').select('id').limit(3);
if (profErr) fail(`profiles ${profErr.message}`);
else if ((profiles?.length ?? 0) === 0) pass('profiles anon empty');
else fail('profiles anon returned rows');

if (serviceKey) {
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: shadowFetch },
  });
  const { data: svcProfiles, error: svcErr } = await serviceClient.from('profiles').select('id').limit(1);
  if (svcErr) fail(`profiles service_role ${svcErr.message}`);
  else if ((svcProfiles?.length ?? 0) >= 1) pass(`profiles service_role count=${svcProfiles.length}`);
  else fail('profiles service_role empty');
} else {
  fail('SHADOW_SUPABASE_SERVICE_ROLE_KEY missing');
}

const instRes = await supabase.from('institutions').select('id').not('slug', 'is', null).order('slug').limit(2);
const ids = (instRes.data ?? []).map((r) => r.id);
if (ids.length < 2) {
  fail('get_comparison_data skipped (need 2 institutions)');
} else {
  const { error: rpcErr } = await supabase.rpc('get_comparison_data', {
    p_inst_a: ids[0],
    p_inst_b: ids[1],
  });
  if (rpcErr) fail(`get_comparison_data ${rpcErr.message}`);
  else pass('get_comparison_data ok');
}

console.log('');
if (failed === 0) {
  console.log('STAGE_4C_JS_SHADOW_PASS');
  process.exit(0);
}
console.log(`STAGE_4C_JS_SHADOW_FAIL (${failed})`);
process.exit(1);
