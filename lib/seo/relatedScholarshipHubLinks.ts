import {
  LONG_TAIL_LINK_LABELS,
  longTailBaseFilter
} from '@/app/scholarships/scholarshipLongTailPresets';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  SEO_ROUTE_STATE_CODE_TO_SLUG,
  SEO_ROUTE_STATE_SLUG_TO_LABEL
} from '@/lib/scholarships/seoTags/routeSegmentMaps';
import { PROGRAMMATIC_SPECIALTY_SLUGS } from '@/lib/seo/programmaticSeoHubCombos';

/**
 * Premium internal links to programmatic hub listings from a scholarship detail page.
 */
export function relatedScholarshipHubLinks(
  s: Scholarship
): { href: string; label: string }[] {
  const codes = (s.stateCodes ?? [])
    .map((c) => String(c).trim().toUpperCase())
    .filter(Boolean);
  const stateSlug = codes.length
    ? SEO_ROUTE_STATE_CODE_TO_SLUG[codes[0]!]
    : undefined;
  if (!stateSlug) return [];

  const stateLabel = SEO_ROUTE_STATE_SLUG_TO_LABEL[stateSlug] ?? stateSlug;

  const out: { href: string; label: string }[] = [
    {
      href: `/scholarships/${stateSlug}`,
      label: `All scholarships · ${stateLabel}`
    }
  ];

  for (const spec of PROGRAMMATIC_SPECIALTY_SLUGS) {
    const fn = longTailBaseFilter(spec);
    if (fn?.(s)) {
      out.push({
        href: `/scholarships/${stateSlug}/${spec}`,
        label: `${LONG_TAIL_LINK_LABELS[spec]} · ${stateLabel}`
      });
      break;
    }
  }

  return out.slice(0, 5);
}
