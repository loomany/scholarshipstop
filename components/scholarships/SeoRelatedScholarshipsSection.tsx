'use client';

import Link from 'next/link';
import manifestData from '@/data/seo-scholarship-routes.json';

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
  className = ''
}: {
  listingMode: LongTailListingMode;
  className?: string;
}) {
  const links = collectLinks(listingMode);
  if (links.length === 0) return null;

  return (
    <div className={`mt-6 text-left ${className}`}>
      <h2 className="text-base font-semibold text-zinc-900">
        Related pages
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        These links stay inside the current promoted SEO set and point only to
        nearby scholarship topics with live exact matches.
      </p>
      <ul className="mt-4 flex flex-col gap-2 sm:max-w-3xl">
        {links.slice(0, 12).map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-sm font-medium text-teal-700 underline decoration-teal-600/35 underline-offset-2 hover:text-teal-900"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
