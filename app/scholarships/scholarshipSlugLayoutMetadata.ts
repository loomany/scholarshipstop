import type { Metadata } from 'next';
import {
  getLongTailPreset,
  normalizeScholarshipDynamicParam
} from '@/app/scholarships/scholarshipLongTailPresets';
import { readLongTailSeoBundle } from '@/lib/scholarships/longTailSeoStore';
import { readScholarshipSeoContent } from '@/lib/scholarships/scholarshipSeoContentStore';
import { shouldBlockScholarshipListingForDrip } from '@/lib/seo/seoDripFeed';
import {
  getSeoListingEntry,
  resolveScholarshipSlugPath
} from '@/lib/scholarships/seoScholarshipResolve';
import {
  evaluateLegacyPresetSeoListingThin,
  evaluateManifestSeoListingThin,
  seoThinCanonicalHref
} from '@/lib/scholarships/seoListingMetadataPolicy';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { scholarshipPublicPath } from '@/app/scholarships/scholarshipsData';
import { getScholarshipDetailServer } from '@/lib/scholarships/scholarshipDetailServer';

function applySafeNoindexFallback(
  meta: Metadata,
  canonical?: string | null
): Metadata {
  meta.robots = { index: false, follow: true };
  if (canonical) {
    meta.alternates = { canonical };
  }
  return meta;
}

function withExplicitIndexFollowWhenUnset(meta: Metadata): Metadata {
  if (meta.robots !== undefined) return meta;
  return { ...meta, robots: { index: true, follow: true } };
}

function applyScholarshipContentBundleIndexingPolicy(
  meta: Metadata,
  canonicalPath: string
): Metadata {
  if (!readScholarshipSeoContent(canonicalPath)) return meta;
  const selfPath = `/scholarships/${canonicalPath}`;
  const next: Metadata = {
    ...meta,
    robots: { index: true, follow: true },
    alternates: { canonical: selfPath }
  };
  if (meta.openGraph && typeof meta.openGraph === 'object') {
    next.openGraph = { ...meta.openGraph, url: selfPath };
  }
  return next;
}

function metaDescription(s: Scholarship): string {
  const seo = s.seoExcerpt?.trim();
  if (seo && seo.length >= 40) {
    return seo.length > 160 ? `${seo.slice(0, 157)}…` : seo;
  }
  const fromShort = s.summaryShort?.trim();
  if (fromShort && fromShort.length >= 40) {
    return fromShort.length > 160 ? `${fromShort.slice(0, 157)}…` : fromShort;
  }
  const title = s.title?.trim() || 'This scholarship';
  return `Learn the key details of ${title}, including eligibility, deadline, award amount, required documents, and how to apply.`.slice(
    0,
    160
  );
}

/**
 * Shared metadata for `/scholarships/...` slug paths (listing + detail). Used by
 * `[[...slugPath]]/layout.tsx` and `/scholarships/[state]/[university]` when delegating to legacy SEO routes.
 */
