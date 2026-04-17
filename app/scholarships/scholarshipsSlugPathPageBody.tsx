import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';

import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import ScholarshipDetailPageAuthBridge from '@/app/scholarships/ScholarshipDetailPageAuthBridge';
import ScholarshipsHubPageAuthBridge from '@/app/scholarships/ScholarshipsHubPageAuthBridge';
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
  LONG_TAIL_LINK_LABELS,
  normalizeScholarshipDynamicParam,
  type LongTailSlug
} from '@/app/scholarships/scholarshipLongTailPresets';
import { loadOrGenerateSeoHubContent } from '@/lib/seo/seoHubContentService';
import {
  buildStateHubSupportingAppendHtml,
  mergeSeoSupportingWithStateHubAppend
} from '@/lib/seo/stateHubSupportingHtml';
import { parseProgrammaticTripleSeoHub } from '@/lib/seo/programmaticSeoHubParse';
import { neighborStateSlugsForSeoHub } from '@/lib/seo/stateHubNeighbors';
import { parseUsStateHubFromCanonicalPath } from '@/lib/seo/stateHubParse';
import { readLongTailSeoBundle } from '@/lib/scholarships/longTailSeoStore';
import type { LongTailSeoBundle } from '@/lib/scholarships/longTailSeoTypes';
import { readScholarshipSeoContent } from '@/lib/scholarships/scholarshipSeoContentStore';
import { scholarshipPublicSlugForMatching } from '@/app/scholarships/scholarshipsData';
import { fetchPublishedArticlesForScholarshipSlug } from '@/lib/content-hub/contentPostsServer';
import { fetchPublishedEssaysForScholarship } from '@/lib/essays/essaysServer';
import {
  getScholarshipDetailServer,
  redactPremiumScholarshipFields
} from '@/lib/scholarships/scholarshipDetailServer';
import { shouldBlockScholarshipListingForDrip } from '@/lib/seo/seoDripFeed';
import { resolveScholarshipSlugPath } from '@/lib/scholarships/seoScholarshipResolve';
import { relatedScholarshipHubLinks } from '@/lib/seo/relatedScholarshipHubLinks';
import { createPublicClient } from '@/utils/supabase/public';

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

function shouldShowManifestSeoPromotedChrome(
  entry: { indexable?: boolean; qualityBucket?: string },
  seo: LongTailSeoBundle | null
): boolean {
  if (isPromotedManifestSeoRoute(entry)) return true;
  return Boolean(seo);
}

export type ScholarshipsSlugPathPageBodyProps = {
  /** Normalized URL segments (same rules as `normalizeScholarshipDynamicParam`). */
  segments: string[];
};

/**
 * Core `/scholarships/...` router body shared by the optional catch-all route and
 * `/scholarships/[state]/[university]` when the path is not a provider-university hub.
 */
