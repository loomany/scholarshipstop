import {
  deadlineTextAllowsCalendarSemantics,
  isPhantomCalendarYear2001,
  parseScholarshipDeadlineAnchor
} from '@/lib/scholarships/scholarshipDeadlineTrust';

export type ScholarshipDeadlineState =
  | 'active'
  | 'rolling'
  | 'unknown'
  | 'expired'
  | 'broken';

export type ScholarshipDeadlineInput = {
  deadline?: string | null;
  deadlineAt?: string | null;
  deadline_text?: string | null;
  deadline_date?: string | null;
  daysUntilDeadline?: number | null;
  days_until_deadline?: number | null;
  deadlineBucket?: string | null;
  deadline_bucket?: string | null;
};

const DEADLINE_STATE_ORDER: Record<ScholarshipDeadlineState, number> = {
  active: 0,
  rolling: 1,
  unknown: 2,
  expired: 3,
  broken: 4
};

const ROLLING_DEADLINE_RE =
  /\b(rolling|ongoing|varies|open|accepted\s+year[-\s]?round|year[-\s]?round)\b/i;

function textFromInput(input: ScholarshipDeadlineInput): string {
  return (input.deadline ?? input.deadline_text ?? '').trim();
}

function dateIsoFromInput(input: ScholarshipDeadlineInput): string | undefined {
  const direct = input.deadlineAt?.trim();
  if (direct) return direct;
  const dateOnly = input.deadline_date?.trim();
  return dateOnly ? `${dateOnly}T23:59:59.999Z` : undefined;
}

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysUntilFromInput(input: ScholarshipDeadlineInput): number | null {
  const value = input.daysUntilDeadline ?? input.days_until_deadline;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hasBrokenDeadlineAnchor(input: ScholarshipDeadlineInput): boolean {
  const iso = dateIsoFromInput(input);
  const text = textFromInput(input);
  return isPhantomCalendarYear2001(iso, text);
}

function hasRollingDeadlineText(input: ScholarshipDeadlineInput): boolean {
  return ROLLING_DEADLINE_RE.test(textFromInput(input));
}

/**
 * Foundation-only app-layer deadline state.
 *
 * Future rollout guidance:
 * - Main catalog / hub / category: hide expired or push them hard to the bottom.
 * - Hot deadlines: exclude expired entirely.
 * - Provider pages: keep all provider scholarships; order active, rolling/unknown, expired, then broken.
 * - Resources / essays / compare: keep expired when relevant, but only at the end.
 * - Detail pages: stay accessible; a later PR can add a "deadline may have passed" notice.
 */
export function getScholarshipDeadlineState(
  input: ScholarshipDeadlineInput,
  now: Date = new Date()
): ScholarshipDeadlineState {
  if (hasBrokenDeadlineAnchor(input)) return 'broken';

  const text = textFromInput(input);
  const iso = dateIsoFromInput(input);
  const textAllowsCalendar = deadlineTextAllowsCalendarSemantics(text);
  const anchor = textAllowsCalendar
    ? parseScholarshipDeadlineAnchor(iso, text)
    : null;

  if (anchor) {
    const daysUntil = daysUntilFromInput(input);
    if (daysUntil != null) return daysUntil < 0 ? 'expired' : 'active';
    return utcDateKey(anchor) < utcDateKey(now) ? 'expired' : 'active';
  }

  if (hasRollingDeadlineText(input)) return 'rolling';
  return 'unknown';
}

export function scholarshipDeadlineHasPassed(
  input: ScholarshipDeadlineInput,
  now: Date = new Date()
): boolean {
  return getScholarshipDeadlineState(input, now) === 'expired';
}

export function compareScholarshipsByDeadlineState(
  a: ScholarshipDeadlineInput,
  b: ScholarshipDeadlineInput,
  now: Date = new Date()
): number {
  return (
    DEADLINE_STATE_ORDER[getScholarshipDeadlineState(a, now)] -
    DEADLINE_STATE_ORDER[getScholarshipDeadlineState(b, now)]
  );
}
