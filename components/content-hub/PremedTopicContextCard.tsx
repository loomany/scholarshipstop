import Link from 'next/link';

import type { PremedTopicContext } from '@/lib/external-data';

import { CompareExternalEnrichmentStatCard } from '@/components/compare/CompareExternalEnrichmentStatCard';
import { DataSourceFooter } from '@/components/data-viz/DataSourceFooter';

type PremedTopicContextCardProps = {
  context: PremedTopicContext | null;
  className?: string;
  compact?: boolean;
  showRelatedLinks?: boolean;
};

export function PremedTopicContextCard({
  context,
  className = '',
  compact = false,
  showRelatedLinks = true
}: PremedTopicContextCardProps) {
  if (!context) return null;

  const dataPoints = (context.data_points ?? []).filter(
    (point) => point.value != null && String(point.value).trim().length > 0
  );
  const links = (context.related_links ?? []).filter(
    (link) => link.label.trim() && link.href.trim()
  );

  return (
    <aside
      className={`rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6 ${className}`.trim()}
      aria-label={`${context.topic} context`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Healthcare planning context
      </p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">{context.topic}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {context.suggested_context_copy}
      </p>

      {dataPoints.length ? (
        <div
          className={`mt-4 grid gap-2.5 ${
            compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {dataPoints.slice(0, compact ? 2 : 4).map((point) => (
            <CompareExternalEnrichmentStatCard
              key={`${point.label}-${point.source}`}
              label={point.label}
              value={String(point.value)}
              hint={point.source}
            />
          ))}
        </div>
      ) : null}

      {showRelatedLinks && links.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.slice(0, compact ? 3 : 5).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Use these data points as planning context, not as a scholarship eligibility
        rule. Scholarship rules, deadlines, and eligibility come from each provider
        or school.
      </p>
      <DataSourceFooter variant="mixed" className="mt-3" />
    </aside>
  );
}
