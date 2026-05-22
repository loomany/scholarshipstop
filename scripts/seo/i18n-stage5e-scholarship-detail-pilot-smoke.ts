/**
 * Stage 5E-1 scholarship detail pilot smoke.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getDetailLanguageSwitcherItems } from '@/lib/i18n/detailLanguageSwitcher';
import { fetchPublishedScholarshipDetail } from '@/lib/i18n/scholarshipPilot/resolveLocalizedScholarshipDetail';

const BASE = (
  process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com'
).replace(/\/$/, '');

const PILOT_SLUG = 'climate-stripes-scholarship-14487';
const UNSEEDED_SLUG = 'how-to-apply-for-a-scholarship-step-by-step';

function loadEnvLocal(): void {
  const path = join(process.cwd(), '.env.local');
  try {
    const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

async function fetchHtml(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: res.status, html: await res.text() };
}

function hasEnglishBodyLeak(html: string): boolean {
  const markers = [
    'University of Reading offers this scholarship to help cover education costs',
    'Plan to apply by 29 May 2026.',
    'Scholarship deadline</'
  ];
  return markers.some((m) => html.includes(m));
}

async function main() {
  let failed = 0;

  const switcher = getDetailLanguageSwitcherItems(
    `/scholarships/${PILOT_SLUG}`
  );
  if (switcher.length !== 3) {
    failed += 1;
    console.error('FAIL EN switcher cluster', switcher);
  } else {
    console.log('OK   EN switcher en/es/fr');
  }

  for (const locale of ['es', 'fr'] as const) {
    const ctx = await fetchPublishedScholarshipDetail(PILOT_SLUG, locale);
    if (!ctx) {
      failed += 1;
      console.error(`FAIL programmatic ${locale} translation missing`);
      continue;
    }
    if (!ctx.scholarship.seoOverview?.trim()) {
      failed += 1;
      console.error(`FAIL ${locale} missing localized overview`);
    } else {
      console.log(`OK   programmatic ${locale} overview present`);
    }
  }

  const en = await fetchHtml(`/scholarships/${PILOT_SLUG}`);
  if (en.status !== 200) {
    failed += 1;
    console.error('FAIL EN HTTP', en.status);
  } else {
    console.log('OK   EN scholarship 200');
    if (en.html.includes('href="/en"')) {
      failed += 1;
      console.error('FAIL /en href');
    }
  }

  for (const locale of ['es', 'fr'] as const) {
    const res = await fetchHtml(`/${locale}/scholarships/${PILOT_SLUG}`);
    if (res.status !== 200) {
      failed += 1;
      console.error(`FAIL ${locale} HTTP`, res.status);
      continue;
    }
    console.log(`OK   ${locale} scholarship 200`);
    if (hasEnglishBodyLeak(res.html)) {
      failed += 1;
      console.error(`FAIL ${locale} possible English body leak`);
    }
    if (res.html.includes('href="/en"')) {
      failed += 1;
      console.error(`FAIL ${locale} /en href`);
    }
    if (!res.html.includes('Climate Stripes Scholarship')) {
      failed += 1;
      console.error(`FAIL ${locale} official title missing`);
    }
  }

  const esUnseeded = await fetchHtml(`/es/scholarships/${UNSEEDED_SLUG}`);
  if (esUnseeded.status !== 404) {
    failed += 1;
    console.error('FAIL unseeded ES should 404', esUnseeded.status);
  } else {
    console.log('OK   unseeded ES scholarship 404');
  }

  const enGate = await fetchHtml('/en');
  if (enGate.status !== 404) {
    failed += 1;
    console.error('FAIL /en should 404', enGate.status);
  } else {
    console.log('OK   /en 404');
  }

  if (failed > 0) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log('\nAll stage 5E-1 scholarship detail smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
