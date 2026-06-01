export type EnrichmentFileMeta = {
  generated_at?: string;
  permission_status?: string;
};

export type EnrichmentFile<T> = {
  meta?: EnrichmentFileMeta;
  records: T[];
};

export type SchoolEnrichment = {
  source_id?: string;
  opeid?: string;
  unit_id?: string;
  school_name: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  ownership?: string;
  school_type?: string | number | null;
  tuition_in_state?: number | null;
  tuition_out_of_state?: number | null;
  admission_rate?: number | null;
  completion_rate?: number | null;
  median_earnings?: number | null;
  avg_net_price?: number | null;
  student_size?: number | null;
  research_signal?:
    | string
    | number
    | { works_count?: number | null; cited_by_count?: number | null }
    | null;
  openalex_id?: string | null;
  ror_id?: string | null;
  data_year?: number | string | null;
  sources?: string[];
};

export type ProviderNonprofitEnrichment = {
  provider_key: string;
  name: string;
  normalized_name: string;
  ein?: string | null;
  city?: string | null;
  state?: string | null;
  ntee_code?: string | null;
  ntee_description?: string | null;
  organization_type?: string | null;
  ruling_year?: number | null;
  revenue_band?: string | null;
  assets_band?: string | null;
  has_recent_filing?: boolean | null;
  propublica_url?: string | null;
  usaspending_award_count?: number | null;
  usaspending_total_obligated?: number | null;
  source_years?: Record<string, string | number>;
  sources?: string[];
};

export type InstitutionResearchEnrichment = {
  institution_key: string;
  name: string;
  normalized_name: string;
  state?: string | null;
  unit_id?: string | null;
  opeid?: string | null;
  ror_id?: string | null;
  openalex_id?: string | null;
  homepage?: string | null;
  institution_type?: string | null;
  country?: string | null;
  works_count?: number | null;
  cited_by_count?: number | null;
  nih_project_count?: number | null;
  nih_total_funding_band?: string | null;
  nih_latest_year?: number | null;
  research_summary?: string | null;
  sources?: string[];
};

export type PublicSafetyContext = {
  metric?: string;
  value?: number | null;
  label?: string;
  note?: string;
};

export type StateAffordability = {
  state: string;
  state_code: string;
  median_household_income?: number | null;
  population?: number | null;
  hud_fmr_1br?: number | null;
  hud_fmr_2br?: number | null;
  living_wage_single_adult?: number | null;
  bls_median_wage?: number | null;
  public_safety_context?: PublicSafetyContext | null;
  health_context?: Record<string, unknown> | null;
  social_vulnerability_context?: Record<string, unknown> | null;
  affordability_score_inputs?: Record<string, unknown> | null;
  data_years?: Record<string, unknown> | null;
  sources?: string[];
};

export type StateSocialContext = {
  state_code: string;
  state_name: string;
  svi_context?: string | null;
  svi_percentile_band?: string | null;
  adi_context?: string | null;
  adi_percentile_band?: string | null;
  county_health_context?: string | null;
  counties_with_svi_data?: number | null;
  counties_with_adi_data?: number | null;
  counties_with_health_data?: number | null;
  source_years?: Record<string, string | number>;
  display_policy: {
    neutral_context_only: true;
    no_rankings: true;
    no_eligibility_claims: true;
  };
  sources?: string[];
};

export type CityRentMetroEnrichment = {
  city_key: string;
  city: string;
  state: string;
  state_code: string;
  county?: string | null;
  county_fips?: string | null;
  metro_name?: string | null;
  metro_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  population?: number | null;
  hud_fmr_1br?: number | null;
  hud_fmr_2br?: number | null;
  zillow_latest_rent?: number | null;
  zillow_rent_12mo_change_pct?: number | null;
  zillow_latest_month?: string | null;
  bls_median_wage?: number | null;
  bls_mean_wage?: number | null;
  bls_employment?: number | null;
  bls_year?: number | null;
  rent_context?: string | null;
  wage_context?: string | null;
  source_years?: Record<string, string | number>;
  sources?: string[];
};

export type CityAffordability = {
  city: string;
  state: string;
  city_ascii?: string;
  county?: string;
  county_fips?: number | string | null;
  lat?: number | null;
  lng?: number | null;
  population?: number | null;
  hud_fmr_1br?: number | null;
  hud_fmr_2br?: number | null;
  living_wage_single_adult?: number | null;
  affordability_notes?: string | null;
  sources?: string[];
};

export type LocationCrosswalk = {
  location_key: string;
  city: string;
  state: string;
  state_code?: string;
  county?: string;
  county_fips?: string | number | null;
  lat?: number | null;
  lng?: number | null;
  population?: number | null;
  geonames_id?: string | null;
  uscities_id?: string | null;
  aliases?: string[];
  sources?: string[];
};
