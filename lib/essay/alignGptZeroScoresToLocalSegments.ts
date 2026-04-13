import type { GptZeroSentenceScore } from '@/lib/essay/parseGptZeroRichResponse';
import { getEssaySentenceSegmentsExact } from '@/lib/essay/splitEssaySentences';

/**
 * GPTZero sentence count often differs from `Intl.Segmenter` — unmapped trailing
 * segments had no score and stayed unhighlighted (~“70% orange, tail white”).
 * Pads shorter API arrays by forward-filling from the last sentence score; trims if longer.
 */
export function alignGptZeroScoresToLocalSegments(
  fullText: string,
  scores: GptZeroSentenceScore[]
): GptZeroSentenceScore[] {
  const parts = getEssaySentenceSegmentsExact(fullText);
  if (parts.length === 0 || scores.length === 0) {
    return scores;
  }

  const sorted = [...scores].sort((a, b) => a.index - b.index);

  if (sorted.length >= parts.length) {
    return sorted.slice(0, parts.length).map((s, i) => ({
      ...s,
      index: i
    }));
  }

  const last = sorted[sorted.length - 1]!;
  const out: GptZeroSentenceScore[] = [];
  for (let i = 0; i < parts.length; i++) {
    const src = i < sorted.length ? sorted[i]! : last;
    out.push({ ...src, index: i });
  }
  return out;
}
