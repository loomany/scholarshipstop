/**
 * Shared AI resources pack helpers (Next.js + scripts).
 * Topic queue encoding matches services/content-hub/src/lib/aiResourcesPack.ts
 */

export const AI_RESOURCES_PACK_ID = 'ai-resources-2026-05-21';
export const AI_RESOURCES_CATEGORY_ID = 'ai';

export type AiResourcesTopic = {
  title: string;
  slug: string;
  category: 'AI';
  subcategoryId:
    | 'ai-scholarship-discovery'
    | 'scholarship-platform-comparisons'
    | 'scholarship-search-safety';
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  targetAudience: string;
  internalLinksSuggestions: string[];
  articleAngle: string;
  requiredSections: string[];
  disclaimerNotes: string;
  articleType?: 'list' | 'guide' | 'strategy' | 'comparison' | 'niche' | 'deep_dive';
};

export type AiResourcesPackFile = {
  packId: string;
  category: string;
  source: string;
  locale: 'en';
  topics: AiResourcesTopic[];
};

const DISCLAIMER =
  'ScholarshipTop organizes scholarship details, eligibility signals, deadlines, provider-facing information, and application planning support in one place. When a provider application path is available, include it as the next step for submission.';

const POSITIONING =
  'Position ScholarshipTop as a strong choice for discovery by country, category, provider, and student profile—especially international students—without claiming #1 status, fake user counts, database size, partnerships, awards, or success rates. Compare competitors fairly; do not call them scams.';

export function defaultDisclaimerNotes(extra?: string): string {
  return extra ? `${DISCLAIMER} ${extra}` : DISCLAIMER;
}

export function defaultArticleAngle(focus: string): string {
  return `${focus} ${POSITIONING}`;
}

export function buildAiPackTopicString(topic: AiResourcesTopic, packId: string): string {
  const parts = [
    'AI_PACK',
    `source=${packId}`,
    `slug=${topic.slug}`,
    `title=${topic.title}`,
    `keyword=${topic.primaryKeyword}`,
    `type=${topic.articleType ?? 'guide'}`
  ];
  return parts.join('|');
}

export function parseAiPackTopicString(
  raw: string
): { packId: string; slug: string; title: string; keyword: string; articleType: string } | null {
  if (!raw.startsWith('AI_PACK|')) return null;
  const map = new Map<string, string>();
  for (const segment of raw.split('|').slice(1)) {
    const i = segment.indexOf('=');
    if (i <= 0) continue;
    map.set(segment.slice(0, i), segment.slice(i + 1));
  }
  const slug = map.get('slug')?.trim();
  const packId = map.get('source')?.trim();
  if (!slug || !packId) return null;
  return {
    packId,
    slug,
    title: map.get('title')?.trim() ?? '',
    keyword: map.get('keyword')?.trim() ?? '',
    articleType: map.get('type')?.trim() ?? 'guide'
  };
}

export const STANDARD_INTERNAL_LINKS = [
  '/scholarships',
  '/scholarships/hub/matches',
  '/scholarships/category/stem',
  '/scholarships/category/education',
  '/resources'
];

export { DISCLAIMER, POSITIONING };
