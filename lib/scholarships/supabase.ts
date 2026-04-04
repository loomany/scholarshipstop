import type { Database, Json } from '@/types_db';
import type {
  Scholarship,
  ScholarshipSeoFaqItem
} from '@/app/scholarships/scholarshipsData';
import { normalizeCategoryId } from '@/app/scholarships/scholarshipCategories';
import { sanitizeRequirementLines } from '@/lib/scholarships/scholarshipText';
import { buildScholarshipCatalog } from '@/lib/scholarships/scholarshipCatalog';
import type { ScholarshipDbCatalogFields } from '@/lib/scholarships/scholarshipCatalogTypes';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

export type ScholarshipRow = Database['public']['Tables']['scholarships']['Row'];
export type ScholarshipMatchScoreRow = Pick<
  ScholarshipRow,
  | 'id'
  | 'field_of_study'
  | 'study_levels'
  | 'catalog_education_levels'
  | 'citizenship_statuses'
  | 'gpa_requirement_min'
  | 'essay_required'
  | 'requirements_count'
  | 'requirement_signals_count'
  | 'easy_apply_flags'
  | 'state_territory_text'
  | 'state_codes'
>;

export { sanitizeRequirementLines };

/**
 * PostgREST limits rows per HTTP response (Supabase default `max_rows` = 1000 in
 * `supabase/config.toml`). Requests without `.range()` silently truncate here.
 * We page in chunks of this size until a short batch — not a cap on total rows.
 */
const SCHOLARSHIPS_DB_PAGE_SIZE = 1000;

