import Link from 'next/link';

import {
  SafeScholarshipHtml,
  scholarshipRichProseClassName
} from '@/components/scholarships/SafeScholarshipHtml';
import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import type { SeoHubCostOfLivingJson } from '@/lib/seo/seoHubContentService';

type StateHubSeoPanelsProps = {
  contentHtml: string | null;
  costOfLiving: SeoHubCostOfLivingJson;
  neighborSlugs: string[];
};

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

export default function StateHubSeoPanels({
  contentHtml,
  costOfLiving,
  neighborSlugs
}: StateHubSeoPanelsProps) {
  const hasCol =
    costOfLiving.average_room_rent_usd_monthly != null ||
    costOfLiving.typical_lunch_usd != null ||
    costOfLiving.monthly_transport_usd != null ||
    (costOfLiving.notes && costOfLiving.notes.trim().length > 0);

  return (
    <div className="mt-10 space-y-10 border-t border-slate-200 pt-10">
      {contentHtml ? (
        <section aria-labelledby="state-hub-guide-heading">
          <h2
            id="state-hub-guide-heading"
            className="mb-4 text-xl font-semibold text-slate-900"
          >
            Studying in this state
          </h2>
          <div
            className={`${scholarshipRichProseClassName} prose prose-slate max-w-none`}
          >
            <SafeScholarshipHtml html={contentHtml} />
          </div>
        </section>
      ) : null}

      {hasCol ? (
        <section aria-labelledby="state-hub-col-heading">
          <h2
            id="state-hub-col-heading"
            className="mb-4 text-xl font-semibold text-slate-900"
          >
            Cost of living (ballpark)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[280px] text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Typical monthly cost (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3">Room rent (estimate)</td>
                  <td className="px-4 py-3">
                    {formatUsd(costOfLiving.average_room_rent_usd_monthly)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Lunch out</td>
                  <td className="px-4 py-3">
                    {formatUsd(costOfLiving.typical_lunch_usd)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Transport</td>
                  <td className="px-4 py-3">
                    {formatUsd(costOfLiving.monthly_transport_usd)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {costOfLiving.notes ? (
            <p className="mt-3 text-sm text-slate-600">{costOfLiving.notes}</p>
          ) : null}
        </section>
      ) : null}

      {neighborSlugs.length > 0 ? (
        <section aria-labelledby="state-hub-neighbors-heading">
          <h2
            id="state-hub-neighbors-heading"
            className="mb-4 text-xl font-semibold text-slate-900"
          >
            Other states you might like
          </h2>
          <ul className="flex flex-wrap gap-2">
            {neighborSlugs.map((slug) => {
              const label = SEO_ROUTE_STATE_SLUG_TO_LABEL[slug] ?? slug;
              return (
                <li key={slug}>
                  <Link
                    href={`/scholarships/${slug}`}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
