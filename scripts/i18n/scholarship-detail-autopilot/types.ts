export type CandidateTier = 'A' | 'B' | 'C' | 'D';

export type AutopilotCandidate = {
  rank: number;
  wave: number;
  slug: string;
  scholarship_uuid: string;
  title: string;
  provider: string;
  amount: string;
  deadline: string;
  category: string;
  source_url_present: boolean;
  amount_present: boolean;
  deadline_present: boolean;
  content_completeness: number;
  en_url: string;
  indexable_en: boolean;
  completeness_score: number;
  risk_score: number;
  tier: CandidateTier;
  include_yes_no: 'yes' | 'no';
  publish_allowed_yes_no: 'yes' | 'no';
  skip_reason: string;
};
