/**
 * Stage 5C.1 — supabase-js smoke against cutover-preview env (production API route).
 * Uses site.cutover-preview.env: https://scholarshiptop.com/supabase + legacy JWT keys.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

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

let failed = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => {
  console.log(`  FAIL  ${m}`);
  failed += 1;
};

console.log('=== Stage 5C.1 supabase-js cutover-preview smoke ===');
if (!url || !anon) {
  fail('missing cutover-preview env');
  process.exit(1);
}

const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });

const { error: authHealthErr } = await supabase.auth.getSession();
if (authHealthErr) fail(`auth client init ${authHealthErr.message}`);
else pass('auth client ok');

const { data: listData, error: listErr } = await supabase.from('scholarships_safe_listing').select('id').limit(3);
if (listErr) fail(`scholarships_safe_listing ${listErr.message}`);
else pass(`scholarships_safe_listing rows=${listData?.length ?? 0}`);

const { data: profAnon, error: profAnonErr } = await supabase.from('profiles').select('id').limit(5);
if (profAnonErr) fail(`profiles anon ${profAnonErr.message}`);
else if ((profAnon ?? []).length === 0) pass('profiles anon empty');
else fail(`profiles anon not empty len=${profAnon.length}`);

if (service) {
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: profSvc, error: profSvcErr } = await admin.from('profiles').select('id').limit(1);
  if (profSvcErr) fail(`profiles service ${profSvcErr.message}`);
  else if ((profSvc ?? []).length >= 1) pass('profiles service >=1');
  else fail('profiles service empty');
} else {
  fail('service key missing');
}

const { data: insts } = await supabase.from('institutions').select('id').not('slug', 'is', null).order('slug').limit(2);
const ids = (insts ?? []).map((r) => r.id);
if (ids.length < 2) {
  fail('get_comparison_data skipped (need 2 institutions)');
} else {
  const { error: rpcErr } = await supabase.rpc('get_comparison_data', { p_inst_a: ids[0], p_inst_b: ids[1] });
  if (rpcErr) fail(`get_comparison_data ${rpcErr.message}`);
  else pass('get_comparison_data ok');
}

console.log('');
if (failed === 0) {
  console.log('STAGE_5C1_JS_CUTOVER_PREVIEW_PASS');
  process.exit(0);
}
console.log(`STAGE_5C1_JS_CUTOVER_PREVIEW_BLOCKED (${failed})`);
process.exit(1);
