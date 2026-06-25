/**
 * Stage 4F.1 — Playwright UI sign-in; expects redirect + /account 200.
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

const baseUrl = (process.env.STAGE4F_BASE_URL || 'http://127.0.0.1:3101').replace(/\/$/, '');
const env = loadEnv(process.env.STAGE4F_ENV_FILE || '/opt/scholarshiptop/env/site.stage4e.env');
const email = `shadow-stage4f1-ui+${Date.now()}@invalid.scholarshiptop.test`;
const password = `Stage4F1!${randomBytes(8).toString('hex')}`;

const api = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { error: signUpErr } = await api.auth.signUp({ email, password });
if (signUpErr) {
  console.log(`STAGE_4F1_UI_SKIP signup_failed`);
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160));
});

try {
  await page.goto(`${baseUrl}/signin/password_signin`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  const nav = page.waitForURL((u) => !u.pathname.includes('/signin/password_signin'), { timeout: 45000 }).catch(() => null);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await nav;
  await page.waitForTimeout(3000);

  const cookies = await context.cookies();
  const hasAuthCookie = cookies.some((c) => c.name.includes('auth') || c.name.includes('sb-'));
  console.log(`  final_url=${page.url()}`);
  console.log(`  auth_cookie_present=${hasAuthCookie}`);
  if (consoleErrors.length) console.log(`  console_errors=${consoleErrors.slice(0, 2).join(' | ')}`);

  if (page.url().includes('/signin/password_signin')) {
    console.log('STAGE_4F1_UI_SIGNIN_FAIL stayed on signin');
    process.exit(1);
  }
  if (!hasAuthCookie) {
    console.log('STAGE_4F1_UI_SIGNIN_FAIL no auth cookie');
    process.exit(1);
  }

  const account = await page.goto(`${baseUrl}/account`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const status = account?.status() ?? 0;
  console.log(`  account_status=${status}`);
  if (status !== 200) {
    console.log('STAGE_4F1_UI_SIGNIN_FAIL account not 200');
    process.exit(1);
  }
  console.log('STAGE_4F1_UI_SIGNIN_PASS');
} finally {
  await browser.close();
}
