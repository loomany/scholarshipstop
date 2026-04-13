import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';

export type HighlightLevel = 'high' | 'mid' | 'none';

export function highlightLevelFromProbability(p: number | undefined): HighlightLevel {
  if (p === undefined) return 'none';
  if (p >= 0.45) return 'high';
  if (p >= 0.25) return 'mid';
  return 'none';
}

export function levelForRow(row: GptZeroSentenceScore | undefined): HighlightLevel {
  if (!row) return 'none';
  if (row.generatedProbability !== undefined) {
    return highlightLevelFromProbability(row.generatedProbability);
  }
  return row.highlight ? 'high' : 'none';
}
