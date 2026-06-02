import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import {
  mapScholarshipRow,
  type ScholarshipRow
} from '@/lib/scholarships/supabase';
import { getScholarshipDetailIndexPolicy } from '@/lib/seo/scholarshipSeoQualityPolicy';

export const SCHOLARSHIP_DETAIL_SITEMAP_SELECT = [
  'id',
  'slug',
  'title',
  'source',
  'provider_name',
  'provider_slug',
  'award_amount_text',
  'award_amount_numeric_sort',
  'currency',
  'deadline_text',
  'deadline_date',
  'is_recurring',
  'requirements_count',
  'requirements_text',
  'requirements_text_clean',
  'eligibility_text',
  'summary_short',
  'summary_long',
  'official_source_name',
  'updated_at',
  'is_indexable',
  'payout_method',
  'document_required',
  'essay_required',
  'transcript_required',
  'recommendation_required',
  'study_levels',
  'field_of_study',
  'applicant_country_codes',
  'host_country_codes'
].join(', ');

export type ScholarshipDetailSitemapRow = Partial<ScholarshipRow> &
  Pick<ScholarshipRow, 'id' | 'slug'>;

export type ScholarshipDetailSitemapDecision = {
  include: boolean;
  reasonCodes: string[];
  publicPath: string | null;
  updatedAt: string | null;
};

export function isExpiredScholarshipSitemapRow(
  row: ScholarshipDetailSitemapRow
): boolean {
  if (row.is_recurring === true) return false;
  const deadline = row.deadline_date?.trim();
  if (!deadline) return false;
  return deadline < new Date().toISOString().slice(0, 10);
}

export function applyScholarshipDetailSitemapCandidateFilters<T extends any>(
  query: T
): T {
  const today = new Date().toISOString().slice(0, 10);
  return (query as any)
    .eq('is_active', true)
    .not('slug', 'is', null)
    .neq('slug', '')
    .or('is_indexable.is.null,is_indexable.eq.true')
    .or(`deadline_date.is.null,deadline_date.gte.${today},is_recurring.eq.true`)
    .or(
      'award_amount_text.not.is.null,award_amount_numeric_sort.not.is.null,payout_method.eq.non_monetary'
    )
    .or(
      'requirements_count.gt.0,requirements_text.not.is.null,eligibility_text.not.is.null'
    )
    .or('summary_short.not.is.null,summary_long.not.is.null')
    .or(
      'provider_name.not.is.null,provider_slug.not.is.null,source.not.is.null,official_source_name.not.is.null'
    ) as T;
}

export function getScholarshipDetailSitemapDecision(
  row: ScholarshipDetailSitemapRow
): ScholarshipDetailSitemapDecision {
  const reasons: string[] = [];
  if (!row.slug?.trim()) reasons.push('missing_slug');
  if (row.is_indexable === false) reasons.push('explicit_noindex');
  if (isExpiredScholarshipSitemapRow(row)) reasons.push('expired_date_guard');
  if (reasons.length > 0) {
    return {
      include: false,
      reasonCodes: reasons,
      publicPath: null,
      updatedAt: row.updated_at ?? null
    };
  }

  const scholarship = mapScholarshipRow(
    row as unknown as Parameters<typeof mapScholarshipRow>[0]
  );
  const policy = getScholarshipDetailIndexPolicy(scholarship);
  return {
    include: policy.indexable,
    reasonCodes: policy.indexable
      ? ['detail_policy_indexable']
      : policy.reasonCodes,
    publicPath: policy.indexable ? scholarshipPublicPath(scholarship) : null,
    updatedAt: scholarship.updatedAt ?? null
  };
}
