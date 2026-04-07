import Link from 'next/link';

import type { ProviderHubRow } from '@/lib/providers/providerHubServer';
import { providerHubRegionLine } from '@/lib/providers/providerHubRegionLabel';

function cardTitle(row: ProviderHubRow): string {
  const n = row.display_name?.trim();
  if (n) return n;
  return row.slug.replace(/-/g, ' ');
}

function descriptionSnippet(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

type Props = { row: ProviderHubRow };

export function ProvidersHubCard({ row }: Props) {
  const title = cardTitle(row);
  const count = row.scholarship_count ?? 0;
  const href = `/providers/${encodeURIComponent(row.slug)}`;
  const region = providerHubRegionLine(row.state);
  const snippet = descriptionSnippet(row.ai_description);
  const headingId = `provider-hub-card-title-${row.slug}`;

  return (
    <li className="h-full">
      <Link
        href={href}
        aria-labelledby={headingId}
        className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm outline-none transition duration-300 ease-out hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 sm:p-8"
      >
        <article className="flex min-h-0 flex-1 flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {region}
          </p>
          <h2
            id={headingId}
            className="mt-4 line-clamp-2 text-xl font-bold leading-snug tracking-tight text-zinc-900 sm:text-2xl sm:leading-snug"
          >
            {title}
          </h2>
          {snippet ? (
            <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-relaxed">
              {snippet}
            </p>
          ) : (
            <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
              Profile details will appear after enrichment.
            </p>
          )}
          <div className="mt-6">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-100">
              {count.toLocaleString()} Active{' '}
              {count === 1 ? 'Scholarship' : 'Scholarships'}
            </span>
          </div>
          <span className="mt-8 inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-semibold text-zinc-900 transition group-hover:border-zinc-300 group-hover:bg-zinc-50">
            View Profile
          </span>
        </article>
      </Link>
    </li>
  );
}
