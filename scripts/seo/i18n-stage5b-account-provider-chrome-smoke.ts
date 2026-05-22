/**
 * Stage 5B — account + provider chrome smoke.
 * Local: default http://127.0.0.1:3020
 * Prod:  SMOKE_BASE_URL=https://scholarshiptop.com  (apex; www 301s to apex)
 */
import { getAccountUiCopy } from '@/lib/i18n/accountUiCopy';
import { getAccountProfileUiCopy } from '@/lib/i18n/accountProfileUiCopy';
import { getProviderDetailUiCopy } from '@/lib/i18n/providerDetailUiCopy';
import { getAuthUiCopy } from '@/lib/i18n/authUiCopy';

const BASE = (
  process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3020'
).replace(/\/$/, '');

const PROVIDER_SLUG = 'loyola-university-chicago';

async function fetchPath(
  path: string,
  init?: RequestInit
): Promise<{ status: number; html: string; location: string | null }> {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
  const html = await res.text();
  return {
    status: res.status,
    html,
    location: res.headers.get('location')
  };
}

async function main() {
  let failed = 0;

  const enProvider = getProviderDetailUiCopy('en');
  const esProvider = getProviderDetailUiCopy('es');
  if (!esProvider.stats.activeScholarships.includes('Becas')) failed += 1;
  else console.log('PASS programmatic ES provider detail copy');

  const esSignin = getAuthUiCopy('es');
  const frAccount = getAccountUiCopy('fr');
  if (!frAccount.pageTitle.includes('Compte')) failed += 1;
  else console.log('PASS programmatic account/auth copy');

  const provider = await fetchPath(`/providers/${PROVIDER_SLUG}`);
  const providerOk =
    provider.status === 200 &&
    provider.html.includes(enProvider.stats.activeScholarships) &&
    provider.html.includes(enProvider.about.heading);
  if (!providerOk) failed += 1;
  console.log(
    `${providerOk ? 'PASS' : 'FAIL'} /providers/${PROVIDER_SLUG} status=${provider.status}`
  );

  for (const locale of ['es', 'fr'] as const) {
    const hub = await fetchPath(`/${locale}/providers`);
    const ok = hub.status === 200;
    if (!ok) failed += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'} /${locale}/providers status=${hub.status}`);
  }

  for (const locale of ['es', 'fr'] as const) {
    const account = await fetchPath(`/${locale}/account`);
    const signinPath = `/${locale}/signin`;
    const redirected =
      account.status === 307 ||
      account.status === 308 ||
      (account.status === 200 && account.html.includes(signinPath));
    const locOk =
      account.location?.includes(signinPath) ||
      account.html.includes(getAccountUiCopy(locale).pageTitle) ||
      account.html.includes(signinPath);
    const ok = redirected && (account.status !== 200 || locOk);
    if (!ok) failed += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} /${locale}/account status=${account.status} loc=${account.location ?? 'n/a'}`
    );

    const signin = await fetchPath(signinPath);
    const signinCopy = getAuthUiCopy(locale);
    const signinOk =
      signin.status === 200 &&
      (signin.html.includes(signinCopy.signInCardTitle) ||
        signin.html.includes(signinCopy.emailLabel));
    if (!signinOk) failed += 1;
    console.log(
      `${signinOk ? 'PASS' : 'FAIL'} ${signinPath} status=${signin.status}`
    );
  }

  const en404 = await fetchPath('/en');
  const enOk = en404.status === 404;
  if (!enOk) failed += 1;
  console.log(`${enOk ? 'PASS' : 'FAIL'} /en status=${en404.status} (expect 404)`);

  void getAccountProfileUiCopy('es');

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll 5B account/provider chrome smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
