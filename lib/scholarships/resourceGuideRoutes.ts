/**
 * Static scholarship guide pages under /resources/*. Single source for hrefs
 * and HTML normalization (avoid relative /faq/... or bare slugs).
 */
export const RESOURCE_GUIDE_SLUGS = [
  'how-to-apply-for-scholarships',
  'scholarship-deadlines-explained',
  'combine-multiple-scholarships',
  'medical-scholarships-guide',
  'scholarships-for-international-students-guide'
] as const;

export type ResourceGuideSlug = (typeof RESOURCE_GUIDE_SLUGS)[number];

export function resourceGuideHref(slug: ResourceGuideSlug): string {
  return `/resources/${slug}`;
}

/** Rewrite relative or wrong-prefix links to canonical /resources/{slug}. */
export function absolutizeResourceGuideLinksInHtml(html: string): string {
  if (!html.includes('href')) return html;
  let s = html;
  for (const slug of RESOURCE_GUIDE_SLUGS) {
    const abs = `/resources/${slug}`;
    const patterns: [RegExp, string][] = [
      // Wrong section: /faq/{slug} or relative faq/{slug}
      [
        new RegExp(`(href\\s*=\\s*)(["'])/faq/${slug}/?\\2`, 'gi'),
        `$1$2${abs}$2`
      ],
      [
        new RegExp(`(href\\s*=\\s*)(["'])(?!/)faq/${slug}/?\\2`, 'gi'),
        `$1$2${abs}$2`
      ],
      // Bare slug or relative file paths
      [
        new RegExp(`(href\\s*=\\s*)(["'])(?!https?:)(?!/)(?:\\.\\.?/)*${slug}/?\\2`, 'gi'),
        `$1$2${abs}$2`
      ],
      // "resources/slug" without leading slash on site root
      [
        new RegExp(
          `(href\\s*=\\s*)(["'])(?!https?:)(?!/)resources/${slug}/?\\2`,
          'gi'
        ),
        `$1$2${abs}$2`
      ]
    ];
    for (const [re, rep] of patterns) {
      s = s.replace(re, rep);
    }
  }
  return s;
}

/** Rewrite generic scholarship-hub entry links to the guest questionnaire entry point. */
export function normalizeScholarshipEntryLinksInHtml(html: string): string {
  if (!html.includes('href')) return html;
  return html.replace(
    /(href\s*=\s*)(["'])\/scholarships\/?\2/gi,
    '$1$2/get-scholarships$2'
  );
}
