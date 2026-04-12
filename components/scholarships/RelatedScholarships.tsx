import Link from 'next/link';

import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import {
  fetchRelatedUniversitiesInState,
  seoStateSlugToUspsCode
} from '@/lib/scholarships/universityHubServer';

export type RelatedScholarshipsProps = {
  /** SEO state segment, e.g. texas */
  state: string;
  /** Provider slug for the current page — excluded from related links. */
  excludeUniversitySlug: string;
};

/**
 * Internal links to other provider hubs in the same state (PageRank + discovery).
 */
export default async function RelatedScholarships({
  state,
  excludeUniversitySlug
}: RelatedScholarshipsProps) {
  const code = seoStateSlugToUspsCode(state);
  if (!code) return null;

  const rows = await fetchRelatedUniversitiesInState(
    code,
    excludeUniversitySlug,
    12
  );
  if (!rows.length) return null;

  const stateKey = state.trim().toLowerCase();
  const stateLabel =
    SEO_ROUTE_STATE_SLUG_TO_LABEL[stateKey] ?? state.replace(/-/g, ' ');

  return (
    <nav
      aria-labelledby="related-scholarships-heading"
      className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2
        id="related-scholarships-heading"
        className="text-lg font-semibold tracking-tight text-slate-900"
      >
        More scholarships in {stateLabel}
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Explore other schools and providers in the same state.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.slug}>
            <Link
              className="block rounded-lg px-3 py-2 text-sm font-medium text-sky-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
              href={`/scholarships/${encodeURIComponent(stateKey)}/${encodeURIComponent(r.slug)}`}
            >
              {r.displayName}
              {r.scholarshipCount > 0 ? (
                <span className="ml-1 font-normal text-slate-500">
                  ({r.scholarshipCount})
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
