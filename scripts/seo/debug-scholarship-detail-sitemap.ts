import { createPublicClient } from '@/utils/supabase/public';
import {
  mapScholarshipRow,
  type ScholarshipRow
} from '@/lib/scholarships/supabase';
import {
  applyScholarshipDetailSitemapCandidateFilters,
  getScholarshipDetailSitemapDecision,
  SCHOLARSHIP_DETAIL_SITEMAP_SELECT
} from '@/lib/seo/scholarshipDetailSitemapPolicy';

const PAGE_SIZE = 1000;
const SAMPLE_LIMIT = 20;

type DebugRow = Partial<ScholarshipRow> & Pick<ScholarshipRow, 'id' | 'slug'>;

type ExcludedSample = {
  slug: string | null;
  title: string | null;
  reasonCodes: string[];
};

function getPublicClientOrThrow() {
  const supabase = createPublicClient();
  if (!supabase) {
    throw new Error('Public Supabase client is not configured.');
  }
  return supabase;
}

async function countRawCandidateRows(): Promise<number> {
  const supabase = getPublicClientOrThrow();
  const { count, error } = await supabase
    .from('scholarships_safe_listing' as unknown as 'scholarships')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

async function fetchRows(): Promise<DebugRow[]> {
  const supabase = getPublicClientOrThrow();

  const rows: DebugRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await applyScholarshipDetailSitemapCandidateFilters(
      supabase
        .from('scholarships_safe_listing' as unknown as 'scholarships')
        .select(SCHOLARSHIP_DETAIL_SITEMAP_SELECT)
    )
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const batch = (data ?? []) as unknown as DebugRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

function reasonBucket(
  reasonCodes: string[]
): 'expired' | 'missing_required' | 'weak' {
  if (
    reasonCodes.includes('expired_date_guard') ||
    reasonCodes.includes('expired_without_future_cycle')
  ) {
    return 'expired';
  }
  if (
    reasonCodes.some((reason) =>
      [
        'missing_slug',
        'missing_award',
        'missing_or_expired_deadline',
        'missing_eligibility',
        'missing_provider',
        'missing_original_summary',
        'low_fact_count',
        'many_missing_fields'
      ].includes(reason)
    )
  ) {
    return 'missing_required';
  }
  return 'weak';
}

async function main() {
  const rawCandidateRows = await countRawCandidateRows();
  const rows = await fetchRows();
  const validSlugRows = rows.filter((row) => Boolean(row.slug?.trim()));
  const localeFilteredRows = validSlugRows;
  const routeFilteredRows = localeFilteredRows;
  const beforePolicyRows = routeFilteredRows.filter(
    (row) => row.is_indexable !== false
  );

  const included: string[] = [];
  const excluded: ExcludedSample[] = [];
  const buckets = {
    policyIndexable: 0,
    weakThin: 0,
    expired: 0,
    missingRequiredFields: 0
  };

  for (const row of routeFilteredRows) {
    const decision = getScholarshipDetailSitemapDecision(row);
    if (decision.include) {
      buckets.policyIndexable += 1;
      if (included.length < SAMPLE_LIMIT) {
        const scholarship = mapScholarshipRow(row as ScholarshipRow);
        included.push(`/scholarships/${scholarship.slug ?? scholarship.id}`);
      }
      continue;
    }

    const bucket = reasonBucket(decision.reasonCodes);
    if (bucket === 'expired') buckets.expired += 1;
    if (bucket === 'missing_required') buckets.missingRequiredFields += 1;
    if (bucket === 'weak') buckets.weakThin += 1;

    if (excluded.length < SAMPLE_LIMIT) {
      excluded.push({
        slug: row.slug ?? null,
        title: row.title ?? null,
        reasonCodes: decision.reasonCodes
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        source: 'scholarships_safe_listing',
        rawCandidateRows,
        rowsAfterSafeCandidatePrefilter: rows.length,
        rowsWithValidSlug: validSlugRows.length,
        rowsAfterLocaleLanguageFilter: localeFilteredRows.length,
        rowsAfterRouteCategoryFilters: routeFilteredRows.length,
        rowsBeforeDetailIndexPolicy: beforePolicyRows.length,
        rowsWherePolicyIndexable: buckets.policyIndexable,
        rowsExcludedAsWeakThin: buckets.weakThin,
        rowsExcludedAsExpired: buckets.expired,
        rowsExcludedForMissingRequiredFields: buckets.missingRequiredFields,
        finalUrlCount: buckets.policyIndexable,
        firstIncludedUrls: included,
        firstExcludedRows: excluded
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
