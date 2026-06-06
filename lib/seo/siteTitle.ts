/**
 * Browser tab / history / mobile URL bar suggestions use <title>.
 * Root layout sets `title.template` to `${SITE_BRAND} | %s` — child routes should pass
 * only the page segment (e.g. `Account`), not a full string with the brand repeated.
 */
export const SITE_BRAND = 'ScholarshipTop';

/** Short value line after the brand (keep under ~40 chars for small tabs). */
export const SITE_TITLE_TAGLINE = 'Scholarships that fit you';

export const SITE_DEFAULT_TITLE = `${SITE_BRAND} | ${SITE_TITLE_TAGLINE}`;

/** Passed to root `metadata.title.template` in app/layout.tsx */
export const SITE_METADATA_TITLE_TEMPLATE = `${SITE_BRAND} | %s` as const;
