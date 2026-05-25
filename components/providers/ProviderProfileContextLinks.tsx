import Link from 'next/link';

import type { ProviderDetailUiCopy } from '@/lib/i18n/providerDetailUiCopy';

const cardClass =
  'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2';

type ProviderProfileContextLinksProps = {
  copy: ProviderDetailUiCopy['contextLinks'];
  items: ReadonlyArray<{ href: string; title: string }>;
};

/**
 * Cross-link SaaS block between About Provider and Official Website (SSR).
 */
export function ProviderProfileContextLinks({
  copy,
  items
}: ProviderProfileContextLinksProps) {
  return (
    <section
      id="provider-explore-scholarships"
      aria-labelledby="provider-cross-links-heading"
      className="scroll-mt-24 mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm"
    >
      <div className="max-w-none">
        <h2
          id="provider-cross-links-heading"
          className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl"
        >
          {copy.heading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
          {copy.body}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map(({ href, title }) => (
          <Link key={href} href={href} className={cardClass}>
            <span className="text-sm font-semibold text-gray-900 sm:text-[0.9375rem]">
              {title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
