/**
 * Stage 5C-2 — localized IQ assessment smoke (local prod server + x-forwarded-host).
 * Run: npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts
 * Prereq: npx next start -p 3020 (with SMOKE_BASE_URL defaulting to http://127.0.0.1:3020)
 */
import { cognitiveAssessmentQuestions } from '@/lib/cognitiveAssessmentQuestions';
import {
  assertLocalizedQuestionBankParity,
  getLocalizedIqQuestions
} from '@/lib/iq/i18n/getLocalizedIqQuestions';
import { getIqAssessmentUiCopy } from '@/lib/iq/i18n/iqAssessmentUiCopy';
import { getIqLanguageSwitcherItems } from '@/lib/iq/i18n/iqLocalizedHref';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3020';
const IQ_HOST = 'iq.scholarshiptop.com';

const HTTP_PATHS = [
  { path: '/', locale: 'en' },
  { path: '/es', locale: 'es' },
  { path: '/fr', locale: 'fr' },
  { path: '/assessment', locale: 'en' },
  { path: '/es/assessment', locale: 'es' },
  { path: '/fr/assessment', locale: 'fr' }
] as const;

const HUB_LEAK = ['ScholarshipTop en español: busca, compara'];

const FIRST_THREE_IDS = ['AR01', 'NL01', 'SP01'] as const;

async function fetchHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-forwarded-host': IQ_HOST }
  });
  if (!res.ok) throw new Error(`${path} status ${res.status}`);
  return res.text();
}

function fail(msg: string): void {
  console.log(`FAIL ${msg}`);
}

function pass(msg: string): void {
  console.log(`PASS ${msg}`);
}

async function main() {
  let failed = 0;

  for (const row of HTTP_PATHS) {
    const html = await fetchHtml(row.path);
    const hub = HUB_LEAK.some((m) => html.includes(m));
    const shellLocale = html.match(/data-iq-product-shell-locale="([^"]+)"/)?.[1];
    const hasShell = html.includes('data-iq-product-shell');
    const enHref = html.includes('href="/en"') || html.includes('href="/en/');
    const localeOk = shellLocale === row.locale;
    const ok = hasShell && localeOk && !hub && !enHref;
    if (!ok) failed += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} HTTP ${row.path} shell=${hasShell} locale=${shellLocale ?? 'missing'} expected=${row.locale} hub=${hub} enHref=${enHref}`
    );
  }

  try {
    assertLocalizedQuestionBankParity();
    pass('question bank parity (30 ES/FR overlays)');
  } catch (e) {
    failed += 1;
    fail(`question bank parity — ${e instanceof Error ? e.message : String(e)}`);
  }

  const en = cognitiveAssessmentQuestions;
  for (const locale of ['es', 'fr'] as const) {
    const bank = getLocalizedIqQuestions(locale);
    const ui = getIqAssessmentUiCopy(locale);
    const missingUi = [
      ui.chooseOneAnswer,
      ui.stepOf(1, 30),
      ui.questionNumber(1),
      ui.startTest
    ].filter((s) => !s.trim());
    if (missingUi.length > 0) {
      failed += 1;
      fail(`${locale} UI copy empty fields`);
      continue;
    }

    let translatedQ = 0;
    for (const id of FIRST_THREE_IDS) {
      const i = en.findIndex((q) => q.id === id);
      const localized = bank[i];
      if (!localized) continue;
      const promptDiffers = localized.prompt !== en[i]!.prompt;
      const optsDiffer = (['A', 'B', 'C', 'D'] as const).some(
        (k) => localized.options[k] !== en[i]!.options[k]
      );
      if (promptDiffers || optsDiffer) translatedQ += 1;
    }
    if (translatedQ < 3) {
      failed += 1;
      fail(`${locale} first-3 questions translated (${translatedQ}/3)`);
    } else {
      pass(`${locale} first-3 questions + UI copy (assessment is client-rendered; not in HTML)`);
    }
  }

  const switcher = getIqLanguageSwitcherItems({
    pathname: '/es/assessment',
    onIqSubdomain: true
  });
  const switcherOk =
    switcher.find((i) => i.locale === 'en')?.href === '/assessment' &&
    switcher.find((i) => i.locale === 'es')?.href === '/es/assessment' &&
    switcher.find((i) => i.locale === 'fr')?.href === '/fr/assessment' &&
    !switcher.some((i) => i.href === '/en' || i.href.startsWith('/en/'));
  if (!switcherOk) {
    failed += 1;
    fail('language switcher hrefs on /es/assessment');
  } else {
    pass('language switcher — no /en hrefs');
  }

  const enAssess = await fetchHtml('/assessment');
  if (!enAssess.includes('data-iq-product-shell-locale="en"')) {
    failed += 1;
    fail('/assessment missing EN shell locale marker');
  } else {
    pass('English /assessment shell locale unchanged (en)');
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll 5C-2 assessment smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
