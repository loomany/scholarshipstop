import 'server-only';

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import type { ContentPostListFields } from '@/lib/content-hub/contentPostListTypes';
import {
  fetchAllPublishedContentPostsForHomeCarouselFallbackCached,
  fetchPublishedContentPostsBySlugsOrdered
} from '@/lib/content-hub/contentPostsServer';
import { resourcesArticlePath } from '@/lib/content-hub/resourcesSection';
import { essayHubArticlePath } from '@/lib/essays/essayHubSection';
import type { EssayListFields } from '@/lib/essays/essaysServer';
import {
  fetchLatestPublishedEssayHubList,
  fetchPublishedEssaysBySlugsOrdered
} from '@/lib/essays/essaysServer';
import type { HomeResourcesCarouselItem } from '@/lib/home/homeResourcesCarouselItem';

export type { HomeResourcesCarouselItem } from '@/lib/home/homeResourcesCarouselItem';

const TARGET_EACH = 10;

/**
 * Pillar-style resource slugs aligned with `CONTENT_HUB_ARTICLES` / typical SEO intents
 * (search, application workflow, aid basics, safety, timelines). Order = priority.
 * Rows missing in DB are skipped and backfilled by `pickTopResourcePosts`.
 */
const TOP_SEO_RESOURCE_SLUGS: readonly string[] = [
  'how-to-search-for-scholarships-step-by-step',
  'how-to-build-a-strong-scholarship-application-profile',
  'ultimate-scholarship-application-checklist',
  'financial-aid-vs-scholarships-whats-the-difference',
  'tips-for-writing-a-winning-scholarship-essay',
  'how-gpa-affects-scholarship-opportunities',
  '10-easiest-scholarships-to-apply-for',
  'scholarship-scams-and-red-flags',
  'fafsa-timeline-and-priority-dates',
  'how-to-track-deadlines-without-missing-opportunities'
];

/**
 * Optional: exact essay hub slugs to pin first (e.g. flagship programs). Empty =
 * all 10 slots come from `scoreEssayGuide` on a recent batch (see `pickTopEssayGuides`).
 */
const TOP_SEO_ESSAY_SLUGS: readonly string[] = [];

