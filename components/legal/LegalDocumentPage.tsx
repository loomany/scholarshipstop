import Link from 'next/link';
import clsx from 'clsx';

import { siteNavLink as nav } from '@/components/ui/nav/siteNavLink';
import type { LocalizedPilotPage } from '@/lib/i18n/staticTranslations';

type LegalDocumentPageProps = {
  page: LocalizedPilotPage;
  backToHomeLabel: string;
  hrefForPath: (path: string) => string;
};

const sectionClass = 'mt-12 first:mt-10';
const h2Class = 'text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl';
const pClass = 'mt-4 text-base leading-relaxed text-zinc-700';
const listClass =
  'mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-zinc-700';

export default function LegalDocumentPage({
  page,
  backToHomeLabel,
  hrefForPath
}: LegalDocumentPageProps) {
  return (
    <article className="mx-auto max-w-[52rem] px-6 py-16 sm:py-20">
      <Link href={hrefForPath('/')} className={clsx(nav.legal, 'mb-6 inline-flex')}>
        ← {backToHomeLabel}
      </Link>

      <header className="border-b border-zinc-200 pb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {page.h1}
        </h1>
        {page.lastUpdatedLabel ? (
          <p className="mt-3 text-sm text-zinc-500">{page.lastUpdatedLabel}</p>
        ) : null}
        <p className="mt-4 text-base leading-relaxed text-zinc-700">{page.intro}</p>
      </header>

      <div className="pt-10">
        {page.sections.map((section, index) => (
          <section
            key={section.title}
            className={sectionClass}
            aria-labelledby={`legal-section-${index}`}
          >
            <h2 id={`legal-section-${index}`} className={h2Class}>
              {section.title}
            </h2>
            <p className={pClass}>{section.body}</p>
            {section.bullets?.length ? (
              <ul className={listClass}>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {page.faq.length > 0 ? (
        <section className={sectionClass} aria-labelledby="legal-faq-heading">
          <h2 id="legal-faq-heading" className={h2Class}>
            FAQ
          </h2>
          <div className="mt-6 space-y-4">
            {page.faq.map((item) => (
              <div
                key={item.question}
                className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-5"
              >
                <h3 className="text-base font-semibold text-zinc-900">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-12 text-sm leading-relaxed text-zinc-600">{page.disclaimer}</p>
    </article>
  );
}
