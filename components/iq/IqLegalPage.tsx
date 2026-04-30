import type { ReactNode } from 'react';
import Link from 'next/link';

import IqProductFooter from '@/components/iq/IqProductFooter';

type IqLegalSection = {
  title: string;
  body: ReactNode;
};

type IqLegalPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  sections: IqLegalSection[];
  closing?: ReactNode;
};

export default function IqLegalPage({
  eyebrow = 'IQ Profile',
  title,
  description,
  sections,
  closing
}: IqLegalPageProps) {
  return (
    <main className="iq-product-shell bg-[#f8fafc] text-slate-950">
      <article className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <Link
          href="/iq"
          className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
        >
          Back to IQ Profile
        </Link>

        <header className="mt-8 border-b border-slate-200 pb-10">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-indigo-600">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {description}
          </p>
        </header>

        <div className="pt-10">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="mt-10 first:mt-0"
              aria-labelledby={`iq-legal-${index}`}
            >
              <h2
                id={`iq-legal-${index}`}
                className="text-2xl font-semibold tracking-tight text-slate-950"
              >
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-7 text-slate-700">
                {section.body}
              </div>
            </section>
          ))}

          {closing ? (
            <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-6 text-base leading-7 text-slate-700 shadow-sm">
              {closing}
            </div>
          ) : null}
        </div>
      </article>
      <IqProductFooter />
    </main>
  );
}
