import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

import { createClient } from '@/utils/supabase/server';
import ScholarshipDetailPageClient from '@/app/scholarships/ScholarshipDetailPageClient';
import ScholarshipsHubPageClient from '@/app/scholarships/ScholarshipsHubPageClient';
import {
  SeoScholarshipHero,
  SeoScholarshipPostListingSeo
} from '@/components/scholarships/SeoScholarshipListingChrome';
import {
  buildInitialListRequestKey,
  createInitialScholarshipsPayload,
  fetchInitialHubScholarshipsPayload,
  fetchInitialLongTailScholarshipsPayload
} from '@/app/scholarships/scholarshipListServerPayload';
import {
  getLongTailPreset,
  isScholarshipDetailUuidParam,
  normalizeScholarshipDynamicParam
} from '@/app/scholarships/scholarshipLongTailPresets';
import { readLongTailSeoBundle } from '@/lib/scholarships/longTailSeoStore';
import { readScholarshipSeoContent } from '@/lib/scholarships/scholarshipSeoContentStore';
import { getScholarshipDetailServer } from '@/lib/scholarships/scholarshipDetailServer';
import { resolveScholarshipSlugPath } from '@/lib/scholarships/seoScholarshipResolve';

type PageProps = { params: { slugPath?: string[] } };

export function generateMetadata({
  params,
  searchParams
}: PageProps & {
  searchParams?: Record<string, string | string[] | undefined>;
}): Metadata {
  const segments = (params.slugPath ?? []).map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );
  if (segments.length > 0) return {};

  const hasNonCanonicalQuery =
    Boolean(searchParams?.q) ||
    Boolean(searchParams?.category) ||
    Boolean(searchParams?.sort) ||
    Boolean(searchParams?.page) ||
    Boolean(searchParams?.deadline) ||
    Boolean(searchParams?.tab);

  return {
    title: 'Find Scholarships',
    alternates: { canonical: '/scholarships' },
    ...(hasNonCanonicalQuery
      ? {
          robots: {
            index: false,
            follow: true
          }
        }
      : {})
  };
}

/** Set DEBUG_SEO_SCHOLARSHIP=1 to log which SEO bundle and copy the server picked. */
function debugLogListingSeo(payload: Record<string, unknown>) {
  if (process.env.DEBUG_SEO_SCHOLARSHIP !== '1') return;
  console.info('[scholarships listing seo]', payload);
}

function normalizeSeoTextLines(
  value: string | string[] | undefined
): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const rows = value.map((line) => line.trim()).filter(Boolean);
    return rows.length > 0 ? rows : undefined;
  }
  const text = value.trim();
  if (!text) return undefined;
  return [text];
}

function isPromotedManifestSeoRoute(entry: {
  indexable?: boolean;
  qualityBucket?: string;
}): boolean {
  return entry.indexable === true && entry.qualityBucket === 'GOOD';
}