const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function seoFaqFromJson(value: Json | null | undefined): ScholarshipSeoFaqItem[] {
  if (!value || !Array.isArray(value)) return [];
  const out: ScholarshipSeoFaqItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const qRaw =
      (typeof o.question === 'string' && o.question) ||
      (typeof o.q === 'string' && o.q) ||
      '';
    const aRaw =
      (typeof o.answer === 'string' && o.answer) ||
      (typeof o.a === 'string' && o.a) ||
      '';
    const question = qRaw.trim();
    const answer = aRaw.trim();
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

const LISTING_CARD_SELECT_COLUMNS = [
  'id',
  'slug',
  'source',
  'title',
  'provider_name',
  'provider_url',
  'award_amount_text',
  'award_amount_numeric_sort',
  'deadline_text',
  'deadline_date',
  'days_until_deadline',
  'deadline_bucket',
  'requirements_count',
  'requirement_signals_count',
  'applicants_count',
  'credibility_score_text',
  'credibility_score',
  'credibility_bucket',
  'ranking_score',
  'requirement_types',
  'essay_required',
  'document_required',
  'photo_required',
  'video_required',
  'link_required',
  'survey_required',
  'question_required',
  'goal_required',
  'special_eligibility_required',
  'transcript_required',
  'recommendation_required',
  'payout_method',
  'is_verified',
  'is_recurring',
  'winner_payment_text',
  'summary_short',
  'apply_url',
  'url',
  'provider_social_facebook',
  'provider_social_instagram',
  'provider_social_linkedin',
  'category',
  'tags',
  'scholarship_status',
  'category_slug',
  'updated_at',
  'created_at',
  'last_verified_at',
  'is_indexable',
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
  'study_levels',
  'field_of_study',
  'citizenship_statuses',
  'location_scope',
  'state_codes',
  'ai_match_score',
  'ai_match_band'
];

/**
 * Listing/card payload only — no long text, HTML, AI, or raw blobs.
 * `mapScholarshipRow` tolerates missing columns (undefined → empty / derived from counts).
 */
export const LIST_CARD_SELECT = LISTING_CARD_SELECT_COLUMNS.join(', ');

/**
 * Match/scoring payload — only fields used by `matchScholarship`, `isEasyApplyScholarship`,
 * and lightweight card mapping for result merge/order.
 */
export const MATCH_SCORE_SELECT = [
  'id',
  'essay_required',
  'requirements_count',
  'requirement_signals_count',
  'catalog_education_levels',
  'gpa_requirement_min',
  'easy_apply_flags',
  'study_levels',
  'field_of_study',
  'citizenship_statuses',
  'state_territory_text',
  'state_codes'
].join(', ');

/**
 * Active-catalog payload for server/script consumers that still need broad scholarship records,
 * but not full HTML/AI/detail blobs.
 */
export const ACTIVE_CATALOG_SELECT = [
  ...LISTING_CARD_SELECT_COLUMNS,
  'provider_mission',
  'payment_details',
  'description',
  'status_text',
  'institutions_text',
  'state_territory_text',
  'ai_match_score',
  'ai_match_band',
  'ai_urgency_level',
  'ai_difficulty_level'
].join(', ');

/**
 * Detail payload for scholarship detail pages and detail metadata.
 * Explicitly list columns instead of `*` to avoid over-reading unrelated row data.
 */
export const DETAIL_SELECT = [
  ...LISTING_CARD_SELECT_COLUMNS,
  'provider_mission',
  'payment_details',
  'description',
  'requirements_text',
  'status_text',
  'institutions_text',
  'state_territory_text',
  'support_email',
  'support_phone',
  'eligibility_text',
  'awards_text',
  'notification_text',
  'selection_criteria_text',
  'description_html',
  'eligibility_html',
  'awards_html',
  'notification_html',
  'payment_html',
  'requirements_html',
  'selection_criteria_html',
  'full_content_html',
  'summary_long',
  'who_can_apply',
  'notification_details',
  'documents_required',
  'requirements_text_clean',
  'official_source_name',
  'number_of_awards',
  'financial_need_considered',
  'ai_student_summary',
  'ai_best_for',
  'ai_key_highlights',
  'ai_eligibility_summary',
  'ai_important_checks',
  'ai_application_tips',
  'ai_why_apply',
  'ai_red_flags',
  'ai_missing_info',
  'ai_urgency_level',
  'ai_difficulty_level',
  'ai_match_score',
  'ai_match_band',
  'ai_score_explanation',
  'ai_confidence_score',
  'seo_excerpt',
  'seo_overview',
  'seo_eligibility',
  'seo_application',
  'seo_faq',
  'provider_slug',
  'source_id'
].join(', ');

/**
 * Inner join to `scholarship_categories` for L2 subject category pages (PostgREST embed).
 * Filter with `.eq('scholarship_categories.category_id', uuid)` on the query builder.
 */
export function scholarshipListSelectWithCatalogSubjectJoin(): string {
  return `${LIST_CARD_SELECT},scholarship_categories!inner(category_id)`;
}

function buildCategories(
  category: string | null,
  tags: Json | null
): string[] | undefined {
  const candidates: string[] = [];
  if (category?.trim()) candidates.push(category.trim());
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (typeof t === 'string' && t.trim()) candidates.push(t.trim());
    }
  }
  const ids = new Set<string>();
  for (const c of candidates) {
    const id = normalizeCategoryId(c);
    if (id) ids.add(id);
  }
  return ids.size > 0 ? Array.from(ids) : undefined;
}

function eligibilityFromRow(
  requirements_text: string | null,
  requirements_count: number | null
): string[] {
  const lines = sanitizeRequirementLines(requirements_text ?? undefined);
  if (lines.length > 0) return lines;
  if (requirements_count != null && requirements_count > 0) {
    return [
      `${requirements_count} requirement${
        requirements_count === 1 ? '' : 's'
      }; see the official page for full details.`
    ];
  }
  return [];
}

function listRequirementsSummaryFromRow(
  requirements_text: string | null,
  requirements_count: number | null
): string | undefined {
  const lines = sanitizeRequirementLines(requirements_text ?? undefined);
  if (lines.length > 0) {
    return `${lines.length} requirement${
      lines.length === 1 ? '' : 's'
    }: Listed in detail`;
  }
  if (requirements_count != null && requirements_count > 0) {
    return `${requirements_count} requirement${
      requirements_count === 1 ? '' : 's'
    }: See detail`;
  }
  return undefined;
}

