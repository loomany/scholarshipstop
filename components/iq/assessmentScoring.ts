import {
  cognitiveAssessmentQuestions,
  type CognitiveOptionKey,
  type CognitiveQuestionDomain,
  type CognitiveAssessmentQuestion
} from '@/lib/cognitiveAssessmentQuestions';
import type { DomainScore } from '@/lib/iqAssessmentTypes';

export type AnswerMap = Record<string, CognitiveOptionKey>;

export const domainLabels: Record<CognitiveQuestionDomain, string> = {
  pattern_abstract: 'Abstract Reasoning',
  numeric_reasoning: 'Numerical Logic',
  verbal_logic: 'Verbal Reasoning',
  spatial_visual: 'Spatial Intelligence',
  prioritization_decision: 'Decision Speed'
};

export const domainOrder: CognitiveQuestionDomain[] = [
  'pattern_abstract',
  'numeric_reasoning',
  'spatial_visual',
  'verbal_logic',
  'prioritization_decision'
];

export const optionKeys: CognitiveOptionKey[] = ['A', 'B', 'C', 'D'];

const MAX_WEIGHTED_SCORE = cognitiveAssessmentQuestions.reduce(
  (total, question) => total + question.weight,
  0
);

export function scoreQuestionBank(
  questions: CognitiveAssessmentQuestion[],
  answers: AnswerMap
) {
  return questions.reduce((score, question) => {
    return (
      score +
      (answers[question.id] === question.correct_option ? question.weight : 0)
    );
  }, 0);
}

export function iqScoreFromWeightedScore(weightedScore: number) {
  const ratio = weightedScore / MAX_WEIGHTED_SCORE;
  return Math.round(Math.max(70, Math.min(145, 70 + ratio * 75)));
}

export function percentileFromIq(iqScore: number) {
  if (iqScore >= 140) return 99;
  if (iqScore >= 130) return 98;
  if (iqScore >= 120) return 91;
  if (iqScore >= 115) return 84;
  if (iqScore >= 110) return 75;
  if (iqScore >= 105) return 63;
  if (iqScore >= 100) return 50;
  if (iqScore >= 95) return 37;
  if (iqScore >= 90) return 25;
  if (iqScore >= 85) return 16;
  if (iqScore >= 80) return 9;
  return 3;
}

export function calculateDomainScores(
  questions: CognitiveAssessmentQuestion[],
  answers: AnswerMap
): DomainScore[] {
  return domainOrder.map((domain) => {
    const domainQuestions = questions.filter(
      (question) => question.domain === domain
    );
    const max = domainQuestions.reduce(
      (total, question) => total + question.weight,
      0
    );
    const earned = scoreQuestionBank(domainQuestions, answers);
    return {
      domain,
      label: domainLabels[domain],
      score: max > 0 ? Math.round((earned / max) * 100) : 0
    };
  });
}

export function lockedArchetype(scores: DomainScore[]) {
  const byDomain = Object.fromEntries(
    scores.map((item) => [item.domain, item.score])
  ) as Record<CognitiveQuestionDomain, number>;
  const logicProxy = (byDomain.pattern_abstract + byDomain.verbal_logic) / 2;
  const architect =
    byDomain.spatial_visual * 0.55 + byDomain.pattern_abstract * 0.45;
  const analyst = byDomain.numeric_reasoning * 0.6 + logicProxy * 0.4;
  const strategist =
    byDomain.prioritization_decision * 0.55 + byDomain.verbal_logic * 0.45;

  const sorted = [
    { label: 'Spatial Architect', value: architect },
    { label: 'Quantitative Analyst', value: analyst },
    { label: 'Strategic Reasoner', value: strategist }
  ].sort((a, b) => b.value - a.value);

  if (sorted[0]!.value - sorted[1]!.value < 7) {
    return `${sorted[0]!.label} / ${sorted[1]!.label}`;
  }

  return sorted[0]!.label;
}
