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
  research_signal?: string | number | null;
  openalex_id?: string | null;
  ror_id?: string | null;
  data_year?: number | string | null;
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