function timeMs(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

const RESOURCE_SEO_RE =
  /scholarship|apply|application|fafsa|financial aid|deadline|essay|international|gpa|scam|checklist|how to|guide|profile|stem|fafsa|grant|aid/i;

function scoreResourcePost(p: ContentPostListFields): number {
  const bundle =
    `${p.title ?? ''} ${p.meta_description ?? ''} ${p.slug ?? ''}`.toLowerCase();
  let s = 0;
  if (RESOURCE_SEO_RE.test(bundle)) s += 6;
  if (/how to|ultimate|complete|step-by-step|checklist|tips|vs\.|difference/i.test(bundle)) {
    s += 5;
  }
  s += timeMs(p.published_at) / 1e14;
  return s;
}

const ESSAY_SEO_RE =
  /how to write|how to plan|personal statement|scholarship essay|essay prompt|draft|revise|outline|structure|adversity|brainstorm|common app|tell your story|winning essay|word limit/i;

function scoreEssayGuide(e: EssayListFields): number {
  const bundle = `${e.title ?? ''} ${e.meta_description ?? ''}`.toLowerCase();
  let s = 0;
  if (ESSAY_SEO_RE.test(bundle)) s += 12;
  if (/^how to\b/i.test(e.title ?? '')) s += 4;
  if ((e.meta_description?.length ?? 0) > 70) s += 2;
  s += timeMs(e.created_at) / 1e14;
  return s;
}

function dedupeResourcePosts(posts: ContentPostListFields[]): ContentPostListFields[] {
  const seen = new Set<string>();
  const out: ContentPostListFields[] = [];
  for (const p of posts) {
    const s = p.slug?.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function dedupeEssays(rows: EssayListFields[]): EssayListFields[] {
  const seen = new Set<string>();
  const out: EssayListFields[] = [];
  for (const e of rows) {
    const k = e.slug.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

async function pickTopResourcePosts(): Promise<ContentPostListFields[]> {
  const curated = await fetchPublishedContentPostsBySlugsOrdered([
    ...TOP_SEO_RESOURCE_SLUGS
  ]);
  const have = dedupeResourcePosts(curated);

  if (have.length >= TARGET_EACH) {
    return have.slice(0, TARGET_EACH);
  }

  const seen = new Set(have.map((p) => p.slug!.toLowerCase()));
  const pool = await fetchAllPublishedContentPostsForHomeCarouselFallbackCached();
  const rest = pool
    .filter((p) => p.slug?.trim() && !seen.has(p.slug.toLowerCase()))
    .map((p) => ({ p, score: scoreResourcePost(p) }))
    .sort((a, b) => b.score - a.score);

  const out = [...have];
  for (const { p } of rest) {
    out.push(p);
    if (out.length >= TARGET_EACH) break;
  }
  return out.slice(0, TARGET_EACH);
}

async function pickTopEssayGuides(): Promise<EssayListFields[]> {
  const preferred =
    TOP_SEO_ESSAY_SLUGS.length > 0
      ? dedupeEssays(
          await fetchPublishedEssaysBySlugsOrdered([...TOP_SEO_ESSAY_SLUGS])
        )
      : [];

  if (preferred.length >= TARGET_EACH) {
    return preferred.slice(0, TARGET_EACH);
  }

  const seen = new Set(preferred.map((e) => e.slug.toLowerCase()));
  const batch = await fetchLatestPublishedEssayHubList(160);
  const rest = dedupeEssays(batch)
    .filter((e) => !seen.has(e.slug.toLowerCase()))
    .map((e) => ({ e, score: scoreEssayGuide(e) }))
    .sort((a, b) => b.score - a.score);

  const out = [...preferred];
  for (const { e } of rest) {
    out.push(e);
    if (out.length >= TARGET_EACH) break;
  }
  return out.slice(0, TARGET_EACH);
}

/**
 * 10 prioritized resource articles + 10 essay hub guides (curated + SEO scoring fallback),
 * merged and sorted by recency (resource: `published_at`, essay: `created_at`).
 */
const fetchHomeResourcesCarouselItemsCached = unstable_cache(
  async (): Promise<HomeResourcesCarouselItem[]> => {
    const [resources, essays] = await Promise.all([
      pickTopResourcePosts(),
      pickTopEssayGuides()
    ]);

    const mappedResources = resources
      .filter((p) => p.slug?.trim())
      .map((p) => ({
        kind: 'resource' as const,
        title: p.title?.trim() || 'Untitled',
        description: p.meta_description?.trim() ?? '',
        href: resourcesArticlePath(p.slug!),
        badgeLabel: 'ARTICLE',
        ctaLabel: 'Read article',
        _t: timeMs(p.published_at)
      }));

    const mappedEssays = essays
      .filter((e) => e.slug?.trim())
      .map((e) => ({
        kind: 'essay' as const,
        title: e.title?.trim() || 'Untitled',
        description: e.meta_description?.trim() ?? '',
        href: essayHubArticlePath(e.slug),
        badgeLabel: 'ESSAY GUIDE',
        ctaLabel: 'Read guide',
        _t: timeMs(e.created_at)
      }));

    const byRecency = (a: { _t: number }, b: { _t: number }) => b._t - a._t;
    mappedResources.sort(byRecency);
    mappedEssays.sort(byRecency);

    /** ARTICLE → ESSAY GUIDE → ARTICLE → …; хвост — из более длинного списка. */
    const merged: Array<
      (typeof mappedResources)[number] | (typeof mappedEssays)[number]
    > = [];
    let i = 0;
    let j = 0;
    let nextArticle = true;
    while (i < mappedResources.length && j < mappedEssays.length) {
      if (nextArticle) {
        merged.push(mappedResources[i]!);
        i += 1;
      } else {
        merged.push(mappedEssays[j]!);
        j += 1;
      }
      nextArticle = !nextArticle;
    }
    while (i < mappedResources.length) {
      merged.push(mappedResources[i]!);
      i += 1;
    }
    while (j < mappedEssays.length) {
      merged.push(mappedEssays[j]!);
      j += 1;
    }

    return merged.slice(0, TARGET_EACH).map(({ _t: _drop, ...rest }) => rest);
  },
  ['home-resources-carousel-v2'],
  { revalidate: 3_600 }
);

export const fetchHomeResourcesCarouselItems = cache(
  fetchHomeResourcesCarouselItemsCached
);
