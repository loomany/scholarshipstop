#!/usr/bin/env node
/**
 * Read-only: Railway env key names → ops/env/*.env.example (no values).
 * Usage: node scripts/vps-migration/generate-env-examples.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const services = {
  site: 'Сайт',
  scripts: 'Скрипты',
  'seo-generation': 'Сео генерация',
  'seo-indexing': 'Сео индексация',
  'seo-audit': 'Сео Аудит',
  mailing: 'Рассылка',
  'mailing-providers': 'Рассылка провайдеры',
  'content-hub': 'Контент Хаб',
  translation: 'Перевод',
};

const RAILWAY_PREFIX = /^RAILWAY_/;

function categorize(key) {
  if (RAILWAY_PREFIX.test(key)) return 'Railway system vars';
  if (key.startsWith('NEXT_PUBLIC_')) return 'public NEXT_PUBLIC_*';
  if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') return 'Supabase anon';
  if (key.includes('ANON')) return 'Supabase anon';
  if (key.includes('SERVICE_ROLE') || key === 'SUPABASE_SERVICE_ROLE_KEY') return 'Supabase service role';
  if (key === 'SUPABASE_URL' || key === 'NEXT_PUBLIC_SUPABASE_URL') return 'Supabase anon';
  if (/GOOGLE_INDEX|URL_INSPECTION|GSC|INDEXNOW|JSONLD/i.test(key)) return 'GSC / indexing';
  if (/^SEO_|SEO_DRIP|SEO_PAGES/i.test(key)) return 'SEO / sitemap / canonical';
  if (/OPENAI|FAL_|GPTZERO|UNDETECTABLE|GPT_SEARCH/i.test(key)) return 'OpenAI / AI';
  if (/RESEND|GRANT_|PROVIDER_OUTREACH/i.test(key)) return 'mailing / email provider';
  if (/I18N_|CONTENT_HUB|CONTENT_ARTICLE|ESSAY_|PROVIDERS_|MANUAL_ESSAY/i.test(key)) return 'worker flags';
  if (/CRON/i.test(key)) return 'cron flags';
  return 'unknown / legacy';
}

function requiredness(key, slug) {
  const optionalPatterns = [
    /^NEXT_PUBLIC_SCHOLARSHIPS_HUB/,
    /^SCHOLARSHIPS_HUB/,
    /^CACHE_BUST/,
    /^GPT_SEARCH/,
    /^GRANT_NOTIFICATION_TEST/,
    /^SEO_DRIP/,
    /^JSONLD_AUDIT_EXIT/,
    /^PROVIDER_OUTREACH_MS/,
    /^PROVIDER_OUTREACH_TELEGRAM/,
    /^GOOGLE_INDEXING_IMMEDIATE/,
    /^GOOGLE_INDEXING_MAX/,
    /^GOOGLE_INDEXING_SCHOLARSHIP/,
    /^URL_INSPECTION/,
    /^GOOGLE_INDEXING_FLUSH/,
    /^SEO_AI_META/,
    /^CONTENT_HUB_FAL/,
    /^FAL_/,
    /^FLUX_/,
    /^PROCESS_/,
    /^CONTINUOUS_MODE/,
    /^RUN_REPROCESS/,
    /^PUBLICATION_INTERVAL/,
    /^NPM_CONFIG/,
    /^SMOKE_BASE/,
  ];
  if (optionalPatterns.some((re) => re.test(key))) return 'optional';
  if (slug === 'seo-audit' && /^JSONLD_AUDIT_SCHOLARSHIP/.test(key)) return 'optional';
  if (slug === 'translation' && /^I18N_WORKER_(RUN_ID|FORCE|RESUME|LOCK_EXIT)/.test(key)) return 'optional';
  return 'required';
}

const snapshot = {};

for (const [slug, railwayName] of Object.entries(services)) {
  const raw = execSync(`railway variable list -s "${railwayName}" --json`, {
    encoding: 'utf8',
    cwd: ROOT,
  });
  const vars = JSON.parse(raw);
  const keys = Object.keys(vars)
    .filter((k) => !RAILWAY_PREFIX.test(k))
    .sort();

  snapshot[slug] = keys.map((key) => ({
    key,
    category: categorize(key),
    required: requiredness(key, slug),
    usedBy: railwayName,
  }));

  const lines = [
    '# ScholarshipTop VPS env template — NO SECRETS',
    `# Service: ${railwayName} (slug: ${slug})`,
    `# Copy to /opt/scholarshiptop/env/${slug}.env and chmod 600`,
    '# Values: set manually from Railway dashboard or secret manager',
    '',
  ];
  for (const key of keys) {
    const req = requiredness(key, slug);
    const placeholder =
      req === 'optional' ? 'OPTIONAL_SET_ON_VPS' : 'REQUIRED_SET_ON_VPS';
    lines.push(`${key}=${placeholder}`);
  }
  lines.push('');

  const outDir = path.join(ROOT, 'ops/env');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${slug}.env.example`), lines.join('\n'));
}

const reportDir = path.join(ROOT, 'reports/vps-migration');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, '_env-keys-snapshot.json'),
  JSON.stringify(snapshot, null, 2)
);

console.log(
  JSON.stringify({ ok: true, services: Object.keys(snapshot).length })
);
