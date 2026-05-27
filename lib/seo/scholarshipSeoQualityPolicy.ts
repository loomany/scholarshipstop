import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  fieldOfStudyDisplayList,
  getScholarshipDeadlineDisplayParts,
  studyLevelsDisplayList,
  type ScholarshipDeadlineFields
} from '@/app/scholarships/scholarshipsData';
import { fieldOfStudyLabelForValue } from '@/lib/constants/scholarshipFieldOfStudyOptions';
import { schoolLevelLabelForValue } from '@/lib/constants/scholarshipProfileOptions';
import { parseScholarshipDeadlineAnchor } from '@/lib/scholarships/scholarshipDeadlineTrust';

export type ScholarshipSourceStatusCode =
  | 'verified_official_source'
  | 'official_source_available'
  | 'needs_confirmation'
  | 'source_unclear';

export type ScholarshipSourceStatus = {
  code: ScholarshipSourceStatusCode;
  label: string;
  shortLabel: string;
  description: string;
};

export type ScholarshipDifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'Unknown';

export type ScholarshipDifficulty = {
  level: ScholarshipDifficultyLevel;
  label: string;
  reason: string;
};

export type ScholarshipDeadlineUrgencyLevel =
  | 'Expired'
  | 'Urgent'
  | 'Soon'
  | 'Open'
  | 'Recurring'
  | 'Check source';

export type ScholarshipDeadlineUrgency = {
  level: ScholarshipDeadlineUrgencyLevel;
  label: string;
  description: string;
  daysLeft: number | null;
};

export type ScholarshipMissingDataFlag = {
  key: string;
  label: string;
  description: string;
};

