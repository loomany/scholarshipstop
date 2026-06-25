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

const env = loadEnv('/opt/scholarshiptop/env/site.stage4e.env');
const email = `shadow-stage4e-debug+${Date.now()}@invalid.scholarshiptop.test`;
const password = 'Stage4E!Test123';
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await client.auth.signUp({ email, password });
console.log('signup_error', error?.message || 'none');
console.log('signup_user', data.user?.id || 'none');
console.log('signup_session', Boolean(data.session));
