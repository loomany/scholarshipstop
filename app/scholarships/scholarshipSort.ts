import type { Scholarship } from './scholarshipsData';

export type SortOption =
  | 'magic'
  | 'best_match'
  | 'highest_amount'
  | 'lowest_amount'
  | 'least_requirements'
  | 'closest_deadline'
  | 'fewest_applicants'
  | 'most_recent'
  | 'verified_first';

/** Hub guests: profile- and scoring-heavy sorts require registration. */
export const GUEST_LOCKED_SORT_OPTIONS = new Set<SortOption>([
  'best_match',
  'magic',
  'verified_first',
  'least_requirements',
  'fewest_applicants'
]);

/** Signed-in users without subscription: only premium ranking sorts are gated. */
export const SUBSCRIPTION_LOCKED_SORT_OPTIONS = new Set<SortOption>([
  'best_match',
  'magic'
]);

export function isGuestLockedSortOption(sort: SortOption): boolean {
  return GUEST_LOCKED_SORT_OPTIONS.has(sort);
}

export function buildScholarshipOrderIndex(
  scholarships: Scholarship[]
): Map<string, number> {
  const m = new Map<string, number>();
  scholarships.forEach((s, i) => m.set(s.id, i));
  return m;
}

function parseAmount(s: Scholarship): number {
  if (
    s.awardAmountNumericSort != null &&
    !Number.isNaN(s.awardAmountNumericSort)
  ) {
    return s.awardAmountNumericSort;
  }
  const raw = (s.amount ?? s.awardAmount ?? '').replace(/,/g, '');
  const match = raw.match(/[\d.]+/);
  if (!match) return 0;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : 0;
}

function deadlineMs(s: Scholarship): number {
  if (s.deadlineAt) {
    const t = new Date(s.deadlineAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const p = Date.parse(s.deadline);
  if (!Number.isNaN(p)) return p;
  return Number.MAX_SAFE_INTEGER;
}

function reqSignalCount(s: Scholarship): number {
  if (
    s.requirementSignalsCount != null &&
    !Number.isNaN(s.requirementSignalsCount)
  ) {
    return s.requirementSignalsCount;
  }
  return (s.eligibility ?? []).map((x) => x.trim()).filter(Boolean).length;
}

function ranking(s: Scholarship): number {
  if (s.rankingScore != null && !Number.isNaN(s.rankingScore)) {
    return s.rankingScore;
  }
  const f = s.featured ? 50 : 0;
  const v = s.verified ? 20 : 0;
  return f + v;
}

function applicants(s: Scholarship): number {
  return typeof s.applicantCount === 'number'
    ? s.applicantCount
    : Number.MAX_SAFE_INTEGER;
}

function recentMs(s: Scholarship): number {
  const iso = s.updatedAt || s.createdAt;
  if (iso) {
    const t = Date.parse(iso);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/** Mutates `list` in place. `orderIndex` = original API order (lower = earlier in response). */
export function sortScholarshipsInPlace(
  list: Scholarship[],
  sortBy: SortOption,
  orderIndex: Map<string, number>
): void {
  const orig = (s: Scholarship) => orderIndex.get(s.id) ?? 0;

  list.sort((a, b) => {
    switch (sortBy) {
      case 'magic':
      case 'best_match': {
        /* best_match: will incorporate user profile + grant eligibility when available */
        const d = ranking(b) - ranking(a);
        if (d !== 0) return d;
        return orig(a) - orig(b);
      }
      case 'highest_amount': {
        const d = parseAmount(b) - parseAmount(a);
        if (d !== 0) return d;
        return orig(a) - orig(b);
      }
      case 'lowest_amount': {
        const d = parseAmount(a) - parseAmount(b);
        if (d !== 0) return d;
        return orig(a) - orig(b);
      }
      case 'least_requirements': {
        const d = reqSignalCount(a) - reqSignalCount(b);
        if (d !== 0) return d;
        return orig(a) - orig(b);
      }
      case 'closest_deadline': {
        const d = deadlineMs(a) - deadlineMs(b);
        if (d !== 0) return d;
        return orig(a) - orig(b);
      }
      case 'fewest_applicants': {
        const d = applicants(a) - applicants(b);
        if (d !== 0) return d;
        return orig(a) - orig(b);
      }
      case 'most_recent': {
        const d = recentMs(b) - recentMs(a);
        if (d !== 0) return d;
        return orig(a) - orig(b);
      }
      case 'verified_first': {
        const va = a.verified ? 1 : 0;
        const vb = b.verified ? 1 : 0;
        const d = vb - va;
        if (d !== 0) return d;
        const d2 = ranking(b) - ranking(a);
        if (d2 !== 0) return d2;
        return orig(a) - orig(b);
      }
      default:
        return orig(a) - orig(b);
    }
  });
}
