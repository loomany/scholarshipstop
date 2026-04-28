import { scholarshipSeoTagsBypassAmountFilter } from '@/lib/scholarships/seoTags/awardSignalTags';
import type { Scholarship } from './scholarshipsData';
import {
  normalizeUsStateToCanonical,
  US_STATE_NAME_TO_CODE
} from '@/lib/constants/usStates';
import {
  getScholarshipCatalog,
  NATIONWIDE_LOCATION
} from '@/lib/scholarships/scholarshipCatalog';
import { isInternationalFriendlyScholarship } from '@/lib/scholarships/internationalFriendly';
import { parseScholarshipDeadlineAnchor } from '@/lib/scholarships/scholarshipDeadlineTrust';

export type DeadlinePreset = 'any' | 'lt1d' | 'd1_7' | 'w1_4' | 'gt4w';

/** low / medium / high map to data completeness buckets (basic / standard / detailed). */
export type CredibilityFlags = {
  low: boolean;
  medium: boolean;
  high: boolean;
  verified: boolean;
};

export type PayoutFlags = {
  college: boolean;
  student: boolean;
  nonMonetary: boolean;
  notStated: boolean;
};

/**
 * Narrow catalog rows toward international-student-friendly signals (structured + text).
 * Does not guarantee visa eligibility — users must confirm on the official program page.
 */
export type CitizenshipAudienceFilter = 'any' | 'international_friendly';

/**
 * Cabinet-driven citizenship slice for Best / recommended (not the IF catalog toggle).
 * International students use `includeEligibility` (`international_students`); this is only for US domestic signals.
 */
export type ProfileCitizenshipNarrow = 'none' | 'us_domestic';

export type MoreFiltersState = {
  deadlinePreset: DeadlinePreset;
  /** When `international_friendly`, require catalog signals for international / foreign eligibility. */
  citizenshipAudience: CitizenshipAudienceFilter;
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
  /** Include-only: scholarship must match ≥1 selected requirement (OR). */
  includeRequirementTypes: Set<string>;
  dataCompleteness: CredibilityFlags;
  payout: PayoutFlags;
  /** Include-only: scholarship must match ≥1 selected tag (OR). */
  includeEligibility: Set<string>;
  includeEducationLevels: Set<string>;
  includeGpaBuckets: Set<string>;
  includeLocationLabels: Set<string>;
  includeEasyApply: Set<string>;
  /**
   * Optional U.S. state (type full name; must match canonical list to narrow SQL).
   * Invalid/partial text does not filter (same as onboarding).
   */
  filterStateInput: string;
  /**
   * Optional university/provider picked from autocomplete suggestions.
   * Input text alone does not filter until a matching suggestion is selected.
   */
  filterUniversityInput: string;
  filterUniversitySlug: string | null;
  /**
   * Profile-backed field-of-study slug (same space as `profiles.field_of_study` / onboarding).
   * When set, listing SQL ORs `field_of_study` JSON + soft title/summary match.
   */
  profileFieldOfStudySlug: string;
  /** Narrow listing toward domestic vs international signals when the profile says so. */
  profileCitizenshipNarrow: ProfileCitizenshipNarrow;
};

export const REQUIREMENT_TYPE_OPTIONS: {
  id: string;
  label: string;
}[] = [
  { id: 'essay', label: 'Essay' },
  { id: 'document', label: 'Document' },
  { id: 'photo', label: 'Photo' },
  { id: 'video', label: 'Video' },
  { id: 'personal_statement', label: 'Personal statement / career goals' },
  { id: 'link', label: 'Link' },
  { id: 'survey', label: 'Survey' },
  { id: 'question', label: 'Question' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'transcript', label: 'Transcript' }
];

