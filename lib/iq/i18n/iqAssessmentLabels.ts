import type { CognitiveQuestionDomain } from '@/lib/cognitiveAssessmentQuestions';
import type { IqLocale } from '@/lib/iq/i18n/iqLocales';

export type ArchetypeKey =
  | 'spatial_architect'
  | 'quantitative_analyst'
  | 'strategic_reasoner';

const DOMAIN_LABELS: Record<IqLocale, Record<CognitiveQuestionDomain, string>> = {
  en: {
    pattern_abstract: 'Abstract Reasoning',
    numeric_reasoning: 'Numerical Logic',
    verbal_logic: 'Verbal Reasoning',
    spatial_visual: 'Spatial Intelligence',
    prioritization_decision: 'Decision Speed'
  },
  es: {
    pattern_abstract: 'Razonamiento abstracto',
    numeric_reasoning: 'Lógica numérica',
    verbal_logic: 'Lógica verbal',
    spatial_visual: 'Inteligencia espacial',
    prioritization_decision: 'Velocidad de decisión'
  },
  fr: {
    pattern_abstract: 'Raisonnement abstrait',
    numeric_reasoning: 'Logique numérique',
    verbal_logic: 'Logique verbale',
    spatial_visual: 'Intelligence spatiale',
    prioritization_decision: 'Vitesse de décision'
  }
};

const ARCHETYPE_LABELS: Record<IqLocale, Record<ArchetypeKey, string>> = {
  en: {
    spatial_architect: 'Spatial Architect',
    quantitative_analyst: 'Quantitative Analyst',
    strategic_reasoner: 'Strategic Reasoner'
  },
  es: {
    spatial_architect: 'Arquitecto espacial',
    quantitative_analyst: 'Analista cuantitativo',
    strategic_reasoner: 'Razonador estratégico'
  },
  fr: {
    spatial_architect: 'Architecte spatial',
    quantitative_analyst: 'Analyste quantitatif',
    strategic_reasoner: 'Raisonneur stratégique'
  }
};

const DIFFICULTY_LABELS: Record<
  IqLocale,
  Record<'easy' | 'medium' | 'hard', string>
> = {
  en: { easy: 'easy', medium: 'medium', hard: 'hard' },
  es: { easy: 'fácil', medium: 'medio', hard: 'difícil' },
  fr: { easy: 'facile', medium: 'moyen', hard: 'difficile' }
};

export function getIqDomainLabel(
  locale: IqLocale,
  domain: CognitiveQuestionDomain
): string {
  return DOMAIN_LABELS[locale][domain];
}

export function getIqDifficultyLabel(
  locale: IqLocale,
  difficulty: 'easy' | 'medium' | 'hard'
): string {
  return DIFFICULTY_LABELS[locale][difficulty];
}

export function getIqArchetypeLabel(
  locale: IqLocale,
  key: ArchetypeKey
): string {
  return ARCHETYPE_LABELS[locale][key];
}

export function formatIqArchetypeResult(
  locale: IqLocale,
  primary: ArchetypeKey,
  secondary: ArchetypeKey | null,
  margin: number
): string {
  const primaryLabel = getIqArchetypeLabel(locale, primary);
  if (secondary && margin < 7) {
    return `${primaryLabel} / ${getIqArchetypeLabel(locale, secondary)}`;
  }
  return primaryLabel;
}
