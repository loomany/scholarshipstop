import type { ReactNode } from 'react';

import { ScholarshipObscuredTextPill } from '@/components/scholarships/ScholarshipObscuredTextPill';
import { SCHOLARSHIP_PROVIDER_OBSCURE_CLASS } from '@/lib/constants/scholarshipActionUi';

export type ObscureProviderInTextOptions = {
  /**
   * If the provider string does not appear in `text`, blur the whole string.
   * Listing card description uses `false` — only matching name segments are blurred.
   * Quick facts / other conservative surfaces may use `true`.
   */
  blurEntireWhenNoSubstringMatch?: boolean;
  /**
   * When set, each blurred segment is shown as an orange-lock pill; click opens the unlock flow.
   * Omit for plain blur (e.g. non-interactive contexts).
   */
  onLockedSegmentClick?: () => void;
  /**
   * When `onLockedSegmentClick` is set: if `false`, pill is visual-only (e.g. nested inside a parent button).
   * Default `true`.
   */
  lockedObscuredInteractive?: boolean;
};

function renderObscuredSlice(
  key: string,
  slice: string,
  options?: ObscureProviderInTextOptions
): ReactNode {
  const onClick = options?.onLockedSegmentClick;
  const interactive =
    options?.lockedObscuredInteractive !== false && Boolean(onClick);
  if (onClick) {
    return (
      <ScholarshipObscuredTextPill
        key={key}
        onUnlock={onClick}
        interactive={interactive}
      >
        {slice}
      </ScholarshipObscuredTextPill>
    );
  }
  return (
    <span
      key={key}
      className={`inline ${SCHOLARSHIP_PROVIDER_OBSCURE_CLASS}`}
      aria-hidden
    >
      {slice}
    </span>
  );
}

/**
 * Unique phrases to blur (longest first) — primary sponsor + official label + common sibling strings.
 */
export function buildScholarshipProviderBlurPhrases(s: {
  provider?: string | null;
  officialSourceName?: string | null;
}): string[] {
  const raw: string[] = [];
  const p = s.provider?.trim();
  if (p) raw.push(p);
  const o = s.officialSourceName?.trim();
  if (o) raw.push(o);

  if (p && /American\s+Osteopathic/i.test(p)) {
    raw.push(
      'American Osteopathic Association',
      'American Osteopathic Foundation',
      'AOA',
      'AOF'
    );
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    const t = x.trim();
    if (t.length < 2) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  out.sort((a, b) => b.length - a.length);
  return out;
}

function mergeIntervals(
  ranges: { start: number; end: number }[]
): { start: number; end: number }[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort(
    (a, b) => a.start - b.start || b.end - a.end
  );
  const merged: { start: number; end: number }[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }
  return merged;
}

/**
 * Blur every case-insensitive occurrence of any phrase in `text` (merged non-overlapping spans).
 */
export function renderTextWithObscuredPhrases(
  text: string,
  phrases: string[],
  options?: ObscureProviderInTextOptions
): ReactNode {
  const blurEntireWhenNoSubstringMatch =
    options?.blurEntireWhenNoSubstringMatch ?? true;
  const cleaned = [
    ...new Set(
      phrases
        .map((p) => p.trim())
        .filter((p) => p.length >= 2)
    )
  ].sort((a, b) => b.length - a.length);

  if (cleaned.length === 0) {
    if (blurEntireWhenNoSubstringMatch) {
      return renderObscuredSlice('full-empty', text, options);
    }
    return text;
  }

  const lower = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];
  for (const phrase of cleaned) {
    const pl = phrase.toLowerCase();
    let from = 0;
    while (from < text.length) {
      const i = lower.indexOf(pl, from);
      if (i < 0) break;
      ranges.push({ start: i, end: i + phrase.length });
      from = i + 1;
    }
  }

  const merged = mergeIntervals(ranges);
  if (merged.length === 0) {
    if (blurEntireWhenNoSubstringMatch) {
      return renderObscuredSlice('full-nomatch', text, options);
    }
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let k = 0;
  for (const r of merged) {
    if (r.start > cursor) {
      nodes.push(<span key={`p-${k++}`}>{text.slice(cursor, r.start)}</span>);
    }
    nodes.push(
      renderObscuredSlice(`b-${k++}`, text.slice(r.start, r.end), options)
    );
    cursor = r.end;
  }
  if (cursor < text.length) {
    nodes.push(<span key={`p-${k++}`}>{text.slice(cursor)}</span>);
  }
  return <>{nodes}</>;
}

/**
 * For users without a subscription: blur every case-insensitive occurrence of `provider` in `text`.
 * When `provider` is empty, blur the full text.
 */
export function renderTextWithObscuredProviderName(
  text: string,
  provider: string,
  options?: ObscureProviderInTextOptions
): ReactNode {
  const p = provider.trim();
  if (!p) {
    return renderObscuredSlice('provider-empty', text, options);
  }
  return renderTextWithObscuredPhrases(text, [p], options);
}
