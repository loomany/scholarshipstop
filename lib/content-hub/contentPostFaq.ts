import type { Json } from '@/types_db';

export type ContentPostFaqItem = { question: string; answer: string };

export function contentPostFaqFromJson(
  value: Json | null | undefined
): ContentPostFaqItem[] {
  if (!value || !Array.isArray(value)) return [];
  const out: ContentPostFaqItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const qRaw =
      (typeof o.question === 'string' && o.question) ||
      (typeof o.q === 'string' && o.q) ||
      '';
    const aRaw =
      (typeof o.answer === 'string' && o.answer) ||
      (typeof o.a === 'string' && o.a) ||
      '';
    const question = qRaw.trim();
    const answer = aRaw.trim();
    if (question && answer) out.push({ question, answer });
  }
  return out;
}
