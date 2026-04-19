'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import ScholarshipCatalogEntryLink from '@/components/scholarships/ScholarshipCatalogEntryLink';

import { SCHOLARSHIP_GPA_OPTIONS } from '@/lib/constants/scholarshipGpaOptions';
import {
  SCHOLARSHIP_ACTION_FILL,
  SCHOLARSHIP_ACTION_FOCUS_VISIBLE
} from '@/lib/constants/scholarshipActionUi';

type Props = {
  instAId: string;
  instBId: string;
  instAName: string;
  instBName: string;
};

type SideMatchSummary = {
  institutionMaxUsd: number | null;
  stateMaxUsd: number | null;
  nationalMaxUsd: number | null;
  totalPotentialUsd: number | null;
  institutionMatchCount: number;
  stateMatchCount: number;
  nationalMatchCount: number;
  totalMatchCount: number;
};

type MatchResponse = {
  institutionA: SideMatchSummary;
  institutionB: SideMatchSummary;
};

export function UniversityCompareMatcher({
  instAId,
  instBId,
  instAName,
  instBName
}: Props) {
  const [gpa, setGpa] = useState<string>('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);

  const gpaNum = useMemo(() => {
    const t = gpa.trim();
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  }, [gpa]);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compare/university-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instAId,
          instBId,
          gpa: gpaNum,
          countryCode: country.trim() || null
        })
      });
      const json = (await res.json()) as MatchResponse & { error?: string };
      if (!res.ok) {
        setError(json.error || 'Could not estimate matches.');
        setResult(null);
        return;
      }
      setResult(json);
    } catch {
      setError('Network error. Try again.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [country, gpaNum, instAId, instBId]);

  const fmtUsd = (n: number | null) =>
    n != null && Number.isFinite(n)
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(n)
      : '—';

  const renderBreakdown = (summary: SideMatchSummary) => {
    const pieces = [
      { label: 'Uni', value: summary.institutionMaxUsd },
      { label: 'State', value: summary.stateMaxUsd },
      { label: 'National', value: summary.nationalMaxUsd }
    ].filter((piece) => piece.value != null);

    if (pieces.length === 0) return 'No indexed funding buckets matched yet';
    return pieces
      .map((piece) => `${fmtUsd(piece.value)} ${piece.label}`)
      .join(' + ');
  };

  const renderMatchCounts = (summary: SideMatchSummary) =>
    `${summary.totalMatchCount} matches (${summary.institutionMatchCount} uni, ${summary.stateMatchCount} state, ${summary.nationalMatchCount} national)`;

  return (
    <section
      className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white p-6 shadow-sm"
      aria-labelledby="compare-matcher-heading"
    >
      <h2
        id="compare-matcher-heading"
        className="text-lg font-semibold tracking-tight text-zinc-900"
      >
        Personal matcher
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Enter your GPA and home country. We filter active catalog rows for each
        school that plausibly fit your profile (citizenship + GPA floor when
        listed), then stack the strongest institution, same-state, and national
        award signals per side.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[140px] flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">GPA (optional)</span>
          <select
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-sky-500/30 focus:ring-2"
          >
            <option value="">Skip</option>
            {SCHOLARSHIP_GPA_OPTIONS.map((o) => (
              <option key={o.value} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Country (optional)</span>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. US, Nigeria"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none ring-sky-500/30 placeholder:text-zinc-400 focus:ring-2"
            autoComplete="country-name"
          />
        </label>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className={`inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${SCHOLARSHIP_ACTION_FILL} ${SCHOLARSHIP_ACTION_FOCUS_VISIBLE}`}
        >
          {loading ? 'Estimating…' : 'Estimate'}
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-5 rounded-xl border border-zinc-100 bg-white/90 p-4 text-sm text-zinc-800">
          <div className="space-y-4">
            <p className="leading-relaxed text-zinc-600">
              We add the strongest indexed award in each bucket: direct university
              grants, same-state grants, and national grants that still fit your
              profile.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="leading-relaxed">
                  <span className="font-semibold text-zinc-900">
                    Potential funding at {instAName}:
                  </span>{' '}
                  <span className="font-semibold text-emerald-900">
                    {fmtUsd(result.institutionA.totalPotentialUsd)}
                  </span>{' '}
                  <span className="text-zinc-600">
                    ({renderBreakdown(result.institutionA)})
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  {renderMatchCounts(result.institutionA)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="leading-relaxed">
                  <span className="font-semibold text-zinc-900">
                    Potential funding at {instBName}:
                  </span>{' '}
                  <span className="font-semibold text-emerald-900">
                    {fmtUsd(result.institutionB.totalPotentialUsd)}
                  </span>{' '}
                  <span className="text-zinc-600">
                    ({renderBreakdown(result.institutionB)})
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  {renderMatchCounts(result.institutionB)}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3">
            <ScholarshipCatalogEntryLink
              className="font-semibold text-sky-700 underline-offset-2 hover:underline"
            >
              View your matches
            </ScholarshipCatalogEntryLink>{' '}
            in the full hub — filters apply to the live catalog, not just this
            pair.
          </p>
        </div>
      ) : null}
    </section>
  );
}
