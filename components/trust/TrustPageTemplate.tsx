import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import type { TrustPageContent } from '@/lib/trust/trustPageContent';

type TrustPageTemplateProps = {
  page: TrustPageContent;
  copy?: {
    backHome: string;
    methodology: string;
    studentFirstRule: string;
    studentFirstHeadline: string;
    studentFirstBody: string;
    relatedTrustPages: string;
    quickReminder: string;
    quickReminderBody: string;
    disclaimer: string;
  };
  hrefForPath?: (href: string) => string;
};

const DEFAULT_COPY = {
  backHome: 'Back to home',
  methodology: 'Verification methodology',
  studentFirstRule: 'Student-first rule',
  studentFirstHeadline:
    'Use organized details, fit signals, deadlines, and provider paths to plan your next step.',
  studentFirstBody:
    'ScholarshipTop helps students compare opportunities, prepare materials, and move toward application with less guesswork.',
  relatedTrustPages: 'Related trust pages',
  quickReminder: 'Quick reminder',
  quickReminderBody:
    'Final scholarship decisions are made by the relevant provider; ScholarshipTop organizes the research and preparation workflow.',
  disclaimer: 'See legal boundaries'
} as const;

export default function TrustPageTemplate({
  page,
  copy = DEFAULT_COPY,
  hrefForPath = (href) => href
}: TrustPageTemplateProps) {
  const primaryCta = page.cta ?? { href: '/scholarships', label: 'Browse scholarships' };

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-zinc-50 pb-16 pt-10 text-zinc-900 sm:pb-20 sm:pt-14">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Link
          href={hrefForPath('/')}
          className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2"
        >
          {copy.backHome}
        </Link>

        <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                {page.eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl lg:leading-tight">
                {page.h1}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                {page.intro}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={hrefForPath(primaryCta.href)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  {primaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href={hrefForPath('/scholarship-verification-methodology')}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2"
                >
                  {copy.methodology}
                </Link>
              </div>
            </div>

            <div className="border-t border-zinc-200 bg-zinc-950 p-6 text-white sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">
                {copy.studentFirstRule}
              </p>
              <p className="mt-4 text-2xl font-semibold leading-snug tracking-tight">
                {copy.studentFirstHeadline}
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                {copy.studentFirstBody}
              </p>
            </div>
          </div>
        </section>

        {page.cards?.length ? (
          <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="Key points">
            {page.cards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-950">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{card.body}</p>
              </article>
            ))}
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-5">
            {page.sections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7"
              >
                <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                  {section.title}
                </h2>
                {section.body ? (
                  <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
                    {section.body}
                  </p>
                ) : null}
                {section.bullets?.length ? (
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-700 sm:text-base">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                          aria-hidden
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}

            {page.faq?.length ? (
              <section
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7"
                aria-labelledby="trust-page-faq"
              >
                <h2
                  id="trust-page-faq"
                  className="text-xl font-bold tracking-tight text-zinc-950"
                >
                  FAQ
                </h2>
                <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
                  {page.faq.map((item, i) => (
                    <details key={item.question} className="group" open={i === 0}>
                      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-zinc-900 marker:content-none hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
                        {item.question}
                      </summary>
                      <p className="border-t border-zinc-100 px-4 pb-4 pt-3 text-sm leading-6 text-zinc-600">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight text-zinc-950">
                {copy.relatedTrustPages}
              </h2>
              <div className="mt-4 space-y-3">
                {(page.links ?? []).map((link) => (
                  <Link
                    key={link.href}
                    href={hrefForPath(link.href)}
                    className="block rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 transition hover:border-zinc-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2"
                  >
                    <span className="text-sm font-semibold text-zinc-950">
                      {link.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-600">
                      {link.body}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight text-orange-950">
                {copy.quickReminder}
              </h2>
              <p className="mt-2 text-sm leading-6 text-orange-900">
                {copy.quickReminderBody}
              </p>
              <Link
                href={hrefForPath('/financial-aid-disclaimer')}
                className="mt-4 inline-flex text-sm font-semibold text-orange-800 underline-offset-4 hover:underline"
              >
                {copy.disclaimer}
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
