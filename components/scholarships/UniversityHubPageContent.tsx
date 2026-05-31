import { Suspense } from 'react';

import ScholarshipsHubPageAuthBridge from '@/app/scholarships/ScholarshipsHubPageAuthBridge';
import type {
  InitialScholarshipsPayload,
  LongTailRouteScopePayload
} from '@/app/scholarships/scholarshipListServerPayload';
import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';
import type { UniversityHubRow } from '@/lib/scholarships/universityHubServer';
import { ProviderProfileFaqAccordion } from '@/components/providers/ProviderProfileFaqAccordion';
import RelatedScholarships from '@/components/scholarships/RelatedScholarships';
import { ScholarshipUniversityExternalContextSidebar } from '@/components/scholarships/ScholarshipUniversityExternalContextSidebar';

export type UniversityHubPageContentProps = {
  hub: UniversityHubRow;
  initialPayload: InitialScholarshipsPayload | null;
  routeScope: LongTailRouteScopePayload;
  faqItems: ProviderFaqItem[];
};

export default function UniversityHubPageContent({
  hub,
  initialPayload,
  routeScope,
  faqItems
}: UniversityHubPageContentProps) {
  const intro =
    hub.aiDescription?.trim() ||
    `Browse active awards linked to ${hub.displayName} in ${hub.stateName}. Compare deadlines and requirements, then open each official listing to apply.`;

  return (
    <ScholarshipsHubPageAuthBridge
      initialPayload={initialPayload}
      routeScope={routeScope}
      leadContent={
        <>
          <header className="border-b border-slate-200 pb-8">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              {hub.stateName} · 2026
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Fully Funded Scholarships at {hub.displayName}, {hub.stateName} 2026
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              {intro}
            </p>
          </header>
          <ScholarshipUniversityExternalContextSidebar
            stateSlug={hub.stateSlug}
            universityDisplayName={hub.displayName}
            providerSlug={hub.slug}
          />
        </>
      }
      postListingContent={
        <>
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
        </>
      }
    />
  );
}
