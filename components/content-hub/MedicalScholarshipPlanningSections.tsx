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
        className="rounded-2xl border border-orange-200/80 bg-gradient-to-b from-orange-50/70 to-white p-5 shadow-sm sm:p-6"
        aria-labelledby="medical-planning-context-heading"
      >
        <h2
          id="medical-planning-context-heading"
          className="text-xl font-bold tracking-tight text-gray-900"
        >
          Medical scholarship planning context
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          Use these data points as planning context, not as a scholarship
          eligibility rule. Medical scholarship requirements vary by program,
          school, state, and funding source.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          Compare scholarship amounts alongside tuition, living costs, career
          goals, and school context. Public workforce and school data can help
          you think through pathways and costs, but every award still depends on
          the provider&apos;s official rules.
        </p>
      </section>

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
          ScholarshipTop shows public planning data when strict matches are
          available. It does not decide whether you qualify, whether an award
          will be offered, or which application will succeed.
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-700">
          <li>
            Planning data can support questions about training paths, public wage
            context, and accredited program identity.
          </li>
          <li>
            Planning data cannot replace official eligibility language, required
            documents, or provider deadlines.
          </li>
          <li>
            Always confirm deadlines, eligibility, and required materials on the
            official provider page before applying.
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
          State-level wage and shortage-designation context can help nursing,
          public health, allied health, and pre-med students think about training
          costs, service areas, and long-term career planning. ScholarshipTop
          shows that context only when a page has an explicit state signal.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          If your scholarship search is tied to a specific state, start with that
          state&apos;s scholarship listing and compare public cost context there.
          For broader planning, use{' '}
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
          Medical school scholarship planning is different from pre-med, nursing,
          and allied health planning. When ScholarshipTop can match an exact
          accredited medical school identity, it may show public school-type and
          education context on provider pages. That context is for planning only
          and does not imply admissions outcomes or award eligibility.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Undergraduate universities and medical schools are separate identities.
          A provider matched to a university should not automatically receive a
          medical school card unless the match is exact and unambiguous.
        </p>
      </section>

      <SmartRelatedLinks
        title="Continue your healthcare scholarship research"
        links={clusterLinks}
        excludeHref="/resources/medical-scholarships-guide"
        className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6"
      />

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 sm:p-6">
        <h2 className="text-base font-bold text-gray-900">Source note</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Sources: public education, workforce, affordability, and institution
          datasets where available. Healthcare planning sections use curated
          public sources such as WDOMS, LCME, COCA, AACOM, College Scorecard,
          BLS OEWS, HRSA HPSA aggregate, and OpenAlex aggregate when strict
          matches exist. Reference only — not ScholarshipTop eligibility rules
          or guarantees. Data availability varies by school, city, state, and
          source year.
        </p>
        <DataSourceFooter variant="mixed" className="mt-3" />
      </section>
    </div>
  );
}
