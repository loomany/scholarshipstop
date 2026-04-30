/**
 * Public routes and labels for the articles/guides section (formerly "Content Hub").
 * Import from here so renames stay in one place.
 */
export const RESOURCES_SECTION_PATH = '/resources' as const;
/** Compact label for the main nav (desktop + drawer). */
export const RESOURCES_SECTION_LABEL = 'Resources';
/** Full title for page H1, breadcrumbs, and document metadata. */
export const RESOURCES_PAGE_TITLE = 'Scholarship Resources';

/** Articles per page on `/resources` index. */
export const RESOURCES_INDEX_PAGE_SIZE = 8;

export function resourcesArticlePath(slug: string): string {
  const s = slug.trim();
  return `${RESOURCES_SECTION_PATH}/${encodeURIComponent(s)}`;
}