export type ScholarshipDetailIndexPolicy = {
  indexable: boolean;
  reasonCodes: string[];
  meaningfulFactCount: number;
  sourceStatus: ScholarshipSourceStatus;
  missingDataFlags: ScholarshipMissingDataFlag[];
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function hasAnyText(values: Array<string | null | undefined>): boolean {
  return values.some(hasText);
}

function nonEmptyCount(values: Array<unknown[] | null | undefined>): number {
  return values.reduce((count, value) => count + (value?.length ? 1 : 0), 0);
}

export function getScholarshipSourceStatus(
  s: Pick<
    Scholarship,
    | 'verified'
    | 'providerUrl'
    | 'listingUrl'
    | 'applyLink'
    | 'source'
    | 'officialSourceName'
    | 'hasOfficialApplicationDestination'
  >
): ScholarshipSourceStatus {
  const hasOfficialDestination =
    hasText(s.applyLink) ||
    hasText(s.listingUrl) ||
    hasText(s.providerUrl) ||
    s.hasOfficialApplicationDestination === true;
  const hasNamedSource = hasAnyText([
    s.officialSourceName,
    s.source,
    s.providerUrl
  ]);

  if (s.verified && hasOfficialDestination) {
    return {
      code: 'verified_official_source',
      label: 'Provider link available',
      shortLabel: 'Provider link',
      description:
        'ScholarshipTop has a provider-facing destination for this listing, so you can keep the scholarship details and application path together.'
    };
  }

  if (hasOfficialDestination) {
    return {
      code: 'official_source_available',
      label: 'Application path included',
      shortLabel: 'Application path',
      description:
        'A provider application destination is available alongside the organized eligibility, deadline, and award details.'
    };
  }

  if (hasNamedSource) {
    return {
      code: 'needs_confirmation',
      label: 'Structured scholarship details',
      shortLabel: 'Structured details',
      description:
        'ScholarshipTop has source or sponsor context and organized details to help you compare fit and prepare next steps.'
    };
  }

  return {
    code: 'source_unclear',
    label: 'Source-quality signal',
    shortLabel: 'Quality signal',
    description:
      'ScholarshipTop has limited source context for this listing, so use the structured details to compare fit, materials, and next steps with care.'
  };
}

export function getScholarshipMissingDataFlags(
  s: Pick<
    Scholarship,
    | 'deadline'
    | 'deadlineAt'
    | 'amount'
    | 'awardAmount'
    | 'awardAmountNumericSort'
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'seoEligibility'
    | 'documentsRequired'
    | 'documentRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'payoutMethod'
    | 'paymentDetails'
    | 'winnerPayment'
    | 'recurring'
    | 'scholarshipStatus'
    | 'aiMissingInfo'
  >
): ScholarshipMissingDataFlag[] {
  const flags: ScholarshipMissingDataFlag[] = [];
  const deadlineText = s.deadline?.trim();
  const deadlineLooksEmpty =
    !deadlineText || (deadlineText.length <= 3 && !/[A-Za-z0-9]/.test(deadlineText));
  const hasDeadline =
    !deadlineLooksEmpty ||
    Boolean(s.deadlineAt?.trim()) ||
    s.recurring === true;
  const hasAward =
    hasText(s.amount) ||
    hasText(s.awardAmount) ||
    (typeof s.awardAmountNumericSort === 'number' &&
      !Number.isNaN(s.awardAmountNumericSort));
  const hasEligibility =
    (s.eligibility?.length ?? 0) > 0 ||
    hasAnyText([s.whoCanApplyText, s.eligibilityText, s.seoEligibility]);
  const hasDocs =
    (s.documentsRequired?.length ?? 0) > 0 ||
    [
      s.documentRequired,
      s.essayRequired,
      s.transcriptRequired,
      s.recommendationRequired
    ].some((value) => value === true);
  const payoutKnown =
    hasText(s.payoutMethod) ||
    hasAnyText([s.paymentDetails, s.winnerPayment]);

  if (!hasDeadline) {
    flags.push({
      key: 'deadline_unclear',
      label: 'Deadline unclear',
      description:
        'Deadline timing is not fully structured yet; save this scholarship and track the application path.'
    });
  }
  if (!hasAward) {
    flags.push({
      key: 'award_unclear',
      label: 'Award amount unclear',
      description: 'Award value or renewal details are not fully structured yet.'
    });
  }
  if (!hasEligibility) {
    flags.push({
      key: 'eligibility_incomplete',
      label: 'Eligibility incomplete',
      description:
        'Use the visible eligibility signals to compare fit and prepare the materials that match your profile.'
    });
  }
  if (!hasDocs) {
    flags.push({
      key: 'documents_unclear',
      label: 'Required documents unclear',
      description:
        'Required documents are not fully structured yet; use the checklist and essay tools to prepare.'
    });
  }
  if (!payoutKnown) {
    flags.push({
      key: 'payout_unclear',
      label: 'Payout method unclear',
      description: 'Payout route is not fully structured yet.'
    });
  }
  if (!s.recurring && !hasText(s.scholarshipStatus)) {
    flags.push({
      key: 'renewal_unclear',
      label: 'Renewal status unclear',
      description: 'Cycle timing is not fully structured yet.'
    });
  }

  for (const item of s.aiMissingInfo ?? []) {
    const text = item.trim();
    if (!text) continue;
    const key = `ai_missing_${text.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    if (flags.some((flag) => flag.key === key)) continue;
    flags.push({
      key,
      label: text,
      description: 'ScholarshipTop could not structure this detail from current listing data.'
    });
  }

  return flags.slice(0, 8);
}

export function getScholarshipApplicationDifficulty(
  s: Pick<
    Scholarship,
    | 'documentsRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'documentRequired'
    | 'photoRequired'
    | 'videoRequired'
    | 'linkRequired'
    | 'surveyRequired'
    | 'questionRequired'
    | 'goalRequired'
    | 'specialEligibilityRequired'
    | 'requirementsCount'
    | 'requirementSignalsCount'
    | 'aiDifficultyLevel'
  >
): ScholarshipDifficulty {
  const ai = s.aiDifficultyLevel?.trim();
  if (ai && /^(easy|medium|hard)$/i.test(ai)) {
    const level = (ai[0]!.toUpperCase() + ai.slice(1).toLowerCase()) as
      | 'Easy'
      | 'Medium'
      | 'Hard';
    return {
      level,
      label: `Effort: ${level}`,
      reason:
        'Difficulty comes from ScholarshipTop structured application signals. Use it to plan your preparation workload.'
    };
  }

  const requiredSignals = [
    s.documentRequired,
    s.photoRequired,
    s.videoRequired,
    s.linkRequired,
    s.surveyRequired,
    s.questionRequired,
    s.goalRequired,
    s.specialEligibilityRequired,
    s.essayRequired,
    s.transcriptRequired,
    s.recommendationRequired
  ].filter((value) => value === true).length;
  const namedDocs = s.documentsRequired?.filter((item) => item.trim()).length ?? 0;
  const explicitReqCount =
    typeof s.requirementsCount === 'number' && !Number.isNaN(s.requirementsCount)
      ? s.requirementsCount
      : typeof s.requirementSignalsCount === 'number' &&
          !Number.isNaN(s.requirementSignalsCount)
        ? s.requirementSignalsCount
        : null;
  const count = Math.max(requiredSignals, namedDocs, explicitReqCount ?? 0);

  if (count === 0) {
    return {
      level: 'Unknown',
      label: 'Effort: Unknown',
      reason:
        'The application workload is not clear from current listing data. Use the organized details to plan materials before submitting.'
    };
  }

  const hasHeavyDocs =
    s.essayRequired === true ||
    s.transcriptRequired === true ||
    s.recommendationRequired === true ||
    s.videoRequired === true ||
    s.specialEligibilityRequired === true;
  const heavyDocCount = [
    s.essayRequired,
    s.transcriptRequired,
    s.recommendationRequired,
    s.videoRequired,
    s.specialEligibilityRequired
  ].filter((value) => value === true).length;

  if (count >= 5 || heavyDocCount >= 3) {
    return {
      level: 'Hard',
      label: 'Effort: Hard',
      reason:
        'This listing appears to require several materials or higher-effort evidence before submission.'
    };
  }

  if (hasHeavyDocs || count >= 2) {
    return {
      level: 'Medium',
      label: 'Effort: Medium',
      reason:
        'Expect at least one meaningful preparation step, such as an essay, transcript, recommendation, or supporting document.'
    };
  }

  return {
    level: 'Easy',
    label: 'Effort: Easy',
    reason:
      'Current structured data shows few required materials, so this may be a faster opportunity to prepare.'
  };
}

export function getScholarshipDeadlineUrgency(
  s: Pick<Scholarship, 'deadlineAt' | 'deadline' | 'recurring'>,
  now: Date = new Date()
): ScholarshipDeadlineUrgency {
  if (s.recurring === true) {
    return {
      level: 'Recurring',
      label: 'Recurring',
      description:
        'This listing may reopen or repeat. Save it to track the current or next cycle.',
      daysLeft: null
    };
  }

  const anchor = parseScholarshipDeadlineAnchor(
    s.deadlineAt ?? undefined,
    s.deadline ?? undefined
  );
  if (!anchor) {
    return {
      level: 'Check source',
      label: 'Timing to track',
      description:
        'ScholarshipTop does not have a structured calendar deadline for this listing yet.',
      daysLeft: null
    };
  }

  const daysLeft = Math.ceil(
    (anchor.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (daysLeft < 0) {
    return {
      level: 'Expired',
      label: 'Expired',
      description:
        'The catalog deadline appears to have passed. Save it if you want to track a future cycle.',
      daysLeft
    };
  }
  if (daysLeft <= 14) {
    return {
      level: 'Urgent',
      label: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
      description:
        'The deadline is close. Prioritize eligibility checks and required materials before spending time on essays.',
      daysLeft
    };
  }
  if (daysLeft <= 45) {
    return {
      level: 'Soon',
      label: `${daysLeft} days left`,
      description:
        'There is still planning time, but documents and recommendations should be checked now.',
      daysLeft
    };
  }
  return {
    level: 'Open',
    label: `${daysLeft} days left`,
    description:
      'The deadline is not immediate, so there is planning time for materials, essays, and shortlist decisions.',
    daysLeft
  };
}

/** Turn catalog slug/token into readable copy (no underscores). */
export function formatScholarshipCatalogTokenForDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return (
    fieldOfStudyLabelForValue(t) ??
    schoolLevelLabelForValue(t) ??
    t.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
  );
}

function formatBestForStudentsPhrase(token: string): string {
  const label = formatScholarshipCatalogTokenForDisplay(token);
  if (/\bstudents$/i.test(label) || /\bstudent$/i.test(label)) return label;
  return `${label} students`;
}

export function getScholarshipBestForLabel(
  s: Pick<
    Scholarship,
    | 'aiBestFor'
    | 'catalogUi'
    | 'studyLevels'
    | 'fieldOfStudy'
    | 'internationalFriendlyListing'
    | 'applicantCountryCodes'
  >
): string {
  const ai = s.aiBestFor?.map((item) => item.trim()).find(Boolean);
  if (ai) {
    const head = ai.replace(/\s+students\s*$/i, '').trim();
    return formatBestForStudentsPhrase(head || ai);
  }
  const field = fieldOfStudyDisplayList(s)[0];
  if (field) return formatBestForStudentsPhrase(field);
  const level = studyLevelsDisplayList(s)[0];
  if (level) return formatBestForStudentsPhrase(level);
  if (s.internationalFriendlyListing === true) return 'International students';
  if ((s.applicantCountryCodes?.length ?? 0) > 0) {
    return 'Students matching country rules';
  }
  return 'Students who match the listed eligibility signals';
}

/** Same calendar/relative deadline copy as the card metric column (never raw ISO). */
function deadlinePhraseForCardSnippet(s: ScholarshipDeadlineFields): string | null {
  const { primary } = getScholarshipDeadlineDisplayParts(s);
  return primary && primary !== '—' ? primary : null;
}

export function buildScholarshipCardSnippet(
  s: Pick<
    Scholarship,
    | 'summaryShort'
    | 'seoExcerpt'
    | 'description'
    | 'amount'
    | 'awardAmount'
    | 'deadline'
    | 'deadlineAt'
    | 'fieldOfStudy'
    | 'studyLevels'
    | 'aiBestFor'
    | 'aiMissingInfo'
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'seoEligibility'
    | 'documentsRequired'
    | 'documentRequired'
    | 'essayRequired'
    | 'transcriptRequired'
    | 'recommendationRequired'
    | 'payoutMethod'
    | 'paymentDetails'
    | 'winnerPayment'
    | 'recurring'
    | 'scholarshipStatus'
  >,
  awardDisplay: string,
  hasAwardContent: boolean
): string {
  const partial = getScholarshipMissingDataFlags(s).length >= 3;
  if (partial) {
    return 'This listing has partial details. Use the structured fields to compare fit, prepare materials, track timing, and open the application path when ready.';
  }

  const bestFor = getScholarshipBestForLabel(s);
  const deadline = deadlinePhraseForCardSnippet(s);
  const amount = hasAwardContent ? awardDisplay : null;
  if (amount && deadline) {
    return `${bestFor} can compare this scholarship with a listed award of ${amount} and a ${deadline} deadline while planning eligibility fit and required materials.`;
  }
  if (deadline) {
    return `${bestFor} should review this scholarship early because the deadline is listed as ${deadline}. Save it and plan the application path before it closes.`;
  }
  if (amount) {
    return `${bestFor} can compare this opportunity with a listed award of ${amount} and review the application path in ScholarshipTop.`;
  }

  const fallback =
    s.summaryShort?.trim() ||
    s.seoExcerpt?.trim() ||
    s.description?.trim();
  if (fallback) {
    return fallback.length > 220 ? `${fallback.slice(0, 217).trim()}...` : fallback;
  }

  return `${bestFor} can use ScholarshipTop to compare eligibility signals, deadline timing, award details, and application steps in one place.`;
}

export function meaningfulScholarshipFactCount(
  s: Pick<
    Scholarship,
    | 'deadline'
    | 'deadlineAt'
    | 'amount'
    | 'awardAmount'
    | 'provider'
    | 'providerUrl'
    | 'listingUrl'
    | 'applyLink'
    | 'eligibility'
    | 'whoCanApplyText'
    | 'eligibilityText'
    | 'documentsRequired'
    | 'studyLevels'
    | 'fieldOfStudy'
    | 'hostCountryCodes'
    | 'applicantCountryCodes'
  >
): number {
  const scalarFacts = [
    hasAnyText([s.deadline, s.deadlineAt]),
    hasAnyText([s.amount, s.awardAmount]),
    hasAnyText([s.provider, s.providerUrl, s.listingUrl, s.applyLink]),
    hasAnyText([s.whoCanApplyText, s.eligibilityText])
  ].filter(Boolean).length;
  return (
    scalarFacts +
    nonEmptyCount([
      s.eligibility,
      s.documentsRequired,
      s.studyLevels,
      s.fieldOfStudy,
      s.hostCountryCodes,
      s.applicantCountryCodes
    ])
  );
}

export function getScholarshipDetailIndexPolicy(
  s: Scholarship
): ScholarshipDetailIndexPolicy {
  const sourceStatus = getScholarshipSourceStatus(s);
  const missingDataFlags = getScholarshipMissingDataFlags(s);
  const meaningfulFactCount = meaningfulScholarshipFactCount(s);
  const hasOriginalSummary = hasAnyText([
    s.aiStudentSummary,
    s.summaryShort,
    s.summaryLong,
    s.seoExcerpt,
    s.seoOverview
  ]);
  const reasonCodes: string[] = [];

  if (s.isIndexable === false) reasonCodes.push('explicit_noindex');
  if (
    sourceStatus.code === 'source_unclear' ||
    sourceStatus.code === 'needs_confirmation'
  ) {
    reasonCodes.push('source_needs_confirmation');
  }
  if (!hasOriginalSummary) reasonCodes.push('missing_original_summary');
  if (meaningfulFactCount < 3) reasonCodes.push('low_fact_count');
  if (missingDataFlags.length >= 5) reasonCodes.push('many_missing_fields');

  return {
    indexable:
      s.isIndexable !== false &&
      hasOriginalSummary &&
      meaningfulFactCount >= 3 &&
      sourceStatus.code !== 'source_unclear',
    reasonCodes,
    meaningfulFactCount,
    sourceStatus,
    missingDataFlags
  };
}

export function getProgrammaticSeoIndexPolicy({
  listingCount,
  hasUniqueIntro,
  hasSpecificFaq,
  hasInternalLinks,
  isCanonical,
  duplicateRisk = false
}: {
  listingCount: number;
  hasUniqueIntro: boolean;
  hasSpecificFaq: boolean;
  hasInternalLinks: boolean;
  isCanonical: boolean;
  duplicateRisk?: boolean;
}): { indexable: boolean; reasonCodes: string[] } {
  const reasonCodes: string[] = [];
  if (listingCount < 10) reasonCodes.push('low_listing_count');
  if (!hasUniqueIntro) reasonCodes.push('missing_unique_intro');
  if (!hasSpecificFaq) reasonCodes.push('missing_specific_faq');
  if (!hasInternalLinks) reasonCodes.push('missing_internal_links');
  if (!isCanonical) reasonCodes.push('non_canonical');
  if (duplicateRisk) reasonCodes.push('duplicate_risk');

  return {
    indexable: reasonCodes.length === 0,
    reasonCodes
  };
}
