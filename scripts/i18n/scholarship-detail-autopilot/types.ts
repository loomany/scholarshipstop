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
  en_url: string;
  indexable_en: boolean;
  completeness_score: number;
  risk_score: number;
  include_yes_no: 'yes' | 'no';
  skip_reason: string;
};