function socialLinksFromRow(row: ScholarshipRow): Scholarship['socialLinks'] {
  const facebook = row.provider_social_facebook?.trim() || undefined;
  const instagram = row.provider_social_instagram?.trim() || undefined;
  const linkedin = row.provider_social_linkedin?.trim() || undefined;
  if (!facebook && !instagram && !linkedin) return undefined;
  return { facebook, instagram, linkedin };
}

export function mapScholarshipRow(row: ScholarshipRow): Scholarship {
  const eligibility = eligibilityFromRow(
    row.requirements_text,
    row.requirements_count
  );
  const awardText = row.award_amount_text?.trim() || '';
  const deadlineText = row.deadline_text?.trim() || '';
  const deadlineAt = row.deadline_date
    ? `${row.deadline_date}T12:00:00.000Z`
    : undefined;

  const dbCatalog: ScholarshipDbCatalogFields = {
    seo_tags: row.seo_tags ?? null,
    eligibility_tags: row.eligibility_tags ?? null,
    catalog_education_levels: row.catalog_education_levels ?? null,
    gpa_requirement_min: row.gpa_requirement_min ?? null,
    gpa_bucket: row.gpa_bucket ?? null,
    easy_apply_flags: row.easy_apply_flags ?? null,
    location_tags: row.location_tags ?? null,
    listing_completeness_score: row.listing_completeness_score ?? null,
    listing_completeness_bucket: row.listing_completeness_bucket ?? null,
    applicants_count_is_estimated: row.applicants_count_is_estimated ?? null
  };

  const base: Scholarship = {
    seoTags: row.seo_tags ?? undefined,
    id: row.id,
    title: row.title?.trim() || 'Untitled scholarship',
    country: 'USA',
    deadline: deadlineText,
    deadlineAt,
    description: row.description?.trim() ?? '',
    eligibility,
    benefits: '',
    howToApply: [],
    applyLink: row.apply_url?.trim() || undefined,
    listingUrl: row.url?.trim() || undefined,
    provider: row.provider_name?.trim() || undefined,
    providerUrl: row.provider_url?.trim() || undefined,
    amount: awardText || undefined,
    awardAmount: awardText || undefined,
    applicantCount:
      row.applicants_count != null && !Number.isNaN(row.applicants_count)
        ? row.applicants_count
        : undefined,
    verified: Boolean(row.is_verified),
    recurring: Boolean(row.is_recurring),
    listRequirementsSummary: listRequirementsSummaryFromRow(
      row.requirements_text,
      row.requirements_count
    ),
    credibilityLabel: row.credibility_score_text?.trim() || undefined,
    winnerPayment: row.winner_payment_text?.trim() || undefined,
    providerMission: row.provider_mission?.trim() || undefined,
    socialLinks: socialLinksFromRow(row),
    categories: buildCategories(row.category, row.tags),
    categorySlug: row.category_slug?.trim().toLowerCase() || null,
    source: row.source ?? null,
    updatedAt: row.updated_at ?? null,
    createdAt: row.created_at ?? null,
    statusText: row.status_text?.trim() || undefined,
    institutionsText: row.institutions_text?.trim() || undefined,
    stateTerritoryText: row.state_territory_text?.trim() || undefined,
    supportEmail: row.support_email?.trim() || undefined,
    supportPhone: row.support_phone?.trim() || undefined,
    eligibilityText: row.eligibility_text?.trim() || undefined,
    awardsText: row.awards_text?.trim() || undefined,
    notificationText: row.notification_text?.trim() || undefined,
    selectionCriteriaText: row.selection_criteria_text?.trim() || undefined,
    descriptionHtml: row.description_html?.trim() || undefined,
    eligibilityHtml: row.eligibility_html?.trim() || undefined,
    awardsHtml: row.awards_html?.trim() || undefined,
    notificationHtml: row.notification_html?.trim() || undefined,
    paymentHtml: row.payment_html?.trim() || undefined,
    requirementsHtml: row.requirements_html?.trim() || undefined,
    selectionCriteriaHtml: row.selection_criteria_html?.trim() || undefined,
    fullContentHtml: row.full_content_html?.trim() || undefined,
    requirementsCount:
      row.requirements_count != null && !Number.isNaN(row.requirements_count)
        ? row.requirements_count
        : undefined,
    slug: row.slug?.trim() || undefined,
    providerSlug: row.provider_slug?.trim() || undefined,
    scholarshipStatus: row.scholarship_status?.trim() || undefined,
    daysUntilDeadline:
      row.days_until_deadline != null && !Number.isNaN(row.days_until_deadline)
        ? row.days_until_deadline
        : undefined,
    deadlineBucket: row.deadline_bucket?.trim() || undefined,
    awardAmountNumericSort:
      row.award_amount_numeric_sort != null &&
      !Number.isNaN(Number(row.award_amount_numeric_sort))
        ? Number(row.award_amount_numeric_sort)
        : undefined,
    payoutMethod: row.payout_method?.trim() || undefined,
    credibilityScore:
      row.credibility_score != null && !Number.isNaN(row.credibility_score)
        ? row.credibility_score
        : undefined,
    credibilityBucket: row.credibility_bucket?.trim() || undefined,
    rankingScore:
      row.ranking_score != null && !Number.isNaN(row.ranking_score)
        ? row.ranking_score
        : undefined,
    requirementTypes: jsonStringArray(row.requirement_types),
    requirementSignalsCount:
      row.requirement_signals_count != null &&
      !Number.isNaN(row.requirement_signals_count)
        ? row.requirement_signals_count
        : undefined,
    summaryShort: row.summary_short?.trim() || undefined,
    summaryLong: row.summary_long?.trim() || undefined,
    whoCanApplyText: row.who_can_apply?.trim() || undefined,
    notificationDetails: row.notification_details?.trim() || undefined,
    paymentDetails: row.payment_details?.trim() || undefined,
    documentsRequired: jsonStringArray(row.documents_required),
    requirementsTextClean: row.requirements_text_clean?.trim() || undefined,
    officialSourceName: row.official_source_name?.trim() || undefined,
    lastVerifiedAt: row.last_verified_at ?? undefined,
    isIndexable: row.is_indexable ?? true,
    studyLevels: jsonStringArray(row.study_levels),
    fieldOfStudy: jsonStringArray(row.field_of_study),
    citizenshipStatuses: jsonStringArray(row.citizenship_statuses),
    locationScope: row.location_scope?.trim() || undefined,
    stateCodes: jsonStringArray(row.state_codes),
    institutionTypes: jsonStringArray(row.institution_types),
    numberOfAwards:
      row.number_of_awards != null && !Number.isNaN(row.number_of_awards)
        ? row.number_of_awards
        : undefined,
    essayRequired: Boolean(row.essay_required),
    documentRequired: Boolean(row.document_required),
    photoRequired: Boolean(row.photo_required),
    videoRequired: Boolean(row.video_required),
    linkRequired: Boolean(row.link_required),
    surveyRequired: Boolean(row.survey_required),
    questionRequired: Boolean(row.question_required),
    goalRequired: Boolean(row.goal_required),
    specialEligibilityRequired: Boolean(row.special_eligibility_required),
    transcriptRequired: Boolean(row.transcript_required),
    recommendationRequired: Boolean(row.recommendation_required),
    financialNeedConsidered: Boolean(row.financial_need_considered),
    aiStudentSummary: row.ai_student_summary?.trim() || undefined,
    aiBestFor: jsonStringArray(row.ai_best_for),
    aiKeyHighlights: jsonStringArray(row.ai_key_highlights),
    aiEligibilitySummary: jsonStringArray(row.ai_eligibility_summary),
    aiImportantChecks: jsonStringArray(row.ai_important_checks),
    aiApplicationTips: jsonStringArray(row.ai_application_tips),
    aiWhyApply: jsonStringArray(row.ai_why_apply),
    aiRedFlags: jsonStringArray(row.ai_red_flags),
    aiMissingInfo: jsonStringArray(row.ai_missing_info),
    aiUrgencyLevel: row.ai_urgency_level?.trim() || undefined,
    aiDifficultyLevel: row.ai_difficulty_level?.trim() || undefined,
    aiMatchScore:
      row.ai_match_score != null && !Number.isNaN(Number(row.ai_match_score))
        ? Math.round(Number(row.ai_match_score))
        : undefined,
    aiMatchBand: row.ai_match_band?.trim() || undefined,
    aiScoreExplanation: row.ai_score_explanation?.trim() || undefined,
    aiConfidenceScore:
      row.ai_confidence_score != null &&
      !Number.isNaN(Number(row.ai_confidence_score))
        ? Number(row.ai_confidence_score)
        : undefined,
    seoExcerpt: row.seo_excerpt?.trim() || undefined,
    seoOverview: row.seo_overview?.trim() || undefined,
    seoEligibility: row.seo_eligibility?.trim() || undefined,
    seoApplication: row.seo_application?.trim() || undefined,
    seoFaq: seoFaqFromJson(row.seo_faq),
    applicantsCountIsEstimated: Boolean(row.applicants_count_is_estimated)
  };

  const scholarshipCatalog = buildScholarshipCatalog(base, dbCatalog);

  return {
    ...base,
    categories: scholarshipCatalog.categorySlugs,
    requirementTypes: scholarshipCatalog.requirementTypesNormalized,
    scholarshipCatalog
  };
}

