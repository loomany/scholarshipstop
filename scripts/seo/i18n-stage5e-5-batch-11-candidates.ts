/**
 * Select 10 candidates for scholarship_detail batch 11.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

import { SCHOLARSHIP_DETAIL_PILOT_SLUGS } from '@/lib/i18n/scholarshipPilot/scholarshipPilotSlugs';

const DATE = '2026-05-23';
const BATCH = 11;

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

async function main() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const pilotSet = new Set<string>(SCHOLARSHIP_DETAIL_PILOT_SLUGS);
  const { data: translated } = await db
    .from('content_translations')
    .select('source_id')
    .eq('source_type', 'scholarship_detail')
    .in('locale', ['es', 'fr']);
  const translatedIds = new Set((translated ?? []).map((r) => r.source_id));

  const { data: rows, error } = await db
    .from('scholarships')
    .select(
      'id, slug, title, provider_name, award_amount_text, award_amount_min, award_amount_max, currency, deadline_text, deadline_date, is_indexable, url, provider_url, category_slug, description, seo_overview, summary_short, is_active'
    )
    .eq('is_indexable', true)
    .eq('is_active', true)
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1500);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  type Cand = {
    slug: string;
    id: string;
    title: string;
    provider: string;
    amount: string;
    deadline: string;
    source_url_present: boolean;
    risk_score: number;
    reason: string;
    score: number;
  };

  const candidates: Cand[] = [];

  for (const row of rows ?? []) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    if (!slug || pilotSet.has(slug) || translatedIds.has(row.id)) continue;
    if (slug.includes('test') || slug.includes('sample')) continue;

    const title = String(row.title ?? '').trim();
    const provider = String(row.provider_name ?? '').trim() || 'Provider listed on ScholarshipTop';
    const deadline =
      String(row.deadline_text ?? '').trim() ||
      (row.deadline_date ? String(row.deadline_date).slice(0, 10) : '') ||
      'See official source';
    const amount = formatAmount(row);
    const hasUrl = Boolean(
      String(row.url ?? '').trim() || String(row.provider_url ?? '').trim()
    );
    const hasBody = Boolean(
      String(row.summary_short ?? '').trim() ||
        String(row.seo_overview ?? '').trim() ||
        String(row.description ?? '').trim()
    );

    let risk = 0;
    const reasons: string[] = [];
    if (!hasUrl) {
      risk += 2;
      reasons.push('no official URL');
    }
    if (!title) {
      risk += 3;
      reasons.push('missing title');
    }
    if (deadline === 'See official source') {
      risk += 1;
      reasons.push('unclear deadline');
    }
    if (amount === 'See official source') {
      risk += 1;
      reasons.push('unclear amount');
    }
    if (!hasBody) {
      risk += 1;
      reasons.push('thin description');
    }
    if (deadline.toLowerCase().includes('expired') || deadline.toLowerCase().includes('closed')) {
      risk += 4;
      reasons.push('possibly expired');
    }

    let score = 100 - risk * 8;
    if (hasUrl) score += 5;
    if (hasBody) score += 5;
    if (provider.length > 3) score += 3;

    if (risk > 4 || title.length <= 5) continue;

    candidates.push({
      slug,
      id: row.id,
      title: title || slug,
      provider,
      amount,
      deadline,
      source_url_present: hasUrl,
      risk_score: risk,
      reason: 'indexable with stable fields',
      score
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const picked = candidates.slice(0, 10);
  if (picked.length !== 10) {
    console.error(`Need 10 candidates, got ${picked.length}`);
    process.exit(1);
  }

  const header =
    'batch_number,slug,scholarship_uuid,title,provider,amount,deadline,source_url_present,indexable_en,risk_score,include_yes_no,reason\n';
  const lines = picked.map((c) =>
    [
      String(BATCH),
      c.slug,
      c.id,
      c.title,
      c.provider,
      c.amount,
      c.deadline,
      c.source_url_present ? 'yes' : 'no',
      'yes',
      String(c.risk_score),
      'yes',
      c.reason
    ]
      .map(escapeCsv)
      .join(',')
  );

  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-scholarship-detail-batch-11-candidates-${DATE}.csv`
  );
  writeFileSync(csvPath, header + lines.join('\n') + '\n', 'utf8');
  console.log('Wrote', csvPath);
  picked.forEach((c, i) => console.log(`${i + 1}. ${c.slug}`));
}

main();
