import type { Json } from '@/types_db';

export type ArticleSignals = {
  countries: string[];
  audiences: string[];
  degrees: string[];
  fields: string[];
  fundingTypes: string[];
  keywords: string[];
};

export type ScholarshipMatchDbRow = {
  id: string;
  slug: string;
  title: string | null;
  scholarship_status: string | null;
  is_indexable: boolean | null;
  description: string | null;
  summary_short: string | null;
  eligibility_text: string | null;
  category: string | null;
  category_slug: string | null;
  tags: Json;
  study_levels: Json;
  field_of_study: Json;
  location_scope: string | null;
  award_amount_text: string | null;
  deadline_text: string | null;
  deadline_date: string | null;
};

export type ScoredScholarshipMatch = {
  row: ScholarshipMatchDbRow;
  score: number;
  haystack: string;
};

export type RelatedScholarshipStored = {
  slug: string;
  title: string;
  score: number;
  reason: string;
  award_amount_text?: string | null;
  deadline_text?: string | null;
};

export type ArticleMatchDiagnostics = {
  version: number;
  signals: ArticleSignals;
  topMatches: { slug: string; score: number }[];
  inlineLinksInserted: number;
  /** True when keyword pass found nothing and a trailing “Explore related scholarships” block was added. */
  inlineFallbackUsed: boolean;
  relatedSelected: number;
};

export const ARTICLE_MATCH_PIPELINE_VERSION = 3;
