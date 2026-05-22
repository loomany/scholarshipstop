/**
 * Stage 5C-4 — contextual strategy paywall, ready choice, legal shell smoke.
 */
import { getIqContextualStrategyCopy } from '@/lib/iq/i18n/iqContextualStrategyCopy';
import { getIqContextualFunnelCopy } from '@/lib/iq/i18n/iqContextualFunnelCopy';
import { getIqLegalMetadata, getIqLegalShellCopy } from '@/lib/iq/i18n/iqLegalShellCopy';

const BASE = (
  process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3020'
).replace(/\/$/, '');
const IQ_HOST = 'iq.scholarshiptop.com';

const LEGAL_PATHS = [
  { path: '/es/faq', locale: 'es' as const, page: 'faq' as const },
  { path: '/fr/help', locale: 'fr' as const, page: 'help' as const }
];

async function main() {
  let failed = 0;

  const esStrategy = getIqContextualStrategyCopy('es');
  if (!esStrategy.premiumTitle.includes('becas')) {
    failed += 1;
    console.log('FAIL ES strategy paywall copy');
  } else {
    console.log('PASS ES strategy paywall copy');
  }

  const frReady = getIqContextualFunnelCopy('fr');
  if (!frReady.iqReadySubtitle.includes('bourses')) {
    failed += 1;
    console.log('FAIL FR ready-choice copy');
  } else {
    console.log('PASS FR ready-choice copy');
  }

  const esShell = getIqLegalShellCopy('es');
  if (!esShell.backToIq.includes('perfil')) {
    failed += 1;
    console.log('FAIL ES legal shell copy');
  } else {
    console.log('PASS ES legal shell copy');
  }

  for (const row of LEGAL_PATHS) {
    const res = await fetch(`${BASE}${row.path}`, {
      headers: { 'x-forwarded-host': IQ_HOST }
    });
    const html = await res.text();
    const meta = getIqLegalMetadata(row.page, row.locale);
    const titleFragment = meta.title.split('—')[0]!.trim();
    const shellOk = html.includes(`data-iq-product-shell-locale="${row.locale}"`);
    const titleOk = html.includes(titleFragment) || html.includes(meta.title);
    const backOk = html.includes(getIqLegalShellCopy(row.locale).backToIq);
    const ok = res.ok && shellOk && (titleOk || backOk);
    if (!ok) failed += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${row.path} status=${res.status} shell=${shellOk} title=${titleOk} back=${backOk}`
    );
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll 5C-4 remaining-surfaces smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