export function parseScholarshipAmount(s: Scholarship): number {
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

function deadlineMs(s: Scholarship): number | null {
  const d = parseScholarshipDeadlineAnchor(s.deadlineAt, s.deadline);
  return d ? d.getTime() : null;
}

export function daysUntilDeadline(s: Scholarship): number | null {
  const ms = deadlineMs(s);
  if (ms === null) return null;
  return (ms - Date.now()) / 86400000;
}

/** Data completeness + verified source (not legacy credibility %). */
function matchesDataCompletenessAndVerified(
  s: Scholarship,
  c: CredibilityFlags
): boolean {
  const anyComp = c.low || c.medium || c.high;
  const any = anyComp || c.verified;
  if (!any) return true;

  const cat = getScholarshipCatalog(s);
  const hitVer = c.verified && Boolean(s.verified);
  const b = cat.completenessBucket;
  const hitBasic = c.low && b === 'basic';
  const hitStd = c.medium && b === 'standard';
  const hitDet = c.high && b === 'detailed';

  return hitVer || hitBasic || hitStd || hitDet;
}

function matchesPayout(s: Scholarship, p: PayoutFlags): boolean {
  const any =
    p.college || p.student || p.nonMonetary || p.notStated;
  if (!any) return true;

  const method = s.payoutMethod?.toLowerCase();
  if (method) {
    const hitCollege = p.college && method === 'college';
    const hitStudent = p.student && method === 'student';
    const hitNon = p.nonMonetary && method === 'non_monetary';
    const hitUnstated = p.notStated && method === 'not_stated';
    return hitCollege || hitStudent || hitNon || hitUnstated;
  }

  const w = (s.winnerPayment ?? s.paymentDetails ?? '').toLowerCase();
  const hitCollege =
    p.college &&
    /college|financial aid|bursar|institution|school office/i.test(w);
  const hitStudent =
    p.student &&
    /student|you|directly to you|paid to you|recipient/i.test(w);
  const hitNon =
    p.nonMonetary &&
    /non-monetary|course|subscription|software|prize|in-kind/i.test(w);
  const hitUnstated =
    p.notStated &&
    (!w ||
      /information will be added|not stated|unspecified|tbd/i.test(w));

  return hitCollege || hitStudent || hitNon || hitUnstated;
}

function matchesGpaBuckets(s: Scholarship, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const cat = getScholarshipCatalog(s);
  const bid = cat.gpaBucketId;
  if (bid && selected.has(bid)) return true;
  return false;
}

function matchesLocation(s: Scholarship, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const cat = getScholarshipCatalog(s);
  const labels = new Set(cat.locationLabels);
  for (const sel of Array.from(selected)) {
    if (labels.has(sel)) return true;
    if (sel === NATIONWIDE_LOCATION && labels.has(NATIONWIDE_LOCATION)) {
      return true;
    }
  }
  return false;
}

function matchesInternationalFriendlyAudience(s: Scholarship): boolean {
  if (s.internationalFriendlyListing === true) return true;
  return isInternationalFriendlyScholarship(s);
}

function matchesFilterStateInput(s: Scholarship, filterStateInput: string): boolean {
  const canon = normalizeUsStateToCanonical(filterStateInput);
  if (!canon) return true;
  const code = US_STATE_NAME_TO_CODE[canon]?.toUpperCase();
  if (!code) return true;
  const row = (s.stateCodes ?? []).map((c) => String(c).trim().toUpperCase());
  if (row.length === 0) return false;
  return row.some((c) => c === code);
}

function matchesEasyApply(s: Scholarship, selected: Set<string>): boolean {
  if (selected.size === 0) return true;
  const cat = getScholarshipCatalog(s);
  for (const id of Array.from(selected)) {
    if (cat.easyApplyIds.includes(id)) return true;
  }
  return false;
}

export function matchesDeadlinePreset(
  s: Scholarship,
  preset: DeadlinePreset
): boolean {
  if (preset === 'any') return true;
  const b = s.deadlineBucket;
  if (b && b !== 'unknown') {
    if (preset === 'lt1d') return b === 'lt_1d';
    if (preset === 'd1_7') return b === 'd1_7';
    if (preset === 'w1_4') return b === 'd8_28';
    if (preset === 'gt4w') return b === 'gt_28';
  }
  const d = daysUntilDeadline(s);
  if (d === null) return true;
  switch (preset) {
    case 'lt1d':
      return d >= 0 && d < 1;
    case 'd1_7':
      return d >= 1 && d <= 7;
    case 'w1_4':
      return d > 7 && d <= 28;
    case 'gt4w':
      return d > 28;
    default:
      return true;
  }
}

export function defaultMoreFiltersFromBounds(bounds: {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
}): MoreFiltersState {
  return {
    deadlinePreset: 'any',
    citizenshipAudience: 'any',
    amountMin: bounds.amountMin,
    amountMax: bounds.amountMax,
    applicantsMin: bounds.applicantsMin,
    applicantsMax: bounds.applicantsMax,
    includeRequirementTypes: new Set(),
    dataCompleteness: {
      low: false,
      medium: false,
      high: false,
      verified: false
    },
    payout: {
      college: false,
      student: false,
      nonMonetary: false,
      notStated: false
    },
    includeEligibility: new Set(),
    includeEducationLevels: new Set(),
    includeGpaBuckets: new Set(),
    includeLocationLabels: new Set(),
    includeEasyApply: new Set(),
    filterStateInput: '',
    filterUniversityInput: '',
    filterUniversitySlug: null,
    profileFieldOfStudySlug: '',
    profileCitizenshipNarrow: 'none'
  };
}

export function computeFilterBounds(
  list: Scholarship[]
): {
  amountMin: number;
  amountMax: number;
  applicantsMin: number;
  applicantsMax: number;
} {
  let amin = Infinity;
  let amax = 0;
  let pmin = Infinity;
  let pmax = 0;
  for (const s of list) {
    const a = parseScholarshipAmount(s);
    amin = Math.min(amin, a);
    amax = Math.max(amax, a);
    const p = s.applicantCount;
    if (typeof p === 'number' && !Number.isNaN(p)) {
      pmin = Math.min(pmin, p);
      pmax = Math.max(pmax, p);
    }
  }
  if (amin === Infinity) amin = 0;
  if (amax === 0) amax = 5000;
  if (pmin === Infinity) pmin = 0;
  if (pmax === 0) pmax = 150000;
  return {
    amountMin: Math.floor(amin),
    amountMax: Math.ceil(amax),
    applicantsMin: Math.floor(pmin),
    applicantsMax: Math.ceil(pmax)
  };
}

export function scholarshipPassesMoreFilters(
  s: Scholarship,
  f: MoreFiltersState
): boolean {
  if (!matchesDeadlinePreset(s, f.deadlinePreset)) return false;

  /** Matches server `applyMoreFilters`: non_monetary, award_signal_* in seo_tags, or in amount range. */
  const amountFilterBypass =
    s.payoutMethod === 'non_monetary' ||
    scholarshipSeoTagsBypassAmountFilter(s);
  const amt = parseScholarshipAmount(s);
  if (!amountFilterBypass && (amt < f.amountMin || amt > f.amountMax)) {
    return false;
  }

  const ap =
    typeof s.applicantCount === 'number' && !Number.isNaN(s.applicantCount)
      ? s.applicantCount
      : null;
  if (ap !== null) {
    if (ap < f.applicantsMin || ap > f.applicantsMax) return false;
  }

  // Requirement-type include filtering is server-only (SQL source of truth).

  if (!matchesDataCompletenessAndVerified(s, f.dataCompleteness)) return false;
  if (!matchesPayout(s, f.payout)) return false;
  // Eligibility and education include filtering are server-only (SQL source of truth).
  if (!matchesGpaBuckets(s, f.includeGpaBuckets)) return false;
  if (!matchesLocation(s, f.includeLocationLabels)) return false;
  if (!matchesEasyApply(s, f.includeEasyApply)) return false;
  if (!matchesFilterStateInput(s, f.filterStateInput)) return false;
  if (f.citizenshipAudience === 'international_friendly') {
    if (!matchesInternationalFriendlyAudience(s)) return false;
  }

  const fos = f.profileFieldOfStudySlug.trim().toLowerCase();
  if (fos) {
    const hay = (s.fieldOfStudy ?? []).map((x) => String(x).toLowerCase());
    if (!hay.some((x) => x === fos || x.includes(fos) || fos.includes(x))) {
      const blob = [s.title, s.summaryShort].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(fos.replace(/_/g, ' ')) && !blob.includes(fos)) {
        return false;
      }
    }
  }

  /** `us_domestic`: server SQL is authoritative; client pass-through avoids false negatives. */

  return true;
}

