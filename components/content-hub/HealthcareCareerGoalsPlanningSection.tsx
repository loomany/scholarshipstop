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
        Students writing career-goals essays can connect their goals to service, training,
        workforce needs, and long-term community impact, but should avoid making claims they
        cannot support. Use public planning context to compare pathways and costs, not to
        imply admission, residency placement, or scholarship eligibility.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Medical and healthcare scholarship requirements vary by program. Workforce and school
        data can help students compare goals, costs, and pathways, yet every application still
        depends on the provider&apos;s official rules.
      </p>

      <SmartRelatedLinks
        title="Related planning pages"
        links={clusterLinks}
        excludeHref="/essays/career-goals"
        className="mt-5"
      />
    </section>
  );
}
