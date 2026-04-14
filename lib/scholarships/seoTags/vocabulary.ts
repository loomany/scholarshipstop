/**
 * Allowlist of canonical values stored in `scholarships.seo_tags` (text[]).
 * URL slugs map to these via `slugSegmentToTag`; listing will filter on them in a later phase.
 */

export const SEO_TAG_GROUPS = {
  audience: [
    'first_generation',
    'international_students',
    'minority',
    'african_american',
    'hispanic',
    'native_american',
    'veterans',
    'disability',
    'women',
    'lgbtq',
    'single_parent',
    'financial_need',
    'foster_youth',
    'low_income'
  ],
  academic: [
    'high_school',
    'high_school_senior',
    'undergraduate',
    'graduate',
    'phd',
    'community_college',
    'trade_school'
  ],
  subject: ['engineering', 'computer_science', 'stem'],
  requirement_format: [
    'no_essay',
    'no_gpa_requirement',
    'few_requirements',
    'closing_soon',
    'easy_apply',
    'quick_apply',
    'verified_source'
  ],
  payout_amount: ['under_5000', 'under_10000'],
  payout_method: [
    'payout_student',
    'payout_college',
    'payout_non_monetary',
    'payout_not_stated'
  ],
  gpa: ['gpa_2_0', 'gpa_2_5', 'gpa_3_0', 'gpa_3_5'],
  /**
   * Parser-driven `award_signal_*` tokens; listing SQL `.or()` includes overlap with these
   * so NULL `award_amount_numeric_sort` rows still match (e.g. BigFuture pipeline).
   */
  award_signals: ['award_signal_high_value', 'award_signal_listing_eligible']
} as const;

/** Flat ordered list (deterministic) for migrations, audits, UI. */
export const ALL_SEO_TAGS = [
  ...SEO_TAG_GROUPS.audience,
  ...SEO_TAG_GROUPS.academic,
  ...SEO_TAG_GROUPS.subject,
  ...SEO_TAG_GROUPS.requirement_format,
  ...SEO_TAG_GROUPS.payout_amount,
  ...SEO_TAG_GROUPS.payout_method,
  ...SEO_TAG_GROUPS.gpa,
  ...SEO_TAG_GROUPS.award_signals
] as const;

export type SeoCanonicalTag = (typeof ALL_SEO_TAGS)[number];

export const SEO_TAG_SET: ReadonlySet<string> = new Set(ALL_SEO_TAGS);

export function isSeoCanonicalTag(s: string): s is SeoCanonicalTag {
  return SEO_TAG_SET.has(s);
}