export function cloneMoreFilters(f: MoreFiltersState): MoreFiltersState {
  return {
    ...f,
    includeRequirementTypes: new Set(f.includeRequirementTypes),
    dataCompleteness: { ...f.dataCompleteness },
    payout: { ...f.payout },
    includeEligibility: new Set(f.includeEligibility),
    includeEducationLevels: new Set(f.includeEducationLevels),
    includeGpaBuckets: new Set(f.includeGpaBuckets),
    includeLocationLabels: new Set(f.includeLocationLabels),
    includeEasyApply: new Set(f.includeEasyApply),
    filterStateInput: f.filterStateInput,
    filterUniversityInput: f.filterUniversityInput,
    filterUniversitySlug: f.filterUniversitySlug,
    profileFieldOfStudySlug: f.profileFieldOfStudySlug,
    profileCitizenshipNarrow: f.profileCitizenshipNarrow
  };
}

/**
 * True when hub `moreFilters` carry quiz / profile / manual narrowing. Used by
 * `/api/scholarships` to avoid serving the generic “best” credibility slice (~224)
 * when there is no DB profile seed but the client sent real filter dimensions.
 */
export function moreFiltersHasProfileOrQuizListingSignals(
  mf: MoreFiltersState
): boolean {
  if (mf.filterStateInput.trim().length > 0) return true;
  if (mf.filterUniversitySlug && mf.filterUniversitySlug.trim().length > 0) {
    return true;
  }
  if (mf.includeEducationLevels.size > 0) return true;
  if (mf.includeGpaBuckets.size > 0) return true;
  if (mf.includeEligibility.size > 0) return true;
  if (mf.citizenshipAudience !== 'any') return true;
  if (mf.deadlinePreset !== 'any') return true;
  if (mf.includeRequirementTypes.size > 0) return true;
  if (mf.includeLocationLabels.size > 0) return true;
  if (mf.includeEasyApply.size > 0) return true;
  if (mf.profileFieldOfStudySlug.trim().length > 0) return true;
  if (mf.profileCitizenshipNarrow !== 'none') return true;
  return false;
}

