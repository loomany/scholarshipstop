export type SitemapSlugMode = 'single-or-indexed' | 'always-indexed';

export type SitemapDocumentSlugPlan =
  | 'english-bucket'
  | 'localized-pilot'
  | 'localized-db'
  | 'not-found';

export function normalizeSitemapSlug(slug: string): string {
  return slug.trim().replace(/\.xml$/i, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function slugMatchesSitemapGroup(
  slug: string,
  slugBase: string,
  slugMode: SitemapSlugMode
): boolean {
  const indexedPattern = new RegExp(`^${escapeRegex(slugBase)}-\\d+$`);
  if (slugMode === 'always-indexed') return indexedPattern.test(slug);
  return slug === slugBase || indexedPattern.test(slug);
}

const ENGLISH_SITEMAP_GROUPS = [
  { slugBase: 'core', slugMode: 'single-or-indexed' },
  { slugBase: 'resources', slugMode: 'single-or-indexed' },
  { slugBase: 'essays', slugMode: 'always-indexed' },
  { slugBase: 'providers', slugMode: 'single-or-indexed' },
  { slugBase: 'categories', slugMode: 'single-or-indexed' },
  { slugBase: 'seo', slugMode: 'single-or-indexed' },
  { slugBase: 'scholarships', slugMode: 'always-indexed' },
  { slugBase: 'compare', slugMode: 'single-or-indexed' }
] as const satisfies ReadonlyArray<{
  slugBase: string;
  slugMode: SitemapSlugMode;
}>;

export function getSitemapDocumentSlugPlan(
  rawSlug: string
): SitemapDocumentSlugPlan {
  const slug = normalizeSitemapSlug(rawSlug);
  if (
    ENGLISH_SITEMAP_GROUPS.some((group) =>
      slugMatchesSitemapGroup(slug, group.slugBase, group.slugMode)
    )
  ) {
    return 'english-bucket';
  }
  if (/^locale-(es|fr)-(core|essays|compare|resources)$/.test(slug)) {
    return 'localized-pilot';
  }
  if (
    /^locale-(es|fr)-(categories|resources-db|providers-db|scholarships-detail-db|essays-guide-db|compare-detail-db)$/.test(
      slug
    )
  ) {
    return 'localized-db';
  }
  return 'not-found';
}
