/**
 * Stage 5E-7: audit published autopilot rows with empty translated_title.
 * Usage: npx tsx scripts/i18n/scholarship-detail-autopilot/audit-empty-translated-titles.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { scholarshipRowToPilotFacts } from '@/lib/i18n/scholarshipPilot/fetchScholarshipPilotFacts';
import type { ScholarshipDbFactRow } from '@/lib/i18n/scholarshipPilot/fetchScholarshipPilotFacts';
import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';

import { BASE, DATE, loadEnvLocal } from './env';

const MACHINE_PREFIX = 'stage5e-scholarship-autopilot-wave-';

function isEmptyTitle(v: unknown): boolean {
  return !String(v ?? '').trim();
}

function waveFromModel(model: string | null): number | null {
  const m = model?.match(/wave-(\d+)$/);
  return m ? Number(m[1]) : null;
}

async function routeStatus(path: string): Promise<number> {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await db
    .from('content_translations')
    .select(
      'source_id, locale, status, machine_model, translated_title, translated_body, translated_summary, translated_meta_title, quality_score'
    )
    .eq('source_type', 'scholarship_detail')
    .in('locale', ['es', 'fr'])
    .eq('status', 'published')
    .like('machine_model', `${MACHINE_PREFIX}%`);

  if (error) throw new Error(error.message);

  const affected = (rows ?? []).filter((r) => isEmptyTitle(r.translated_title));
  const sourceIds = [...new Set(affected.map((r) => String(r.source_id)).filter(Boolean))];

  const slugById = new Map<string, string>();
  const titleById = new Map<string, string>();
  const chunk = 80;
  for (let i = 0; i < sourceIds.length; i += chunk) {
    const slice = sourceIds.slice(i, i + chunk);
    const { data: sch } = await db
      .from('scholarships')
      .select('id, slug, title, provider_name, award_amount_text, award_amount_min, award_amount_max, currency, deadline_text, deadline_date')
      .in('id', slice);
    for (const s of sch ?? []) {
      const id = String(s.id);
      const slug = String(s.slug ?? '').trim().toLowerCase();
      slugById.set(id, slug);
      const facts = scholarshipRowToPilotFacts(s as ScholarshipDbFactRow);
      titleById.set(id, facts.officialTitle);
    }
  }

  const slugs = [...new Set(
    affected.map((r) => slugById.get(String(r.source_id)) ?? '').filter(Boolean)
  )];

  const waves = new Set<number>();
  for (const r of affected) {
    const w = waveFromModel(r.machine_model);
    if (w) waves.add(w);
  }

  const listed = await listPublishedScholarshipDetailTranslations();
  const listedSlugs = new Set(listed.map((r) => r.scholarshipSlug));

  const sampleSlugs = slugs.slice(0, 8);
  const routeChecks: { slug: string; en: number; es: number; fr: number }[] = [];
  for (const slug of sampleSlugs) {
    routeChecks.push({
      slug,
      en: await routeStatus(`/scholarships/${slug}`),
      es: await routeStatus(`/es/scholarships/${slug}`),
      fr: await routeStatus(`/fr/scholarships/${slug}`)
    });
  }

  const withBody = affected.filter(
    (r) => Boolean(r.translated_body?.trim() || r.translated_summary?.trim())
  ).length;

  const report = {
    totalAffectedRows: affected.length,
    es: affected.filter((r) => r.locale === 'es').length,
    fr: affected.filter((r) => r.locale === 'fr').length,
    distinctScholarships: slugs.length,
    waves: [...waves].sort((a, b) => a - b),
    withBodyOrSummary: withBody,
    inSitemapList: slugs.filter((s) => listedSlugs.has(s)).length,
    notInSitemapList: slugs.filter((s) => !listedSlugs.has(s)).length,
    sampleSlugs: slugs.slice(0, 25),
    routeChecks,
    smokeWhyPassed:
      'Wave smoke checked route HTTP 200 and sitemap counts vs sitemap-eligible totals; per-slug XML inclusion only for listed slugs after 5E-6 hardening. Empty translated_title excludes rows from listPublishedScholarshipDetailTranslations (hasLocalizedTitle).'
  };

  console.log(JSON.stringify(report, null, 2));

  const md = `# Stage 5E-7 empty translated_title audit (${DATE})

## Affected rows (autopilot published, empty translated_title)

| Metric | Value |
|--------|-------|
| Total rows | **${report.totalAffectedRows}** |
| ES | **${report.es}** |
| FR | **${report.fr}** |
| Distinct scholarships | **${report.distinctScholarships}** |
| Waves | ${report.waves.join(', ')} |
| Has translated_body/summary | **${report.withBodyOrSummary}** / ${report.totalAffectedRows} |
| Slugs in sitemap list | **${report.inSitemapList}** |
| Slugs excluded from sitemap | **${report.notInSitemapList}** |

## Why smoke passed

${report.smokeWhyPassed}

## Sample slugs

${report.sampleSlugs.map((s) => `- \`${s}\``).join('\n')}

## Sample routes

${routeChecks.map((r) => `- \`${r.slug}\` EN=${r.en} ES=${r.es} FR=${r.fr}`).join('\n')}
`;

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-7-empty-title-audit-${DATE}.md`);
  writeFileSync(path, md, 'utf8');
  console.log('Wrote', path);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
