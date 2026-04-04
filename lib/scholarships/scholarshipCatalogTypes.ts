import type { Json } from '@/types_db';

export type ScholarshipCatalogView = {
  seoTags?: string[];
  eligibilityIds: string[];
  educationIds: string[];
  gpaBucketId: string | null;
  gpaMin: number | null;
  easyApplyIds: string[];
  locationLabels: string[];
  completenessScore: number | null;
  completenessBucket: 'basic' | 'standard' | 'detailed' | null;
  categorySlugs: string[];
  requirementTypesNormalized: string[];
};

export type ScholarshipDbCatalogFields = {
  seo_tags?: string[] | null;
  eligibility_tags?: Json | null;
  catalog_education_levels?: Json | null;
  easy_apply_flags?: Json | null;
  location_tags?: Json | null;
  gpa_requirement_min?: number | null;
  gpa_bucket?: string | null;
  listing_completeness_score?: number | null;
  listing_completeness_bucket?: string | null;
  applicants_count_is_estimated?: boolean | null;
};
