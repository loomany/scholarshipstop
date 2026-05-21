import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense, type CSSProperties } from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2, ClipboardCheck } from 'lucide-react';

import { EssayGuideCardImage } from '@/components/essays/EssayGuideCardImage';
import { EssaysIndexHeroMedia } from '@/components/essays/EssaysIndexHeroMedia';
import { EssaysIndexResultSummary } from '@/components/essays/EssaysIndexResultSummary';
import EssaysIndexToolbar from '@/components/essays/EssaysIndexToolbar';
import ResourcesPagination from '@/components/content-hub/ResourcesPagination';
import {
  ESSAYS_INDEX_PAGE_SIZE,
  fetchEssaysHubIndexPage,
  type EssayListFields
} from '@/lib/essays/essaysServer';
import {
  buildEssaysIndexHref,
  parseEssaysIndexSearchParams
} from '@/lib/essays/essaysIndexFilters';
import {
  ESSAYS_PAGE_TITLE,
  ESSAYS_SECTION_PATH,
  essayHubArticlePath
} from '@/lib/essays/essayHubSection';
import { STATIC_ESSAY_GUIDES } from '@/lib/essays/staticEssayGuides';
import { getStaticEssayGuideCardCopy } from '@/lib/i18n/staticEssayGuideCards';
import {
  buildStaticEssayGuideEntries,
  filterStaticEssayGuides
} from '@/lib/i18n/staticEssayHub';
import { getURL } from '@/utils/helpers';
import {
  getEssaysHubUiCopy,
  getHubIqPromoUiCopy,
  type EssaysHubUiCopy
} from '@/lib/i18n/hubUiCopy';
import {
  hrefForLocalizedUi,
  hrefForLocalizedUiRequired,
  sectionPathForLocale,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';
import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

const baseTitle = 'Scholarship Essay Guides & Examples (2026)';
const baseDescription =
  'Use ScholarshipTop essay guides, examples, outlines, checklists, and prompt-specific advice to plan stronger scholarship applications.';

const commandCenterGroups = [
  {
    title: 'Start here',
    body: 'Build the foundation before drafting: examples, outline, checklist, and mistakes.',
    links: [
      ['Examples', '/essays/examples'],
      ['Outline', '/essays/outline'],
      ['Checklist', '/essays/checklist'],
      ['Mistakes', '/essays/mistakes']
    ]
  },
  {
    title: 'Prompt guides',
    body: 'Use these when a scholarship asks about need, goals, leadership, or personal background.',
    links: [
      ['Financial Need', '/essays/financial-need'],
      ['Career Goals', '/essays/career-goals'],
      ['Leadership', '/essays/leadership'],
      ['Personal Statement', '/essays/personal-statement']
    ]
  },
  {
    title: 'Applicant profiles',
    body: 'Match your writing strategy to the type of award or student profile you are targeting.',
    links: [
      ['STEM Essay', '/essays/stem'],
      ['No-Essay Scholarships', '/essays/no-essay-scholarships'],
      ['No Essay Hub', '/scholarships/no-essay'],
      ['International Students', '/scholarships/international-students']
    ]
  }
] as const;

export type EssaysIndexPageContentProps = {
  searchParams?: Record<string, string | string[] | undefined>;
  locale?: Stage2PilotLocale | 'en';
  ui?: EssaysHubUiCopy;
};

export async function EssaysIndexPageContent({
  searchParams,
  locale = 'en',
  ui: uiProp
}: EssaysIndexPageContentProps) {
  const ui = uiProp ?? getEssaysHubUiCopy(locale);
  const iqCopy = getHubIqPromoUiCopy(locale);
  const sectionPath = sectionPathForLocale(locale, ESSAYS_SECTION_PATH);
  const hrefForPath = (path: string) => hrefForLocalizedUiRequired(locale, path);
  const queryState = parseEssaysIndexSearchParams(searchParams);
  const {
    rows: indexRows,
    total,
    categoryOptions,
    anyPublished: hasAnyPublished
  } = await fetchEssaysHubIndexPage(queryState);

  const totalPages =
    total <= 0 ? 0 : Math.max(1, Math.ceil(total / ESSAYS_INDEX_PAGE_SIZE));
  const currentPage = queryState.page;
  const withSlug = indexRows.filter((p) => p.slug?.trim());
  const displayRows =
    currentPage === 1 ? prioritizeUniqueHeroImages(withSlug) : withSlug;

  if (total > 0 && queryState.page > totalPages) {
    redirect(
      buildEssaysIndexHref(
        totalPages,
        {
          q: queryState.q,
          categoryKey: queryState.categoryKey,
          sort: queryState.sort
        },
        sectionPath
      )
    );
  }

  const pageSize = ESSAYS_INDEX_PAGE_SIZE;
  const showingFrom =
    total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo =
    total === 0 ? 0 : Math.min(currentPage * pageSize, total);
  const staticEntries =
    locale !== 'en' ? buildStaticEssayGuideEntries(locale) : [];
  const staticFiltered =
    locale !== 'en'
      ? filterStaticEssayGuides(staticEntries, queryState)
      : [];
  const showStaticEssaysToolbar = locale !== 'en' && staticEntries.length > 0;

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: ui.home,
        item: getURL(hrefForPath('/').replace(/^\/+/, '') || '/')
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: ui.pageTitle,
        item: getURL(sectionPath.replace(/^\/+/, ''))
      }
    ]
  };

  const itemListSchema =
    withSlug.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: ui.pageTitle,
          description: ui.intro,
          numberOfItems: withSlug.length,
          itemListElement: withSlug.map((post, index) => {
            const slug = post.slug!.trim();
            const path = essayHubArticlePath(slug).replace(/^\/+/, '');
            return {
              '@type': 'ListItem',
              position: index + 1,
              name: post.title?.trim() || 'Untitled',
              item: getURL(path)
            };
          })
        }
      : null;

  return (
    <div className="bg-white text-gray-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      {itemListSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListSchema)
          }}
        />
      ) : null}
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-6 lg:pb-14 lg:pt-6">
        <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li>
              <Link
                href={hrefForPath('/')}
                className="font-medium text-gray-600 transition hover:text-gray-900"
              >
                {ui.home}
              </Link>
            </li>
            <li className="text-gray-300" aria-hidden>
              /
            </li>
            <li className="font-medium text-gray-900" aria-current="page">
              {ui.h1}
            </li>
          </ol>
        </nav>

        {/*
          On ES/FR, the DB-backed long-tail grid is hidden, so the toolbar (search/sort
          across English long-tail) would not apply. We render only the localized header
          + hero CTA video so users still see the essay command center / static guides.
        */}
        {hasAnyPublished && locale === 'en' ? (
          <Suspense
            fallback={
              <div
                className="mt-4 flex flex-col gap-6 sm:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8 lg:gap-y-0 xl:gap-x-10"
                aria-hidden
              >
                <div className="min-w-0 space-y-4">
                  <div className="h-28 w-full max-w-xl animate-pulse rounded-2xl bg-gray-100 sm:h-32" />
                  <div className="h-24 w-full animate-pulse rounded-2xl bg-gray-100" />
                </div>
                <div className="h-44 w-full max-w-sm shrink-0 animate-pulse rounded-2xl bg-gray-100 lg:mx-0 lg:max-w-none" />
              </div>
            }
          >
            {/*
              Title + toolbar share the left column with the video on the right (`lg`+).
              Stacking toolbar then a full-width `justify-end` video row left the left
              half of the row empty beside a tall video.
            */}
            <section className="mt-4 flex flex-col gap-6 sm:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8 lg:gap-y-0 xl:gap-x-10">
              <div className="min-w-0 space-y-4 sm:space-y-5">
                <header>
                  <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                    {ui.h1}
                  </h1>
                  <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
                    {ui.intro}
                  </p>
                </header>
                <EssaysIndexToolbar
                  locale={locale}
                  categoryOptions={categoryOptions}
                  resultCount={total}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  className="mt-0 w-full max-w-none"
                />
              </div>
              <aside className="w-full max-w-sm shrink-0 lg:max-w-none lg:w-full">
                <EssaysIndexHeroMedia
                  youtubeVideoId={
                    process.env.NEXT_PUBLIC_ESSAYS_HERO_YOUTUBE_ID?.trim() ||
                    null
                  }
                  ctaLabel={ui.tryEssayMentor}
                />
                <EssaysIndexResultSummary
                  resultCount={total}
                  showingFrom={showingFrom}
                  showingTo={showingTo}
                  className="mt-2 lg:hidden"
                />
              </aside>
            </section>
          </Suspense>
        ) : (
          <section className="mt-4 flex flex-col gap-6 sm:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-x-8 lg:gap-y-0 xl:gap-x-10">
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <header>
                <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.1]">
                  {ui.h1}
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed">
                  {ui.intro}
                </p>
              </header>
              {showStaticEssaysToolbar ? (
                <EssaysIndexToolbar
                  locale={locale}
                  categoryOptions={[]}
                  resultCount={staticFiltered.length}
                  showingFrom={staticFiltered.length === 0 ? 0 : 1}
                  showingTo={staticFiltered.length}
                  className="mt-0 w-full max-w-none"
                />
              ) : null}
            </div>
            <aside className="w-full max-w-sm shrink-0 lg:max-w-none lg:w-full">
              <EssaysIndexHeroMedia
                youtubeVideoId={
                  process.env.NEXT_PUBLIC_ESSAYS_HERO_YOUTUBE_ID?.trim() || null
                }
                ctaLabel={ui.tryEssayMentor}
              />
            </aside>
          </section>
        )}

        {!hasAnyPublished ? (
          <p className="mt-8 text-center text-gray-600 sm:mt-10">
            {ui.noPublished}
          </p>
        ) : total === 0 ? (
          <p className="mt-8 text-center text-gray-600 sm:mt-10">
            {ui.noMatches}
          </p>
        ) : (
          <>
            <EssayCommandCenter
              ui={ui}
              hrefForPath={hrefForPath}
              locale={locale}
              featuredSlugs={
                locale !== 'en'
                  ? staticFiltered
                      .map((entry) => entry.slug)
                      .filter((slug) =>
                        ['examples', 'checklist', 'financial-need', 'career-goals'].includes(
                          slug
                        )
                      )
                  : undefined
              }
              showEssayMentor={locale === 'en'}
            />
            {/*
              DB-backed essay long-tail (`/essays/how-to-write-...`) is English-only; hide the
              grid + pagination on ES/FR to avoid surfacing untranslated prominent CTA cards.
              Localized static essay guides above remain accessible through `EssayCommandCenter`.
            */}
            {locale === 'en' ? (
              <>
                <EssaysGrid
                  posts={displayRows}
                  readGuideLabel={ui.readGuide}
                  hrefForPath={hrefForPath}
                  iq={iqCopy}
                />
                {total > 0 && displayRows.length > 0 ? (
                  <ResourcesPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    buildHref={(page) =>
                      buildEssaysIndexHref(
                        page,
                        {
                          q: queryState.q,
                          categoryKey: queryState.categoryKey,
                          sort: queryState.sort
                        },
                        sectionPath
                      )
                    }
                  />
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function EssayCommandCenter({
  ui,
  hrefForPath,
  locale,
  featuredSlugs,
  showEssayMentor
}: {
  ui: EssaysHubUiCopy;
  hrefForPath: (path: string) => string;
  locale: Stage2PilotLocale | 'en';
  featuredSlugs?: string[];
  showEssayMentor: boolean;
}) {
  const defaultFeatured = [
    'examples',
    'checklist',
    'financial-need',
    'career-goals'
  ];
  const featuredStaticGuides = STATIC_ESSAY_GUIDES.filter((guide) =>
    (featuredSlugs ?? defaultFeatured).includes(guide.slug)
  );

  return (
    <section
      className="mt-8 rounded-3xl border border-orange-100 bg-orange-50/40 p-5 shadow-sm sm:mt-10 sm:p-6 lg:p-8"
      aria-labelledby="essay-command-center-heading"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
            {ui.commandCenterEyebrow}
          </p>
          <h2
            id="essay-command-center-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl"
          >
            {ui.commandCenterTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-700 sm:text-base">
            {ui.commandCenterBody}
          </p>
        </div>
        {showEssayMentor ? (
          <Link
            href="/essay"
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
          >
            {ui.openEssayMentor}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {ui.groups.map((group) => (
          <div
            key={group.title}
            className="rounded-2xl border border-white/80 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-600" aria-hidden />
              <h3 className="text-base font-bold text-gray-950">{group.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-600">{group.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.links.map(([label, href]) => (
                <Link
                  key={href}
                  href={hrefForPath(href)}
                  className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 transition hover:border-orange-200 hover:bg-orange-100"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featuredStaticGuides.map((guide) => {
          const card = getStaticEssayGuideCardCopy(locale, guide.slug);
          return (
          <Link
            key={guide.slug}
            href={hrefForPath(essayHubArticlePath(guide.slug))}
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                {ui.curatedGuide}
              </span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-gray-950">
              {card.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-600">
              {card.description}
            </p>
          </Link>
          );
        })}
      </div>
    </section>
  );
}

const essaysHubCardLinkClassName =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-gray-100 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.16)]';

const essaysHubIqPromoLinkClassName =
  'group flex h-full flex-col overflow-hidden rounded-2xl border border-[#FFB875]/80 bg-white shadow-[0_14px_44px_-18px_rgba(234,88,12,0.26)] ring-1 ring-[#FFE2C2] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_52px_-18px_rgba(234,88,12,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB875] focus-visible:ring-offset-2';

function EssaysGrid({
  posts,
  readGuideLabel,
  hrefForPath,
  iq
}: {
  posts: EssayListFields[];
  readGuideLabel: string;
  hrefForPath: (path: string) => string;
  iq: ReturnType<typeof getHubIqPromoUiCopy>;
}) {
  if (posts.length === 0) {
    return (
      <ul className="mt-6 grid list-none gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3" />
    );
  }

  return (
    <ul className="mt-6 grid list-none gap-6 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
      <EssaysHubIqPromoLi
        key="essays-hub-iq-promo-first"
        iq={iq}
        variant="first"
        listClassName="order-2 lg:order-1"
      />
      {posts.map((post, index) => {
        const slug = post.slug!.trim();
        const title = post.title?.trim() || 'Untitled';
        const desc = post.meta_description?.trim() || '';
        const href = hrefForPath(essayHubArticlePath(slug));
        return (
          <li
            key={post.id}
            className={index === 0 ? 'order-1 lg:order-2' : undefined}
            style={index > 0 ? { order: index + 2 } : undefined}
          >
            <Link
              href={href}
              className={essaysHubCardLinkClassName}
            >
              <EssayGuideCardImage
                src={post.hero_image_url}
                alt={title ? `Cover for ${title}` : 'Essay guide cover'}
                placeholderLabel="Essay guide"
              />
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h2 className="text-lg font-bold leading-snug tracking-tight text-gray-900 group-hover:text-gray-800 sm:text-xl">
                  {title}
                </h2>
                {desc ? (
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
                    {desc}
                  </p>
                ) : null}
                <span className="mt-4 inline-flex items-center text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                  {readGuideLabel}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
      <EssaysHubIqPromoLi
        key="essays-hub-iq-promo-last"
        iq={iq}
        variant="last"
        listStyle={{ order: posts.length + 2 }}
      />
    </ul>
  );
}

function EssaysHubIqPromoLi({
  iq,
  variant,
  listClassName,
  listStyle
}: {
  iq: ReturnType<typeof getHubIqPromoUiCopy>;
  variant: 'first' | 'last';
  listClassName?: string;
  listStyle?: CSSProperties;
}) {
  const heroSub =
    variant === 'first'
      ? iq.mapCognitiveDnaBodyFirst
      : iq.mapCognitiveDnaBodyLast;
  return (
    <li className={listClassName} style={listStyle}>
      <Link
        href="/iq/assessment?intent=essay_prep"
        aria-label={iq.startIqAria}
        className={essaysHubIqPromoLinkClassName}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#FFF7ED] via-white to-[#EEF6FF]">
          <div
            className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#FF7A1A] via-slate-950 to-[#0EA5E9]"
            aria-hidden
          />
          <div
            className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#FF7A1A]/20 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute bottom-4 right-8 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl"
            aria-hidden
          />
          <div className="relative flex h-full flex-col justify-between p-5 pl-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB875] bg-white/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#B45309] shadow-sm">
                <BrainCircuit className="h-3 w-3 text-[#F97316]" aria-hidden />
                {iq.featuredTool}
              </span>
              <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                {iq.iqBadge}
              </span>
            </div>
            <div>
              <p className="text-2xl font-semibold leading-tight tracking-tight text-slate-950">
                {iq.mapCognitiveDna}
              </p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
                {heroSub}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col border-t border-orange-100/80 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold leading-snug tracking-tight text-gray-900 sm:text-xl">
            {iq.iqAssessmentTitle}
          </h2>
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">
            {iq.iqAssessmentBody}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 transition group-hover:text-orange-700">
            {iq.startIqTest}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </Link>
    </li>
  );
}

function normalizeHeroKey(url: string | null | undefined): string | null {
  const value = url?.trim().toLowerCase();
  return value ? value : null;
}

function prioritizeUniqueHeroImages(posts: EssayListFields[]): EssayListFields[] {
  const unique: EssayListFields[] = [];
  const duplicates: EssayListFields[] = [];
  const used = new Set<string>();

  for (const post of posts) {
    const key = normalizeHeroKey(post.hero_image_url);
    if (!key) {
      unique.push(post);
      continue;
    }
    if (used.has(key)) {
      duplicates.push(post);
      continue;
    }
    used.add(key);
    unique.push(post);
  }

  return [...unique, ...duplicates];
}
