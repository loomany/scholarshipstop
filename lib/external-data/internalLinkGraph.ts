import 'server-only';

import { STATE_VS_SEPARATOR, stateComparePath, stateSlugFromCode } from '@/lib/seo/stateCompareSlug';

import { stateDisplayName } from './stateAffordability';
import type { ContextLinkItem } from './contentEnrichmentLinks';

export type InternalLinkPageType =
  | 'scholarship-state'
  | 'scholarship-university'
  | 'provider'
  | 'compare-state-detail'
  | 'compare-university-detail';

export type InternalLinkGraphInput = {
  pageType: InternalLinkPageType;
  stateSlug?: string | null;
  stateCode?: string | null;
  stateName?: string | null;
  providerSlug?: string | null;
  providerDisplayName?: string | null;
  compareStateSlugA?: string | null;
  compareStateSlugB?: string | null;
  institutionStateSlugA?: string | null;
  institutionStateSlugB?: string | null;
};

const HOW_TO_FIND = {
  href: '/resources/how-to-find-scholarships',
  label: 'How to find scholarships'
} as const;

const FINANCIAL_NEED = {
  href: '/essays/financial-need',
  label: 'Financial need essay guide'
} as const;

const COMPARE_STATES = {
  href: '/compare/states',
  label: 'Compare states'
} as const;

const COMPARE_UNIVERSITIES = {
  href: '/compare/universities',
  label: 'Compare universities'
} as const;

function scholarshipStateLink(stateCode: string, stateSlug: string): ContextLinkItem {
  return {
    href: `/scholarships/${encodeURIComponent(stateSlug)}`,
    label: `${stateDisplayName(stateCode)} scholarships`
  };
}

/** Popular published pair — only when this state is part of it. */
function featuredStateCompareLink(stateSlug: string | null): ContextLinkItem | null {
  if (!stateSlug) return null;
  const normalized = stateSlug.trim().toLowerCase();
  if (normalized !== 'california' && normalized !== 'texas') return null;
  const slug = `california${STATE_VS_SEPARATOR}texas`;
  return {
    href: stateComparePath(slug),
    label: 'Compare California vs Texas'
  };
}

export function normalizeInternalLinkHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return '';
  const path = trimmed.split('?')[0]?.split('#')[0] ?? trimmed;
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

/** Dedupe and drop self-links; cap at six. */
export function finalizeInternalLinks(
  links: ContextLinkItem[],
  excludeHref?: string | null
): ContextLinkItem[] {
  const exclude = excludeHref ? normalizeInternalLinkHref(excludeHref) : null;
  const seen = new Set<string>();
  const result: ContextLinkItem[] = [];

  for (const link of links) {
    if (!link.href.trim() || !link.label.trim()) continue;
    const href = normalizeInternalLinkHref(link.href);
    if (!href || (exclude && href === exclude)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    result.push({ href, label: link.label.trim() });
    if (result.length >= 6) break;
  }

  return result;
}

export function buildInternalLinkCluster(input: InternalLinkGraphInput): ContextLinkItem[] {
  const stateSlug = input.stateSlug?.trim().toLowerCase() ?? null;
  const stateCode = input.stateCode?.trim().toUpperCase() ?? null;
  const stateName =
    input.stateName?.trim() ||
    (stateCode ? stateDisplayName(stateCode) : null) ||
    (stateSlug ? stateSlug.replace(/-/g, ' ') : null);

  const links: ContextLinkItem[] = [];

  switch (input.pageType) {
    case 'scholarship-state':
      links.push(
        COMPARE_STATES,
        COMPARE_UNIVERSITIES,
        HOW_TO_FIND,
        FINANCIAL_NEED
      );
      {
        const featured = featuredStateCompareLink(stateSlug);
        if (featured) links.push(featured);
      }
      break;

    case 'scholarship-university':
      if (stateSlug && stateCode) {
        links.push(scholarshipStateLink(stateCode, stateSlug));
      } else if (stateSlug && stateName) {
        links.push({
          href: `/scholarships/${encodeURIComponent(stateSlug)}`,
          label: `Scholarships in ${stateName}`
        });
      }
      links.push(COMPARE_UNIVERSITIES, HOW_TO_FIND, FINANCIAL_NEED);
      if (input.providerSlug?.trim()) {
        links.push({
          href: `/providers/${encodeURIComponent(input.providerSlug.trim())}`,
          label: input.providerDisplayName?.trim() ?
            `${input.providerDisplayName.trim()} provider page`
          : 'Provider profile'
        });
      }
      break;

    case 'provider':
      if (stateSlug) {
        links.push({
          href: `/scholarships/${encodeURIComponent(stateSlug)}`,
          label: stateCode ? `Scholarships in ${stateDisplayName(stateCode)}` : `Scholarships in ${stateName ?? stateSlug}`
        });
      }
      links.push(COMPARE_UNIVERSITIES, HOW_TO_FIND);
      break;

    case 'compare-state-detail': {
      const slugA = input.compareStateSlugA;
      const slugB = input.compareStateSlugB;
      if (slugA) {
        links.push({
          href: `/scholarships/${encodeURIComponent(slugA)}`,
          label: `Scholarships in ${slugA.replace(/-/g, ' ')}`
        });
      }
      if (slugB && slugB !== slugA) {
        links.push({
          href: `/scholarships/${encodeURIComponent(slugB)}`,
          label: `Scholarships in ${slugB.replace(/-/g, ' ')}`
        });
      }
      links.push(COMPARE_UNIVERSITIES, HOW_TO_FIND, FINANCIAL_NEED, COMPARE_STATES);
      break;
    }

    case 'compare-university-detail': {
      const instA = input.institutionStateSlugA;
      const instB = input.institutionStateSlugB;
      if (instA) {
        links.push({
          href: `/scholarships/${encodeURIComponent(instA)}`,
          label: `Scholarships in ${instA.replace(/-/g, ' ')}`
        });
      }
      if (instB && instB !== instA) {
        links.push({
          href: `/scholarships/${encodeURIComponent(instB)}`,
          label: `Scholarships in ${instB.replace(/-/g, ' ')}`
        });
      }
      if (instA && instB && instA !== instB) {
        const sorted = [instA, instB].sort((a, b) => a.localeCompare(b, 'en'));
        links.push({
          href: stateComparePath(`${sorted[0]}${STATE_VS_SEPARATOR}${sorted[1]}`),
          label: 'Compare these states'
        });
      }
      links.push(COMPARE_UNIVERSITIES, HOW_TO_FIND, FINANCIAL_NEED);
      break;
    }
  }

  return links;
}

export function internalLinkTitle(pageType: InternalLinkPageType): string {
  switch (pageType) {
    case 'scholarship-state':
    case 'scholarship-university':
      return 'Explore related scholarship paths';
    case 'provider':
      return 'Related scholarship planning pages';
    case 'compare-state-detail':
      return 'Compare costs and scholarship options';
    case 'compare-university-detail':
      return 'Useful next steps';
  }
}

export function resolveStateSlugFromCode(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  return stateSlugFromCode(code.trim().toUpperCase());
}