export async function fetchScholarshipsByCategorySlug(
  categorySlug: string
): Promise<Scholarship[]> {
  const raw = categorySlug.trim().toLowerCase();
  if (!raw) return [];
  const canonical = normalizeCategoryId(raw);
  const slugKeys = Array.from(
    new Set([raw].concat(canonical ? [canonical] : []))
  );

  const supabase = createClient();
  const rows: ScholarshipRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(ACTIVE_CATALOG_SELECT)
      .eq('is_active', true)
      .in('category_slug', slugKeys)
      .order('ranking_score', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + SCHOLARSHIPS_DB_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ScholarshipRow[];
    rows.push(...batch);
    if (batch.length < SCHOLARSHIPS_DB_PAGE_SIZE) break;
    offset += SCHOLARSHIPS_DB_PAGE_SIZE;
  }

  return rows.map((row) => mapScholarshipRow(row));
}

/** Same query as GET /api/scholarships (no category). Shared by Next server client and Node scripts. */
async function loadPagedActiveScholarships(
  supabase: SupabaseClient<Database>
): Promise<Scholarship[]> {
  const rows: ScholarshipRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(ACTIVE_CATALOG_SELECT)
      .eq('is_active', true)
      .order('ranking_score', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + SCHOLARSHIPS_DB_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ScholarshipRow[];
    rows.push(...batch);
    if (batch.length < SCHOLARSHIPS_DB_PAGE_SIZE) break;
    offset += SCHOLARSHIPS_DB_PAGE_SIZE;
  }

  return rows.map((row) => mapScholarshipRow(row));
}

