/**
 * Tiered scholarship_detail candidate pool (Stage 5E-9 relaxed autopilot).
 * Usage: npx tsx scripts/i18n/scholarship-detail-autopilot/select-candidates-tiered.ts --audit
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { DATE, loadEnvLocal } from './env';
import { fetchTranslatedScholarshipDetailSourceIds } from './fetch-translated-source-ids';
import type { AutopilotCandidate, CandidateTier } from './types';

const PAGE = 1000;

function escapeCsv(v: string | number | boolean) {
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

type ScholarshipRow = {
  id: string;
  slug: string | null;
  title: string | null;
  provider_name: string | null;
  award_amount_text: string | null;
  award_amount_min: number | null;
  award_amount_max: number | null;
  currency: string | null;
  deadline_text: string | null;
  deadline_date: string | null;
  is_indexable: boolean | null;
  url: string | null;
  provider_url: string | null;
  category_slug: string | null;
  description: string | null;
  seo_overview: string | null;
  summary_short: string | null;
  is_active: boolean | null;
};

function bodyLength(row: ScholarshipRow): number {
  return (
    String(row.summary_short ?? '').trim().length +
    String(row.seo_overview ?? '').trim().length +
    String(row.description ?? '').trim().length
  );
}

function classifyTier(row: ScholarshipRow): {
  tier: CandidateTier;
  publish_allowed: boolean;
  skip_reason: string;
  risk: number;
  completeness: number;
  hasUrl: boolean;
  amountPresent: boolean;
  deadlinePresent: boolean;
  title: string;
  provider: string;
  amount: string;
  deadline: string;
} {
  const slug = String(row.slug ?? '').trim().toLowerCase();
  const title = String(row.title ?? '').trim();
  const providerRaw = String(row.provider_name ?? '').trim();
  const provider = providerRaw || '';
  const deadline =
    String(row.deadline_text ?? '').trim() ||
    (row.deadline_date ? String(row.deadline_date).slice(0, 10) : '') ||
    'See official source';
  const amount = formatAmount(row);
  const hasUrl = Boolean(String(row.url ?? '').trim() || String(row.provider_url ?? '').trim());
  const amountPresent = amount !== 'See official source';
  const deadlinePresent = deadline !== 'See official source';
  const bodyLen = bodyLength(row);
  const hasBody = bodyLen >= 80;
  const thinBody = bodyLen > 0 && bodyLen < 80;
  const indexable = row.is_indexable !== false && row.is_active !== false;

  let risk = 0;
  const reasons: string[] = [];

  if (!indexable) {
    return {
      tier: 'D',
      publish_allowed: false,
      skip_reason: 'non-indexable or inactive',
      risk: 99,
      completeness: 0,
      hasUrl,
      amountPresent,
      deadlinePresent,
      title,
      provider,
      amount,
      deadline
    };
  }
  if (!slug || slug.length < 4 || slug.includes('test') || slug.includes('sample')) {
    return {
      tier: 'D',
      publish_allowed: false,
      skip_reason: 'bad slug',
      risk: 99,
      completeness: 0,
      hasUrl,
      amountPresent,
      deadlinePresent,
      title,
      provider,
      amount,
      deadline
    };
  }
  if (!title || title.length < 5) {
    return {
      tier: 'D',
      publish_allowed: false,
      skip_reason: 'missing title',
      risk: 99,
      completeness: 0,
      hasUrl,
      amountPresent,
      deadlinePresent,
      title,
      provider,
      amount,
      deadline
    };
  }
  if (!provider || provider.length < 3) {
    return {
      tier: 'D',
      publish_allowed: false,
      skip_reason: 'missing provider',
      risk: 99,
      completeness: 0,
      hasUrl,
      amountPresent,
      deadlinePresent,
      title,
      provider,
      amount,
      deadline
    };
  }

  if (deadline.toLowerCase().includes('expired') || deadline.toLowerCase().includes('closed')) {
    risk += 5;
    reasons.push('possibly expired');
  }
  if (!hasUrl) {
    risk += 2;
    reasons.push('no official URL');
  }
  if (!amountPresent && !deadlinePresent) {
    risk += 2;
    reasons.push('missing amount and deadline');
  }
  if (thinBody) {
    risk += 2;
    reasons.push('thin content');
  }
  if (!hasBody && bodyLen === 0) {
    risk += 4;
    reasons.push('no description');
  }
  if (provider.toLowerCase().includes('unknown') || provider.toLowerCase().includes('tbd')) {
    risk += 3;
    reasons.push('uncertain provider');
  }

  let completeness = 35;
  if (hasUrl) completeness += 15;
  if (hasBody) completeness += 20;
  else if (thinBody) completeness += 8;
  if (amountPresent) completeness += 10;
  if (deadlinePresent) completeness += 10;
  if (provider.length > 3) completeness += 10;
  if (row.category_slug) completeness += 5;

  if (risk >= 8 || !hasBody) {
    return {
      tier: 'C',
      publish_allowed: false,
      skip_reason: reasons.join('; ') || 'review_required',
      risk,
      completeness,
      hasUrl,
      amountPresent,
      deadlinePresent,
      title,
      provider,
      amount,
      deadline
    };
  }

  const tierA =
    hasUrl &&
    (amountPresent || deadlinePresent) &&
    hasBody &&
    risk <= 2 &&
    !reasons.includes('possibly expired');

  if (tierA) {
    return {
      tier: 'A',
      publish_allowed: true,
      skip_reason: '',
      risk,
      completeness,
      hasUrl,
      amountPresent,
      deadlinePresent,
      title,
      provider,
      amount,
      deadline
    };
  }

  if (hasBody && risk <= 6) {
    return {
      tier: 'B',
      publish_allowed: true,
      skip_reason: reasons.join('; ') || '',
      risk,
      completeness,
      hasUrl,
      amountPresent,
      deadlinePresent,
      title,
      provider,
      amount,
      deadline
    };
  }

  return {
    tier: 'C',
    publish_allowed: false,
    skip_reason: reasons.join('; ') || 'review_required',
    risk,
    completeness,
    hasUrl,
    amountPresent,
    deadlinePresent,
    title,
    provider,
    amount,
    deadline
  };
}

async function fetchAllScholarships(db: ReturnType<typeof createClient>) {
  const all: ScholarshipRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('scholarships')
      .select(
        'id, slug, title, provider_name, award_amount_text, award_amount_min, award_amount_max, currency, deadline_text, deadline_date, is_indexable, url, provider_url, category_slug, description, seo_overview, summary_short, is_active'
      )
      .eq('is_indexable', true)
      .eq('is_active', true)
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...(data as ScholarshipRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export type TierAudit = {
  all: AutopilotCandidate[];
  tierCounts: Record<CandidateTier, number>;
  publishable: AutopilotCandidate[];
};

export async function auditTieredPool(): Promise<TierAudit> {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const translatedIds = await fetchTranslatedScholarshipDetailSourceIds(db);

  const rows = await fetchAllScholarships(db);
  const all: AutopilotCandidate[] = [];
  const tierCounts: Record<CandidateTier, number> = { A: 0, B: 0, C: 0, D: 0 };

  for (const row of rows) {
    const slug = String(row.slug ?? '').trim().toLowerCase();
    if (!slug || translatedIds.has(row.id)) continue;

    const c = classifyTier(row);
    tierCounts[c.tier]++;

    all.push({
      rank: 0,
      wave: 0,
      slug,
      scholarship_uuid: row.id,
      title: c.title || slug,
      provider: c.provider || 'Provider listed on ScholarshipTop',
      amount: c.amount,
      deadline: c.deadline,
      category: String(row.category_slug ?? '').trim(),
      source_url_present: c.hasUrl,
      amount_present: c.amountPresent,
      deadline_present: c.deadlinePresent,
      content_completeness: c.completeness,
      en_url: `https://scholarshiptop.com/scholarships/${slug}`,
      indexable_en: row.is_indexable !== false,
      completeness_score: c.completeness,
      risk_score: c.risk,
      tier: c.tier,
      include_yes_no: c.publish_allowed ? 'yes' : 'no',
      publish_allowed_yes_no: c.publish_allowed ? 'yes' : 'no',
      skip_reason: c.skip_reason
    });
  }

  const publishable = all
    .filter((c) => c.publish_allowed_yes_no === 'yes')
    .sort(
      (a, b) =>
        (a.tier === 'A' ? 0 : 1) - (b.tier === 'A' ? 0 : 1) ||
        b.completeness_score - a.completeness_score ||
        a.risk_score - b.risk_score
    );

  return { all, tierCounts, publishable };
}

export async function selectTieredCandidates(
  target: number,
  waveSize: number
): Promise<AutopilotCandidate[]> {
  const { publishable } = await auditTieredPool();
  const picked = publishable.slice(0, target);

  let wave = 0;
  picked.forEach((c, i) => {
    c.rank = i + 1;
    if (i % waveSize === 0) wave += 1;
    c.wave = wave;
  });

  return picked;
}

export function writeTieredPoolCsv(all: AutopilotCandidate[], path: string) {
  const header =
    'tier,slug,uuid,title,provider,amount_present,deadline_present,source_url_present,content_completeness,indexable_en,risk_score,publish_allowed_yes_no,skip_reason\n';
  const lines = all.map((c) =>
    [
      c.tier,
      c.slug,
      c.scholarship_uuid,
      c.title,
      c.provider,
      c.amount_present ? 'yes' : 'no',
      c.deadline_present ? 'yes' : 'no',
      c.source_url_present ? 'yes' : 'no',
      c.content_completeness,
      c.indexable_en ? 'yes' : 'no',
      c.risk_score,
      c.publish_allowed_yes_no,
      c.skip_reason
    ]
      .map(escapeCsv)
      .join(',')
  );
  mkdirSync(join(process.cwd(), 'reports/seo'), { recursive: true });
  writeFileSync(path, header + lines.join('\n') + '\n', 'utf8');
}

async function main() {
  const auditOnly = process.argv.includes('--audit');
  const target = Number(process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? '2000');
  const waveSize = Number(process.argv.find((a) => a.startsWith('--wave-size='))?.split('=')[1] ?? '50');

  const { all, tierCounts, publishable } = await auditTieredPool();
  const csvPath = join(
    process.cwd(),
    'reports/seo',
    `i18n-stage5e-9-scholarship-candidate-pool-expanded-${DATE}.csv`
  );
  writeTieredPoolCsv(all, csvPath);

  console.log('Tier counts (untranslated indexable):', tierCounts);
  console.log('Publishable A+B:', publishable.length, `(A=${publishable.filter((c) => c.tier === 'A').length}, B=${publishable.filter((c) => c.tier === 'B').length})`);
  console.log('Wrote', csvPath);

  if (!auditOnly) {
    const picked = await selectTieredCandidates(target, waveSize);
    console.log(`Selected ${picked.length} for autopilot (${Math.ceil(picked.length / waveSize)} waves)`);
  }
}

if (process.argv[1]?.includes('select-candidates-tiered')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