export default async function ScholarshipsSlugPathPageBody({
  segments
}: ScholarshipsSlugPathPageBodyProps) {
  if (segments.length === 0) {
    const supabase = createPublicClient();
    const initialListPayload =
      await fetchInitialHubScholarshipsPayload(supabase, null);
    return (
      <ScholarshipsHubPageAuthBridge
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
    const scholarship = await getScholarshipDetailServer(segments[0]!);
    if (!scholarship) {
      notFound();
    }
    const matchSlug = scholarshipPublicSlugForMatching(scholarship);
    const initialRelatedArticles = matchSlug
      ? await fetchPublishedArticlesForScholarshipSlug(matchSlug, 3)
      : [];
    const initialRelatedEssays = await fetchPublishedEssaysForScholarship(
      scholarship.id,
      4
    );
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
          <ScholarshipDetailPageAuthBridge
            initialScholarship={redactPremiumScholarshipFields(scholarship)}
            initialRelatedArticles={initialRelatedArticles}
            initialRelatedEssays={initialRelatedEssays}
            initialRelatedHubLinks={relatedScholarshipHubLinks(scholarship)}
          />
        </Suspense>
      </>
    );
  }

  const resolved = resolveScholarshipSlugPath(segments);

  if (resolved.kind === 'redirect_canonical') {
    if (shouldBlockScholarshipListingForDrip(resolved.canonicalPath)) {
      notFound();
    }
    permanentRedirect(`/scholarships/${resolved.canonicalPath}`);
  }

  if (resolved.kind === 'not_found') {
    notFound();
  }

  if (resolved.kind === 'scholarship_detail') {
    const scholarship =
      segments.length === 1
        ? await getScholarshipDetailServer(segments[0]!)
        : null;
    if (!scholarship) {
      notFound();
    }
    const matchSlug = scholarshipPublicSlugForMatching(scholarship);
    const initialRelatedArticles = matchSlug
      ? await fetchPublishedArticlesForScholarshipSlug(matchSlug, 3)
      : [];
    const initialRelatedEssays = await fetchPublishedEssaysForScholarship(
      scholarship.id,
      4
    );
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
          <ScholarshipDetailPageAuthBridge
            initialScholarship={redactPremiumScholarshipFields(scholarship)}
            initialRelatedArticles={initialRelatedArticles}
            initialRelatedEssays={initialRelatedEssays}
            initialRelatedHubLinks={relatedScholarshipHubLinks(scholarship)}
          />
        </Suspense>
      </>
    );
  }

  if (resolved.kind === 'legacy_long_tail') {
    if (shouldBlockScholarshipListingForDrip(resolved.slug)) {
      notFound();
    }
    const supabase = createPublicClient();
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
            <div className="mx-auto max-w-5xl">
              <ScholarshipsBrandLoading />
            </div>
          </section>
        }
      >
        <ScholarshipsHubPageAuthBridge
          initialPayload={createInitialScholarshipsPayload(
            buildInitialListRequestKey({
              kind: 'long_tail',
              routeKey: longTail.slug,
              searchParamsString: ''
            }),
            initialListPayload
          )}
          routeScope={routeScope}
          leadContent={null}
          postListingContent={null}
        />
      </Suspense>
    );
  }

  if (resolved.kind === 'manifest_seo') {
    if (shouldBlockScholarshipListingForDrip(resolved.canonicalPath)) {
      notFound();
    }
    const supabase = createPublicClient();
    const { entry, canonicalPath } = resolved;
    const { result: initialListPayload, routeScope } =
      await fetchInitialLongTailScholarshipsPayload(supabase, {
        type: 'manifest',
        canonicalPath,
        entry
      });

    const seo = readScholarshipSeoContent(canonicalPath);

    const stateHubCtx = parseUsStateHubFromCanonicalPath(canonicalPath);
    const tripleHubCtx = parseProgrammaticTripleSeoHub(canonicalPath);
    const year = new Date().getFullYear();

    let manifestDisplayHeading: string | null = null;
    let stateHubIntroFallback: string | null = null;
    let stateHubSupportingAppend: string | null = null;

    if (stateHubCtx) {
      const topicSlug = stateHubCtx.topicSlug as LongTailSlug | null;
      const topicLinkLabel =
        topicSlug && LONG_TAIL_LINK_LABELS[topicSlug]
          ? LONG_TAIL_LINK_LABELS[topicSlug]
          : null;
      const hubRow = await loadOrGenerateSeoHubContent(canonicalPath, {
        stateName: stateHubCtx.stateLabel,
        topicLabel: topicLinkLabel,
        year
      });
      manifestDisplayHeading =
        topicSlug && topicLinkLabel
          ? `${topicLinkLabel} in ${stateHubCtx.stateLabel} · ${year}`
          : `Scholarships in ${stateHubCtx.stateLabel} · ${year}`;
      stateHubIntroFallback =
        topicSlug && topicLinkLabel
          ? `Discover top-rated ${topicLinkLabel.toLowerCase()} programs and financial aid tailored for students in ${stateHubCtx.stateLabel}. Use our smart filters to match deadlines, award size, and eligibility.`
          : `Discover scholarships for students in ${stateHubCtx.stateLabel}. Use filters below to refine by field, deadline, and amount.`;

      const neighbors = neighborStateSlugsForSeoHub(stateHubCtx.stateSlug);
      stateHubSupportingAppend = buildStateHubSupportingAppendHtml({
        contentHtml: hubRow?.content_html ?? null,
        costOfLiving: hubRow?.cost_of_living_json ?? {},
        neighborSlugs: neighbors
      });
    } else if (tripleHubCtx) {
      const hubRow = await loadOrGenerateSeoHubContent(canonicalPath, {
        stateName: tripleHubCtx.stateLabel,
        topicLabel: tripleHubCtx.topicLabel,
        degreeLabel: tripleHubCtx.degreeLabel,
        year
      });
      manifestDisplayHeading = `${tripleHubCtx.topicLabel} (${tripleHubCtx.degreeLabel}) in ${tripleHubCtx.stateLabel} · ${year}`;
      stateHubIntroFallback = `Discover top-rated ${tripleHubCtx.topicLabel.toLowerCase()} programs for ${tripleHubCtx.degreeLabel.toLowerCase()} students in ${tripleHubCtx.stateLabel}. Use filters to find programs that fit your plan.`;
      const neighbors = neighborStateSlugsForSeoHub(tripleHubCtx.stateSlug);
      stateHubSupportingAppend = buildStateHubSupportingAppendHtml({
        contentHtml: hubRow?.content_html ?? null,
        costOfLiving: hubRow?.cost_of_living_json ?? {},
        neighborSlugs: neighbors
      });
    }

    const pageTitle =
      manifestDisplayHeading?.trim() ||
      seo?.h1?.trim() ||
      seo?.seo_title?.trim() ||
      entry.h1Fallback;
    const introParagraph =
      seo?.intro?.trim() ||
      stateHubIntroFallback?.trim() ||
      `Browse scholarships in our USA catalog that match this topic (${entry.h1Fallback}). Compare deadlines, amounts, and requirements, then open each official listing to apply.`;
    const mergedSupporting = mergeSeoSupportingWithStateHubAppend(
      seo?.supporting,
      stateHubSupportingAppend
    );
    const faqItems = seo?.faq;

    const safePath = canonicalPath.replace(/\//g, '__');
    const promotedChrome =
      stateHubCtx !== null ||
      tripleHubCtx !== null ||
      shouldShowManifestSeoPromotedChrome(entry, seo);
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
              <div className="mx-auto max-w-5xl">
                <ScholarshipsBrandLoading />
              </div>
            </section>
          }
        >
          <ScholarshipsHubPageAuthBridge
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
                  introFromSeoBundle={Boolean(seo?.intro?.trim())}
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
                  publicSeoPage={stateHubCtx !== null || tripleHubCtx !== null}
                />
              ) : null
            }
            postListingContent={
              <>
                {promotedChrome ? (
                  <SeoScholarshipPostListingSeo
                    heading={pageTitle}
                    supportingParagraph={mergedSupporting}
                    relatedIntroParagraph={seo?.related_intro ?? null}
                    howToUseLines={normalizeSeoTextLines(seo?.how_to_use)}
                    whoForLines={normalizeSeoTextLines(seo?.who_for)}
                    faqItems={seo?.faq}
                    pageData={seo?.page_data ?? null}
                    qualityBucket={entry.qualityBucket ?? null}
                    updatedAt={seo?._meta?.generatedAt ?? null}
                    relatedMode={listingMode}
                  />
                ) : null}
              </>
            }
          />
        </Suspense>
      </>
    );
  }

  notFound();
}
