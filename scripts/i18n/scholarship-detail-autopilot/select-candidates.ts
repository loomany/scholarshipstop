/**
 * Rank scholarship_detail autopilot candidates.
 * Usage: npx tsx scripts/i18n/scholarship-detail-autopilot/select-candidates.ts --target=500 --wave-size=50
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { DATE, loadEnvLocal } from './env';
import { fetchTranslatedScholarshipDetailSourceIds } from './fetch-translated-source-ids';
import type { AutopilotCandidate } from './types';

function escapeCsv(v: string) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function formatAmount(row: {
  award_amount_text: string | null;
  award_amount_min: number | null;
  award_amount_max: number | null;
  currency: string | null;
}): string {
  if (row.award_amount_text?.trim()) return row.award_amount_text.trim();
  const cur = row.currency?.trim() || 'USD';
  if (
    typeof row.award_amount_min === 'number' &&
    typeof row.award_amount_max === 'number' &&
    row.award_amount_min === row.award_amount_max
  ) {
    return `${row.award_amount_min} ${cur}`;
  }
  if (typeof row.award_amount_min === 'number' && typeof row.award_amount_max === 'number') {
    return `${row.award_amount_min}–${row.award_amount_max} ${cur}`;
  }
  if (typeof row.award_amount_min === 'number') return `${row.award_amount_min} ${cur}`;
  return 'See official source';
}

function parseArgs() {
  const target = Number(process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? '500');
  const waveSize = Number(process.argv.find((a) => a.startsWith('--wave-size='))?.split('=')[1] ?? '50');
  return { target, waveSize };
}

export async function selectCandidates(target: number, waveSize: number): Promise<AutopilotCandidate[]> {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const translatedIds = await fetchTranslatedScholarshipDetailSourceIds(db);

  const { data: rows, error } = await db
    .from('scholarships')
    .select(
      'id, slug, title, provider_name, award_amount_text, award_amount_min, award_amount_max, currency, deadline_text, deadline_date, is_indexable, url, provider_url, category_slug, description, seo_overview, summary_short, is_active'
    )
    .eq('is_indexable', true)
    .eq('is_active', true)
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5000);

  if (error) throw new Error(error.message);

  const scored: AutopilotCandidate[] = [];

  for (const row of rows ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    if (!slug || translatedIds.has(row.id) || slug.includes('test') || slug.includes('sample')) {
      continue;
    }

    const title = String(row.title ?? '').trim();
    const provider = String(row.provider_name ?? '').trim() || 'Provider listed on ScholarshipTop';
    const deadline =
      String(row.deadline_text ?? '').trim() ||
      (row.deadline_date ? String(row.deadline_date).slice(0, 10) : '') ||
      'See official source';
    const amount = formatAmount(row);
    const hasUrl = Boolean(String(row.url ?? '').trim() || String(row.provider_url ?? '').trim());
    const hasBody = Boolean(
      String(row.summary_short ?? '').trim() ||
        String(row.seo_overview ?? '').trim() ||
        String(row.description ?? '').trim()
    );

    let risk = 0;
    const skipReasons: string[] = [];
    if (!hasUrl) {
      risk += 2;
      skipReasons.push('no official URL');
    }
    if (!title) {
      risk += 3;
      skipReasons.push('missing title');
    }
    if (!hasBody) {
      risk += 1;
      skipReasons.push('thin description');
    }
    if (deadline.toLowerCase().includes('expired') || deadline.toLowerCase().includes('closed')) {
      risk += 4;
      skipReasons.push('possibly expired');
    }

    let completeness = 40;
    if (hasUrl) completeness += 15;
    if (hasBody) completeness += 15;
    if (amount !== 'See official source') completeness += 10;
    if (deadline !== 'See official source') completeness += 10;
    if (provider.length > 3) completeness += 10;
    if (row.category_slug) completeness += 5;

    const amountPresent = amount !== 'See official source';
    const deadlinePresent = deadline !== 'See official source';
    const include = risk <= 4 && title.length > 5 && hasBody;
    scored.push({
      rank: 0,
      wave: 0,
      slug,
      scholarship_uuid: row.id,
      title: title || slug,
      provider,
      amount,
      deadline,
      category: String(row.category_slug ?? '').trim(),
      source_url_present: hasUrl,
      amount_present: amountPresent,
      deadline_present: deadlinePresent,
      content_completeness: completeness,
      en_url: `https://scholarshiptop.com/scholarships/${slug}`,
      indexable_en: row.is_indexable !== false,
      completeness_score: completeness,
      risk_score: risk,
      tier: include && hasUrl && (amountPresent || deadlinePresent) ? 'A' : include ? 'B' : 'D',
      include_yes_no: include ? 'yes' : 'no',
      publish_allowed_yes_no: include ? 'yes' : 'no',
      skip_reason: include ? '' : skipReasons.join('; ') || 'high risk'
    });
  }

  scored.sort((a, b) => b.completeness_score - a.completeness_score || a.risk_score - b.risk_score);
  const picked = scored.filter((c) => c.include_yes_no === 'yes').slice(0, target);

  let wave = 0;
  picked.forEach((c, i) => {
    c.rank = i + 1;
    if (i % waveSize === 0) wave += 1;
    c.wave = wave;
  });

  return picked;
}

async function main() {
  const { target, waveSize } = parseArgs();
  const picked = await selectCandidates(target, waveSize);

  const header =
    'rank,wave,slug,scholarship_uuid,title,provider,amount,deadline,category,source_url_present,en_url,indexable_en,completeness_score,risk_score,include_yes_no,skip_reason\n';
  const lines = picked.map((c) =>
    [
      c.rank,
      c.wave,
      c.slug,
      c.scholarship_uuid,
      c.title,
      c.provider,
      c.amount,
      c.deadline,
      c.category,
      c.source_url_present ? 'yes' : 'no',
      c.en_url,
      c.indexable_en ? 'yes' : 'no',
      c.completeness_score,
      c.risk_score,
      c.include_yes_no,
      c.skip_reason
    ]
      .map(escapeCsv)
      .join(',')
  );

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const path = join(process.cwd(), 'reports/seo', `i18n-stage5e-6-autopilot-candidates-${DATE}.csv`);
  writeFileSync(path, header + lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${path} (${picked.length} candidates, ${Math.ceil(picked.length / waveSize)} waves)`);
}

if (process.argv[1]?.includes('select-candidates')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
