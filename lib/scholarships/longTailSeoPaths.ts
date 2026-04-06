import path from 'path';

/**
 * Slugs с JSON в data/long-tail-seo/ (generate-once).
 * Без undergraduate — только статический PRESET_COPY + без отдельного SEO-файла.
 */
export const LONG_TAIL_SEO_DATA_SLUGS = [
  'no-essay',
  'closing-soon',
  'under-5000',
  'international-students',
  'high-school',
  'engineering',
  'computer-science',
  'under-10000'
] as const;

export type LongTailSeoDataSlug = (typeof LONG_TAIL_SEO_DATA_SLUGS)[number];

export function longTailSeoJsonPath(slug: string): string {
  return path.join(process.cwd(), 'data', 'long-tail-seo', `${slug}.json`);
}
