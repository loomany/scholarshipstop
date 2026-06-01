import { SmartRelatedLinks } from '@/components/internal-links/SmartRelatedLinks';
import { buildMedicalClusterLinks } from '@/lib/external-data/medicalContentCluster';

export function HealthcareCareerGoalsPlanningSection() {
  const clusterLinks = buildMedicalClusterLinks({ surface: 'career-goals' });

  return (
    <section
      className="mt-8 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6"
      aria-labelledby="healthcare-career-goals-planning-heading"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Healthcare career goals planning context
      </p>
      <h2
        id="healthcare-career-goals-planning-heading"
        className="mt-1 text-lg font-bold text-gray-900"
      >
        Connect goals to evidence, not guarantees
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        When writing a career-goals essay, connect your goal to specific
        experiences, service motivation, training plans, and long-term impact.
        Reviewers want to see why the path fits you now — not a generic promise
        about helping people someday.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Healthcare examples should be personal and evidence-based; avoid broad
        claims you cannot support. Use public planning context to compare
        pathways and costs, not to imply admission, residency placement, or
        scholarship eligibility.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Medical and healthcare scholarship requirements vary by program, school,
        state, and funding source. Compare scholarship amounts alongside
        tuition, living costs, career goals, and school context — then confirm
        every rule on the official provider page.
      </p>

      <SmartRelatedLinks
        title="Planning pages for your essay research"
        links={clusterLinks}
        excludeHref="/essays/career-goals"
        className="mt-5"
      />
    </section>
  );
}
