/**
 * Audits resource/essay pages for D2 enrichment candidates.
 * Run: npx tsx scripts/data/d2-audit-resource-essay-candidates.ts
 */
import fs from 'node:fs';
import path from 'node:path';

import { STATIC_ESSAY_GUIDES } from '@/lib/essays/staticEssayGuides';
import { STATIC_SCHOLARSHIP_GUIDES } from '@/lib/resources/staticScholarshipGuides';
import {
  hasDisplayableContentContext,
  isGenericTopicSlug,
  resolveContentEnrichmentContext,
  resolveStateCodeFromContentHints
} from '@/lib/external-data';

type Row = {
  route: string;
  slug: string;
  title: string;
  type: 'resource' | 'essay';
  detected_state: string;
  detected_school: string;
  current_context_card: string;
  recommended_context: string;
  risk: string;
  action: string;
};

const KEYWORD =
  /california|texas|new[- ]york|florida|illinois|georgia|ohio|pennsylvania|massachusetts|harvard|stanford|university|college|campus|low-income|financial-need|first-generation|international|graduate|nursing|stem|engineering|medical/i;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function assessPage(
  type: 'resource' | 'essay',
  slug: string,
  title: string,
  category: string | null = null
): Row | null {
  if (!KEYWORD.test(`${slug} ${title} ${category ?? ''}`)) return null;

  const hints = { slug, title, category, subcategory: null as string | null };
  const context = resolveContentEnrichmentContext(hints);
  const show = hasDisplayableContentContext(context, hints);
  const state = resolveStateCodeFromContentHints(hints) ?? context.stateCode ?? '';
  const school = context.schoolRow?.school_name ?? '';

  const generic = isGenericTopicSlug(slug);
  let recommended = 'none';
  if (show && context.schoolRow) recommended = 'school compact stats + compare links';
  else if (show && context.stateRow) recommended = 'state compact stats + scholarship links';
  else if (!generic && (state || KEYWORD.test(slug))) recommended = 'improve resolver / monitor';

  let risk = 'low';
  if (generic && show) risk = 'high';
  if (!show && state && !generic) risk = 'medium';

  let action = 'skip';
  if (generic) action = 'keep hidden';
  else if (show) action = 'enhance links/copy';
  else if (recommended.includes('improve')) action = 'resolver candidate';

  return {
    route: type === 'resource' ? `/resources/${slug}` : `/essays/${slug}`,
    slug,
    title,
    type,
    detected_state: state,
    detected_school: school,
    current_context_card: show ? 'yes' : 'no',
    recommended_context: recommended,
    risk,
    action
  };
}

function loadInventorySlugs(): Array<{ slug: string; title: string }> {
  const csvPath = path.join(
    process.cwd(),
    'reports/seo/i18n-stage4d-resources-pilot-candidates-2026-05-21.csv'
  );
  if (!fs.existsSync(csvPath)) return [];

  const text = fs.readFileSync(csvPath, 'utf8');
  const lines = text.split(/\r?\n/).slice(1);
  const rows: Array<{ slug: string; title: string }> = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^"[^"]*","([^"]+)","([^"]+)"/);
    if (match) {
      rows.push({ slug: match[1]!, title: match[2]! });
    }
  }
  return rows;
}

function main() {
  const rows: Row[] = [];
  const seen = new Set<string>();

  for (const guide of STATIC_SCHOLARSHIP_GUIDES) {
    const row = assessPage('resource', guide.slug, guide.title);
    if (row && !seen.has(row.route)) {
      seen.add(row.route);
      rows.push(row);
    }
  }

  for (const guide of STATIC_ESSAY_GUIDES) {
    const row = assessPage('essay', guide.slug, guide.title);
    if (row && !seen.has(row.route)) {
      seen.add(row.route);
      rows.push(row);
    }
  }

  for (const item of loadInventorySlugs()) {
    const row = assessPage('resource', item.slug, item.title);
    if (row && !seen.has(row.route)) {
      seen.add(row.route);
      rows.push(row);
    }
  }

  rows.sort((a, b) => {
    if (a.current_context_card !== b.current_context_card) {
      return a.current_context_card === 'yes' ? -1 : 1;
    }
    return a.route.localeCompare(b.route);
  });

  const header =
    'route,slug,title,type,detected_state,detected_school,current_context_card,recommended_context,risk,action';
  const body = rows.map((row) =>
    [
      row.route,
      row.slug,
      row.title,
      row.type,
      row.detected_state,
      row.detected_school,
      row.current_context_card,
      row.recommended_context,
      row.risk,
      row.action
    ]
      .map(csvEscape)
      .join(',')
  );

  const outPath = path.join(process.cwd(), 'reports/data/d2-resource-essay-candidate-pages.csv');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${header}\n${body.join('\n')}\n`, 'utf8');

  console.log(`Wrote ${rows.length} rows to ${outPath}`);
  console.log(`Showing context: ${rows.filter((r) => r.current_context_card === 'yes').length}`);
  console.log(`Hidden generic: ${rows.filter((r) => r.action === 'keep hidden').length}`);
}

main();
