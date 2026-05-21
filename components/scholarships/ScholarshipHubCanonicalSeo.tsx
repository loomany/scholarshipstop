import Link from 'next/link';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  Compass,
  FileText
} from 'lucide-react';
import type { ScholarshipHubCanonicalSeoSlug } from '@/app/scholarships/scholarshipHubCanonicalSeoContent';
import {
  SCHOLARSHIP_HUB_CANONICAL_SEO,
  SCHOLARSHIP_HUB_RELATED_LINKS_DEFAULT
} from '@/app/scholarships/scholarshipHubCanonicalSeoContent';
import {
  hrefForLocalizedUiRequired,
  localizedScholarshipHubTabHref,
  type LocalizedUiLocale
} from '@/lib/i18n/localizedHref';
import { getScholarshipsHubUiCopy } from '@/lib/i18n/scholarshipsHubUiCopy';
import type { ScholarshipHubPathTabInput } from '@/app/scholarships/scholarshipHubPath';

const CONTINUE_SEARCH_CARD_META: Record<string, { Icon: LucideIcon }> = {
  '/resources': { Icon: BookOpen },
  '/essays': { Icon: FileText },
  '/providers': { Icon: Building2 },
  '/compare': { Icon: ArrowLeftRight }
};

function continueSearchCards(locale: LocalizedUiLocale) {
  const c = getScholarshipsHubUiCopy(locale).continueSearch;
  const byHref: Record<
    string,
    { title: string; description: string; Icon: LucideIcon }
  > = {
    '/resources': {
      title: c.resourcesTitle,
      description: c.resourcesBody,
      Icon: BookOpen
    },
    '/essays': {
      title: c.essaysTitle,
      description: c.essaysBody,
      Icon: FileText
    },
    '/providers': {
      title: c.providersTitle,
      description: c.providersBody,
      Icon: Building2
    },
    '/compare': {
      title: c.compareTitle,
      description: c.compareBody,
      Icon: ArrowLeftRight
    }
  };
  return SCHOLARSHIP_HUB_RELATED_LINKS_DEFAULT.map((row) => {
    const meta = byHref[row.href] ?? {
      title: row.label,
      description: '',
      Icon: CONTINUE_SEARCH_CARD_META[row.href]?.Icon ?? Compass
    };
    return {
      href: row.href,
      title: meta.title,
      description: meta.description,
      Icon: meta.Icon
    };
  });
}

