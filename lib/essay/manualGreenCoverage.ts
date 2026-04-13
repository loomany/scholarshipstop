import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { getRiskySentenceIndicesForEssay } from '@/lib/essay/riskySentenceIndices';
import { getEssaySentenceSegmentsExact } from '@/lib/essay/splitEssaySentences';

/** Доля «рискового» текста (по символам), закрытая ручными правками (зелёная подсветка), не Humanize. */
export const MANUAL_GREEN_COVERAGE_THRESHOLD = 0.75;

export function getManualGreenCoverageRatio(
  essayContent: string,
  sentenceScores: GptZeroSentenceScore[] | null | undefined,
  userEdits: Record<number, string> | undefined,
  humanizeIndices: Set<number> | undefined
): number {
  if (!sentenceScores?.length) return 0;
  const risky = getRiskySentenceIndicesForEssay(essayContent, sentenceScores);
  if (risky.length === 0) return 1;
  const parts = getEssaySentenceSegmentsExact(essayContent);
  let riskChars = 0;
  let manualGreenChars = 0;
  const edits = userEdits ?? {};
  const hz = humanizeIndices ?? new Set<number>();
  for (const i of risky) {
    const len = Math.max(0, (parts[i] ?? '').length);
    riskChars += len;
    const manualGreen = edits[i] !== undefined && !hz.has(i);
    if (manualGreen) manualGreenChars += len;
  }
  if (riskChars === 0) return 1;
  return manualGreenChars / riskChars;
}