export async function generateScholarshipSlugLayoutMetadata(params: {
  slugPath?: string[];
}): Promise<Metadata> {
  const segments = (params.slugPath ?? []).map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );
  if (segments.length === 0) {
    return { title: 'Find Scholarships' };
  }

  const resolved = resolveScholarshipSlugPath(segments);

  if (resolved.kind === 'redirect_canonical') {
    if (shouldBlockScholarshipListingForDrip(resolved.canonicalPath)) {
      return applySafeNoindexFallback(
        { title: 'Find Scholarships' },
        `/scholarships/${resolved.canonicalPath}`
      );
    }
    const entry = getSeoListingEntry(resolved.canonicalPath);
    if (entry) {
      const path = `/scholarships/${resolved.canonicalPath}`;
      const seo = readScholarshipSeoContent(resolved.canonicalPath);
      const title = seo?.seo_title ?? entry.h1Fallback;
      const description =
        seo?.seo_description ?? entry.metaDescriptionFallback;
      const meta: Metadata = {
        title,
        description,
        openGraph: {
          title,
          description,
          url: path,
          type: 'website'
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description
        },
        alternates: {
          canonical: path
        }
      };
      if (
        entry.indexable !== true ||
        (entry.qualityBucket != null && entry.qualityBucket !== 'GOOD') ||
        entry.noindexNow
      ) {
        meta.robots = { index: false, follow: true };
        meta.alternates = {
          canonical:
            entry.canonicalTarget
              ? `/scholarships/${entry.canonicalTarget}`
              : seoThinCanonicalHref({
                  kind: 'manifest',
                  canonicalPath: resolved.canonicalPath
                })
        };
      }
      try {
        const live = await evaluateManifestSeoListingThin(entry);
        if (
          live.thinListing ||
          live.broadFallbackNoindex ||
          live.fallbackUsed ||
          live.exactCount <= 0
        ) {
          meta.robots = { index: false, follow: true };
          meta.alternates = {
            canonical:
              live.widenTo
                ? `/scholarships/${live.widenTo}`
                : seoThinCanonicalHref({
                    kind: 'manifest',
                    canonicalPath: resolved.canonicalPath
                  })
          };
        }
      } catch {
        return applySafeNoindexFallback(
          meta,
          entry.canonicalTarget
            ? `/scholarships/${entry.canonicalTarget}`
            : seoThinCanonicalHref({
                kind: 'manifest',
                canonicalPath: resolved.canonicalPath
              })
        );
      }
      return withExplicitIndexFollowWhenUnset(
        applyScholarshipContentBundleIndexingPolicy(meta, resolved.canonicalPath)
      );
    }
    return {
      title: 'Find Scholarships',
      alternates: {
        canonical: `/scholarships/${resolved.canonicalPath}`
      }
    };
  }

  if (resolved.kind === 'legacy_long_tail') {
    if (shouldBlockScholarshipListingForDrip(resolved.slug)) {
      return applySafeNoindexFallback(
        { title: 'Find Scholarships' },
        `/scholarships/${resolved.slug}`
      );
    }
    const longTail = getLongTailPreset(resolved.slug);
    if (!longTail) return { title: 'Find Scholarships' };
    const path = `/scholarships/${longTail.slug}`;
    const seo = readLongTailSeoBundle(longTail.slug);
    const title = seo?.seo_title ?? longTail.metaTitle;
    const description = seo?.seo_description ?? longTail.metaDescription;
    const meta: Metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        url: path,
        type: 'website'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description
      },
      alternates: {
        canonical: path
      }
    };
    try {
      const live = await evaluateLegacyPresetSeoListingThin(longTail.slug);
      if (live.thinListing || live.broadFallbackNoindex) {
        meta.robots = { index: false, follow: true };
        meta.alternates = {
          canonical: seoThinCanonicalHref({
            kind: 'legacy',
            canonicalPath: longTail.slug
          })
        };
      }
    } catch {
      return applySafeNoindexFallback(
        meta,
        seoThinCanonicalHref({
          kind: 'legacy',
          canonicalPath: longTail.slug
        })
      );
    }
    return withExplicitIndexFollowWhenUnset(meta);
  }

  if (resolved.kind === 'manifest_seo') {
    if (shouldBlockScholarshipListingForDrip(resolved.canonicalPath)) {
      return applySafeNoindexFallback(
        { title: 'Find Scholarships' },
        `/scholarships/${resolved.canonicalPath}`
      );
    }
    const path = `/scholarships/${resolved.canonicalPath}`;
    const seo = readScholarshipSeoContent(resolved.canonicalPath);
    const title = seo?.seo_title ?? resolved.entry.h1Fallback;
    const description =
      seo?.seo_description ?? resolved.entry.metaDescriptionFallback;
    const meta: Metadata = {
      title,
      description,
      openGraph: {
        title,
        description,
        url: path,
        type: 'website'
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description
      },
      alternates: {
        canonical: path
      }
    };
    if (
      resolved.entry.indexable !== true ||
      (resolved.entry.qualityBucket != null &&
        resolved.entry.qualityBucket !== 'GOOD') ||
      resolved.entry.noindexNow
    ) {
      meta.robots = { index: false, follow: true };
      meta.alternates = {
        canonical:
          resolved.entry.canonicalTarget
            ? `/scholarships/${resolved.entry.canonicalTarget}`
            : seoThinCanonicalHref({
                kind: 'manifest',
                canonicalPath: resolved.canonicalPath
              })
      };
    }
    try {
      const live = await evaluateManifestSeoListingThin(resolved.entry);
      if (
        live.thinListing ||
        live.broadFallbackNoindex ||
        live.fallbackUsed ||
        live.exactCount <= 0
      ) {
        meta.robots = { index: false, follow: true };
        meta.alternates = {
          canonical:
            live.widenTo
              ? `/scholarships/${live.widenTo}`
              : seoThinCanonicalHref({
                  kind: 'manifest',
                  canonicalPath: resolved.canonicalPath
                })
        };
      }
    } catch {
      return applySafeNoindexFallback(
        meta,
        resolved.entry.canonicalTarget
          ? `/scholarships/${resolved.entry.canonicalTarget}`
          : seoThinCanonicalHref({
              kind: 'manifest',
              canonicalPath: resolved.canonicalPath
            })
      );
    }
    return withExplicitIndexFollowWhenUnset(
      applyScholarshipContentBundleIndexingPolicy(meta, resolved.canonicalPath)
    );
  }

  if (resolved.kind !== 'scholarship_detail' && segments.length !== 1) {
    return { title: 'Find Scholarships' };
  }

  const raw = segments[0]!;

  const record = await getScholarshipDetailServer(raw);

  if (!record) {
    return { title: 'Scholarship' };
  }

  const title = `${record.title} 2026: Eligibility, Deadline, Award Amount`;
  const description = metaDescription(record);
  const path = scholarshipPublicPath(record);

  const meta: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      url: path,
      type: 'article'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    },
    alternates: {
      canonical: path
    }
  };

  if (record.isIndexable === false) {
    meta.robots = { index: false, follow: true };
  }

  return withExplicitIndexFollowWhenUnset(meta);
}
