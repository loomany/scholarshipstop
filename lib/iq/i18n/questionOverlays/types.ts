import type {
  CognitiveOptionKey,
  CognitiveVisualSpec
} from '@/lib/cognitiveAssessmentQuestions';

export type QuestionTextOverlay = {
  prompt: string;
  options: Record<CognitiveOptionKey, string>;
  explanation: string;
  visual?: Pick<CognitiveVisualSpec, 'title' | 'caption'>;
};

export type QuestionOverlayMap = Record<string, QuestionTextOverlay>;