export async function fetchActiveScholarships(): Promise<Scholarship[]> {
  const supabase = createClient() as unknown as SupabaseClient<Database>;
  return loadPagedActiveScholarships(supabase);
}

/**
 * Full active catalog for offline scripts (e.g. generate-seo-scholarship-ai.ts) where
 * `createClient()` from Next cookies is unavailable. Matches production list when env
 * points at the same Supabase project as the deployed app.
 */
export async function fetchActiveScholarshipsForScript(): Promise<Scholarship[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'fetchActiveScholarshipsForScript: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient<Database>(url, key);
  return loadPagedActiveScholarships(supabase);
}

/**
 * Одна запись по PK для страницы детали.
 * Без фильтра is_active — прямой переход по id должен открывать запись, если она есть и RLS пускает.
 */
export async function fetchScholarshipById(
  id: string
): Promise<Scholarship | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('scholarships')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapScholarshipRow(data as ScholarshipRow);
}

export async function fetchScholarshipBySlug(
  slug: string
): Promise<Scholarship | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('scholarships')
    .select(DETAIL_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapScholarshipRow(data as ScholarshipRow);
}

export async function fetchScholarshipBySlugOrId(
  param: string
): Promise<Scholarship | null> {
  const decoded = decodeURIComponent(param.trim());
  if (UUID_PARAM_RE.test(decoded)) {
    return fetchScholarshipById(decoded);
  }
  return fetchScholarshipBySlug(decoded);
}
