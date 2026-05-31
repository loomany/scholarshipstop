import 'server-only';

import { stateDisplayName } from './stateAffordability';
import type { ResolvedContentEnrichmentContext } from './resolveContentEnrichmentContext';
import { finalizeInternalLinks } from './internalLinkGraph';
import { stateSlugFromCode } from '@/lib/seo/stateCompareSlug';

export type ContextLinkItem = {
  href: string;
  label: string;
};

export type ScholarshipContextLinkCluster =
  | 'state-resource'
  | 'school-resource'
  | 'state-essay'
  | 'provider';

type BuildLinksInput = {
  cluster: ScholarshipContextLinkCluster;
  context: ResolvedContentEnrichmentContext;
  stateSlug?: string | null;
};

function scholarshipStateLink(stateCode: string, stateSlug: string): ContextLinkItem {
  return {
    href: `/scholarships/${encodeURIComponent(stateSlug)}`,
    label: `${stateDisplayName(stateCode)} scholarships`
  };
}

/** 3–6 natural internal links for enrichment context blocks. */
export function buildRelatedScholarshipContextLinks({
  cluster,
  context,
  stateSlug: stateSlugOverride = null
}: BuildLinksInput): ContextLinkItem[] {
  const stateSlug =
    stateSlugOverride ??
    (context.stateCode ? stateSlugFromCode(context.stateCode) : null);
  const stateCode = context.stateCode;
  const school = context.schoolRow;

  const links: ContextLinkItem[] = [];

  switch (cluster) {
    case 'state-resource':
      if (stateSlug && stateCode) {
        links.push(scholarshipStateLink(stateCode, stateSlug));
      }
      links.push(
        { href: '/compare/states', label: 'Compare states' },
        { href: '/compare/universities', label: 'Compare universities' },
        { href: '/resources/how-to-find-scholarships', label: 'How to find scholarships' },
        { href: '/essays/financial-need', label: 'Financial need essay guide' }
      );
      break;

    case 'school-resource':
      if (stateSlug && stateCode) {
        links.push(scholarshipStateLink(stateCode, stateSlug));
      }
      links.push(
        { href: '/compare/universities', label: 'Compare universities' },
        { href: '/resources/how-to-find-scholarships', label: 'How to find scholarships' }
      );
      if (school?.school_name) {
        links.push({
          href: '/essays/financial-need',
          label: 'Financial need essays'
        });
      }
      break;

    case 'state-essay':
      if (stateSlug && stateCode) {
        links.push(scholarshipStateLink(stateCode, stateSlug));
      }
      links.push(
        { href: '/scholarships', label: 'Browse scholarships' },
        { href: '/resources/how-to-find-scholarships', label: 'How to find scholarships' },
        { href: '/compare/universities', label: 'Compare universities' }
      );
      if (stateSlug) {
        links.push({ href: '/compare/states', label: 'Compare states' });
      }
      break;

    case 'provider':
      if (stateSlug && context.stateCode) {
        links.push({
          href: `/scholarships/${encodeURIComponent(stateSlug)}`,
          label: `Scholarships in ${context.stateCode}`
        });
      }
      links.push(
        { href: '/compare/universities', label: 'Compare universities' },
        { href: '/resources/how-to-find-scholarships', label: 'How to find scholarships' }
      );
      break;
  }

  return finalizeInternalLinks(
    links.filter((link) => link.href.trim() && link.label.trim())
  );
}

export function resolveContentEnrichmentLinkCluster(
  context: ResolvedContentEnrichmentContext,
  contentType: 'resource' | 'essay'
): ScholarshipContextLinkCluster | null {
  if (context.schoolRow) {
    return contentType === 'essay' ? 'state-essay' : 'school-resource';
  }
  if (context.stateCode && context.stateRow) {
    return contentType === 'essay' ? 'state-essay' : 'state-resource';
  }
  return null;
}
