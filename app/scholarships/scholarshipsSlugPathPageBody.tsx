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
import { scholarshipHubQueryStringFromURLSearchParams } from '@/app/scholarships/scholarshipHubCanonicalQueryString';
import {
  HUB_PATH_PREFIX,
  hubPathToTab,
  type HubPathToTabResult
} from '@/app/scholarships/scholarshipHubPath';
import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
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
import { fetchComparePeersForInstitution } from '@/lib/seo/comparePeersServer';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import { createPublicClient } from '@/utils/supabase/public';
import { createClient as createServerSupabase } from '@/utils/supabase/server';

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

function safeScholarshipReturnToHref(searchParamsString: string): string {
  const raw = new URLSearchParams(searchParamsString).get('return_to')?.trim() ?? '';
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return SCHOLARSHIPS_HUB_ALL_MATCHES_HREF;
  }
  return raw;
}

function hubRouteEffectiveSearchParamsString(
  incomingSearchParamsString: string,
  hub: HubPathToTabResult
): string {
  const merged = new URLSearchParams(incomingSearchParamsString);
  merged.delete('tab');
  merged.delete('scope');
  merged.set('tab', hub.tab);
  if (hub.audience === 'international_friendly') {
    merged.set('aud', 'international_friendly');
  } else {
    merged.delete('aud');
  }
  return scholarshipHubQueryStringFromURLSearchParams(merged);
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
  /** Raw query string for hub root SSR alignment. */
  searchParamsString?: string;
};

function HubShellFallback() {
  return (
    <section className="min-h-screen bg-[#F3F7FA] px-4 py-8 sm:px-5 md:py-12 lg:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="space-y-5 sm:space-y-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-[2rem] lg:leading-tight">
            Scholarship matches
          </h1>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 h-4 w-48 rounded bg-gray-200" />
            <div className="mb-3 h-11 w-full rounded-xl bg-gray-100" />
            <div className="flex gap-3">
              <div className="h-10 w-24 rounded-xl bg-gray-100" />
              <div className="h-10 w-28 rounded-xl bg-gray-100" />
              <div className="h-10 w-24 rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`hub-shell-card-${idx}`}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 h-5 w-2/3 rounded bg-gray-200" />
                <div className="mb-2 h-4 w-full rounded bg-gray-100" />
                <div className="mb-4 h-4 w-5/6 rounded bg-gray-100" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-9 rounded bg-gray-100" />
                  <div className="h-9 rounded bg-gray-100" />
                  <div className="h-9 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="rounded-lg bg-black px-4 py-3.5 text-center">
                <span className="text-sm font-bold tracking-tight text-white">
                  My scholarships
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {Array.from({ length: 7 }).map((_, idx) => (
                  <li key={idx} className="flex items-center gap-3 rounded-lg py-2.5 pr-2 pl-3">
                    <span className="h-[18px] w-[18px] rounded-full bg-orange-200" />
                    <span className="h-4 flex-1 rounded bg-gray-200" />
                    <span className="h-3 w-[4.5ch] rounded bg-gray-200" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="h-40 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    </section>
  );
}

async function HubRootStreamedBridge({
  searchParamsString
}: {
  searchParamsString: string;
}) {
  type HubListingClient = ReturnType<typeof createPublicClient>;
  let profile: ProfilesRow | null = null;
  let supabase: HubListingClient = createPublicClient();
  try {
    const serverSb = createServerSupabase();
    const {
      data: { user }
    } = await serverSb.auth.getUser();
    if (user?.id) {
      const { data: prof } = await serverSb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      profile = prof ?? null;
      supabase = serverSb as unknown as HubListingClient;
    }
  } catch {
    profile = null;
    supabase = createPublicClient();
  }
  const initialListPayload = await fetchInitialHubScholarshipsPayload(
    supabase,
    profile,
    searchParamsString
  );
  return (
    <ScholarshipsHubPageAuthBridge
      initialPayload={createInitialScholarshipsPayload(
        buildInitialListRequestKey({
          kind: 'hub',
          routeKey: 'hub',
          searchParamsString
        }),
        initialListPayload
      )}
    />
  );
}

/**
 * Core `/scholarships/...` router body shared by the optional catch-all route and
 * `/scholarships/[state]/[university]` when the path is not a provider-university hub.
 */
export default async function ScholarshipsSlugPathPageBody({
  segments,
  searchParamsString = ''
}: ScholarshipsSlugPathPageBodyProps) {
  /** `/scholarships/hub/{segment}` — same hub UI as `/scholarships`; never hit SEO/detail resolve. */
  if (segments[0] === HUB_PATH_PREFIX) {
    const hubResolved = hubPathToTab(segments);
    if (!hubResolved) {
      notFound();
    }
    const effectiveSearchParamsString = hubRouteEffectiveSearchParamsString(
      searchParamsString,
      hubResolved
    );
    return (
      <Suspense fallback={<HubShellFallback />}>
        <HubRootStreamedBridge searchParamsString={effectiveSearchParamsString} />
      </Suspense>
    );
  }

  const returnToHref = safeScholarshipReturnToHref(searchParamsString);

  if (segments.length === 0) {
    return (
      <Suspense fallback={<HubShellFallback />}>
        <HubRootStreamedBridge searchParamsString={searchParamsString} />
      </Suspense>
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
    const initialComparePeers = await fetchComparePeersForInstitution(
      scholarship.institutionId
    );
    return (
      <>
        <h1 className="sr-only">{scholarship.title}</h1>
        <ScholarshipDetailPageAuthBridge
          initialScholarship={redactPremiumScholarshipFields(scholarship)}
          routeParam={segments[0]}
          returnToHref={returnToHref}
          initialRelatedArticles={initialRelatedArticles}
          initialRelatedEssays={initialRelatedEssays}
          initialRelatedHubLinks={relatedScholarshipHubLinks(scholarship)}
          initialComparePeers={initialComparePeers}
        />
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
    const initialComparePeers = await fetchComparePeersForInstitution(
      scholarship.institutionId
    );
    return (
      <>
        <h1 className="sr-only">{scholarship.title}</h1>
        <ScholarshipDetailPageAuthBridge
          initialScholarship={redactPremiumScholarshipFields(scholarship)}
          routeParam={segments[0]}
          returnToHref={returnToHref}
          initialRelatedArticles={initialRelatedArticles}
          initialRelatedEssays={initialRelatedEssays}
          initialRelatedHubLinks={relatedScholarshipHubLinks(scholarship)}
          initialComparePeers={initialComparePeers}
        />
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
          <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 sm:px-5 md:py-12 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <ScholarshipsBrandLoading showTopAccentBar />
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
            <section className="min-h-screen bg-[#F3F7FA] px-4 py-12 sm:px-5 md:py-12 lg:px-8">
              <div className="mx-auto max-w-5xl">
                <ScholarshipsBrandLoading showTopAccentBar />
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
