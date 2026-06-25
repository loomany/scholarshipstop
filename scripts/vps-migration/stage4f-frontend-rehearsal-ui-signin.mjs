/**
 * Stage 4F — Playwright UI sign-in with diagnostics (production-like server).
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
const email = `shadow-stage4f-ui+${Date.now()}@invalid.scholarshiptop.test`;
const password = `Stage4F!${randomBytes(8).toString('hex')}`;

const api = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const diagnostics = {
  baseUrl,
  supabaseApi: env.NEXT_PUBLIC_SUPABASE_URL,
  consoleErrors: [],
  pageErrors: [],
  authRequests: [],
  cookiesAfterSubmit: [],
  finalUrl: null,
  redirectMethod: 'client (allowServerRedirect=false in settings.ts)',
};

const { error: signUpErr } = await api.auth.signUp({ email, password });
if (signUpErr) {
  console.log(`STAGE_4F_UI_SIGNIN_SKIP signup_failed ${signUpErr.message}`);
  process.exit(0);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') diagnostics.consoleErrors.push(msg.text().slice(0, 200));
});
page.on('pageerror', (err) => diagnostics.pageErrors.push(String(err).slice(0, 200)));
page.on('request', (req) => {
  const u = req.url();
  if (u.includes('/auth/v1/') || u.includes('54321')) {
    diagnostics.authRequests.push({ method: req.method(), url: u.replace(/\/auth\/v1\/[^?]+/, '/auth/v1/...') });
  }
});

try {
  await page.goto(`${baseUrl}/signin/password_signin`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  const navPromise = page.waitForURL((url) => !url.pathname.includes('/signin/password_signin'), {
    timeout: 30000,
  }).catch(() => null);

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await navPromise;
  await page.waitForTimeout(2000);

  diagnostics.finalUrl = page.url();
  diagnostics.cookiesAfterSubmit = (await context.cookies()).map((c) => ({
    name: c.name,
    domain: c.domain,
    path: c.path,
    httpOnly: c.httpOnly,
  }));

  const stayedOnSignin = page.url().includes('/signin/password_signin');
  const hasAuthCookie = diagnostics.cookiesAfterSubmit.some(
    (c) => c.name.includes('auth') || c.name.includes('sb-')
  );

  console.log('=== Stage 4F UI sign-in diagnostics ===');
  console.log(`  final_url=${diagnostics.finalUrl}`);
  console.log(`  auth_cookie_present=${hasAuthCookie}`);
  console.log(`  auth_requests=${diagnostics.authRequests.length}`);
  if (diagnostics.consoleErrors.length) {
    console.log(`  console_errors=${diagnostics.consoleErrors.slice(0, 3).join(' | ')}`);
  }
  if (diagnostics.pageErrors.length) {
    console.log(`  page_errors=${diagnostics.pageErrors.slice(0, 3).join(' | ')}`);
  }
  if (!hasAuthCookie && stayedOnSignin) {
    console.log('  likely_cause=client-side signIn sets cookies on browser; check NEXT_PUBLIC_SUPABASE_URL baked at build vs runtime API');
  }
  if (hasAuthCookie && stayedOnSignin) {
    console.log('  likely_cause=auth succeeded but client router.push redirect slow or blocked on localhost');
  }

  if (stayedOnSignin) {
    console.log('STAGE_4F_UI_SIGNIN_FAIL stayed on signin');
    process.exit(1);
  }
  console.log('STAGE_4F_UI_SIGNIN_PASS');
} finally {
  await browser.close();
}
