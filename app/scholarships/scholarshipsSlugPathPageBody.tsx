import { Suspense, type ReactNode } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';

import ScholarshipsHubShellSkeleton from '@/components/scholarships/ScholarshipsHubShellSkeleton';
import ScholarshipDetailPageAuthBridge from '@/app/scholarships/ScholarshipDetailPageAuthBridge';
import ScholarshipsHubPageAuthBridge from '@/app/scholarships/ScholarshipsHubPageAuthBridge';
import ContinueScholarshipSearchCardGrid from '@/components/scholarships/ContinueScholarshipSearchCardGrid';
import {
  SCHOLARSHIP_HUB_CANONICAL_SEO,
  isScholarshipHubCanonicalSeoSlug,
  type ScholarshipHubCanonicalSeoSlug
} from '@/app/scholarships/scholarshipHubCanonicalSeoContent';
import { scholarshipListPageTitle } from '@/app/scholarships/scholarshipTabs';
import {
  ScholarshipHubCanonicalIntro,
  ScholarshipHubCanonicalListingFooter
} from '@/components/scholarships/ScholarshipHubCanonicalSeo';
import {
  SeoScholarshipHero,
  SeoScholarshipPostListingSeo
} from '@/components/scholarships/SeoScholarshipListingChrome';
import {
  buildInitialListRequestKey,
  createInitialScholarshipsPayload,
  fetchInitialCountryScholarshipsPayload,
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
import { buildScholarshipListingJsonLd } from '@/app/scholarships/scholarshipListingJsonLd';

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

const SCHOLARSHIPS_ROOT_SCHEMA_DESCRIPTION =
  'Browse the ScholarshipTop catalog to find scholarships by deadline, award amount, eligibility, field of study, GPA, and student background.';

function ScholarshipCatalogRootIntro() {
  return (
    <div className="mt-5 max-w-5xl rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-5 text-sm leading-relaxed text-slate-600 shadow-sm sm:mt-6 sm:p-6 sm:text-[0.9375rem] lg:mx-auto">
      <p>
        Browse the ScholarshipTop catalog to compare scholarships by deadline,
        award amount, eligibility, field of study, GPA, and student background.
        Use the filters to narrow the full catalog and open each listing to
        review requirements before you apply.
      </p>
    </div>
  );
}

async function HubRootStreamedBridge({
  searchParamsString,
  hubCanonicalSeoSlug,
  hubCanonicalIntroBelowTitle,
  postListingContent,
  listingJsonLdPath,
  listingJsonLdName,
  listingJsonLdDescription,
  includeListingJsonLd = false,
  fallbackPageTitle = 'Scholarship matches'
}: {
  searchParamsString: string;
  hubCanonicalSeoSlug?: ScholarshipHubCanonicalSeoSlug;
  hubCanonicalIntroBelowTitle?: ReactNode;
  postListingContent?: ReactNode;
  listingJsonLdPath?: string;
  listingJsonLdName?: string;
  listingJsonLdDescription?: string;
  includeListingJsonLd?: boolean;
  fallbackPageTitle?: string;
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
  const hubIntro =
    hubCanonicalSeoSlug != null ? (
      <ScholarshipHubCanonicalIntro
        slug={hubCanonicalSeoSlug}
        introMarginTopClassName={
          hubCanonicalSeoSlug === 'best-recommendation' ? 'mt-5 sm:mt-6' : undefined
        }
      />
    ) : (
      hubCanonicalIntroBelowTitle ?? null
    );
  const hubFooter =
    hubCanonicalSeoSlug != null ? (
      <ScholarshipHubCanonicalListingFooter slug={hubCanonicalSeoSlug} />
    ) : (
      postListingContent ?? null
    );
  const listingJsonLd =
    includeListingJsonLd && listingJsonLdPath && listingJsonLdName
      ? buildScholarshipListingJsonLd({
          name: listingJsonLdName,
          description: listingJsonLdDescription ?? listingJsonLdName,
          path: listingJsonLdPath,
          result: initialListPayload
        })
      : null;

  return (
    <>
      {listingJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
        />
      ) : null}
      <ScholarshipsHubPageAuthBridge
        initialPayload={createInitialScholarshipsPayload(
          buildInitialListRequestKey({
            kind: 'hub',
            routeKey: 'hub',
            searchParamsString
          }),
          initialListPayload
        )}
        currentPathname={listingJsonLdPath ?? '/scholarships'}
        hubCanonicalIntroBelowTitle={hubIntro}
        postListingContent={hubFooter}
        fallbackPageTitle={fallbackPageTitle}
      />
    </>
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
    const hubSlugNorm = normalizeScholarshipDynamicParam(segments[1] ?? '');
    const hubCanonicalSeoSlug: ScholarshipHubCanonicalSeoSlug | undefined =
      isScholarshipHubCanonicalSeoSlug(hubSlugNorm) ? hubSlugNorm : undefined;
    const hubFallbackPageTitle =
      hubResolved.audience === 'international_friendly'
        ? 'Scholarships for international students'
        : scholarshipListPageTitle(hubResolved.tab, { guest: true });
    return (
      <Suspense
        fallback={<ScholarshipsHubShellSkeleton pageTitle={hubFallbackPageTitle} />}
      >
        <HubRootStreamedBridge
          searchParamsString={effectiveSearchParamsString}
          hubCanonicalSeoSlug={hubCanonicalSeoSlug}
          listingJsonLdPath={`/scholarships/hub/${encodeURIComponent(segments[1] ?? '')}`}
          listingJsonLdName={hubFallbackPageTitle}
          listingJsonLdDescription={
            hubCanonicalSeoSlug
              ? SCHOLARSHIP_HUB_CANONICAL_SEO[hubCanonicalSeoSlug].introText
              : hubFallbackPageTitle
          }
          includeListingJsonLd={searchParamsString.length === 0}
          fallbackPageTitle={hubFallbackPageTitle}
        />
      </Suspense>
    );
  }

  const returnToHref = safeScholarshipReturnToHref(searchParamsString);

  if (segments.length === 0) {
    return (
      <Suspense fallback={<ScholarshipsHubShellSkeleton />}>
        <HubRootStreamedBridge
          searchParamsString={searchParamsString}
          hubCanonicalIntroBelowTitle={<ScholarshipCatalogRootIntro />}
          postListingContent={
            <ContinueScholarshipSearchCardGrid
              idPrefix="scholarships-root-continue"
              className="mt-10 max-w-5xl lg:mx-auto"
            />
          }
          listingJsonLdPath="/scholarships"
          listingJsonLdName="Find Scholarships"
          listingJsonLdDescription={SCHOLARSHIPS_ROOT_SCHEMA_DESCRIPTION}
          includeListingJsonLd={searchParamsString.length === 0}
        />
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

  if (resolved.kind === 'country_seo') {
    const supabase = createPublicClient();
    const { route } = resolved;
    const { result: initialListPayload, routeScope } =
      await fetchInitialCountryScholarshipsPayload(supabase, route);
    const listingJsonLd = buildScholarshipListingJsonLd({
      name: route.h1,
      description: route.metaDescription,
      path: route.href,
      result: initialListPayload
    });

    return (
      <>
        {listingJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
          />
        ) : null}
        <h1 className="sr-only">{route.h1}</h1>
        <Suspense fallback={<ScholarshipsHubShellSkeleton pageTitle={route.h1} />}>
          <ScholarshipsHubPageAuthBridge
            initialPayload={createInitialScholarshipsPayload(
              buildInitialListRequestKey({
                kind: 'long_tail',
                routeKey: route.canonicalPath,
                searchParamsString: ''
              }),
              initialListPayload
            )}
            routeScope={routeScope}
            currentPathname={route.href}
            leadContent={
              <SeoScholarshipHero
                heading={route.h1}
                scholarshipCount={initialListPayload.total}
                listLoading={false}
                introHtml={route.intro}
                introFromSeoBundle={false}
                fallbackUsed={false}
                thinListing={initialListPayload.total < 4}
                exactFilterMatchTotal={initialListPayload.total}
                qualityBucket={initialListPayload.total >= 4 ? 'GOOD' : 'THIN'}
                pageData={null}
                updatedAt={null}
                canonicalTarget={null}
                publicSeoPage
              />
            }
            postListingContent={
              <SeoScholarshipPostListingSeo
                heading={route.h1}
                supportingParagraph={route.supporting}
                relatedIntroParagraph={null}
                faqItems={route.faq}
                pageData={null}
                qualityBucket={initialListPayload.total >= 4 ? 'GOOD' : 'THIN'}
                updatedAt={null}
              />
            }
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

    const listingJsonLd = buildScholarshipListingJsonLd({
      name: pageTitle,
      description: introParagraph ?? longTail.metaDescription,
      path: `/scholarships/${longTail.slug}`,
      result: initialListPayload
    });

    return (
      <>
        {listingJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
          />
        ) : null}
        <Suspense fallback={<ScholarshipsHubShellSkeleton pageTitle={pageTitle} />}>
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
            currentPathname={`/scholarships/${longTail.slug}`}
            leadContent={null}
            postListingContent={null}
          />
        </Suspense>
      </>
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

    const listingJsonLd = buildScholarshipListingJsonLd({
      name: pageTitle,
      description: introParagraph,
      path: `/scholarships/${canonicalPath}`,
      result: initialListPayload
    });

    return (
      <>
        {listingJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
          />
        ) : null}
        <h1 className="sr-only">{pageTitle}</h1>
        <Suspense fallback={<ScholarshipsHubShellSkeleton pageTitle={pageTitle} />}>
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
            currentPathname={`/scholarships/${canonicalPath}`}
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
