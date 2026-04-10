'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  GraduationCap,
  ListChecks,
  Save
} from 'lucide-react';

import type { InterlinkingPreviewDetailedCardModel } from '@/lib/scholarships/interlinkingPreviewDetailedCardModel';
import {
  isScholarshipSaved,
  saveScholarshipToUserProfile
} from '@/app/scholarships/savedScholarships';

const metricIconClass = 'h-4 w-4 shrink-0 text-orange-500';
const metricWrapClass =
  'inline-flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/90 px-3 py-2 text-sm font-medium text-zinc-800';

export default function InterlinkingPreviewDetailedCard({
  providerName,
  scholarshipTitle,
  deadlineLabel,
  awardLabel,
  requirementsCountLabel,
  tags,
  summarySnippet,
  scholarshipId,
  detailHref,
  notificationLabel,
  notificationChannel: _notificationChannel
}: InterlinkingPreviewDetailedCardModel) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isScholarshipSaved(scholarshipId));
  }, [scholarshipId]);

  const onSave = useCallback(() => {
    if (saved) return;
    saveScholarshipToUserProfile(scholarshipId);
    setSaved(true);
  }, [saved, scholarshipId]);

  return (
    <article
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_64px_-28px_rgba(15,23,42,0.45)] ring-1 ring-zinc-200/60"
      aria-label={`Scholarship preview: ${scholarshipTitle}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-orange-50/90 to-transparent" />

      <div className="relative flex items-start justify-between gap-4 px-6 pb-3 pt-6 sm:px-8 sm:pt-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-zinc-950 shadow-md ring-2 ring-orange-400/35">
            <Image
              src="/logo-preview.png"
              alt="ScholarshipTop"
              width={44}
              height={44}
              className="h-full w-full object-cover"
              priority
            />
          </div>
        </div>
        <p className="max-w-[60%] text-right text-[0.8125rem] font-medium leading-snug text-zinc-500">
          {providerName}
        </p>
      </div>

      <div className="relative px-6 sm:px-8">
        {notificationLabel ? (
          <p className="mb-4 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-orange-700">
            From notification · {notificationLabel}
          </p>
        ) : (
          <p className="mb-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-2 text-center text-[0.7rem] leading-relaxed text-zinc-500">
            Notification source not set — add{' '}
            <code className="rounded bg-white px-1 font-mono text-[0.65rem] text-zinc-700">
              ?notify=best
            </code>{' '}
            ·{' '}
            <code className="rounded bg-white px-1 font-mono text-[0.65rem] text-zinc-700">
              saved_filters
            </code>{' '}
            ·{' '}
            <code className="rounded bg-white px-1 font-mono text-[0.65rem] text-zinc-700">
              easy_apply
            </code>{' '}
            ·{' '}
            <code className="rounded bg-white px-1 font-mono text-[0.65rem] text-zinc-700">
              hot_deadlines
            </code>
          </p>
        )}

        <h2 className="text-center text-2xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-[1.75rem]">
          {scholarshipTitle}
        </h2>

        <div
          className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-center sm:gap-3"
          role="list"
        >
          <div className={metricWrapClass} role="listitem">
            <CalendarDays className={metricIconClass} aria-hidden />
            <span className="min-w-0">
              <span className="text-zinc-500">Deadline</span>{' '}
              <span className="text-zinc-900">{deadlineLabel}</span>
            </span>
          </div>
          <div className={metricWrapClass} role="listitem">
            <CircleDollarSign className={metricIconClass} aria-hidden />
            <span className="min-w-0">
              <span className="text-zinc-500">Award</span>{' '}
              <span className="text-zinc-900">{awardLabel}</span>
            </span>
          </div>
          <div className={metricWrapClass} role="listitem">
            <ListChecks className={metricIconClass} aria-hidden />
            <span className="min-w-0">
              <span className="text-zinc-900">{requirementsCountLabel}</span>{' '}
              <span className="text-zinc-500">requirements</span>
            </span>
          </div>
        </div>

        {summarySnippet ? (
          <p className="mt-5 line-clamp-4 text-center text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
            {summarySnippet}
          </p>
        ) : (
          <p className="mt-5 text-center text-sm text-zinc-400">No summary available yet.</p>
        )}

        {tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-zinc-600">
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative mt-6 flex flex-col gap-3 px-6 pb-7 sm:flex-row sm:items-stretch sm:justify-center sm:gap-3 sm:px-8 sm:pb-8">
        <Link
          href={detailHref}
          rel="internal"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange-500 to-orange-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:from-orange-600 hover:to-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:min-h-[3rem] sm:max-w-[14rem]"
        >
          <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
          Open in Web View
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={onSave}
          disabled={saved}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-h-[3rem] sm:max-w-[14rem] ${
            saved
              ? 'cursor-not-allowed border border-emerald-300/80 bg-emerald-50 text-emerald-800 focus-visible:ring-emerald-500/40'
              : 'border border-emerald-600/25 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20 hover:from-emerald-600 hover:to-emerald-700 focus-visible:ring-emerald-500/50'
          }`}
        >
          <Save className="h-4 w-4 shrink-0" aria-hidden />
          {saved ? 'Saved' : 'Save to Profile'}
        </button>
      </div>
    </article>
  );
}
