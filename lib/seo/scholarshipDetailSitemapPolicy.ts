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
  'provider_url',
  'provider_mission',
  'apply_url',
  'url',
  'award_amount_text',
  'award_amount_numeric_sort',
  'currency',
  'deadline_text',
  'deadline_date',
  'is_recurring',
  'requirements_count',
  'requirement_signals_count',
  'requirements_text',
  'requirements_text_clean',
  'requirements_html',
  'eligibility_text',
  'eligibility_html',
  'who_can_apply',
  'documents_required',
  'document_urls',
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
  'photo_required',
  'video_required',
  'link_required',
  'survey_required',
  'question_required',
  'goal_required',
  'special_eligibility_required',
  'study_levels',
  'field_of_study',
  'institution_types',
  'applicant_country_codes',
  'host_country_codes',
  'state_codes',
  'location_scope',
  'number_of_awards',
  'financial_need_considered',
  'status_text',
  'scholarship_status',
  'payment_details',
  'winner_payment_text',
  'ai_student_summary',
  'seo_excerpt',
  'seo_overview',
  'seo_eligibility'
].join(', ');

export const SCHOLARSHIP_DETAIL_SAFE_LISTING_SITEMAP_SELECT = [
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
  'days_until_deadline',
  'deadline_bucket',
  'is_recurring',
  'requirements_count',
  'requirement_signals_count',
  'requirements_text',
  'requirements_text_clean',
  'eligibility_text',
  'summary_short',
  'summary_long',
  'official_source_name',
  'updated_at',
  'created_at',
  'last_verified_at',
  'is_indexable',
  'payout_method',
  'document_required',
  'essay_required',
  'requires_essay',
  'transcript_required',
  'recommendation_required',
  'photo_required',
  'video_required',
  'link_required',
  'survey_required',
  'question_required',
  'goal_required',
  'special_eligibility_required',
  'study_levels',
  'field_of_study',
  'institution_types',
  'citizenship_statuses',
  'applicant_country_codes',
  'host_country_codes',
  'state_codes',
  'location_scope',
  'category',
  'tags',
  'category_slug',
  'scholarship_status',
  'winner_payment_text',
  'financial_need_considered',
  'requirement_types',
  'is_verified',
  'applicants_count',
  'credibility_score_text',
  'credibility_score',
  'credibility_bucket',
  'ranking_score',
  'seo_tags',
  'eligibility_tags',
  'catalog_education_levels',
  'gpa_requirement_min',
  'gpa_bucket',
  'easy_apply_flags',
  'location_tags',
  'listing_completeness_score',
  'listing_completeness_bucket',
  'applicants_count_is_estimated',
  'institution_id',
  'international_friendly_listing'
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
    .or('apply_url.not.is.null,url.not.is.null')
    .or(
      'requirements_text.not.is.null,requirements_text_clean.not.is.null,eligibility_text.not.is.null,who_can_apply.not.is.null,documents_required.not.is.null,document_required.eq.true,essay_required.eq.true,transcript_required.eq.true,recommendation_required.eq.true,provider_mission.not.is.null'
    )
    .or('summary_short.not.is.null,summary_long.not.is.null')
    .or(
      'provider_name.not.is.null,provider_slug.not.is.null,source.not.is.null,official_source_name.not.is.null'
    ) as T;
}

export function applyScholarshipDetailSafeListingSitemapCandidateFilters<
  T extends any
>(query: T): T {
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
      'requirements_text.not.is.null,requirements_text_clean.not.is.null,eligibility_text.not.is.null,document_required.eq.true,essay_required.eq.true,transcript_required.eq.true,recommendation_required.eq.true'
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
