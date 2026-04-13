/**
 * Сегменты предложений для подсветки GPTZero: **склейка без изменений === исходный текст**
 * (переносы строк, лишние пробелы, отступы сохраняются).
 */
export function getEssaySentenceSegmentsExact(text: string): string[] {
  if (text === '') return [];

  try {
    const segmenter = new Intl.Segmenter(['ru', 'en'], {
      granularity: 'sentence'
    });
    const parts = Array.from(segmenter.segment(text), (data) => data.segment);
    const joined = parts.join('');
    if (joined === text) {
      return parts;
    }
  } catch {
    /* Intl unsupported */
  }

  return [text];
}

/** Подмена предложений по индексу Intl.Segmenter; склейка даёт полный текст без сдвига индексов GPTZero. */
export function applySentenceEdits(
  baseContent: string,
  edits: Record<number, string>
): string {
  const parts = getEssaySentenceSegmentsExact(baseContent);
  if (parts.length === 0) return baseContent;
  return parts.map((p, i) => (edits[i] !== undefined ? edits[i]! : p)).join('');
}
