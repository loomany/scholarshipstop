import type {
  CognitiveOptionKey,
  CognitiveQuestionDomain
} from '@/lib/cognitiveAssessmentQuestions';
import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type UserIntent =
  | 'general_iq'
  | 'essay_prep'
  | 'college_fit'
  | 'scholarship_match'
  | 'provider_research'
  | 'deadline_strategy';

export type QualificationData = {
  countryCode: string;
  schoolLevel: string;
  fieldOfStudy: string;
  citizenship: string;
  state: string;
  gpa: string;
};

export type DomainScore = {
  domain: CognitiveQuestionDomain;
  label: string;
  score: number;
};

export type AssessmentResult = {
  answers: Record<string, CognitiveOptionKey>;
  timedOutQuestionIds: string[];
  totalDurationSeconds?: number;
  weightedScore: number;
  iqScore: number;
  percentile: number;
  archetype: string;
  domainScores: DomainScore[];
  /** Locale used when the assessment was scored (for report/paywall copy). */
  assessmentLocale?: IqLocale;
};

export type StrategyGrantRecommendation = {
  id: string;
  title: string;
  amount: string;
  match_reason: string;
  url: string;
};

export type StrategyReadingRecommendation = {
  id: string;
  title: string;
  url: string;
  match_reason: string;
};

export type StrategyRecommendation = {
  hook_title: string;
  strategy_summary: string;
  recommended_grants: StrategyGrantRecommendation[];
  recommended_reading: StrategyReadingRecommendation[];
};
