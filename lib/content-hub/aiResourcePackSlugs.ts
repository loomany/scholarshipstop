/**
 * Stage 6B–6E AI resource pack — slugs that must classify as `ai` and hide IQ article CTA.
 */
export const AI_RESOURCE_PACK_SLUGS = [
  'best-scholarship-websites',
  'best-scholarship-search-engines-international-students',
  'scholarshiptop-vs-fastweb',
  'scholarshiptop-vs-scholarships-com',
  'best-free-scholarship-websites-without-spam',
  'best-scholarship-websites-for-graduate-students',
  'can-chatgpt-help-find-scholarships',
  'how-to-use-chatgpt-to-search-for-scholarships',
  'best-ai-tools-for-finding-scholarships',
  'ai-scholarship-search-vs-traditional-databases',
  'best-sites-to-find-fully-funded-scholarships',
  'how-to-verify-ai-generated-scholarship-lists',
  'chatgpt-prompts-for-scholarship-search',
  'ai-tools-for-international-students-looking-for-scholarships',
  'how-to-use-ai-without-missing-scholarship-deadlines',
  'scholarship-search-checklist-using-ai'
] as const;

export type AiResourcePackSlug = (typeof AI_RESOURCE_PACK_SLUGS)[number];

const PACK_SET = new Set<string>(AI_RESOURCE_PACK_SLUGS);

/** Default subcategory when slug is in the pack but JSON override is missing. */
const PACK_SUBCATEGORY_BY_SLUG: Partial<Record<AiResourcePackSlug, string>> = {
  'scholarshiptop-vs-fastweb': 'scholarship-platform-comparisons',
  'scholarshiptop-vs-scholarships-com': 'scholarship-platform-comparisons',
  'best-free-scholarship-websites-without-spam': 'scholarship-search-safety',
  'how-to-verify-ai-generated-scholarship-lists': 'scholarship-search-safety',
  'scholarship-search-checklist-using-ai': 'scholarship-search-safety'
};

export function isAiResourcePackSlug(
  slug: string | null | undefined
): slug is AiResourcePackSlug {
  const s = slug?.trim() ?? '';
  return s.length > 0 && PACK_SET.has(s);
}

export function aiResourcePackSubcategoryId(slug: AiResourcePackSlug): string {
  return PACK_SUBCATEGORY_BY_SLUG[slug] ?? 'ai-scholarship-discovery';
}