export default async function ScholarshipsCatchAllPage({ params }: PageProps) {
  const rawSegments = params.slugPath ?? [];
  const segments = rawSegments.map((s) =>
    normalizeScholarshipDynamicParam(decodeURIComponent(s))
  );

  if (segments.length === 0) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const profile = user?.id
      ? (
          await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
        ).data
      : null;
    const initialListPayload =
      await fetchInitialHubScholarshipsPayload(supabase, profile);
    return (
      <ScholarshipsHubPageClient
        isAuthenticated={Boolean(user)}
        initialPayload={createInitialScholarshipsPayload(
          buildInitialListRequestKey({
            kind: 'hub',
            routeKey: 'hub',
            searchParamsString: ''
          }),
          initialListPayload
        )}
      />
    );
  }

  if (segments.length === 1 && isScholarshipDetailUuidParam(segments[0]!)) {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const scholarship = await getScholarshipDetailServer(segments[0]!);
    if (!scholarship) {
      notFound();
    }
    return (
      <>
        <h1 className="sr-only">{scholarship.title}</h1>
        <Suspense
        fallback={
          <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 text-slate-600 sm:px-5 md:py-12 lg:px-8">
            <div className="mx-auto max-w-5xl">Loading…</div>
          </section>
        }
      >
          <ScholarshipDetailPageClient
            isAuthenticated={Boolean(user)}
            initialScholarship={scholarship}
          />
        </Suspense>
      </>
    );
  }

  const resolved = resolveScholarshipSlugPath(segments);

  if (resolved.kind === 'redirect_canonical') {
    permanentRedirect(`/scholarships/${resolved.canonicalPath}`);
  }

  if (resolved.kind === 'not_found') {
    notFound();
  }

  if (resolved.kind === 'scholarship_detail') {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const scholarship =
      segments.length === 1
        ? await getScholarshipDetailServer(segments[0]!)
        : null;
    if (!scholarship) {
      notFound();
    }
    return (
      <>
        <h1 className="sr-only">{scholarship.title}</h1>
        <Suspense
        fallback={
          <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 text-slate-600 sm:px-5 md:py-12 lg:px-8">
            <div className="mx-auto max-w-5xl">Loading…</div>
          </section>
        }
      >
          <ScholarshipDetailPageClient
            isAuthenticated={Boolean(user)}
            initialScholarship={scholarship}
          />
        </Suspense>
      </>
    );
  }

  if (resolved.kind === 'legacy_long_tail') {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const longTail = getLongTailPreset(resolved.slug);
    if (!longTail) notFound();
    const { result: initialListPayload, routeScope } =
      await fetchInitialLongTailScholarshipsPayload(supabase, {
        type: 'legacy',
        slug: longTail.slug
      });
    const seo = readLongTailSeoBundle(longTail.slug);
    const pageTitle = seo?.h1?.trim() || seo?.seo_title?.trim() || longTail.h1;
    const introParagraph = seo?.intro?.trim() || null;
    const faqItems = seo?.faq;

    debugLogListingSeo({
      routeKind: 'legacy_long_tail',
      slug: longTail.slug,
      jsonPath: `data/long-tail-seo/${longTail.slug}.json`,
      bundleFound: !!seo,
      priority: 'long-tail-seo json → preset h1/meta',
      propsFromBundle: seo
        ? {
            h1: seo.h1 ?? null,
            seo_title: seo.seo_title ?? null,
            introLen: seo.intro?.length ?? 0,
            supportingLen: seo.supporting?.length ?? 0,
            faqCount: faqItems?.length ?? 0
          }
        : null,
      chosenH1OrTitle: pageTitle,
      chosenIntroPreview: introParagraph?.slice(0, 120) ?? null
    });

    return (
      <Suspense
        fallback={
          <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 text-slate-600 sm:px-5 md:py-12 lg:px-8">
            <div className="mx-auto max-w-5xl">Loading scholarships…</div>
          </section>
        }
      >
        <ScholarshipsHubPageClient
          isAuthenticated={Boolean(user)}
          initialPayload={createInitialScholarshipsPayload(
            buildInitialListRequestKey({
              kind: 'long_tail',
              routeKey: longTail.slug,
              searchParamsString: ''
            }),
            initialListPayload
          )}
          routeScope={routeScope}
        />
      </Suspense>
    );
  }

  if (resolved.kind === 'manifest_seo') {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { entry, canonicalPath } = resolved;
    const { result: initialListPayload, routeScope } =
      await fetchInitialLongTailScholarshipsPayload(supabase, {
        type: 'manifest',
        canonicalPath,
        entry
      });

    const seo = readScholarshipSeoContent(canonicalPath);
    const pageTitle =
      seo?.h1?.trim() || seo?.seo_title?.trim() || entry.h1Fallback;
    const introParagraph =
      seo?.intro?.trim() ||
      `Browse scholarships in our USA catalog that match this topic (${entry.h1Fallback}). Compare deadlines, amounts, and requirements, then open each official listing to apply.`;
    const faqItems = seo?.faq;

    const safePath = canonicalPath.replace(/\//g, '__');
    const promotedChrome = isPromotedManifestSeoRoute(entry);
    const listingMode = { type: 'manifest', canonicalPath, entry } as const;

    debugLogListingSeo({
      routeKind: 'manifest_seo',
      canonicalPath,
      jsonPath: `data/seo-scholarship-content/${safePath}.json`,
      bundleFound: !!seo,
      priority:
        'h1 from bundle → seo_title from bundle → entry.h1Fallback; intro from bundle → generic fallback',
      propsFromBundle: seo
        ? {
            h1: seo.h1 ?? null,
            seo_title: seo.seo_title ?? null,
            introLen: seo.intro?.length ?? 0,
            supportingLen: seo.supporting?.length ?? 0,
            faqCount: faqItems?.length ?? 0
          }
        : null,
      chosenH1OrTitle: pageTitle,
      chosenIntroPreview: introParagraph?.slice(0, 120) ?? null,
      promotedChrome
    });

    return (
      <>
        <h1 className="sr-only">{pageTitle}</h1>
        <Suspense
        fallback={
          <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 text-slate-600 sm:px-5 md:py-12 lg:px-8">
            <div className="mx-auto max-w-5xl">Loading scholarships…</div>
          </section>
        }
      >
          <ScholarshipsHubPageClient
            isAuthenticated={Boolean(user)}
            initialPayload={createInitialScholarshipsPayload(
              buildInitialListRequestKey({
                kind: 'long_tail',
                routeKey: canonicalPath,
                searchParamsString: ''
              }),
              initialListPayload
            )}
            routeScope={routeScope}
            leadContent={
              promotedChrome ? (
                <SeoScholarshipHero
                  heading={pageTitle}
                  scholarshipCount={initialListPayload.total}
                  listLoading={false}
                  introHtml={introParagraph}
                  fallbackUsed={Boolean(initialListPayload.seoFallback?.used)}
                  thinListing={Boolean(
                    initialListPayload.seoFallback?.thinListing
                  )}
                  exactFilterMatchTotal={
                    initialListPayload.seoFallback?.exactTotal ?? null
                  }
                  qualityBucket={entry.qualityBucket ?? null}
                  pageData={seo?.page_data ?? null}
                  updatedAt={seo?._meta?.generatedAt ?? null}
                  canonicalTarget={entry.canonicalTarget ?? null}
                />
              ) : null
            }
            postListingContent={
              promotedChrome ? (
                <SeoScholarshipPostListingSeo
                  heading={pageTitle}
                  supportingParagraph={seo?.supporting ?? null}
                  relatedIntroParagraph={seo?.related_intro ?? null}
                  howToUseLines={normalizeSeoTextLines(seo?.how_to_use)}
                  whoForLines={normalizeSeoTextLines(seo?.who_for)}
                  faqItems={seo?.faq}
                  pageData={seo?.page_data ?? null}
                  qualityBucket={entry.qualityBucket ?? null}
                  updatedAt={seo?._meta?.generatedAt ?? null}
                  relatedMode={listingMode}
                />
              ) : null
            }
          />
        </Suspense>
      </>
    );
  }

  notFound();
}