function scholarshipHubFaqPageJsonLd(
  faq: { question: string; answer: string }[]
): Record<string, unknown> | null {
  if (faq.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
}

/** Intro copy beneath the listings h1 — `/scholarships/hub/[segment]` canonical catalog only (SSR). */
export function ScholarshipHubCanonicalIntro({
  slug,
  introMarginTopClassName,
  locale = 'en'
}: {
  slug: ScholarshipHubCanonicalSeoSlug;
  /** Default `mt-5 sm:mt-6`. Best hub can override to match lead→toolbar vertical rhythm. */
  introMarginTopClassName?: string;
  locale?: LocalizedUiLocale;
}) {
  const pack = SCHOLARSHIP_HUB_CANONICAL_SEO[slug];
  const introText = getScholarshipsHubUiCopy(locale).hubCanonicalIntro[slug] ?? pack.introText;
  const bestHubLayout = slug === 'best-recommendation';
  return (
    <div
      className={clsx(
        'max-w-5xl rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-sm',
        bestHubLayout ? 'mx-auto' : 'lg:mx-auto',
        'text-sm leading-relaxed text-slate-600 sm:p-6 sm:text-[0.9375rem]',
        introMarginTopClassName ?? 'mt-5 sm:mt-6'
      )}
    >
      <p className={bestHubLayout ? 'text-left text-pretty' : undefined}>
        {introText}
      </p>
    </div>
  );
}

/**
 * FAQ + related links below cards/pagination. FAQ uses visible text matching JSON-LD (`details` SSR).
 */
function localizeHubFooterHref(locale: LocalizedUiLocale, href: string): string {
  const normalized = href.split(/[?#]/, 1)[0] ?? href;
  const suffix = href.slice(normalized.length);
  const hubTabMatch = normalized.match(/^\/scholarships\/hub\/([^/]+)$/);
  if (hubTabMatch) {
    return `${localizedScholarshipHubTabHref(
      locale,
      hubTabMatch[1] as ScholarshipHubPathTabInput
    )}${suffix}`;
  }
  return hrefForLocalizedUiRequired(locale, href);
}

export function ScholarshipHubCanonicalListingFooter({
  slug,
  locale = 'en'
}: {
  slug: ScholarshipHubCanonicalSeoSlug;
  locale?: LocalizedUiLocale;
}) {
  const pack = SCHOLARSHIP_HUB_CANONICAL_SEO[slug];
  const faqLd = scholarshipHubFaqPageJsonLd(pack.faq);
  const extraRelated = (pack.extraRelatedHrefs ?? []).map((row) => ({
    ...row,
    href: localizeHubFooterHref(locale, row.href)
  }));
  const idPrefix = `hub-${slug}-faq`;
  const continueSearch = getScholarshipsHubUiCopy(locale).continueSearch;
  const baseCards = continueSearchCards(locale).map((card) => ({
    ...card,
    href: localizeHubFooterHref(locale, card.href)
  }));

  return (
    <>
      {faqLd ? (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- schema.org FAQPage mirrors visible accordion
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
      <section
        className="mt-10 max-w-5xl lg:mx-auto"
        aria-labelledby={`${idPrefix}-heading`}
      >
        <h2
          id={`${idPrefix}-heading`}
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          FAQ
        </h2>
        <div
          className={clsx(
            'mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm'
          )}
        >
          {pack.faq.map((item, i) => {
            const openDefault = i === 0;
            return (
              <details key={`${slug}-faq-${i}`} className="group" open={openDefault}>
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold text-gray-900 transition marker:content-none hover:bg-gray-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35 sm:px-5 [&::-webkit-details-marker]:hidden"
                  id={`${idPrefix}-q-${i}`}
                >
                  <span className="min-w-0 flex-1 pr-2">{item.question}</span>
                  <svg
                    className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div
                  id={`${idPrefix}-a-${i}`}
                  role="region"
                  aria-labelledby={`${idPrefix}-q-${i}`}
                  className="border-t border-gray-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-gray-600 sm:px-5"
                >
                  {item.answer}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section
        className={clsx(
          'mt-10 max-w-5xl rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 lg:mx-auto'
        )}
        aria-labelledby={`${idPrefix}-related-heading`}
        aria-describedby={`${idPrefix}-related-subtitle`}
      >
        <h2
          id={`${idPrefix}-related-heading`}
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          {continueSearch.heading}
        </h2>
        <p
          id={`${idPrefix}-related-subtitle`}
          className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]"
        >
          {continueSearch.subtitle}
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {baseCards.map(({ href, title, description, Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'group block cursor-pointer rounded-xl border border-slate-200 bg-white p-5 transition',
                'hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40'
              )}
            >
              <div className="flex gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{description}</p>
                  <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                    {continueSearch.explore}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {extraRelated.map((row) => (
            <Link
              key={row.href}
              href={row.href}
              className={clsx(
                'group block cursor-pointer rounded-xl border border-slate-200 bg-white p-5 transition',
                'hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40'
              )}
            >
              <div className="flex gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-orange-50 group-hover:text-orange-600"
                  aria-hidden
                >
                  <Compass className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg text-slate-900">{row.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {continueSearch.exploringSubtitle}
                  </p>
                  <span className="mt-3 inline-block font-medium text-orange-500 transition group-hover:text-orange-600">
                    {continueSearch.explore}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
