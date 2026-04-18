import { Suspense } from 'react';
import Link from 'next/link';

import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import type { UniversityHubRow } from '@/lib/scholarships/universityHubServer';
import { ProviderProfileFaqAccordion } from '@/components/providers/ProviderProfileFaqAccordion';
import RelatedScholarships from '@/components/scholarships/RelatedScholarships';
import UniversityHubScholarshipsAuthBridge from '@/components/scholarships/UniversityHubScholarshipsAuthBridge';

export type UniversityHubPageContentProps = {
  hub: UniversityHubRow;
  scholarships: Scholarship[];
  loadError: string | null;
  faqItems: ProviderFaqItem[];
};

export default function UniversityHubPageContent({
  hub,
  scholarships,
  loadError,
  faqItems
}: UniversityHubPageContentProps) {
  const intro =
    hub.aiDescription?.trim() ||
    `Browse active awards linked to ${hub.displayName} in ${hub.stateName}. Compare deadlines and requirements, then open each official listing to apply.`;

  return (
    <article className="min-h-screen bg-[#F3F7FA] px-4 py-10 sm:px-5 md:py-14 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {hub.stateName} · 2026
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Fully Funded Scholarships at {hub.displayName}, {hub.stateName}{' '}
            2026
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-700">{intro}</p>
        </header>

        {loadError ? (
          <section
            aria-live="polite"
            className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950"
          >
            <h2 className="text-lg font-semibold">Could not load listings</h2>
            <p className="mt-2 text-sm">{loadError}</p>
          </section>
        ) : null}

        {!loadError && scholarships.length === 0 ? (
          <section className="mt-10 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              No active catalog matches yet
            </h2>
            <p className="mt-3 text-slate-600">
              We did not find active scholarships tied to this provider slug in
              our database. Try the main catalog search or check back after new
              imports.
            </p>
            <p className="mt-6">
              <Link
                className="font-medium text-sky-800 underline underline-offset-4"
                href="/scholarships"
              >
                Browse all scholarships
              </Link>
            </p>
          </section>
        ) : null}

        {!loadError && scholarships.length > 0 ? (
          <div className="mt-10 flex w-full min-w-0 flex-col gap-4">
            <UniversityHubScholarshipsAuthBridge scholarships={scholarships} />
          </div>
        ) : null}

        {faqItems.length > 0 ? (
          <ProviderProfileFaqAccordion items={faqItems} />
        ) : null}

        <Suspense
          fallback={
            <aside className="mt-12 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6">
              <ScholarshipsBrandLoading
                density="compact"
                label="Loading related schools…"
                className="!min-h-[10rem] py-6"
              />
            </aside>
          }
        >
          <RelatedScholarships
            state={hub.stateSlug}
            excludeUniversitySlug={hub.slug}
          />
        </Suspense>
      </div>
    </article>
  );
}
