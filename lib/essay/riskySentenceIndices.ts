import { levelForRow } from '@/lib/essay/gptZeroHighlightLevels';
import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { getEssaySentenceSegmentsExact } from '@/lib/essay/splitEssaySentences';

/**
 * Индексы предложений с подсветкой риска (как в `EssayContentHighlighted`: mid/high, не только пробелы).
 */
export function getRiskySentenceIndicesForEssay(
  essayContent: string,
  sentenceScores: GptZeroSentenceScore[] | null
): number[] {
  if (!sentenceScores?.length) return [];
  const parts = getEssaySentenceSegmentsExact(essayContent);
  const scoresByIndex = new Map<number, GptZeroSentenceScore>();
  for (const s of sentenceScores) {
    scoresByIndex.set(s.index, s);
  }
  const out: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i]!;
    const onlyWs = chunk !== '' && chunk.trim() === '';
    const row = scoresByIndex.get(i);
    const level = levelForRow(row);
    const showRisk = !onlyWs && level !== 'none';
    if (showRisk) out.push(i);
  }
  return out;
}
