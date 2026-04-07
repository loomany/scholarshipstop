import type { Metadata } from 'next';
import { breadcrumbCategoryLabel } from '@/app/scholarships/scholarshipCategories';
import {
  getLongTailPreset,
  isScholarshipDetailUuidParam,
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
import {
  formatScholarshipAwardDisplay,
  scholarshipPublicPath
} from '@/app/scholarships/scholarshipsData';
import { ScholarshipDetailInitialDataProvider } from '@/app/scholarships/ScholarshipDetailInitialDataContext';
import { getScholarshipDetailServer } from '@/lib/scholarships/scholarshipDetailServer';
import { resolveScholarshipCategorySlug } from '@/lib/scholarships/similarScholarships';

type LayoutProps = {
  children: React.ReactNode;
  params: { slugPath?: string[] };
};

function applySafeNoindexFallback(meta: Metadata, canonical?: string | null): Metadata {
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

function payoutMethodLabel(method: string | null | undefined): string | null {
  const m = method?.toLowerCase();
  if (!m) return null;
  const map: Record<string, string> = {
    college: 'Paid to the college or financial aid office',
    student: 'Paid directly to the student',
    non_monetary:
      'Non-monetary award (for example courses, equipment, or prizes)',
    not_stated: 'Not stated on the listing'
  };
  return map[m] ?? null;
}

function legacyFaqItems(s: Scholarship): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];

  const who =
    s.whoCanApplyText?.trim() ||
    (s.eligibility?.length ? s.eligibility.join(' ') : '') ||
    s.eligibilityText?.trim();
  if (who) {
    out.push({
      question: 'Who is eligible for this scholarship?',
      answer: who.length > 800 ? `${who.slice(0, 797)}…` : who
    });
  }

  const deadlineLine = s.deadline?.trim();
  if (deadlineLine && deadlineLine !== '—') {
    out.push({
      question: 'What is the deadline?',
      answer: deadlineLine
    });
  }

  const amount = (s.amount ?? s.awardAmount)?.trim();
  if (amount) {
    out.push({
      question: 'How much is the award amount?',
      answer: formatScholarshipAwardDisplay(amount)
    });
  }

  const docs = s.documentsRequired?.filter(Boolean).length
    ? s.documentsRequired!.join('; ')
    : null;
  if (docs) {
    out.push({
      question: 'What documents are required?',
      answer: docs
    });
  }

  const payout = payoutMethodLabel(s.payoutMethod);
  if (payout) {
    out.push({
      question: 'What type of payout is used?',
      answer: payout
    });
  }

  if (s.essayRequired === true || s.essayRequired === false) {
    out.push({
      question: 'Is an essay required?',
      answer: s.essayRequired
        ? 'Yes, an essay is listed among requirements.'
        : 'No essay requirement was detected in the structured data for this listing.'
    });
  }

  return out;
}

function faqItems(s: Scholarship): { question: string; answer: string }[] {
  const fromSeo =
    s.seoFaq
      ?.filter((x) => x.question?.trim() && x.answer?.trim())
      .map((x) => {
        const answer = x.answer.trim();
        return {
          question: x.question.trim(),
          answer: answer.length > 800 ? `${answer.slice(0, 797)}…` : answer
        };
      }) ?? [];
  if (fromSeo.length >= 2) return fromSeo;
  if (fromSeo.length === 1) {
    const legacy = legacyFaqItems(s).filter(
      (l) =>
        l.question.trim().toLowerCase() !==
        fromSeo[0].question.trim().toLowerCase()
    );
    return [...fromSeo, ...legacy];
  }
  return legacyFaqItems(s);
}

function jsonLdDocument(s: Scholarship) {
  const path = scholarshipPublicPath(s);
  const faqs = faqItems(s);
  const graph: Record<string, unknown>[] = [];

  const grant: Record<string, unknown> = {
    '@type': 'Grant',
    name: s.title,
    description:
      s.seoOverview?.trim() ||
      s.summaryLong?.trim() ||
      s.summaryShort?.trim() ||
      s.description?.trim().slice(0, 2000) ||
      undefined,
    url: path
  };
  if (s.provider?.trim()) {
    grant.funder = {
      '@type': 'Organization',
      name: s.provider.trim()
    };
  }
  if (
    s.awardAmountNumericSort != null &&
    !Number.isNaN(s.awardAmountNumericSort) &&
    s.payoutMethod !== 'non_monetary'
  ) {
    grant.amount = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: s.awardAmountNumericSort
    };
  }
  graph.push(grant);

  const categorySlug = resolveScholarshipCategorySlug(s);
  const crumbItems: { name: string; item: string }[] = [
    { name: 'Home', item: '/' },
    { name: 'Find Scholarships', item: '/scholarships' }
  ];
  if (categorySlug) {
    crumbItems.push({
      name: breadcrumbCategoryLabel(categorySlug),
      item: `/scholarships/category/${categorySlug}`
    });
  }
  crumbItems.push({ name: s.title, item: path });

  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: crumbItems.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item
    }))
  });

  if (faqs.length >= 2) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer
        }
      }))
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
}

export async function generateMetadata({
  params
}: Pick<LayoutProps, 'params'>): Promise<Metadata> {
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
        entry.qualityBucket != null && entry.qualityBucket !== 'GOOD' ||
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
      return withExplicitIndexFollowWhenUnset(meta);
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
      resolved.entry.qualityBucket != null &&
        resolved.entry.qualityBucket !== 'GOOD' ||
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
    return withExplicitIndexFollowWhenUnset(meta);
  }

  if (
    resolved.kind !== 'scholarship_detail' &&
    segments.length !== 1
  ) {
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

export default async function ScholarshipsSlugPathLayout({
  children,
  params
}: LayoutProps) {
  const segments = (params.slugPath ?? []).map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );
  if (segments.length === 0) {
    return <>{children}</>;
  }

  const resolved = resolveScholarshipSlugPath(segments);
  if (
    resolved.kind === 'legacy_long_tail' ||
    resolved.kind === 'manifest_seo' ||
    resolved.kind === 'redirect_canonical' ||
    resolved.kind === 'not_found'
  ) {
    return <>{children}</>;
  }

  if (segments.length !== 1) {
    return <>{children}</>;
  }

  const raw = segments[0]!;

  const record = await getScholarshipDetailServer(raw);

  if (!record) {
    return <>{children}</>;
  }

  const json = JSON.stringify(jsonLdDocument(record));

  return (
    <ScholarshipDetailInitialDataProvider value={record}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: json }}
      />
      {children}
    </ScholarshipDetailInitialDataProvider>
  );
}
