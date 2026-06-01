import Link from 'next/link';

import { SmartRelatedLinks } from '@/components/internal-links/SmartRelatedLinks';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';
import { buildMedicalClusterLinks } from '@/lib/external-data/medicalContentCluster';
import { resourceGuideLinkClassName } from '@/lib/content-hub/resourceGuidePages';

export function MedicalScholarshipPlanningSections() {
  const clusterLinks = buildMedicalClusterLinks({ surface: 'medical-guide' });

  return (
    <div className="not-prose my-10 space-y-8">
      <section
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="medical-planning-data-heading"
      >
        <h2
          id="medical-planning-data-heading"
          className="text-xl font-bold tracking-tight text-gray-900"
        >
          What this data can and cannot tell you
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Use this as planning context, not as a scholarship eligibility rule. Medical and
          healthcare scholarship requirements vary by program, provider, school level, and
          location. Public workforce and school data can help students compare goals, costs,
          and pathways, but they do not replace official provider instructions.
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-700">
          <li>
            Planning data can support questions about training paths, public wage context,
            and accredited program identity.
          </li>
          <li>
            Planning data cannot tell you whether you qualify, whether an award is
            guaranteed, or which application will succeed.
          </li>
          <li>
            Always confirm deadlines, eligibility, and required materials on the official
            provider page before applying.
          </li>
        </ul>
      </section>

      <section
        className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6"
        aria-labelledby="medical-workforce-planning-heading"
      >
        <h2
          id="medical-workforce-planning-heading"
          className="text-xl font-bold tracking-tight text-gray-900"
        >
          Health workforce planning context
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          State-level wage and shortage-designation context can help nursing, public health,
          allied health, and pre-med students think about training costs, service areas, and
          long-term career planning. ScholarshipTop shows that context only when a page has
          an explicit state signal. It does not create eligibility or funding guarantees.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          If your scholarship search is tied to a specific state, start with that state&apos;s
          scholarship listing and compare public cost context there. For broader planning,
          use{' '}
          <Link href="/compare/states" className={resourceGuideLinkClassName}>
            state comparison pages
          </Link>{' '}
          alongside this guide.
        </p>
      </section>

      <section
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="medical-school-planning-heading"
      >
        <h2
          id="medical-school-planning-heading"
          className="text-xl font-bold tracking-tight text-gray-900"
        >
          Medical school planning context
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Medical school scholarship planning is different from pre-med, nursing, and allied
          health planning. When ScholarshipTop can match an exact accredited medical school
          identity, it may show public school-type and education context on provider pages.
          That context is for planning only and does not imply admissions outcomes or award
          eligibility.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Undergraduate universities and medical schools are separate identities. A provider
          matched to a university should not automatically receive a medical school card
          unless the match is exact and unambiguous.
        </p>
      </section>

      <SmartRelatedLinks
        title="Related next steps"
        links={clusterLinks}
        excludeHref="/resources/medical-scholarships-guide"
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
      />

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 sm:p-6">
        <h2 className="text-base font-bold text-gray-900">Source note</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Healthcare planning sections on ScholarshipTop use curated public sources such as
          WDOMS, LCME, COCA, AACOM, College Scorecard, BLS OEWS, HRSA HPSA aggregate, and
          OpenAlex aggregate where strict matches are available. Scholarship rules always
          come from each provider or school.
        </p>
        <DataSourceFooter variant="mixed" className="mt-3" />
      </section>
    </div>
  );
}
