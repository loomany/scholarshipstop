/** Essay Hub (/essays) — programmatic SEO guides (distinct from /essay app tool). */

export const ESSAYS_SECTION_PATH = '/essays';

export const ESSAYS_PAGE_TITLE = 'Scholarship Essay Guides';

export function essayHubArticlePath(slug: string): string {
  const s = slug.trim();
  if (!s) return ESSAYS_SECTION_PATH;
  return `${ESSAYS_SECTION_PATH}/${encodeURIComponent(s)}`;
}
