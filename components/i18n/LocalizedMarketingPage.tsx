import Link from 'next/link';
import { Check } from 'lucide-react';

import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { SiteFaqAccordion } from '@/components/ui/SiteFaqAccordion';
import { homePrimaryCtaClass } from '@/components/home/homeMarketingCtaClasses';
import type { LocalizedPilotPage } from '@/lib/i18n/staticTranslations';
import { hrefForLocalizedUiRequired } from '@/lib/i18n/localizedHref';

const container = 'mx-auto w-full max-w-7xl';
const homeSectionPadX =
  'pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6';
const ledeMuted =
  'text-lg leading-relaxed text-gray-600 sm:text-xl sm:leading-relaxed';
const h2Section =
  'text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15] xl:text-[2.5rem]';

type LocalizedMarketingPageProps = {
  page: LocalizedPilotPage;
  labels: {
    language: string;
    primaryCta: string;
    secondaryCta?: string;
    faqHeading: string;
  };
};

export function LocalizedMarketingPage({ page, labels }: LocalizedMarketingPageProps) {
  const hrefForPath = (path: string) =>
    hrefForLocalizedUiRequired(page.locale, path);
  const primaryCtaHref =
    page.links.find((l) => l.href.includes('get-scholarships') || l.href.includes('submit'))?.href ??
    '/get-scholarships';
  const secondaryHref = page.links.find((l) => l.href === '/scholarships')?.href ?? '/scholarships';

  return (
    <div className="bg-white text-gray-900 antialiased">
      <section
        className={`border-b border-gray-100 bg-white pt-10 pb-12 sm:pt-12 sm:pb-14 lg:pt-14 lg:pb-16 ${homeSectionPadX}`}
      >
        <div className={`${container} max-w-4xl text-center`}>
          <div className="mb-6 flex justify-center">
            <LanguageSwitcher pathname={page.localizedPath} label={labels.language} />
          </div>
          {page.eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              {page.eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 text-pretty text-[clamp(1.8125rem,5.25vw+0.8rem,2.25rem)] font-bold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl sm:leading-[1.06] lg:text-[3rem] lg:leading-[1.05]">
            {page.h1}
          </h1>
          <p className={`mx-auto mt-5 max-w-3xl text-pretty sm:mt-6 ${ledeMuted}`}>
            {page.intro}
          </p>
          <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 sm:mt-10 sm:flex-row sm:justify-center sm:gap-5">
            <Link href={hrefForPath(primaryCtaHref)} className={homePrimaryCtaClass}>
              {labels.primaryCta}
            </Link>
            {labels.secondaryCta ? (
              <Link
                href={hrefForPath(secondaryHref)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
              >
                {labels.secondaryCta}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {page.sections.map((section) => (
        <section
          key={section.title}
          className={`border-b border-gray-100 bg-gray-50/50 py-10 sm:py-12 lg:py-14 ${homeSectionPadX}`}
        >
          <div className={`${container} max-w-4xl`}>
            <h2 className={`text-pretty text-center ${h2Section}`}>{section.title}</h2>
            <p className={`mx-auto mt-4 max-w-3xl text-center ${ledeMuted}`}>{section.body}</p>
            {section.bullets?.length ? (
              <ul className="mx-auto mt-8 max-w-2xl space-y-3 text-left text-base text-gray-700">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}

      {(page.cards ?? []).length > 0 ? (
        <section className={`border-b border-gray-100 bg-white py-10 sm:py-12 lg:py-14 ${homeSectionPadX}`}>
          <div className={container}>
            <div className="grid gap-6 sm:grid-cols-2">
              {(page.cards ?? []).map((card) => {
                const href = card.href ? hrefForPath(card.href) : null;
                const inner = (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.body}</p>
                  </>
                );
                return href ? (
                  <Link
                    key={card.title}
                    href={href}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                  >
                    {inner}
                  </Link>
                ) : (
                  <article
                    key={card.title}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    {inner}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {page.faq.length > 0 ? (
        <section className={`py-10 sm:py-12 lg:py-14 ${homeSectionPadX}`}>
          <div className={`${container} max-w-3xl`}>
            <SiteFaqAccordion
              items={page.faq}
              headingId="marketing-faq-heading"
              heading={labels.faqHeading}
            />
          </div>
        </section>
      ) : null}

      <section className={`border-t border-gray-100 bg-gray-50 py-8 ${homeSectionPadX}`}>
        <p className={`${container} max-w-3xl text-center text-sm leading-relaxed text-gray-600`}>
          {page.disclaimer}
        </p>
      </section>
    </div>
  );
}
