/**
 * Stage 5C-3 — landing/paywall/report/footer smoke.
 * Run: SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-3-iq-product-smoke.ts
 */
import { getIqAssessmentMetadata, getIqHomeMetadata } from '@/lib/iq/i18n/iqMetadataCopy';
import { getIqLandingCopy } from '@/lib/iq/i18n/iqLandingCopy';
import { getIqPaywallCopy } from '@/lib/iq/i18n/iqPaywallCopy';

const BASE = (
  process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3020'
).replace(/\/$/, '');
const IQ_HOST = 'iq.scholarshiptop.com';

const PATHS = [
  { path: '/', locale: 'en' as const, titleNeedle: getIqHomeMetadata('en').title },
  { path: '/es', locale: 'es' as const, titleNeedle: getIqHomeMetadata('es').title },
  { path: '/fr', locale: 'fr' as const, titleNeedle: getIqHomeMetadata('fr').title },
  {
    path: '/assessment',
    locale: 'en' as const,
    titleNeedle: getIqAssessmentMetadata('en').title
  },
  {
    path: '/es/assessment',
    locale: 'es' as const,
    titleNeedle: getIqAssessmentMetadata('es').title
  },
  {
    path: '/fr/assessment',
    locale: 'fr' as const,
    titleNeedle: getIqAssessmentMetadata('fr').title
  }
];

async function main() {
  let failed = 0;
  for (const row of PATHS) {
    const res = await fetch(`${BASE}${row.path}`, {
      headers: { 'x-forwarded-host': IQ_HOST }
    });
    const html = await res.text();
    const shellOk = html.includes(`data-iq-product-shell-locale="${row.locale}"`);
    const titleFragment = row.titleNeedle.split('|')[0]!.trim();
    const titleOk = html.includes(titleFragment);
    const ok = res.ok && shellOk && titleOk && !html.includes('href="/en"');
    if (!ok) failed += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${row.path} status=${res.status} shell=${shellOk} title=${titleOk}`
    );
  }

  const esLanding = getIqLandingCopy('es');
  if (!esLanding.hero.title.includes('test de CI')) {
    failed += 1;
    console.log('FAIL programmatic ES landing title');
  } else {
    console.log('PASS programmatic ES landing copy');
  }

  const frPay = getIqPaywallCopy('fr');
  if (!frPay.unlockTitle.includes('profil')) {
    failed += 1;
    console.log('FAIL programmatic FR paywall copy');
  } else {
    console.log('PASS programmatic FR paywall copy');
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll 5C-3 product smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
