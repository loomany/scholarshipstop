'use client';

import Link from 'next/link';
import manifestData from '@/data/seo-scholarship-routes.json';

import {
  SafeScholarshipHtml,
  scholarshipRichProseClassName
} from '@/components/scholarships/SafeScholarshipHtml';
import type { LongTailListingMode } from '@/lib/scholarships/seoScholarshipListing';

type LinkItem = { href: string; label: string };

type ManifestFile = {
  routes: Array<{
    canonicalPath: string;
    h1Fallback?: string;
    qualityBucket?: string;
    indexable?: boolean;
  }>;
};

const cleanSeoRoutes = ((manifestData as ManifestFile).routes ?? []).filter(
  (route) => route.qualityBucket === 'GOOD' && route.indexable === true
);

const AUDIENCE_GROUP = new Set([
  'for-women',
  'african-american',
  'hispanic',
  'first-generation',
  'native-american',
  'disability',
  'minority',
  'veterans',
  'single-parent',
  'lgbtq',
  'foster-youth',
  'international-students',
  'low-income'
]);

const UTILITY_GROUP = new Set(['closing-soon', 'payout-college', 'payout-student']);
const TOPIC_GROUP = new Set(['engineering', 'computer-science', 'phd']);

function routeLabel(path: string): string {
  const fromManifest = cleanSeoRoutes.find((route) => route.canonicalPath === path);
  return fromManifest?.h1Fallback?.trim() || path.replace(/-/g, ' ');
}

function relatedPathsFor(currentPath: string): string[] {
  const paths = cleanSeoRoutes.map((route) => route.canonicalPath);
  const candidates: string[] = [];
  const add = (path: string) => {
    if (!path || path === currentPath || candidates.includes(path)) return;
    if (!paths.includes(path)) return;
    candidates.push(path);
  };

  if (AUDIENCE_GROUP.has(currentPath)) {
    ['for-women', 'first-generation', 'minority', 'low-income', 'veterans', 'single-parent'].forEach(add);
  }
  if (TOPIC_GROUP.has(currentPath)) {
    ['engineering', 'computer-science', 'phd', 'closing-soon'].forEach(add);
  }
  if (UTILITY_GROUP.has(currentPath)) {
    ['closing-soon', 'payout-college', 'payout-student', 'engineering', 'computer-science'].forEach(add);
  }

  if (currentPath === 'international-students') {
    ['low-income', 'for-women', 'closing-soon', 'computer-science'].forEach(add);
  }

  const currentTokens = currentPath.split('/').filter(Boolean);
  for (const route of cleanSeoRoutes) {
    if (route.canonicalPath === currentPath) continue;
    const routeTokens = route.canonicalPath.split('/').filter(Boolean);
    if (routeTokens.some((token) => currentTokens.includes(token))) {
      add(route.canonicalPath);
    }
  }

  ['closing-soon', 'engineering', 'computer-science', 'for-women'].forEach(add);
  return candidates.slice(0, 6);
}

function collectLinks(mode: LongTailListingMode): LinkItem[] {
  const currentPath =
    mode.type === 'manifest' ? mode.canonicalPath : mode.slug;
  return relatedPathsFor(currentPath).map((path) => ({
    href: `/scholarships/${path}`,
    label: routeLabel(path)
  }));
}

export function SeoRelatedScholarshipsSection({
  listingMode,
  className = '',
  /** Preserved for crawlers / optional readers; shown in a compact disclosure. */
  introHtml = null
}: {
  listingMode: LongTailListingMode;
  className?: string;
  introHtml?: string | null;
}) {
  const links = collectLinks(listingMode);
  if (links.length === 0) return null;

  return (
    <div className={`text-left ${className}`}>
      <h2 className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
        Related searches
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.slice(0, 12).map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-orange-300 hover:text-orange-600 sm:text-sm"
          >
            {label}
          </Link>
        ))}
      </div>
      {introHtml?.trim() ? (
        <details className="group mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700 marker:text-slate-400 hover:text-slate-900">
            About these links
          </summary>
          <div className="mt-2 border-t border-slate-200/80 pt-2">
            <SafeScholarshipHtml
              html={introHtml.trim()}
              className={`${scholarshipRichProseClassName} text-sm leading-relaxed text-slate-600 [&_p]:my-1`}
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
