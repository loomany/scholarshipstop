/**
 * Разбор ответа POST https://api.gptzero.me/v2/predict/text для UI (Human Score + подсветка).
 * Схема полей может отличаться между версиями API — парсим несколько вариантов.
 */

export type GptZeroSentenceScore = {
  index: number;
  /** Вероятность «сгенерировано ИИ» для предложения, 0–1 (если известна). */
  generatedProbability?: number;
  /** Подсветка в UI: высокая доля ИИ в предложении. */
  highlight: boolean;
};

const HIGHLIGHT_AI_THRESHOLD = 0.45;

function num(o: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function scoreRow(
  index: number,
  generatedProbability: number | undefined
): GptZeroSentenceScore {
  const highlight =
    generatedProbability !== undefined &&
    generatedProbability >= HIGHLIGHT_AI_THRESHOLD;
  return { index, generatedProbability, highlight };
}

/**
 * Извлекает оценки по предложениям из JSON GPTZero.
 * Приоритет: массив `documents[0].sentences`, иначе разворачиваем `documents[0].paragraphs`.
 */
export function extractGptZeroSentenceScores(raw: unknown): GptZeroSentenceScore[] {
  if (!raw || typeof raw !== 'object') return [];
  const root = raw as Record<string, unknown>;
  const docs = root.documents;
  if (!Array.isArray(docs) || !docs[0] || typeof docs[0] !== 'object') return [];
  const doc = docs[0] as Record<string, unknown>;

  const sentencesArr = doc.sentences;
  if (Array.isArray(sentencesArr) && sentencesArr.length > 0) {
    return sentencesArr.map((item, index) => {
      if (!item || typeof item !== 'object') {
        return scoreRow(index, undefined);
      }
      const o = item as Record<string, unknown>;
      const gp = num(o, [
        'generated_probability',
        'generated_prob',
        'completely_generated_prob',
        'average_generated_prob',
        'ai_probability'
      ]);
      return scoreRow(index, gp);
    });
  }

  const paragraphs = doc.paragraphs;
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return [];

  const byIndex = new Map<number, GptZeroSentenceScore>();
  for (const p of paragraphs) {
    if (!p || typeof p !== 'object') continue;
    const po = p as Record<string, unknown>;
    const start =
      typeof po.start_sentence_index === 'number' ? po.start_sentence_index : 0;
    const n = typeof po.num_sentences === 'number' ? po.num_sentences : 0;
    const gp = num(po, [
      'completely_generated_prob',
      'average_generated_prob',
      'generated_probability'
    ]);
    for (let i = 0; i < n; i++) {
      const idx = start + i;
      const row = scoreRow(idx, gp);
      byIndex.set(idx, row);
    }
  }

  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}