/** Count of non-default filter selections (for toolbar badge). */
export function countMoreFilterSelections(
  f: MoreFiltersState,
  bounds: ReturnType<typeof computeFilterBounds>
): number {
  const d = defaultMoreFiltersFromBounds(bounds);
  let n = 0;
  if (f.deadlinePreset !== 'any') n++;
  if (f.citizenshipAudience !== 'any') n++;
  if (f.amountMin !== d.amountMin || f.amountMax !== d.amountMax) n++;
  if (f.applicantsMin !== d.applicantsMin || f.applicantsMax !== d.applicantsMax) {
    n++;
  }
  n += f.includeRequirementTypes.size;
  const dc = f.dataCompleteness;
  const dc0 = d.dataCompleteness;
  if (dc.low !== dc0.low) n++;
  if (dc.medium !== dc0.medium) n++;
  if (dc.high !== dc0.high) n++;
  if (dc.verified !== dc0.verified) n++;
  const po = f.payout;
  if (po.college || po.student || po.nonMonetary || po.notStated) n++;
  n += f.includeEligibility.size;
  n += f.includeEducationLevels.size;
  n += f.includeGpaBuckets.size;
  n += f.includeLocationLabels.size;
  n += f.includeEasyApply.size;
  if (f.filterStateInput.trim() !== '') n++;
  if (f.filterUniversitySlug?.trim()) n++;
  if (f.profileFieldOfStudySlug.trim()) n++;
  if (f.profileCitizenshipNarrow !== 'none') n++;
  return n;
}

function setSymmetricDiffCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of Array.from(a)) if (!b.has(x)) n++;
  for (const x of Array.from(b)) if (!a.has(x)) n++;
  return n;
}

/** How many filter controls differ from a preset baseline (e.g. long-tail curated defaults). */
export function countMoreFilterDeltaFromBaseline(
  f: MoreFiltersState,
  baseline: MoreFiltersState
): number {
  let n = 0;
  if (f.deadlinePreset !== baseline.deadlinePreset) n++;
  if (f.citizenshipAudience !== baseline.citizenshipAudience) n++;
  if (
    f.amountMin !== baseline.amountMin ||
    f.amountMax !== baseline.amountMax
  ) {
    n++;
  }
  if (
    f.applicantsMin !== baseline.applicantsMin ||
    f.applicantsMax !== baseline.applicantsMax
  ) {
    n++;
  }
  n += setSymmetricDiffCount(f.includeRequirementTypes, baseline.includeRequirementTypes);
  const dc = f.dataCompleteness;
  const db = baseline.dataCompleteness;
  if (dc.low !== db.low) n++;
  if (dc.medium !== db.medium) n++;
  if (dc.high !== db.high) n++;
  if (dc.verified !== db.verified) n++;
  const pf = f.payout;
  const pb = baseline.payout;
  if (
    pf.college !== pb.college ||
    pf.student !== pb.student ||
    pf.nonMonetary !== pb.nonMonetary ||
    pf.notStated !== pb.notStated
  ) {
    n++;
  }
  n += setSymmetricDiffCount(f.includeEligibility, baseline.includeEligibility);
  n += setSymmetricDiffCount(
    f.includeEducationLevels,
    baseline.includeEducationLevels
  );
  n += setSymmetricDiffCount(f.includeGpaBuckets, baseline.includeGpaBuckets);
  n += setSymmetricDiffCount(
    f.includeLocationLabels,
    baseline.includeLocationLabels
  );
  n += setSymmetricDiffCount(f.includeEasyApply, baseline.includeEasyApply);
  if (f.filterStateInput.trim() !== baseline.filterStateInput.trim()) n++;
  if ((f.filterUniversitySlug ?? '') !== (baseline.filterUniversitySlug ?? '')) n++;
  if (f.profileFieldOfStudySlug.trim() !== baseline.profileFieldOfStudySlug.trim()) n++;
  if (f.profileCitizenshipNarrow !== baseline.profileCitizenshipNarrow) n++;
  return n;
}
