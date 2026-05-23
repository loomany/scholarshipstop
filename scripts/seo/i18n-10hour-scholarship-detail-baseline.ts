/**
 * Production baseline for 10-hour scholarship_detail scale-up.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BASE = (process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com').replace(/\/$/, '');
const DATE = '2026-05-22';

function loadEnvLocal() {
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[t.slice(0, eq).trim()] = v;
  }
}

async function fetchStatus(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return res.status;
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const db = createClient(url, key);

  const types = [
    'scholarship_category',
    'resource_article',
    'provider_profile',
    'scholarship_detail'
  ] as const;

  const counts: Record<string, unknown> = {};
  for (const st of types) {
    const { data } = await db
      .from('content_translations')
      .select('locale, status, quality_score, machine_model')
      .eq('source_type', st);
    const rows = data ?? [];
    counts[st] = {
      total: rows.length,
      es: rows.filter((r) => r.locale === 'es').length,
      fr: rows.filter((r) => r.locale === 'fr').length,
      published: rows.filter((r) => r.status === 'published').length,
      statuses: Object.fromEntries(
        [...new Set(rows.map((r) => r.status))].map((s) => [
          s,
          rows.filter((r) => r.status === s).length
        ])
      ),
      machine_models: Object.fromEntries(
        [...new Set(rows.map((r) => r.machine_model).filter(Boolean))].map((m) => [
          m,
          rows.filter((r) => r.machine_model === m).length
        ])
      )
    };
  }

  const indexXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const esXml = await (await fetch(`${BASE}/sitemaps/locale-es-scholarships-detail-db.xml`)).text();
  const frXml = await (await fetch(`${BASE}/sitemaps/locale-fr-scholarships-detail-db.xml`)).text();
  const esLocs = [...esXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const frLocs = [...frXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const smoke = {
    en404: await fetchStatus('/en'),
    esHub: await fetchStatus('/es'),
    seededEs: await fetchStatus('/es/scholarships/climate-stripes-scholarship-14487'),
    seededFr: await fetchStatus('/fr/scholarships/climate-stripes-scholarship-14487'),
    unseededEs: await fetchStatus('/es/scholarships/how-to-apply-for-a-scholarship-step-by-step'),
    unseededFr: await fetchStatus('/fr/scholarships/how-to-apply-for-a-scholarship-step-by-step'),
    sch0: await fetchStatus('/sitemaps/scholarships-0.xml'),
    esDetailSitemap: await fetchStatus('/sitemaps/locale-es-scholarships-detail-db.xml'),
    frDetailSitemap: await fetchStatus('/sitemaps/locale-fr-scholarships-detail-db.xml')
  };

  const report = `# Scholarship detail scale-up baseline (${DATE})

## content_translations counts

\`\`\`json
${JSON.stringify(counts, null, 2)}
\`\`\`

## Sitemap

- index lists ES detail-db: ${indexXml.includes('locale-es-scholarships-detail-db')}
- index lists FR detail-db: ${indexXml.includes('locale-fr-scholarships-detail-db')}
- ES detail-db URLs: ${esLocs.length}
- FR detail-db URLs: ${frLocs.length}
- /en in detail sitemaps: ${[...esLocs, ...frLocs].some((u) => u.includes('/en/'))}
- draft markers: ${['review_required', 'draft'].some((m) => esXml.includes(m) || frXml.includes(m))}

## Route/smoke

\`\`\`json
${JSON.stringify(smoke, null, 2)}
\`\`\`
`;

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const path = join(
    process.cwd(),
    'reports/seo',
    `i18n-10hour-scholarship-detail-scaleup-baseline-${DATE}.md`
  );
  writeFileSync(path, report, 'utf8');
  console.log('Wrote', path);
  console.log(JSON.stringify({ counts: counts.scholarship_detail, smoke }, null, 2));
}

main();
