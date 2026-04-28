/**
 * Deadline display/sorting helpers. V8 parses date-only phrases like "November 30"
 * as year 2001 (implementation-defined); treat those as untrusted unless the source
 * text explicitly mentions the year (aligned with Python parse_deadline_date).
 */

/** Matches a four-digit calendar year we treat as authoritative (same century window as ingest). */
export function deadlineTextHasExplicitFourDigitYear(text: string): boolean {
  return /\b(19|20)\d{2}\b/.test(text.trim());
}

/**
 * When `deadline_text` is empty or em-dash only, calendar fields may come from `deadline_date` alone.
 * When text is present but has no four-digit year, we stay text-only (no ISO / expiry / days-left).
 */
export function deadlineTextAllowsCalendarSemantics(
  deadlineText: string | undefined
): boolean {
  const s = deadlineText?.trim() ?? '';
  if (!s || s === '—') return true;
  return deadlineTextHasExplicitFourDigitYear(s);
}

/**
 * True when `deadlineAt` points at UTC year 2001 but `deadline_text` does not mention 2001 —
 * almost always bogus (JS parse artifact or bad ingest).
 */
export function isPhantomCalendarYear2001(
  deadlineAtIso: string | undefined,
  deadlineText: string | undefined
): boolean {
  const iso = deadlineAtIso?.trim();
  const raw = deadlineText?.trim() ?? '';
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getUTCFullYear() !== 2001) return false;
  return !/\b2001\b/.test(raw);
}

/**
 * Calendar anchor for UX (cards, expiry): Supabase `deadline_date` → noon UTC when allowed,
 * else parse `deadline` text only if it contains an explicit four-digit year.
 */
export function parseScholarshipDeadlineAnchor(
  deadlineAt: string | undefined,
  deadline: string | undefined
): Date | null {
  const raw = deadline?.trim();
  const hasSubstantiveText = Boolean(raw && raw !== '—');
  if (hasSubstantiveText && !deadlineTextHasExplicitFourDigitYear(raw!)) {
    return null;
  }

  const iso = deadlineAt?.trim();
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      if (isPhantomCalendarYear2001(iso, deadline)) return null;
      return d;
    }
  }

  if (!hasSubstantiveText) return null;
  const ts = Date.parse(raw!);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
}

/** Sort key: finite ms when trustworthy; otherwise MAX_SAFE_INTEGER (closest-deadline sorts last; subtraction stays numeric). */
export function scholarshipDeadlineSortMs(
  deadlineAt: string | undefined,
  deadline: string | undefined
): number {
  const d = parseScholarshipDeadlineAnchor(deadlineAt, deadline);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}
