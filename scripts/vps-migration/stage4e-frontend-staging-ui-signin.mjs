/**
 * Optional Stage 4E UI sign-in smoke (Playwright). Creates its own test user via API first.
 */
import { chromium } from 'playwright';
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

const baseUrl = (process.env.STAGE4E_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const env = loadEnv(process.env.STAGE4E_ENV_FILE || '/opt/scholarshiptop/env/site.stage4e.env');
const email = `shadow-stage4e-ui+${Date.now()}@invalid.scholarshiptop.test`;
const password = `Stage4E!${randomBytes(8).toString('hex')}`;

const api = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { error: signUpErr } = await api.auth.signUp({ email, password });
if (signUpErr) {
  console.log(`STAGE_4E_UI_SIGNIN_SKIP signup_failed ${signUpErr.message}`);
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  await page.goto(`${baseUrl}/signin/password_signin`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(3000);
  const url = page.url();
  if (url.includes('/signin/password_signin')) {
    console.log('STAGE_4E_UI_SIGNIN_FAIL stayed on signin');
    process.exit(1);
  }
  console.log('STAGE_4E_UI_SIGNIN_PASS');
} finally {
  await browser.close();
  await api.auth.signInWithPassword({ email, password });
  const userId = (await api.auth.getUser()).data.user?.id;
  if (userId) {
    // best-effort cleanup via SQL is handled by orchestrator script
  }
}
